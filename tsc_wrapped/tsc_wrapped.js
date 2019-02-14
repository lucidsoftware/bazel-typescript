var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs", "path", "typescript", "../tsetse/runner", "./cache", "./compiler_host", "./diagnostics", "./manifest", "./perf_trace", "./strict_deps", "./tsconfig", "./worker"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs = require("fs");
    var path = require("path");
    var ts = require("typescript");
    var runner_1 = require("../tsetse/runner");
    var cache_1 = require("./cache");
    var compiler_host_1 = require("./compiler_host");
    var bazelDiagnostics = require("./diagnostics");
    var manifest_1 = require("./manifest");
    var perfTrace = require("./perf_trace");
    var strict_deps_1 = require("./strict_deps");
    var tsconfig_1 = require("./tsconfig");
    var worker_1 = require("./worker");
    /**
     * Top-level entry point for tsc_wrapped.
     */
    function main(args) {
        if (worker_1.runAsWorker(args)) {
            worker_1.log('Starting TypeScript compiler persistent worker...');
            worker_1.runWorkerLoop(runOneBuild);
            // Note: intentionally don't process.exit() here, because runWorkerLoop
            // is waiting for async callbacks from node.
        }
        else {
            worker_1.debug('Running a single build...');
            if (args.length === 0)
                throw new Error('Not enough arguments');
            if (!runOneBuild(args)) {
                return 1;
            }
        }
        return 0;
    }
    exports.main = main;
    /** The one ProgramAndFileCache instance used in this process. */
    var cache = new cache_1.ProgramAndFileCache(worker_1.debug);
    function isCompilationTarget(bazelOpts, sf) {
        return (bazelOpts.compilationTargetSrc.indexOf(sf.fileName) !== -1);
    }
    /**
     * Gather diagnostics from TypeScript's type-checker as well as other plugins we
     * install such as strict dependency checking.
     */
    function gatherDiagnostics(options, bazelOpts, program, disabledTsetseRules) {
        // Install extra diagnostic plugins
        if (!bazelOpts.disableStrictDeps) {
            var ignoredFilesPrefixes = [];
            if (bazelOpts.nodeModulesPrefix) {
                // Under Bazel, we exempt external files fetched from npm from strict
                // deps. This is because we allow users to implicitly depend on all the
                // node_modules.
                // TODO(alexeagle): if users opt-in to fine-grained npm dependencies, we
                // should be able to enforce strict deps for them.
                ignoredFilesPrefixes.push(bazelOpts.nodeModulesPrefix);
                if (options.rootDir) {
                    ignoredFilesPrefixes.push(path.resolve(options.rootDir, 'node_modules'));
                }
            }
            program = strict_deps_1.PLUGIN.wrap(program, __assign({}, bazelOpts, { rootDir: options.rootDir, ignoredFilesPrefixes: ignoredFilesPrefixes }));
        }
        if (!bazelOpts.isJsTranspilation) {
            var selectedTsetsePlugin = runner_1.PLUGIN;
            program = selectedTsetsePlugin.wrap(program, disabledTsetseRules);
        }
        // TODO(alexeagle): support plugins registered by config
        var diagnostics = [];
        perfTrace.wrap('type checking', function () {
            var e_1, _a;
            // These checks mirror ts.getPreEmitDiagnostics, with the important
            // exception of avoiding b/30708240, which is that if you call
            // program.getDeclarationDiagnostics() it somehow corrupts the emit.
            perfTrace.wrap("global diagnostics", function () {
                diagnostics.push.apply(diagnostics, __spread(program.getOptionsDiagnostics()));
                diagnostics.push.apply(diagnostics, __spread(program.getGlobalDiagnostics()));
            });
            var sourceFilesToCheck;
            if (bazelOpts.typeCheckDependencies) {
                sourceFilesToCheck = program.getSourceFiles();
            }
            else {
                sourceFilesToCheck = program.getSourceFiles().filter(function (f) { return isCompilationTarget(bazelOpts, f); });
            }
            var _loop_1 = function (sf) {
                perfTrace.wrap("check " + sf.fileName, function () {
                    diagnostics.push.apply(diagnostics, __spread(program.getSyntacticDiagnostics(sf)));
                    diagnostics.push.apply(diagnostics, __spread(program.getSemanticDiagnostics(sf)));
                });
                perfTrace.snapshotMemoryUsage();
            };
            try {
                for (var sourceFilesToCheck_1 = __values(sourceFilesToCheck), sourceFilesToCheck_1_1 = sourceFilesToCheck_1.next(); !sourceFilesToCheck_1_1.done; sourceFilesToCheck_1_1 = sourceFilesToCheck_1.next()) {
                    var sf = sourceFilesToCheck_1_1.value;
                    _loop_1(sf);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (sourceFilesToCheck_1_1 && !sourceFilesToCheck_1_1.done && (_a = sourceFilesToCheck_1.return)) _a.call(sourceFilesToCheck_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
        return diagnostics;
    }
    exports.gatherDiagnostics = gatherDiagnostics;
    /**
     * Runs a single build, returning false on failure.  This is potentially called
     * multiple times (once per bazel request) when running as a bazel worker.
     * Any encountered errors are written to stderr.
     */
    function runOneBuild(args, inputs) {
        var e_2, _a;
        if (args.length !== 1) {
            console.error('Expected one argument: path to tsconfig.json');
            return false;
        }
        perfTrace.snapshotMemoryUsage();
        // Strip leading at-signs, used in build_defs.bzl to indicate a params file
        var tsconfigFile = args[0].replace(/^@+/, '');
        var _b = __read(tsconfig_1.parseTsconfig(tsconfigFile), 3), parsed = _b[0], errors = _b[1], target = _b[2].target;
        if (errors) {
            console.error(bazelDiagnostics.format(target, errors));
            return false;
        }
        if (!parsed) {
            throw new Error('Impossible state: if parseTsconfig returns no errors, then parsed should be non-null');
        }
        var options = parsed.options, bazelOpts = parsed.bazelOpts, files = parsed.files, disabledTsetseRules = parsed.disabledTsetseRules;
        if (bazelOpts.maxCacheSizeMb !== undefined) {
            var maxCacheSizeBytes = bazelOpts.maxCacheSizeMb * (1 << 20);
            cache.setMaxCacheSize(maxCacheSizeBytes);
        }
        else {
            cache.resetMaxCacheSize();
        }
        var fileLoader;
        if (inputs) {
            fileLoader = new cache_1.CachedFileLoader(cache);
            // Resolve the inputs to absolute paths to match TypeScript internals
            var resolvedInputs = new Map();
            try {
                for (var _c = __values(Object.keys(inputs)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var key = _d.value;
                    resolvedInputs.set(tsconfig_1.resolveNormalizedPath(key), inputs[key]);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
            cache.updateCache(resolvedInputs);
        }
        else {
            fileLoader = new cache_1.UncachedFileLoader();
        }
        var perfTracePath = bazelOpts.perfTracePath;
        if (!perfTracePath) {
            return runFromOptions(fileLoader, options, bazelOpts, files, disabledTsetseRules);
        }
        worker_1.log('Writing trace to', perfTracePath);
        var success = perfTrace.wrap('runOneBuild', function () { return runFromOptions(fileLoader, options, bazelOpts, files, disabledTsetseRules); });
        if (!success)
            return false;
        // Force a garbage collection pass.  This keeps our memory usage
        // consistent across multiple compilations, and allows the file
        // cache to use the current memory usage as a guideline for expiring
        // data.  Note: this is intentionally not within runFromOptions(), as
        // we want to gc only after all its locals have gone out of scope.
        global.gc();
        perfTrace.snapshotMemoryUsage();
        perfTrace.write(perfTracePath);
        return true;
    }
    // We only allow our own code to use the expected_diagnostics attribute
    var expectDiagnosticsWhitelist = [];
    function runFromOptions(fileLoader, options, bazelOpts, files, disabledTsetseRules) {
        perfTrace.snapshotMemoryUsage();
        cache.resetStats();
        cache.traceStats();
        var compilerHostDelegate = ts.createCompilerHost({ target: ts.ScriptTarget.ES5 });
        var moduleResolver = bazelOpts.isJsTranspilation ?
            makeJsModuleResolver(bazelOpts.workspaceName) :
            ts.resolveModuleName;
        var compilerHost = new compiler_host_1.CompilerHost(files, options, bazelOpts, compilerHostDelegate, fileLoader, moduleResolver);
        var oldProgram = cache.getProgram(bazelOpts.target);
        var program = perfTrace.wrap('createProgram', function () { return ts.createProgram(compilerHost.inputFiles, options, compilerHost, oldProgram); });
        cache.putProgram(bazelOpts.target, program);
        if (!bazelOpts.isJsTranspilation) {
            // If there are any TypeScript type errors abort now, so the error
            // messages refer to the original source.  After any subsequent passes
            // (decorator downleveling or tsickle) we do not type check.
            var diagnostics_1 = gatherDiagnostics(options, bazelOpts, program, disabledTsetseRules);
            if (!expectDiagnosticsWhitelist.length ||
                expectDiagnosticsWhitelist.some(function (p) { return bazelOpts.target.startsWith(p); })) {
                diagnostics_1 = bazelDiagnostics.filterExpected(bazelOpts, diagnostics_1, bazelDiagnostics.uglyFormat);
            }
            else if (bazelOpts.expectedDiagnostics.length > 0) {
                console.error("Only targets under " + expectDiagnosticsWhitelist.join(', ') + " can use " +
                    'expected_diagnostics, but got', bazelOpts.target);
            }
            if (diagnostics_1.length > 0) {
                console.error(bazelDiagnostics.format(bazelOpts.target, diagnostics_1));
                worker_1.debug('compilation failed at', new Error().stack);
                return false;
            }
        }
        var compilationTargets = program.getSourceFiles().filter(function (fileName) { return isCompilationTarget(bazelOpts, fileName); });
        var diagnostics = [];
        var useTsickleEmit = bazelOpts.tsickle;
        if (useTsickleEmit) {
            diagnostics = emitWithTsickle(program, compilerHost, compilationTargets, options, bazelOpts);
        }
        else {
            diagnostics = emitWithTypescript(program, compilationTargets);
        }
        var warnings = diagnostics.filter(function (d) { return d.category == ts.DiagnosticCategory.Warning; });
        if (warnings.length > 0) {
            console.warn(bazelDiagnostics.format(bazelOpts.target, warnings));
        }
        var errors = diagnostics.filter(function (d) { return d.category == ts.DiagnosticCategory.Error; });
        if (errors.length > 0) {
            console.error(bazelDiagnostics.format(bazelOpts.target, errors));
            worker_1.debug('compilation failed at', new Error().stack);
            return false;
        }
        cache.printStats();
        return true;
    }
    function emitWithTypescript(program, compilationTargets) {
        var e_3, _a;
        var diagnostics = [];
        try {
            for (var compilationTargets_1 = __values(compilationTargets), compilationTargets_1_1 = compilationTargets_1.next(); !compilationTargets_1_1.done; compilationTargets_1_1 = compilationTargets_1.next()) {
                var sf = compilationTargets_1_1.value;
                var result = program.emit(sf);
                diagnostics.push.apply(diagnostics, __spread(result.diagnostics));
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (compilationTargets_1_1 && !compilationTargets_1_1.done && (_a = compilationTargets_1.return)) _a.call(compilationTargets_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return diagnostics;
    }
    function emitWithTsickle(program, compilerHost, compilationTargets, options, bazelOpts) {
        var e_4, _a;
        var emitResults = [];
        var diagnostics = [];
        // The 'tsickle' import above is only used in type positions, so it won't
        // result in a runtime dependency on tsickle.
        // If the user requests the tsickle emit, then we dynamically require it
        // here for use at runtime.
        var optTsickle;
        try {
            // tslint:disable-next-line:no-require-imports
            optTsickle = require('tsickle');
        }
        catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND') {
                throw e;
            }
            throw new Error('When setting bazelOpts { tsickle: true }, ' +
                'you must also add a devDependency on the tsickle npm package');
        }
        perfTrace.wrap('emit', function () {
            var e_5, _a;
            var _loop_2 = function (sf) {
                perfTrace.wrap("emit " + sf.fileName, function () {
                    emitResults.push(optTsickle.emitWithTsickle(program, compilerHost, compilerHost, options, sf));
                });
            };
            try {
                for (var compilationTargets_3 = __values(compilationTargets), compilationTargets_3_1 = compilationTargets_3.next(); !compilationTargets_3_1.done; compilationTargets_3_1 = compilationTargets_3.next()) {
                    var sf = compilationTargets_3_1.value;
                    _loop_2(sf);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (compilationTargets_3_1 && !compilationTargets_3_1.done && (_a = compilationTargets_3.return)) _a.call(compilationTargets_3);
                }
                finally { if (e_5) throw e_5.error; }
            }
        });
        var emitResult = optTsickle.mergeEmitResults(emitResults);
        diagnostics.push.apply(diagnostics, __spread(emitResult.diagnostics));
        // If tsickle reported diagnostics, don't produce externs or manifest outputs.
        if (diagnostics.length > 0) {
            return diagnostics;
        }
        var externs = '/** @externs */\n' +
            '// generating externs was disabled using generate_externs=False\n';
        if (bazelOpts.tsickleGenerateExterns) {
            externs =
                optTsickle.getGeneratedExterns(emitResult.externs, options.rootDir);
        }
        if (bazelOpts.tsickleExternsPath) {
            // Note: when tsickleExternsPath is provided, we always write a file as a
            // marker that compilation succeeded, even if it's empty (just containing an
            // @externs).
            fs.writeFileSync(bazelOpts.tsickleExternsPath, externs);
            // When generating externs, generate an externs file for each of the input
            // .d.ts files.
            if (bazelOpts.tsickleGenerateExterns &&
                compilerHost.provideExternalModuleDtsNamespace) {
                try {
                    for (var compilationTargets_2 = __values(compilationTargets), compilationTargets_2_1 = compilationTargets_2.next(); !compilationTargets_2_1.done; compilationTargets_2_1 = compilationTargets_2.next()) {
                        var extern = compilationTargets_2_1.value;
                        if (!extern.isDeclarationFile)
                            continue;
                        var outputBaseDir = options.outDir;
                        var relativeOutputPath = compilerHost.relativeOutputPath(extern.fileName);
                        mkdirp(outputBaseDir, path.dirname(relativeOutputPath));
                        var outputPath = path.join(outputBaseDir, relativeOutputPath);
                        var moduleName = compilerHost.pathToModuleName('', extern.fileName);
                        fs.writeFileSync(outputPath, "goog.module('" + moduleName + "');\n" +
                            "// Export an empty object of unknown type to allow imports.\n" +
                            "// TODO: use typeof once available\n" +
                            "exports = /** @type {?} */ ({});\n");
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (compilationTargets_2_1 && !compilationTargets_2_1.done && (_a = compilationTargets_2.return)) _a.call(compilationTargets_2);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
        }
        if (bazelOpts.manifest) {
            perfTrace.wrap('manifest', function () {
                var manifest = manifest_1.constructManifest(emitResult.modulesManifest, compilerHost);
                fs.writeFileSync(bazelOpts.manifest, manifest);
            });
        }
        return diagnostics;
    }
    /**
     * Creates directories subdir (a slash separated relative path) starting from
     * base.
     */
    function mkdirp(base, subdir) {
        var steps = subdir.split(path.sep);
        var current = base;
        for (var i = 0; i < steps.length; i++) {
            current = path.join(current, steps[i]);
            if (!fs.existsSync(current))
                fs.mkdirSync(current);
        }
    }
    /**
     * Resolve module filenames for JS modules.
     *
     * JS module resolution needs to be different because when transpiling JS we
     * do not pass in any dependencies, so the TS module resolver will not resolve
     * any files.
     *
     * Fortunately, JS module resolution is very simple. The imported module name
     * must either a relative path, or the workspace root (i.e. 'google3'),
     * so we can perform module resolution entirely based on file names, without
     * looking at the filesystem.
     */
    function makeJsModuleResolver(workspaceName) {
        // The literal '/' here is cross-platform safe because it's matching on
        // import specifiers, not file names.
        var workspaceModuleSpecifierPrefix = workspaceName + "/";
        var workspaceDir = "" + path.sep + workspaceName + path.sep;
        function jsModuleResolver(moduleName, containingFile, compilerOptions, host) {
            var resolvedFileName;
            if (containingFile === '') {
                // In tsickle we resolve the filename against '' to get the goog module
                // name of a sourcefile.
                resolvedFileName = moduleName;
            }
            else if (moduleName.startsWith(workspaceModuleSpecifierPrefix)) {
                // Given a workspace name of 'foo', we want to resolve import specifiers
                // like: 'foo/project/file.js' to the absolute filesystem path of
                // project/file.js within the workspace.
                var workspaceDirLocation = containingFile.indexOf(workspaceDir);
                if (workspaceDirLocation < 0) {
                    return { resolvedModule: undefined };
                }
                var absolutePathToWorkspaceDir = containingFile.slice(0, workspaceDirLocation);
                resolvedFileName = path.join(absolutePathToWorkspaceDir, moduleName);
            }
            else {
                if (!moduleName.startsWith('./') && !moduleName.startsWith('../')) {
                    throw new Error("Unsupported module import specifier: " + JSON.stringify(moduleName) + ".\n" +
                        "JS module imports must either be relative paths " +
                        "(beginning with '.' or '..'), " +
                        ("or they must begin with '" + workspaceName + "/'."));
                }
                resolvedFileName = path.join(path.dirname(containingFile), moduleName);
            }
            return {
                resolvedModule: {
                    resolvedFileName: resolvedFileName,
                    extension: ts.Extension.Js,
                    // These two fields are cargo culted from what ts.resolveModuleName
                    // seems to return.
                    packageId: undefined,
                    isExternalLibraryImport: false,
                }
            };
        }
        return jsModuleResolver;
    }
    if (require.main === module) {
        // Do not call process.exit(), as that terminates the binary before
        // completing pending operations, such as writing to stdout or emitting the
        // v8 performance log. Rather, set the exit code and fall off the main
        // thread, which will cause node to terminate cleanly.
        process.exitCode = main(process.argv.slice(2));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3dyYXBwZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2Nfd3JhcHBlZC90c2Nfd3JhcHBlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBQUEsdUJBQXlCO0lBQ3pCLDJCQUE2QjtJQUU3QiwrQkFBaUM7SUFFakMsMkNBQWtFO0lBRWxFLGlDQUE4RjtJQUM5RixpREFBNkM7SUFDN0MsZ0RBQWtEO0lBQ2xELHVDQUE2QztJQUM3Qyx3Q0FBMEM7SUFDMUMsNkNBQXlEO0lBQ3pELHVDQUE4RTtJQUM5RSxtQ0FBZ0U7SUFFaEU7O09BRUc7SUFDSCxTQUFnQixJQUFJLENBQUMsSUFBYztRQUNqQyxJQUFJLG9CQUFXLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDckIsWUFBRyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7WUFDekQsc0JBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMzQix1RUFBdUU7WUFDdkUsNENBQTRDO1NBQzdDO2FBQU07WUFDTCxjQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUNuQyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQztnQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDL0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdEIsT0FBTyxDQUFDLENBQUM7YUFDVjtTQUNGO1FBQ0QsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBZEQsb0JBY0M7SUFFRCxpRUFBaUU7SUFDakUsSUFBTSxLQUFLLEdBQUcsSUFBSSwyQkFBbUIsQ0FBQyxjQUFLLENBQUMsQ0FBQztJQUU3QyxTQUFTLG1CQUFtQixDQUN4QixTQUF1QixFQUFFLEVBQWlCO1FBQzVDLE9BQU8sQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsT0FBTyxD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QUM7YUFDdEU7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUNqRSxNQUFNLElBQUksS0FBSyxDQUNYLDBDQUNJLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFFBQUs7d0JBQ25DLGtEQUFrRDt3QkFDbEQsZ0NBQWdDO3lCQUNoQyw4QkFBNEIsYUFBYSxRQUFLLENBQUEsQ0FBQyxDQUFDO2lCQUNyRDtnQkFDRCxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDeEU7WUFDRCxPQUFPO2dCQUNMLGNBQWMsRUFBRTtvQkFDZCxnQkFBZ0Isa0JBQUE7b0JBQ2hCLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUU7b0JBQzFCLG1FQUFtRTtvQkFDbkUsbUJBQW1CO29CQUNuQixTQUFTLEVBQUUsU0FBUztvQkFDcEIsdUJBQXVCLEVBQUUsS0FBSztpQkFDL0I7YUFDRixDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sZ0JBQWdCLENBQUM7SUFDMUIsQ0FBQztJQUdELElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7UUFDM0IsbUVBQW1FO1FBQ25FLDJFQUEyRTtRQUMzRSxzRUFBc0U7UUFDdEUsc0RBQXNEO1FBQ3RELE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDaEQiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHNpY2tsZSBmcm9tICd0c2lja2xlJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1BMVUdJTiBhcyBiYXplbENvbmZvcm1hbmNlUGx1Z2lufSBmcm9tICcuLi90c2V0c2UvcnVubmVyJztcblxuaW1wb3J0IHtDYWNoZWRGaWxlTG9hZGVyLCBGaWxlTG9hZGVyLCBQcm9ncmFtQW5kRmlsZUNhY2hlLCBVbmNhY2hlZEZpbGVMb2FkZXJ9IGZyb20gJy4vY2FjaGUnO1xuaW1wb3J0IHtDb21waWxlckhvc3R9IGZyb20gJy4vY29tcGlsZXJfaG9zdCc7XG5pbXBvcnQgKiBhcyBiYXplbERpYWdub3N0aWNzIGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjb25zdHJ1Y3RNYW5pZmVzdH0gZnJvbSAnLi9tYW5pZmVzdCc7XG5pbXBvcnQgKiBhcyBwZXJmVHJhY2UgZnJvbSAnLi9wZXJmX3RyYWNlJztcbmltcG9ydCB7UExVR0lOIGFzIHN0cmljdERlcHNQbHVnaW59IGZyb20gJy4vc3RyaWN0X2RlcHMnO1xuaW1wb3J0IHtCYXplbE9wdGlvbnMsIHBhcnNlVHNjb25maWcsIHJlc29sdmVOb3JtYWxpemVkUGF0aH0gZnJvbSAnLi90c2NvbmZpZyc7XG5pbXBvcnQge2RlYnVnLCBsb2csIHJ1bkFzV29ya2VyLCBydW5Xb3JrZXJMb29wfSBmcm9tICcuL3dvcmtlcic7XG5cbi8qKlxuICogVG9wLWxldmVsIGVudHJ5IHBvaW50IGZvciB0c2Nfd3JhcHBlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1haW4oYXJnczogc3RyaW5nW10pIHtcbiAgaWYgKHJ1bkFzV29ya2VyKGFyZ3MpKSB7XG4gICAgbG9nKCdTdGFydGluZyBUeXBlU2NyaXB0IGNvbXBpbGVyIHBlcnNpc3RlbnQgd29ya2VyLi4uJyk7XG4gICAgcnVuV29ya2VyTG9vcChydW5PbmVCdWlsZCk7XG4gICAgLy8gTm90ZTogaW50ZW50aW9uYWxseSBkb24ndCBwcm9jZXNzLmV4aXQoKSBoZXJlLCBiZWNhdXNlIHJ1bldvcmtlckxvb3BcbiAgICAvLyBpcyB3YWl0aW5nIGZvciBhc3luYyBjYWxsYmFja3MgZnJvbSBub2RlLlxuICB9IGVsc2Uge1xuICAgIGRlYnVnKCdSdW5uaW5nIGEgc2luZ2xlIGJ1aWxkLi4uJyk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ05vdCBlbm91Z2ggYXJndW1lbnRzJyk7XG4gICAgaWYgKCFydW5PbmVCdWlsZChhcmdzKSkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICB9XG4gIHJldHVybiAwO1xufVxuXG4vKiogVGhlIG9uZSBQcm9ncmFtQW5kRmlsZUNhY2hlIGluc3RhbmNlIHVzZWQgaW4gdGhpcyBwcm9jZXNzLiAqL1xuY29uc3QgY2FjaGUgPSBuZXcgUHJvZ3JhbUFuZEZpbGVDYWNoZShkZWJ1Zyk7XG5cbmZ1bmN0aW9uIGlzQ29tcGlsYXRpb25UYXJnZXQoXG4gICAgYmF6ZWxPcHRzOiBCYXplbE9wdGlvbnMsIHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIHJldHVybiAoYmF6ZWxPcHRzLmNvbXBpbGF0aW9uVGFyZ2V0U3JjLmluZGV4T2Yoc2YuZmlsZU5hbWUpICE9PSAtMSk7XG59XG5cbi8qKlxuICogR2F0aGVyIGRpYWdub3N0aWNzIGZyb20gVHlwZVNjcmlwdCdzIHR5cGUtY2hlY2tlciBhcyB3ZWxsIGFzIG90aGVyIHBsdWdpbnMgd2VcbiAqIGluc3RhbGwgc3VjaCBhcyBzdHJpY3QgZGVwZW5kZW5jeSBjaGVja2luZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdhdGhlckRpYWdub3N0aWNzKFxuICAgIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucywgYmF6ZWxPcHRzOiBCYXplbE9wdGlvbnMsIHByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgZGlzYWJsZWRUc2V0c2VSdWxlczogc3RyaW5nW10pOiB0cy5EaWFnbm9zdGljW10ge1xuICAvLyBJbnN0YWxsIGV4dHJhIGRpYWdub3N0aWMgcGx1Z2luc1xuICBpZiAoIWJhemVsT3B0cy5kaXNhYmxlU3RyaWN0RGVwcykge1xuICAgIGNvbnN0IGlnbm9yZWRGaWxlc1ByZWZpeGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChiYXplbE9wdHMubm9kZU1vZHVsZXNQcmVmaXgpIHtcbiAgICAgIC8vIFVuZGVyIEJhemVsLCB3ZSBleGVtcHQgZXh0ZXJuYWwgZmlsZXMgZmV0Y2hlZCBmcm9tIG5wbSBmcm9tIHN0cmljdFxuICAgICAgLy8gZGVwcy4gVGhpcyBpcyBiZWNhdXNlIHdlIGFsbG93IHVzZXJzIHRvIGltcGxpY2l0bHkgZGVwZW5kIG9uIGFsbCB0aGVcbiAgICAgIC8vIG5vZGVfbW9kdWxlcy5cbiAgICAgIC8vIFRPRE8oYWxleGVhZ2xlKTogaWYgdXNlcnMgb3B0LWluIHRvIGZpbmUtZ3JhaW5lZCBucG0gZGVwZW5kZW5jaWVzLCB3ZVxuICAgICAgLy8gc2hvdWxkIGJlIGFibGUgdG8gZW5mb3JjZSBzdHJpY3QgZGVwcyBmb3IgdGhlbS5cbiAgICAgIGlnbm9yZWRGaWxlc1ByZWZpeGVzLnB1c2goYmF6ZWxPcHRzLm5vZGVNb2R1bGVzUHJlZml4KTtcbiAgICAgIGlmIChvcHRpb25zLnJvb3REaXIpIHtcbiAgICAgICAgaWdub3JlZEZpbGVzUHJlZml4ZXMucHVzaChcbiAgICAgICAgICAgIHBhdGgucmVzb2x2ZShvcHRpb25zLnJvb3REaXIhLCAnbm9kZV9tb2R1bGVzJykpO1xuICAgICAgfVxuICAgIH1cbiAgICBwcm9ncmFtID0gc3RyaWN0RGVwc1BsdWdpbi53cmFwKHByb2dyYW0sIHtcbiAgICAgIC4uLmJhemVsT3B0cyxcbiAgICAgIHJvb3REaXI6IG9wdGlvbnMucm9vdERpcixcbiAgICAgIGlnbm9yZWRGaWxlc1ByZWZpeGVzLFxuICAgIH0pO1xuICB9XG4gIGlmICghYmF6ZWxPcHRzLmlzSnNUcmFuc3BpbGF0aW9uKSB7XG4gICAgbGV0IHNlbGVjdGVkVHNldHNlUGx1Z2luID0gYmF6ZWxDb25mb3JtYW5jZVBsdWdpbjtcbiAgICBwcm9ncmFtID0gc2VsZWN0ZWRUc2V0c2VQbHVnaW4ud3JhcChwcm9ncmFtLCBkaXNhYmxlZFRzZXRzZVJ1bGVzKTtcbiAgfVxuXG4gIC8vIFRPRE8oYWxleGVhZ2xlKTogc3VwcG9ydCBwbHVnaW5zIHJlZ2lzdGVyZWQgYnkgY29uZmlnXG5cbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBwZXJmVHJhY2Uud3JhcCgndHlwZSBjaGVja2luZycsICgpID0+IHtcbiAgICAvLyBUaGVzZSBjaGVja3MgbWlycm9yIHRzLmdldFByZUVtaXREaWFnbm9zdGljcywgd2l0aCB0aGUgaW1wb3J0YW50XG4gICAgLy8gZXhjZXB0aW9uIG9mIGF2b2lkaW5nIGIvMzA3MDgyNDAsIHdoaWNoIGlzIHRoYXQgaWYgeW91IGNhbGxcbiAgICAvLyBwcm9ncmFtLmdldERlY2xhcmF0aW9uRGlhZ25vc3RpY3MoKSBpdCBzb21laG93IGNvcnJ1cHRzIHRoZSBlbWl0LlxuICAgIHBlcmZUcmFjZS53cmFwKGBnbG9iYWwgZGlhZ25vc3RpY3NgLCAoKSA9PiB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnByb2dyYW0uZ2V0T3B0aW9uc0RpYWdub3N0aWNzKCkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5wcm9ncmFtLmdldEdsb2JhbERpYWdub3N0aWNzKCkpO1xuICAgIH0pO1xuICAgIGxldCBzb3VyY2VGaWxlc1RvQ2hlY2s6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT47XG4gICAgaWYgKGJhemVsT3B0cy50eXBlQ2hlY2tEZXBlbmRlbmNpZXMpIHtcbiAgICAgIHNvdXJjZUZpbGVzVG9DaGVjayA9IHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc291cmNlRmlsZXNUb0NoZWNrID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbHRlcihcbiAgICAgICAgICBmID0+IGlzQ29tcGlsYXRpb25UYXJnZXQoYmF6ZWxPcHRzLCBmKSk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc2Ygb2Ygc291cmNlRmlsZXNUb0NoZWNrKSB7XG4gICAgICBwZXJmVHJhY2Uud3JhcChgY2hlY2sgJHtzZi5maWxlTmFtZX1gLCAoKSA9PiB7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4ucHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzZikpO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnByb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzZikpO1xuICAgICAgfSk7XG4gICAgICBwZXJmVHJhY2Uuc25hcHNob3RNZW1vcnlVc2FnZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGRpYWdub3N0aWNzO1xufVxuXG4vKipcbiAqIFJ1bnMgYSBzaW5nbGUgYnVpbGQsIHJldHVybmluZyBmYWxzZSBvbiBmYWlsdXJlLiAgVGhpcyBpcyBwb3RlbnRpYWxseSBjYWxsZWRcbiAqIG11bHRpcGxlIHRpbWVzIChvbmNlIHBlciBiYXplbCByZXF1ZXN0KSB3aGVuIHJ1bm5pbmcgYXMgYSBiYXplbCB3b3JrZXIuXG4gKiBBbnkgZW5jb3VudGVyZWQgZXJyb3JzIGFyZSB3cml0dGVuIHRvIHN0ZGVyci5cbiAqL1xuZnVuY3Rpb24gcnVuT25lQnVpbGQoXG4gICAgYXJnczogc3RyaW5nW10sIGlucHV0cz86IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nfSk6IGJvb2xlYW4ge1xuICBpZiAoYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFeHBlY3RlZCBvbmUgYXJndW1lbnQ6IHBhdGggdG8gdHNjb25maWcuanNvbicpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHBlcmZUcmFjZS5zbmFwc2hvdE1lbW9yeVVzYWdlKCk7XG5cbiAgLy8gU3RyaXAgbGVhZGluZyBhdC1zaWducywgdXNlZCBpbiBidWlsZF9kZWZzLmJ6bCB0byBpbmRpY2F0ZSBhIHBhcmFtcyBmaWxlXG4gIGNvbnN0IHRzY29uZmlnRmlsZSA9IGFyZ3NbMF0ucmVwbGFjZSgvXkArLywgJycpO1xuICBjb25zdCBbcGFyc2VkLCBlcnJvcnMsIHt0YXJnZXR9XSA9IHBhcnNlVHNjb25maWcodHNjb25maWdGaWxlKTtcbiAgaWYgKGVycm9ycykge1xuICAgIGNvbnNvbGUuZXJyb3IoYmF6ZWxEaWFnbm9zdGljcy5mb3JtYXQodGFyZ2V0LCBlcnJvcnMpKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFwYXJzZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdJbXBvc3NpYmxlIHN0YXRlOiBpZiBwYXJzZVRzY29uZmlnIHJldHVybnMgbm8gZXJyb3JzLCB0aGVuIHBhcnNlZCBzaG91bGQgYmUgbm9uLW51bGwnKTtcbiAgfVxuICBjb25zdCB7b3B0aW9ucywgYmF6ZWxPcHRzLCBmaWxlcywgZGlzYWJsZWRUc2V0c2VSdWxlc30gPSBwYXJzZWQ7XG5cbiAgaWYgKGJhemVsT3B0cy5tYXhDYWNoZVNpemVNYiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbWF4Q2FjaGVTaXplQnl0ZXMgPSBiYXplbE9wdHMubWF4Q2FjaGVTaXplTWIgKiAoMSA8PCAyMCk7XG4gICAgY2FjaGUuc2V0TWF4Q2FjaGVTaXplKG1heENhY2hlU2l6ZUJ5dGVzKTtcbiAgfSBlbHNlIHtcbiAgICBjYWNoZS5yZXNldE1heENhY2hlU2l6ZSgpO1xuICB9XG5cbiAgbGV0IGZpbGVMb2FkZXI6IEZpbGVMb2FkZXI7XG4gIGlmIChpbnB1dHMpIHtcbiAgICBmaWxlTG9hZGVyID0gbmV3IENhY2hlZEZpbGVMb2FkZXIoY2FjaGUpO1xuICAgIC8vIFJlc29sdmUgdGhlIGlucHV0cyB0byBhYnNvbHV0ZSBwYXRocyB0byBtYXRjaCBUeXBlU2NyaXB0IGludGVybmFsc1xuICAgIGNvbnN0IHJlc29sdmVkSW5wdXRzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhpbnB1dHMpKSB7XG4gICAgICByZXNvbHZlZElucHV0cy5zZXQocmVzb2x2ZU5vcm1hbGl6ZWRQYXRoKGtleSksIGlucHV0c1trZXldKTtcbiAgICB9XG4gICAgY2FjaGUudXBkYXRlQ2FjaGUocmVzb2x2ZWRJbnB1dHMpO1xuICB9IGVsc2Uge1xuICAgIGZpbGVMb2FkZXIgPSBuZXcgVW5jYWNoZWRGaWxlTG9hZGVyKCk7XG4gIH1cblxuICBjb25zdCBwZXJmVHJhY2VQYXRoID0gYmF6ZWxPcHRzLnBlcmZUcmFjZVBhdGg7XG4gIGlmICghcGVyZlRyYWNlUGF0aCkge1xuICAgIHJldHVybiBydW5Gcm9tT3B0aW9ucyhcbiAgICAgICAgZmlsZUxvYWRlciwgb3B0aW9ucywgYmF6ZWxPcHRzLCBmaWxlcywgZGlzYWJsZWRUc2V0c2VSdWxlcyk7XG4gIH1cblxuICBsb2coJ1dyaXRpbmcgdHJhY2UgdG8nLCBwZXJmVHJhY2VQYXRoKTtcbiAgY29uc3Qgc3VjY2VzcyA9IHBlcmZUcmFjZS53cmFwKFxuICAgICAgJ3J1bk9uZUJ1aWxkJyxcbiAgICAgICgpID0+IHJ1bkZyb21PcHRpb25zKFxuICAgICAgICAgIGZpbGVMb2FkZXIsIG9wdGlvbnMsIGJhemVsT3B0cywgZmlsZXMsIGRpc2FibGVkVHNldHNlUnVsZXMpKTtcbiAgaWYgKCFzdWNjZXNzKSByZXR1cm4gZmFsc2U7XG4gIC8vIEZvcmNlIGEgZ2FyYmFnZSBjb2xsZWN0aW9uIHBhc3MuICBUaGlzIGtlZXBzIG91ciBtZW1vcnkgdXNhZ2VcbiAgLy8gY29uc2lzdGVudCBhY3Jvc3MgbXVsdGlwbGUgY29tcGlsYXRpb25zLCBhbmQgYWxsb3dzIHRoZSBmaWxlXG4gIC8vIGNhY2hlIHRvIHVzZSB0aGUgY3VycmVudCBtZW1vcnkgdXNhZ2UgYXMgYSBndWlkZWxpbmUgZm9yIGV4cGlyaW5nXG4gIC8vIGRhdGEuICBOb3RlOiB0aGlzIGlzIGludGVudGlvbmFsbHkgbm90IHdpdGhpbiBydW5Gcm9tT3B0aW9ucygpLCBhc1xuICAvLyB3ZSB3YW50IHRvIGdjIG9ubHkgYWZ0ZXIgYWxsIGl0cyBsb2NhbHMgaGF2ZSBnb25lIG91dCBvZiBzY29wZS5cbiAgZ2xvYmFsLmdjKCk7XG5cbiAgcGVyZlRyYWNlLnNuYXBzaG90TWVtb3J5VXNhZ2UoKTtcbiAgcGVyZlRyYWNlLndyaXRlKHBlcmZUcmFjZVBhdGgpO1xuXG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyBXZSBvbmx5IGFsbG93IG91ciBvd24gY29kZSB0byB1c2UgdGhlIGV4cGVjdGVkX2RpYWdub3N0aWNzIGF0dHJpYnV0ZVxuY29uc3QgZXhwZWN0RGlhZ25vc3RpY3NXaGl0ZWxpc3Q6IHN0cmluZ1tdID0gW1xuXTtcblxuZnVuY3Rpb24gcnVuRnJvbU9wdGlvbnMoXG4gICAgZmlsZUxvYWRlcjogRmlsZUxvYWRlciwgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgIGJhemVsT3B0czogQmF6ZWxPcHRpb25zLCBmaWxlczogc3RyaW5nW10sXG4gICAgZGlzYWJsZWRUc2V0c2VSdWxlczogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgcGVyZlRyYWNlLnNuYXBzaG90TWVtb3J5VXNhZ2UoKTtcbiAgY2FjaGUucmVzZXRTdGF0cygpO1xuICBjYWNoZS50cmFjZVN0YXRzKCk7XG4gIGNvbnN0IGNvbXBpbGVySG9zdERlbGVnYXRlID1cbiAgICAgIHRzLmNyZWF0ZUNvbXBpbGVySG9zdCh7dGFyZ2V0OiB0cy5TY3JpcHRUYXJnZXQuRVM1fSk7XG5cbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBiYXplbE9wdHMuaXNKc1RyYW5zcGlsYXRpb24gP1xuICAgICAgbWFrZUpzTW9kdWxlUmVzb2x2ZXIoYmF6ZWxPcHRzLndvcmtzcGFjZU5hbWUpIDpcbiAgICAgIHRzLnJlc29sdmVNb2R1bGVOYW1lO1xuICBjb25zdCBjb21waWxlckhvc3QgPSBuZXcgQ29tcGlsZXJIb3N0KFxuICAgICAgZmlsZXMsIG9wdGlvbnMsIGJhemVsT3B0cywgY29tcGlsZXJIb3N0RGVsZWdhdGUsIGZpbGVMb2FkZXIsXG4gICAgICBtb2R1bGVSZXNvbHZlcik7XG5cblxuICBjb25zdCBvbGRQcm9ncmFtID0gY2FjaGUuZ2V0UHJvZ3JhbShiYXplbE9wdHMudGFyZ2V0KTtcbiAgY29uc3QgcHJvZ3JhbSA9IHBlcmZUcmFjZS53cmFwKFxuICAgICAgJ2NyZWF0ZVByb2dyYW0nLFxuICAgICAgKCkgPT4gdHMuY3JlYXRlUHJvZ3JhbShcbiAgICAgICAgICBjb21waWxlckhvc3QuaW5wdXRGaWxlcywgb3B0aW9ucywgY29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtKSk7XG4gIGNhY2hlLnB1dFByb2dyYW0oYmF6ZWxPcHRzLnRhcmdldCwgcHJvZ3JhbSk7XG5cbiAgaWYgKCFiYXplbE9wdHMuaXNKc1RyYW5zcGlsYXRpb24pIHtcbiAgICAvLyBJZiB0aGVyZSBhcmUgYW55IFR5cGVTY3JpcHQgdHlwZSBlcnJvcnMgYWJvcnQgbm93LCBzbyB0aGUgZXJyb3JcbiAgICAvLyBtZXNzYWdlcyByZWZlciB0byB0aGUgb3JpZ2luYWwgc291cmNlLiAgQWZ0ZXIgYW55IHN1YnNlcXVlbnQgcGFzc2VzXG4gICAgLy8gKGRlY29yYXRvciBkb3dubGV2ZWxpbmcgb3IgdHNpY2tsZSkgd2UgZG8gbm90IHR5cGUgY2hlY2suXG4gICAgbGV0IGRpYWdub3N0aWNzID1cbiAgICAgICAgZ2F0aGVyRGlhZ25vc3RpY3Mob3B0aW9ucywgYmF6ZWxPcHRzLCBwcm9ncmFtLCBkaXNhYmxlZFRzZXRzZVJ1bGVzKTtcbiAgICBpZiAoIWV4cGVjdERpYWdub3N0aWNzV2hpdGVsaXN0Lmxlbmd0aCB8fFxuICAgICAgICBleHBlY3REaWFnbm9zdGljc1doaXRlbGlzdC5zb21lKHAgPT4gYmF6ZWxPcHRzLnRhcmdldC5zdGFydHNXaXRoKHApKSkge1xuICAgICAgZGlhZ25vc3RpY3MgPSBiYXplbERpYWdub3N0aWNzLmZpbHRlckV4cGVjdGVkKFxuICAgICAgICAgIGJhemVsT3B0cywgZGlhZ25vc3RpY3MsIGJhemVsRGlhZ25vc3RpY3MudWdseUZvcm1hdCk7XG4gICAgfSBlbHNlIGlmIChiYXplbE9wdHMuZXhwZWN0ZWREaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgIGBPbmx5IHRhcmdldHMgdW5kZXIgJHtcbiAgICAgICAgICAgICAgZXhwZWN0RGlhZ25vc3RpY3NXaGl0ZWxpc3Quam9pbignLCAnKX0gY2FuIHVzZSBgICtcbiAgICAgICAgICAgICAgJ2V4cGVjdGVkX2RpYWdub3N0aWNzLCBidXQgZ290JyxcbiAgICAgICAgICBiYXplbE9wdHMudGFyZ2V0KTtcbiAgICB9XG5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgY29uc29sZS5lcnJvcihiYXplbERpYWdub3N0aWNzLmZvcm1hdChiYXplbE9wdHMudGFyZ2V0LCBkaWFnbm9zdGljcykpO1xuICAgICAgZGVidWcoJ2NvbXBpbGF0aW9uIGZhaWxlZCBhdCcsIG5ldyBFcnJvcigpLnN0YWNrISk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgY29tcGlsYXRpb25UYXJnZXRzID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbHRlcihcbiAgICAgIGZpbGVOYW1lID0+IGlzQ29tcGlsYXRpb25UYXJnZXQoYmF6ZWxPcHRzLCBmaWxlTmFtZSkpO1xuXG4gIGxldCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGxldCB1c2VUc2lja2xlRW1pdCA9IGJhemVsT3B0cy50c2lja2xlO1xuICBpZiAodXNlVHNpY2tsZUVtaXQpIHtcbiAgICBkaWFnbm9zdGljcyA9IGVtaXRXaXRoVHNpY2tsZShcbiAgICAgICAgcHJvZ3JhbSwgY29tcGlsZXJIb3N0LCBjb21waWxhdGlvblRhcmdldHMsIG9wdGlvbnMsIGJhemVsT3B0cyk7XG4gIH0gZWxzZSB7XG4gICAgZGlhZ25vc3RpY3MgPSBlbWl0V2l0aFR5cGVzY3JpcHQocHJvZ3JhbSwgY29tcGlsYXRpb25UYXJnZXRzKTtcbiAgfVxuICBjb25zdCB3YXJuaW5ncyA9IGRpYWdub3N0aWNzLmZpbHRlcihkID0+IGQuY2F0ZWdvcnkgPT0gdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lldhcm5pbmcpO1xuICBpZiAod2FybmluZ3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnNvbGUud2FybihiYXplbERpYWdub3N0aWNzLmZvcm1hdChiYXplbE9wdHMudGFyZ2V0LCB3YXJuaW5ncykpO1xuICB9XG4gIGNvbnN0IGVycm9ycyA9IGRpYWdub3N0aWNzLmZpbHRlcihkID0+IGQuY2F0ZWdvcnkgPT0gdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yKTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc29sZS5lcnJvcihiYXplbERpYWdub3N0aWNzLmZvcm1hdChiYXplbE9wdHMudGFyZ2V0LCBlcnJvcnMpKTtcbiAgICBkZWJ1ZygnY29tcGlsYXRpb24gZmFpbGVkIGF0JywgbmV3IEVycm9yKCkuc3RhY2shKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjYWNoZS5wcmludFN0YXRzKCk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBlbWl0V2l0aFR5cGVzY3JpcHQoXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgY29tcGlsYXRpb25UYXJnZXRzOiB0cy5Tb3VyY2VGaWxlW10pOiB0cy5EaWFnbm9zdGljW10ge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGZvciAoY29uc3Qgc2Ygb2YgY29tcGlsYXRpb25UYXJnZXRzKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gcHJvZ3JhbS5lbWl0KHNmKTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnJlc3VsdC5kaWFnbm9zdGljcyk7XG4gIH1cbiAgcmV0dXJuIGRpYWdub3N0aWNzO1xufVxuXG5mdW5jdGlvbiBlbWl0V2l0aFRzaWNrbGUoXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgY29tcGlsZXJIb3N0OiBDb21waWxlckhvc3QsXG4gICAgY29tcGlsYXRpb25UYXJnZXRzOiB0cy5Tb3VyY2VGaWxlW10sIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyxcbiAgICBiYXplbE9wdHM6IEJhemVsT3B0aW9ucyk6IHRzLkRpYWdub3N0aWNbXSB7XG4gIGNvbnN0IGVtaXRSZXN1bHRzOiB0c2lja2xlLkVtaXRSZXN1bHRbXSA9IFtdO1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIC8vIFRoZSAndHNpY2tsZScgaW1wb3J0IGFib3ZlIGlzIG9ubHkgdXNlZCBpbiB0eXBlIHBvc2l0aW9ucywgc28gaXQgd29uJ3RcbiAgLy8gcmVzdWx0IGluIGEgcnVudGltZSBkZXBlbmRlbmN5IG9uIHRzaWNrbGUuXG4gIC8vIElmIHRoZSB1c2VyIHJlcXVlc3RzIHRoZSB0c2lja2xlIGVtaXQsIHRoZW4gd2UgZHluYW1pY2FsbHkgcmVxdWlyZSBpdFxuICAvLyBoZXJlIGZvciB1c2UgYXQgcnVudGltZS5cbiAgbGV0IG9wdFRzaWNrbGU6IHR5cGVvZiB0c2lja2xlO1xuICB0cnkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1yZXF1aXJlLWltcG9ydHNcbiAgICBvcHRUc2lja2xlID0gcmVxdWlyZSgndHNpY2tsZScpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUuY29kZSAhPT0gJ01PRFVMRV9OT1RfRk9VTkQnKSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdXaGVuIHNldHRpbmcgYmF6ZWxPcHRzIHsgdHNpY2tsZTogdHJ1ZSB9LCAnICtcbiAgICAgICAgJ3lvdSBtdXN0IGFsc28gYWRkIGEgZGV2RGVwZW5kZW5jeSBvbiB0aGUgdHNpY2tsZSBucG0gcGFja2FnZScpO1xuICB9XG4gIHBlcmZUcmFjZS53cmFwKCdlbWl0JywgKCkgPT4ge1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgY29tcGlsYXRpb25UYXJnZXRzKSB7XG4gICAgICBwZXJmVHJhY2Uud3JhcChgZW1pdCAke3NmLmZpbGVOYW1lfWAsICgpID0+IHtcbiAgICAgICAgZW1pdFJlc3VsdHMucHVzaChvcHRUc2lja2xlLmVtaXRXaXRoVHNpY2tsZShcbiAgICAgICAgICAgIHByb2dyYW0sIGNvbXBpbGVySG9zdCwgY29tcGlsZXJIb3N0LCBvcHRpb25zLCBzZikpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgY29uc3QgZW1pdFJlc3VsdCA9IG9wdFRzaWNrbGUubWVyZ2VFbWl0UmVzdWx0cyhlbWl0UmVzdWx0cyk7XG4gIGRpYWdub3N0aWNzLnB1c2goLi4uZW1pdFJlc3VsdC5kaWFnbm9zdGljcyk7XG5cbiAgLy8gSWYgdHNpY2tsZSByZXBvcnRlZCBkaWFnbm9zdGljcywgZG9uJ3QgcHJvZHVjZSBleHRlcm5zIG9yIG1hbmlmZXN0IG91dHB1dHMuXG4gIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgbGV0IGV4dGVybnMgPSAnLyoqIEBleHRlcm5zICovXFxuJyArXG4gICAgICAnLy8gZ2VuZXJhdGluZyBleHRlcm5zIHdhcyBkaXNhYmxlZCB1c2luZyBnZW5lcmF0ZV9leHRlcm5zPUZhbHNlXFxuJztcbiAgaWYgKGJhemVsT3B0cy50c2lja2xlR2VuZXJhdGVFeHRlcm5zKSB7XG4gICAgZXh0ZXJucyA9XG4gICAgICAgIG9wdFRzaWNrbGUuZ2V0R2VuZXJhdGVkRXh0ZXJucyhlbWl0UmVzdWx0LmV4dGVybnMsIG9wdGlvbnMucm9vdERpciEpO1xuICB9XG5cbiAgaWYgKGJhemVsT3B0cy50c2lja2xlRXh0ZXJuc1BhdGgpIHtcbiAgICAvLyBOb3RlOiB3aGVuIHRzaWNrbGVFeHRlcm5zUGF0aCBpcyBwcm92aWRlZCwgd2UgYWx3YXlzIHdyaXRlIGEgZmlsZSBhcyBhXG4gICAgLy8gbWFya2VyIHRoYXQgY29tcGlsYXRpb24gc3VjY2VlZGVkLCBldmVuIGlmIGl0J3MgZW1wdHkgKGp1c3QgY29udGFpbmluZyBhblxuICAgIC8vIEBleHRlcm5zKS5cbiAgICBmcy53cml0ZUZpbGVTeW5jKGJhemVsT3B0cy50c2lja2xlRXh0ZXJuc1BhdGgsIGV4dGVybnMpO1xuXG4gICAgLy8gV2hlbiBnZW5lcmF0aW5nIGV4dGVybnMsIGdlbmVyYXRlIGFuIGV4dGVybnMgZmlsZSBmb3IgZWFjaCBvZiB0aGUgaW5wdXRcbiAgICAvLyAuZC50cyBmaWxlcy5cbiAgICBpZiAoYmF6ZWxPcHRzLnRzaWNrbGVHZW5lcmF0ZUV4dGVybnMgJiZcbiAgICAgICAgY29tcGlsZXJIb3N0LnByb3ZpZGVFeHRlcm5hbE1vZHVsZUR0c05hbWVzcGFjZSkge1xuICAgICAgZm9yIChjb25zdCBleHRlcm4gb2YgY29tcGlsYXRpb25UYXJnZXRzKSB7XG4gICAgICAgIGlmICghZXh0ZXJuLmlzRGVjbGFyYXRpb25GaWxlKSBjb250aW51ZTtcbiAgICAgICAgY29uc3Qgb3V0cHV0QmFzZURpciA9IG9wdGlvbnMub3V0RGlyITtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVPdXRwdXRQYXRoID1cbiAgICAgICAgICAgIGNvbXBpbGVySG9zdC5yZWxhdGl2ZU91dHB1dFBhdGgoZXh0ZXJuLmZpbGVOYW1lKTtcbiAgICAgICAgbWtkaXJwKG91dHB1dEJhc2VEaXIsIHBhdGguZGlybmFtZShyZWxhdGl2ZU91dHB1dFBhdGgpKTtcbiAgICAgICAgY29uc3Qgb3V0cHV0UGF0aCA9IHBhdGguam9pbihvdXRwdXRCYXNlRGlyLCByZWxhdGl2ZU91dHB1dFBhdGgpO1xuICAgICAgICBjb25zdCBtb2R1bGVOYW1lID0gY29tcGlsZXJIb3N0LnBhdGhUb01vZHVsZU5hbWUoJycsIGV4dGVybi5maWxlTmFtZSk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMoXG4gICAgICAgICAgICBvdXRwdXRQYXRoLFxuICAgICAgICAgICAgYGdvb2cubW9kdWxlKCcke21vZHVsZU5hbWV9Jyk7XFxuYCArXG4gICAgICAgICAgICAgICAgYC8vIEV4cG9ydCBhbiBlbXB0eSBvYmplY3Qgb2YgdW5rbm93biB0eXBlIHRvIGFsbG93IGltcG9ydHMuXFxuYCArXG4gICAgICAgICAgICAgICAgYC8vIFRPRE86IHVzZSB0eXBlb2Ygb25jZSBhdmFpbGFibGVcXG5gICtcbiAgICAgICAgICAgICAgICBgZXhwb3J0cyA9IC8qKiBAdHlwZSB7P30gKi8gKHt9KTtcXG5gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoYmF6ZWxPcHRzLm1hbmlmZXN0KSB7XG4gICAgcGVyZlRyYWNlLndyYXAoJ21hbmlmZXN0JywgKCkgPT4ge1xuICAgICAgY29uc3QgbWFuaWZlc3QgPVxuICAgICAgICAgIGNvbnN0cnVjdE1hbmlmZXN0KGVtaXRSZXN1bHQubW9kdWxlc01hbmlmZXN0LCBjb21waWxlckhvc3QpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyhiYXplbE9wdHMubWFuaWZlc3QsIG1hbmlmZXN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBkaWFnbm9zdGljcztcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGRpcmVjdG9yaWVzIHN1YmRpciAoYSBzbGFzaCBzZXBhcmF0ZWQgcmVsYXRpdmUgcGF0aCkgc3RhcnRpbmcgZnJvbVxuICogYmFzZS5cbiAqL1xuZnVuY3Rpb24gbWtkaXJwKGJhc2U6IHN0cmluZywgc3ViZGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgc3RlcHMgPSBzdWJkaXIuc3BsaXQocGF0aC5zZXApO1xuICBsZXQgY3VycmVudCA9IGJhc2U7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICBjdXJyZW50ID0gcGF0aC5qb2luKGN1cnJlbnQsIHN0ZXBzW2ldKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoY3VycmVudCkpIGZzLm1rZGlyU3luYyhjdXJyZW50KTtcbiAgfVxufVxuXG5cbi8qKlxuICogUmVzb2x2ZSBtb2R1bGUgZmlsZW5hbWVzIGZvciBKUyBtb2R1bGVzLlxuICpcbiAqIEpTIG1vZHVsZSByZXNvbHV0aW9uIG5lZWRzIHRvIGJlIGRpZmZlcmVudCBiZWNhdXNlIHdoZW4gdHJhbnNwaWxpbmcgSlMgd2VcbiAqIGRvIG5vdCBwYXNzIGluIGFueSBkZXBlbmRlbmNpZXMsIHNvIHRoZSBUUyBtb2R1bGUgcmVzb2x2ZXIgd2lsbCBub3QgcmVzb2x2ZVxuICogYW55IGZpbGVzLlxuICpcbiAqIEZvcnR1bmF0ZWx5LCBKUyBtb2R1bGUgcmVzb2x1dGlvbiBpcyB2ZXJ5IHNpbXBsZS4gVGhlIGltcG9ydGVkIG1vZHVsZSBuYW1lXG4gKiBtdXN0IGVpdGhlciBhIHJlbGF0aXZlIHBhdGgsIG9yIHRoZSB3b3Jrc3BhY2Ugcm9vdCAoaS5lLiAnZ29vZ2xlMycpLFxuICogc28gd2UgY2FuIHBlcmZvcm0gbW9kdWxlIHJlc29sdXRpb24gZW50aXJlbHkgYmFzZWQgb24gZmlsZSBuYW1lcywgd2l0aG91dFxuICogbG9va2luZyBhdCB0aGUgZmlsZXN5c3RlbS5cbiAqL1xuZnVuY3Rpb24gbWFrZUpzTW9kdWxlUmVzb2x2ZXIod29ya3NwYWNlTmFtZTogc3RyaW5nKSB7XG4gIC8vIFRoZSBsaXRlcmFsICcvJyBoZXJlIGlzIGNyb3NzLXBsYXRmb3JtIHNhZmUgYmVjYXVzZSBpdCdzIG1hdGNoaW5nIG9uXG4gIC8vIGltcG9ydCBzcGVjaWZpZXJzLCBub3QgZmlsZSBuYW1lcy5cbiAgY29uc3Qgd29ya3NwYWNlTW9kdWxlU3BlY2lmaWVyUHJlZml4ID0gYCR7d29ya3NwYWNlTmFtZX0vYDtcbiAgY29uc3Qgd29ya3NwYWNlRGlyID0gYCR7cGF0aC5zZXB9JHt3b3Jrc3BhY2VOYW1lfSR7cGF0aC5zZXB9YDtcbiAgZnVuY3Rpb24ganNNb2R1bGVSZXNvbHZlcihcbiAgICAgIG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyxcbiAgICAgIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBob3N0OiB0cy5Nb2R1bGVSZXNvbHV0aW9uSG9zdCk6XG4gICAgICB0cy5SZXNvbHZlZE1vZHVsZVdpdGhGYWlsZWRMb29rdXBMb2NhdGlvbnMge1xuICAgIGxldCByZXNvbHZlZEZpbGVOYW1lO1xuICAgIGlmIChjb250YWluaW5nRmlsZSA9PT0gJycpIHtcbiAgICAgIC8vIEluIHRzaWNrbGUgd2UgcmVzb2x2ZSB0aGUgZmlsZW5hbWUgYWdhaW5zdCAnJyB0byBnZXQgdGhlIGdvb2cgbW9kdWxlXG4gICAgICAvLyBuYW1lIG9mIGEgc291cmNlZmlsZS5cbiAgICAgIHJlc29sdmVkRmlsZU5hbWUgPSBtb2R1bGVOYW1lO1xuICAgIH0gZWxzZSBpZiAobW9kdWxlTmFtZS5zdGFydHNXaXRoKHdvcmtzcGFjZU1vZHVsZVNwZWNpZmllclByZWZpeCkpIHtcbiAgICAgIC8vIEdpdmVuIGEgd29ya3NwYWNlIG5hbWUgb2YgJ2ZvbycsIHdlIHdhbnQgdG8gcmVzb2x2ZSBpbXBvcnQgc3BlY2lmaWVyc1xuICAgICAgLy8gbGlrZTogJ2Zvby9wcm9qZWN0L2ZpbGUuanMnIHRvIHRoZSBhYnNvbHV0ZSBmaWxlc3lzdGVtIHBhdGggb2ZcbiAgICAgIC8vIHByb2plY3QvZmlsZS5qcyB3aXRoaW4gdGhlIHdvcmtzcGFjZS5cbiAgICAgIGNvbnN0IHdvcmtzcGFjZURpckxvY2F0aW9uID0gY29udGFpbmluZ0ZpbGUuaW5kZXhPZih3b3Jrc3BhY2VEaXIpO1xuICAgICAgaWYgKHdvcmtzcGFjZURpckxvY2F0aW9uIDwgMCkge1xuICAgICAgICByZXR1cm4ge3Jlc29sdmVkTW9kdWxlOiB1bmRlZmluZWR9O1xuICAgICAgfVxuICAgICAgY29uc3QgYWJzb2x1dGVQYXRoVG9Xb3Jrc3BhY2VEaXIgPVxuICAgICAgICAgIGNvbnRhaW5pbmdGaWxlLnNsaWNlKDAsIHdvcmtzcGFjZURpckxvY2F0aW9uKTtcbiAgICAgIHJlc29sdmVkRmlsZU5hbWUgPSBwYXRoLmpvaW4oYWJzb2x1dGVQYXRoVG9Xb3Jrc3BhY2VEaXIsIG1vZHVsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIW1vZHVsZU5hbWUuc3RhcnRzV2l0aCgnLi8nKSAmJiAhbW9kdWxlTmFtZS5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgVW5zdXBwb3J0ZWQgbW9kdWxlIGltcG9ydCBzcGVjaWZpZXI6ICR7XG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkobW9kdWxlTmFtZSl9LlxcbmAgK1xuICAgICAgICAgICAgYEpTIG1vZHVsZSBpbXBvcnRzIG11c3QgZWl0aGVyIGJlIHJlbGF0aXZlIHBhdGhzIGAgK1xuICAgICAgICAgICAgYChiZWdpbm5pbmcgd2l0aCAnLicgb3IgJy4uJyksIGAgK1xuICAgICAgICAgICAgYG9yIHRoZXkgbXVzdCBiZWdpbiB3aXRoICcke3dvcmtzcGFjZU5hbWV9LycuYCk7XG4gICAgICB9XG4gICAgICByZXNvbHZlZEZpbGVOYW1lID0gcGF0aC5qb2luKHBhdGguZGlybmFtZShjb250YWluaW5nRmlsZSksIG1vZHVsZU5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgcmVzb2x2ZWRNb2R1bGU6IHtcbiAgICAgICAgcmVzb2x2ZWRGaWxlTmFtZSxcbiAgICAgICAgZXh0ZW5zaW9uOiB0cy5FeHRlbnNpb24uSnMsICAvLyBqcyBjYW4gb25seSBpbXBvcnQganNcbiAgICAgICAgLy8gVGhlc2UgdHdvIGZpZWxkcyBhcmUgY2FyZ28gY3VsdGVkIGZyb20gd2hhdCB0cy5yZXNvbHZlTW9kdWxlTmFtZVxuICAgICAgICAvLyBzZWVtcyB0byByZXR1cm4uXG4gICAgICAgIHBhY2thZ2VJZDogdW5kZWZpbmVkLFxuICAgICAgICBpc0V4dGVybmFsTGlicmFyeUltcG9ydDogZmFsc2UsXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBqc01vZHVsZVJlc29sdmVyO1xufVxuXG5cbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICAvLyBEbyBub3QgY2FsbCBwcm9jZXNzLmV4aXQoKSwgYXMgdGhhdCB0ZXJtaW5hdGVzIHRoZSBiaW5hcnkgYmVmb3JlXG4gIC8vIGNvbXBsZXRpbmcgcGVuZGluZyBvcGVyYXRpb25zLCBzdWNoIGFzIHdyaXRpbmcgdG8gc3Rkb3V0IG9yIGVtaXR0aW5nIHRoZVxuICAvLyB2OCBwZXJmb3JtYW5jZSBsb2cuIFJhdGhlciwgc2V0IHRoZSBleGl0IGNvZGUgYW5kIGZhbGwgb2ZmIHRoZSBtYWluXG4gIC8vIHRocmVhZCwgd2hpY2ggd2lsbCBjYXVzZSBub2RlIHRvIHRlcm1pbmF0ZSBjbGVhbmx5LlxuICBwcm9jZXNzLmV4aXRDb2RlID0gbWFpbihwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpO1xufVxuIl19