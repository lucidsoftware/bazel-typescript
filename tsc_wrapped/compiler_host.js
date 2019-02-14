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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs", "path", "typescript", "./perf_trace", "./worker"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs = require("fs");
    var path = require("path");
    var ts = require("typescript");
    var perfTrace = require("./perf_trace");
    var worker_1 = require("./worker");
    function narrowTsOptions(options) {
        if (!options.rootDirs) {
            throw new Error("compilerOptions.rootDirs should be set by tsconfig.bzl");
        }
        if (!options.rootDir) {
            throw new Error("compilerOptions.rootDirs should be set by tsconfig.bzl");
        }
        if (!options.outDir) {
            throw new Error("compilerOptions.rootDirs should be set by tsconfig.bzl");
        }
        return options;
    }
    exports.narrowTsOptions = narrowTsOptions;
    function validateBazelOptions(bazelOpts) {
        if (!bazelOpts.isJsTranspilation)
            return;
        if (bazelOpts.compilationTargetSrc &&
            bazelOpts.compilationTargetSrc.length > 1) {
            throw new Error("In JS transpilation mode, only one file can appear in " +
                "bazelOptions.compilationTargetSrc.");
        }
        if (!bazelOpts.transpiledJsOutputFileName) {
            throw new Error("In JS transpilation mode, transpiledJsOutputFileName " +
                "must be specified in tsconfig.");
        }
    }
    var SOURCE_EXT = /((\.d)?\.tsx?|\.js)$/;
    /**
     * CompilerHost that knows how to cache parsed files to improve compile times.
     */
    var CompilerHost = /** @class */ (function () {
        function CompilerHost(inputFiles, options, bazelOpts, delegate, fileLoader, moduleResolver) {
            if (moduleResolver === void 0) { moduleResolver = ts.resolveModuleName; }
            var _this = this;
            this.inputFiles = inputFiles;
            this.bazelOpts = bazelOpts;
            this.delegate = delegate;
            this.fileLoader = fileLoader;
            this.moduleResolver = moduleResolver;
            /**
             * Lookup table to answer file stat's without looking on disk.
             */
            this.knownFiles = new Set();
            this.moduleResolutionHost = this;
            // TODO(evanm): delete this once tsickle is updated.
            this.host = this;
            this.allowActionInputReads = true;
            this.options = narrowTsOptions(options);
            this.relativeRoots =
                this.options.rootDirs.map(function (r) { return path.relative(_this.options.rootDir, r); });
            inputFiles.forEach(function (f) {
                _this.knownFiles.add(f);
            });
            // getCancelationToken is an optional method on the delegate. If we
            // unconditionally implement the method, we will be forced to return null,
            // in the absense of the delegate method. That won't match the return type.
            // Instead, we optionally set a function to a field with the same name.
            if (delegate && delegate.getCancellationToken) {
                this.getCancelationToken = delegate.getCancellationToken.bind(delegate);
            }
            // Override directoryExists so that TypeScript can automatically
            // include global typings from node_modules/@types
            // see getAutomaticTypeDirectiveNames in
            // TypeScript:src/compiler/moduleNameResolver
            if (this.allowActionInputReads && delegate && delegate.directoryExists) {
                this.directoryExists = delegate.directoryExists.bind(delegate);
            }
            validateBazelOptions(bazelOpts);
            this.googmodule = bazelOpts.googmodule;
            this.es5Mode = bazelOpts.es5Mode;
            this.prelude = bazelOpts.prelude;
            this.untyped = bazelOpts.untyped;
            this.typeBlackListPaths = new Set(bazelOpts.typeBlackListPaths);
            this.transformDecorators = bazelOpts.tsickle;
            this.transformTypesToClosure = bazelOpts.tsickle;
            this.addDtsClutzAliases = bazelOpts.addDtsClutzAliases;
            this.isJsTranspilation = Boolean(bazelOpts.isJsTranspilation);
            this.provideExternalModuleDtsNamespace = !bazelOpts.hasImplementation;
        }
        /**
         * For the given potentially absolute input file path (typically .ts), returns
         * the relative output path. For example, for
         * /path/to/root/blaze-out/k8-fastbuild/genfiles/my/file.ts, will return
         * my/file.js or my/file.closure.js (depending on ES5 mode).
         */
        CompilerHost.prototype.relativeOutputPath = function (fileName) {
            var result = this.rootDirsRelative(fileName);
            result = result.replace(/(\.d)?\.[jt]sx?$/, '');
            if (!this.bazelOpts.es5Mode)
                result += '.closure';
            return result + '.js';
        };
        /**
         * Workaround https://github.com/Microsoft/TypeScript/issues/8245
         * We use the `rootDirs` property both for module resolution,
         * and *also* to flatten the structure of the output directory
         * (as `rootDir` would do for a single root).
         * To do this, look for the pattern outDir/relativeRoots[i]/path/to/file
         * or relativeRoots[i]/path/to/file
         * and replace that with path/to/file
         */
        CompilerHost.prototype.flattenOutDir = function (fileName) {
            var e_1, _a;
            var result = fileName;
            // outDir/relativeRoots[i]/path/to/file -> relativeRoots[i]/path/to/file
            if (fileName.startsWith(this.options.rootDir)) {
                result = path.relative(this.options.outDir, fileName);
            }
            try {
                for (var _b = __values(this.relativeRoots), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var dir = _c.value;
                    // relativeRoots[i]/path/to/file -> path/to/file
                    var rel = path.relative(dir, result);
                    if (!rel.startsWith('..')) {
                        result = rel;
                        // relativeRoots is sorted longest first so we can short-circuit
                        // after the first match
                        break;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return result;
        };
        /** Avoid using tsickle on files that aren't in srcs[] */
        CompilerHost.prototype.shouldSkipTsickleProcessing = function (fileName) {
            return this.bazelOpts.isJsTranspilation ||
                this.bazelOpts.compilationTargetSrc.indexOf(fileName) === -1;
        };
        /** Whether the file is expected to be imported using a named module */
        CompilerHost.prototype.shouldNameModule = function (fileName) {
            return this.bazelOpts.compilationTargetSrc.indexOf(fileName) !== -1;
        };
        /** Allows suppressing warnings for specific known libraries */
        CompilerHost.prototype.shouldIgnoreWarningsForPath = function (filePath) {
            return this.bazelOpts.ignoreWarningPaths.some(function (p) { return !!filePath.match(new RegExp(p)); });
        };
        /**
         * fileNameToModuleId gives the module ID for an input source file name.
         * @param fileName an input source file name, e.g.
         *     /root/dir/bazel-out/host/bin/my/file.ts.
         * @return the canonical path of a file within blaze, without /genfiles/ or
         *     /bin/ path parts, excluding a file extension. For example, "my/file".
         */
        CompilerHost.prototype.fileNameToModuleId = function (fileName) {
            return this.relativeOutputPath(fileName.substring(0, fileName.lastIndexOf('.')));
        };
        /**
         * TypeScript SourceFile's have a path with the rootDirs[i] still present, eg.
         * /build/work/bazel-out/local-fastbuild/bin/path/to/file
         * @return the path without any rootDirs, eg. path/to/file
         */
        CompilerHost.prototype.rootDirsRelative = function (fileName) {
            var e_2, _a;
            try {
                for (var _b = __values(this.options.rootDirs), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var root = _c.value;
                    if (fileName.startsWith(root)) {
                        // rootDirs are sorted longest-first, so short-circuit the iteration
                        // see tsconfig.ts.
                        return path.posix.relative(root, fileName);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return fileName;
        };
        /**
         * Massages file names into valid goog.module names:
         * - resolves relative paths to the given context
         * - resolves non-relative paths which takes module_root into account
         * - replaces '/' with '.' in the '<workspace>' namespace
         * - replace first char if non-alpha
         * - replace subsequent non-alpha numeric chars
         */
        CompilerHost.prototype.pathToModuleName = function (context, importPath) {
            // tsickle hands us an output path, we need to map it back to a source
            // path in order to do module resolution with it.
            // outDir/relativeRoots[i]/path/to/file ->
            // rootDir/relativeRoots[i]/path/to/file
            if (context.startsWith(this.options.outDir)) {
                context = path.join(this.options.rootDir, path.relative(this.options.outDir, context));
            }
            // Try to get the resolved path name from TS compiler host which can
            // handle resolution for libraries with module_root like rxjs and @angular.
            var resolvedPath = null;
            var resolved = this.moduleResolver(importPath, context, this.options, this);
            if (resolved && resolved.resolvedModule &&
                resolved.resolvedModule.resolvedFileName) {
                resolvedPath = resolved.resolvedModule.resolvedFileName;
                // /build/work/bazel-out/local-fastbuild/bin/path/to/file ->
                // path/to/file
                resolvedPath = this.rootDirsRelative(resolvedPath);
            }
            else {
                // importPath can be an absolute file path in google3.
                // Try to trim it as a path relative to bin and genfiles, and if so,
                // handle its file extension in the block below and prepend the workspace
                // name.
                var trimmed = this.rootDirsRelative(importPath);
                if (trimmed !== importPath) {
                    resolvedPath = trimmed;
                }
            }
            if (resolvedPath) {
                // Strip file extensions.
                importPath = resolvedPath.replace(SOURCE_EXT, '');
                // Make sure all module names include the workspace name.
                if (importPath.indexOf(this.bazelOpts.workspaceName) !== 0) {
                    importPath = path.posix.join(this.bazelOpts.workspaceName, importPath);
                }
            }
            // Remove the __{LOCALE} from the module name.
            if (this.bazelOpts.locale) {
                var suffix = '__' + this.bazelOpts.locale.toLowerCase();
                if (importPath.toLowerCase().endsWith(suffix)) {
                    importPath = importPath.substring(0, importPath.length - suffix.length);
                }
            }
            // Replace characters not supported by goog.module and '.' with
            // '$<Hex char code>' so that the original module name can be re-obtained
            // without any loss.
            // See goog.VALID_MODULE_RE_ in Closure's base.js for characters supported
            // by google.module.
            var escape = function (c) {
                return '$' + c.charCodeAt(0).toString(16);
            };
            var moduleName = importPath.replace(/^[^a-zA-Z_/]/, '_')
                .replace(/[^a-zA-Z_0-9_/.]/g, '_')
                .replace(/\//g, '.')
                .replace(/lucid\.cake\.node_modules\.(.*?([^.]+))\.\2$/, '$1')
                .replace(/lucid\.cake\.node_modules\./, '')
                .replace(/lucid\.external\.closure_types\.google_closure_library_modules\.[ab]\./, '')
                .replace(/\.index$/, '')
                .replace(/lucid\.cake\.app\.webroot\.ts\./, '_lucid.');
            return moduleName;
        };
        /**
         * Converts file path into a valid AMD module name.
         *
         * An AMD module can have an arbitrary name, so that it is require'd by name
         * rather than by path. See http://requirejs.org/docs/whyamd.html#namedmodules
         *
         * "However, tools that combine multiple modules together for performance need
         *  a way to give names to each module in the optimized file. For that, AMD
         *  allows a string as the first argument to define()"
         */
        CompilerHost.prototype.amdModuleName = function (sf) {
            if (!this.shouldNameModule(sf.fileName))
                return undefined;
            // /build/work/bazel-out/local-fastbuild/bin/path/to/file.ts
            // -> path/to/file
            var fileName = this.rootDirsRelative(sf.fileName).replace(SOURCE_EXT, '');
            var workspace = this.bazelOpts.workspaceName;
            // Workaround https://github.com/bazelbuild/bazel/issues/1262
            //
            // When the file comes from an external bazel repository,
            // and TypeScript resolves runfiles symlinks, then the path will look like
            // output_base/execroot/local_repo/external/another_repo/foo/bar
            // We want to name such a module "another_repo/foo/bar" just as it would be
            // named by code in that repository.
            // As a workaround, check for the /external/ path segment, and fix up the
            // workspace name to be the name of the external repository.
            if (fileName.startsWith('external/')) {
                var parts = fileName.split('/');
                workspace = parts[1];
                fileName = parts.slice(2).join('/');
            }
            if (this.bazelOpts.moduleName) {
                var relativeFileName = path.posix.relative(this.bazelOpts.package, fileName);
                if (!relativeFileName.startsWith('..')) {
                    if (this.bazelOpts.moduleRoot &&
                        this.bazelOpts.moduleRoot.replace(SOURCE_EXT, '') ===
                            relativeFileName) {
                        return this.bazelOpts.moduleName;
                    }
                    // Support the common case of commonjs convention that index is the
                    // default module in a directory.
                    // This makes our module naming scheme more conventional and lets users
                    // refer to modules with the natural name they're used to.
                    if (relativeFileName === 'index') {
                        return this.bazelOpts.moduleName;
                    }
                    return path.posix.join(this.bazelOpts.moduleName, relativeFileName);
                }
            }
            // path/to/file ->
            // myWorkspace/path/to/file
            return path.posix.join(workspace, fileName);
        };
        /**
         * Resolves the typings file from a package at the specified path. Helper
         * function to `resolveTypeReferenceDirectives`.
         */
        CompilerHost.prototype.resolveTypingFromDirectory = function (typePath, primary) {
            // Looks for the `typings` attribute in a package.json file
            // if it exists
            var pkgFile = path.posix.join(typePath, 'package.json');
            if (this.fileExists(pkgFile)) {
                var pkg = JSON.parse(fs.readFileSync(pkgFile, 'UTF-8'));
                var typings = pkg['typings'];
                if (typings) {
                    if (typings === '.' || typings === './') {
                        typings = 'index.d.ts';
                    }
                    var maybe_1 = path.posix.join(typePath, typings);
                    if (this.fileExists(maybe_1)) {
                        return { primary: primary, resolvedFileName: maybe_1 };
                    }
                }
            }
            // Look for an index.d.ts file in the path
            var maybe = path.posix.join(typePath, 'index.d.ts');
            if (this.fileExists(maybe)) {
                return { primary: primary, resolvedFileName: maybe };
            }
            return undefined;
        };
        /**
         * Override the default typescript resolveTypeReferenceDirectives function.
         * Resolves /// <reference types="x" /> directives under bazel. The default
         * typescript secondary search behavior needs to be overridden to support
         * looking under `bazelOpts.nodeModulesPrefix`
         */
        CompilerHost.prototype.resolveTypeReferenceDirectives = function (names, containingFile) {
            var _this = this;
            if (!this.allowActionInputReads)
                return [];
            var result = [];
            names.forEach(function (name) {
                var resolved;
                // primary search
                _this.options.typeRoots.forEach(function (typeRoot) {
                    if (!resolved) {
                        resolved = _this.resolveTypingFromDirectory(path.posix.join(typeRoot, name), true);
                    }
                });
                // secondary search
                if (!resolved) {
                    resolved = _this.resolveTypingFromDirectory(path.posix.join(_this.bazelOpts.nodeModulesPrefix, name), false);
                }
                // Types not resolved should be silently ignored. Leave it to Typescript
                // to either error out with "TS2688: Cannot find type definition file for
                // 'foo'" or for the build to fail due to a missing type that is used.
                if (!resolved) {
                    if (worker_1.DEBUG) {
                        worker_1.debug("Failed to resolve type reference directive '" + name + "'");
                    }
                    return;
                }
                // In typescript 2.x the return type for this function
                // is `(ts.ResolvedTypeReferenceDirective | undefined)[]` thus we actually
                // do allow returning `undefined` in the array but the function is typed
                // `(ts.ResolvedTypeReferenceDirective)[]` to compile with both typescript
                // 2.x and 3.0/3.1 without error. Typescript 3.0/3.1 do handle the `undefined`
                // values in the array correctly despite the return signature.
                // It looks like the return type change was a mistake because
                // it was changed back to include `| undefined` recently:
                // https://github.com/Microsoft/TypeScript/pull/28059.
                result.push(resolved);
            });
            return result;
        };
        /** Loads a source file from disk (or the cache). */
        CompilerHost.prototype.getSourceFile = function (fileName, languageVersion, onError) {
            var _this = this;
            return perfTrace.wrap("getSourceFile " + fileName, function () {
                var sf = _this.fileLoader.loadFile(fileName, fileName, languageVersion);
                if (!/\.d\.tsx?$/.test(fileName) &&
                    (_this.options.module === ts.ModuleKind.AMD ||
                        _this.options.module === ts.ModuleKind.UMD)) {
                    var moduleName = _this.amdModuleName(sf);
                    if (sf.moduleName === moduleName || !moduleName)
                        return sf;
                    if (sf.moduleName) {
                        throw new Error("ERROR: " + sf.fileName + " " +
                            ("contains a module name declaration " + sf.moduleName + " ") +
                            ("which would be overwritten with " + moduleName + " ") +
                            "by Bazel's TypeScript compiler.");
                    }
                    // Setting the moduleName is equivalent to the original source having a
                    // ///<amd-module name="some/name"/> directive
                    sf.moduleName = moduleName;
                }
                return sf;
            });
        };
        CompilerHost.prototype.writeFile = function (fileName, content, writeByteOrderMark, onError, sourceFiles) {
            var _this = this;
            perfTrace.wrap("writeFile " + fileName, function () { return _this.writeFileImpl(fileName, content, writeByteOrderMark, onError, sourceFiles); });
        };
        CompilerHost.prototype.writeFileImpl = function (fileName, content, writeByteOrderMark, onError, sourceFiles) {
            // Workaround https://github.com/Microsoft/TypeScript/issues/18648
            // This bug is fixed in TS 2.9
            var version = ts.versionMajorMinor;
            var _a = __read(version.split('.').map(function (s) { return Number(s); }), 2), major = _a[0], minor = _a[1];
            var workaroundNeeded = major <= 2 && minor <= 8;
            if (workaroundNeeded &&
                (this.options.module === ts.ModuleKind.AMD ||
                    this.options.module === ts.ModuleKind.UMD) &&
                fileName.endsWith('.d.ts') && sourceFiles && sourceFiles.length > 0 &&
                sourceFiles[0].moduleName) {
                content =
                    "/// <amd-module name=\"" + sourceFiles[0].moduleName + "\" />\n" + content;
            }
            fileName = this.flattenOutDir(fileName);
            if (this.bazelOpts.isJsTranspilation) {
                fileName = this.bazelOpts.transpiledJsOutputFileName;
            }
            else if (!this.bazelOpts.es5Mode) {
                // Write ES6 transpiled files to *.closure.js.
                if (this.bazelOpts.locale) {
                    // i18n paths are required to end with __locale.js so we put
                    // the .closure segment before the __locale
                    fileName = fileName.replace(/(__[^\.]+)?\.js$/, '.closure$1.js');
                }
                else {
                    fileName = fileName.replace(/\.js$/, '.closure.js');
                }
            }
            // Prepend the output directory.
            fileName = path.join(this.options.outDir, fileName);
            // Our file cache is based on mtime - so avoid writing files if they
            // did not change.
            if (!fs.existsSync(fileName) ||
                fs.readFileSync(fileName, 'utf-8') !== content) {
                this.delegate.writeFile(fileName, content, writeByteOrderMark, onError, sourceFiles);
            }
        };
        /**
         * Performance optimization: don't try to stat files we weren't explicitly
         * given as inputs.
         * This also allows us to disable Bazel sandboxing, without accidentally
         * reading .ts inputs when .d.ts inputs are intended.
         * Note that in worker mode, the file cache will also guard against arbitrary
         * file reads.
         */
        CompilerHost.prototype.fileExists = function (filePath) {
            // Under Bazel, users do not declare deps[] on their node_modules.
            // This means that we do not list all the needed .d.ts files in the files[]
            // section of tsconfig.json, and that is what populates the knownFiles set.
            // In addition, the node module resolver may need to read package.json files
            // and these are not permitted in the files[] section.
            // So we permit reading node_modules/* from action inputs, even though this
            // can include data[] dependencies and is broader than we would like.
            // This should only be enabled under Bazel, not Blaze.
            if (this.allowActionInputReads && filePath.indexOf('/node_modules/') >= 0) {
                var result = this.fileLoader.fileExists(filePath);
                if (worker_1.DEBUG && !result && this.delegate.fileExists(filePath)) {
                    worker_1.debug("Path exists, but is not registered in the cache", filePath);
                    Object.keys(this.fileLoader.cache.lastDigests).forEach(function (k) {
                        if (k.endsWith(path.basename(filePath))) {
                            worker_1.debug("  Maybe you meant to load from", k);
                        }
                    });
                }
                return result;
            }
            return this.knownFiles.has(filePath);
        };
        CompilerHost.prototype.getDefaultLibLocation = function () {
            // Since we override getDefaultLibFileName below, we must also provide the
            // directory containing the file.
            // Otherwise TypeScript looks in C:\lib.xxx.d.ts for the default lib.
            return path.dirname(this.getDefaultLibFileName({ target: ts.ScriptTarget.ES5 }));
        };
        CompilerHost.prototype.getDefaultLibFileName = function (options) {
            if (this.bazelOpts.nodeModulesPrefix) {
                return path.join(this.bazelOpts.nodeModulesPrefix, 'typescript/lib', ts.getDefaultLibFileName({ target: ts.ScriptTarget.ES5 }));
            }
            return this.delegate.getDefaultLibFileName(options);
        };
        CompilerHost.prototype.realpath = function (s) {
            // tsc-wrapped relies on string matching of file paths for things like the
            // file cache and for strict deps checking.
            // TypeScript will try to resolve symlinks during module resolution which
            // makes our checks fail: the path we resolved as an input isn't the same
            // one the module resolver will look for.
            // See https://github.com/Microsoft/TypeScript/pull/12020
            // So we simply turn off symlink resolution.
            return s;
        };
        // Delegate everything else to the original compiler host.
        CompilerHost.prototype.getCanonicalFileName = function (path) {
            return this.delegate.getCanonicalFileName(path);
        };
        CompilerHost.prototype.getCurrentDirectory = function () {
            return this.delegate.getCurrentDirectory();
        };
        CompilerHost.prototype.useCaseSensitiveFileNames = function () {
            return this.delegate.useCaseSensitiveFileNames();
        };
        CompilerHost.prototype.getNewLine = function () {
            return this.delegate.getNewLine();
        };
        CompilerHost.prototype.getDirectories = function (path) {
            return this.delegate.getDirectories(path);
        };
        CompilerHost.prototype.readFile = function (fileName) {
            return this.delegate.readFile(fileName);
        };
        CompilerHost.prototype.trace = function (s) {
            console.error(s);
        };
        return CompilerHost;
    }());
    exports.CompilerHost = CompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL3RzY193cmFwcGVkL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBLHVCQUF5QjtJQUN6QiwyQkFBNkI7SUFFN0IsK0JBQWlDO0lBR2pDLHdDQUEwQztJQUUxQyxtQ0FBc0M7SUFrQnRDLFNBQWdCLGVBQWUsQ0FBQyxPQUEyQjtRQUN6RCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRTtZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7U0FDM0U7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7U0FDM0U7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7U0FDM0U7UUFDRCxPQUFPLE9BQXlCLENBQUM7SUFDbkMsQ0FBQztJQVhELDBDQVdDO0lBRUQsU0FBUyxvQkFBb0IsQ0FBQyxTQUF1QjtRQUNuRCxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQjtZQUFFLE9BQU87UUFFekMsSUFBSSxTQUFTLENBQUMsb0JBQW9CO1lBQzlCLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdEO2dCQUN4RCxvQ0FBb0MsQ0FBQyxDQUFDO1NBQ3ZEO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFBRTtZQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RDtnQkFDdkQsZ0NBQWdDLENBQUMsQ0FBQztTQUNuRDtJQUNILENBQUM7SUFFRCxJQUFN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O1lBQzVDLE9BQU8sQ0FBQyxDQUFDO1FBQ1gsQ0FBQztRQUVELDBEQUEwRDtRQUUxRCwyQ0FBb0IsR0FBcEIsVUFBcUIsSUFBWTtZQUMvQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELDBDQUFtQixHQUFuQjtZQUNFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzdDLENBQUM7UUFFRCxnREFBeUIsR0FBekI7WUFDRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsQ0FBQztRQUNuRCxDQUFDO1FBRUQsaUNBQVUsR0FBVjtZQUNFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNwQyxDQUFDO1FBRUQscUNBQWMsR0FBZCxVQUFlLElBQVk7WUFDekIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsK0JBQVEsR0FBUixVQUFTLFFBQWdCO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUVELDRCQUFLLEdBQUwsVUFBTSxDQUFTO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixDQUFDO1FBQ0gsbUJBQUM7SUFBRCxDQUFDLEFBNWhCRCxJQTRoQkM7SUE1aEJZLG9DQUFZIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzaWNrbGUgZnJvbSAndHNpY2tsZSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtGaWxlTG9hZGVyfSBmcm9tICcuL2NhY2hlJztcbmltcG9ydCAqIGFzIHBlcmZUcmFjZSBmcm9tICcuL3BlcmZfdHJhY2UnO1xuaW1wb3J0IHtCYXplbE9wdGlvbnN9IGZyb20gJy4vdHNjb25maWcnO1xuaW1wb3J0IHtERUJVRywgZGVidWd9IGZyb20gJy4vd29ya2VyJztcblxuZXhwb3J0IHR5cGUgTW9kdWxlUmVzb2x2ZXIgPVxuICAgIChtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcsXG4gICAgIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBob3N0OiB0cy5Nb2R1bGVSZXNvbHV0aW9uSG9zdCkgPT5cbiAgICAgICAgdHMuUmVzb2x2ZWRNb2R1bGVXaXRoRmFpbGVkTG9va3VwTG9jYXRpb25zO1xuXG4vKipcbiAqIE5hcnJvd3MgZG93biB0aGUgdHlwZSBvZiBzb21lIHByb3BlcnRpZXMgZnJvbSBub24tb3B0aW9uYWwgdG8gcmVxdWlyZWQsIHNvXG4gKiB0aGF0IHdlIGRvIG5vdCBuZWVkIHRvIGNoZWNrIHByZXNlbmNlIGJlZm9yZSBlYWNoIGFjY2Vzcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCYXplbFRzT3B0aW9ucyBleHRlbmRzIHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIHJvb3REaXJzOiBzdHJpbmdbXTtcbiAgcm9vdERpcjogc3RyaW5nO1xuICBvdXREaXI6IHN0cmluZztcbiAgdHlwZVJvb3RzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5hcnJvd1RzT3B0aW9ucyhvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBCYXplbFRzT3B0aW9ucyB7XG4gIGlmICghb3B0aW9ucy5yb290RGlycykge1xuICAgIHRocm93IG5ldyBFcnJvcihgY29tcGlsZXJPcHRpb25zLnJvb3REaXJzIHNob3VsZCBiZSBzZXQgYnkgdHNjb25maWcuYnpsYCk7XG4gIH1cbiAgaWYgKCFvcHRpb25zLnJvb3REaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGNvbXBpbGVyT3B0aW9ucy5yb290RGlycyBzaG91bGQgYmUgc2V0IGJ5IHRzY29uZmlnLmJ6bGApO1xuICB9XG4gIGlmICghb3B0aW9ucy5vdXREaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGNvbXBpbGVyT3B0aW9ucy5yb290RGlycyBzaG91bGQgYmUgc2V0IGJ5IHRzY29uZmlnLmJ6bGApO1xuICB9XG4gIHJldHVybiBvcHRpb25zIGFzIEJhemVsVHNPcHRpb25zO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUJhemVsT3B0aW9ucyhiYXplbE9wdHM6IEJhemVsT3B0aW9ucykge1xuICBpZiAoIWJhemVsT3B0cy5pc0pzVHJhbnNwaWxhdGlvbikgcmV0dXJuO1xuXG4gIGlmIChiYXplbE9wdHMuY29tcGlsYXRpb25UYXJnZXRTcmMgJiZcbiAgICAgIGJhemVsT3B0cy5jb21waWxhdGlvblRhcmdldFNyYy5sZW5ndGggPiAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW4gSlMgdHJhbnNwaWxhdGlvbiBtb2RlLCBvbmx5IG9uZSBmaWxlIGNhbiBhcHBlYXIgaW4gXCIgK1xuICAgICAgICAgICAgICAgICAgICBcImJhemVsT3B0aW9ucy5jb21waWxhdGlvblRhcmdldFNyYy5cIik7XG4gIH1cblxuICBpZiAoIWJhemVsT3B0cy50cmFuc3BpbGVkSnNPdXRwdXRGaWxlTmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkluIEpTIHRyYW5zcGlsYXRpb24gbW9kZSwgdHJhbnNwaWxlZEpzT3V0cHV0RmlsZU5hbWUgXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIm11c3QgYmUgc3BlY2lmaWVkIGluIHRzY29uZmlnLlwiKTtcbiAgfVxufVxuXG5jb25zdCBTT1VSQ0VfRVhUID0gLygoXFwuZCk/XFwudHN4P3xcXC5qcykkLztcblxuLyoqXG4gKiBDb21waWxlckhvc3QgdGhhdCBrbm93cyBob3cgdG8gY2FjaGUgcGFyc2VkIGZpbGVzIHRvIGltcHJvdmUgY29tcGlsZSB0aW1lcy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBpbGVySG9zdCBpbXBsZW1lbnRzIHRzLkNvbXBpbGVySG9zdCwgdHNpY2tsZS5Uc2lja2xlSG9zdCB7XG4gIC8qKlxuICAgKiBMb29rdXAgdGFibGUgdG8gYW5zd2VyIGZpbGUgc3RhdCdzIHdpdGhvdXQgbG9va2luZyBvbiBkaXNrLlxuICAgKi9cbiAgcHJpdmF0ZSBrbm93bkZpbGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgLyoqXG4gICAqIHJvb3REaXJzIHJlbGF0aXZlIHRvIHRoZSByb290RGlyLCBlZyBcImJhemVsLW91dC9sb2NhbC1mYXN0YnVpbGQvYmluXCJcbiAgICovXG4gIHByaXZhdGUgcmVsYXRpdmVSb290czogc3RyaW5nW107XG5cbiAgZ2V0Q2FuY2VsYXRpb25Ub2tlbj86ICgpID0+IHRzLkNhbmNlbGxhdGlvblRva2VuO1xuICBkaXJlY3RvcnlFeGlzdHM/OiAoZGlyOiBzdHJpbmcpID0+IGJvb2xlYW47XG5cbiAgZ29vZ21vZHVsZTogYm9vbGVhbjtcbiAgZXM1TW9kZTogYm9vbGVhbjtcbiAgcHJlbHVkZTogc3RyaW5nO1xuICB1bnR5cGVkOiBib29sZWFuO1xuICB0eXBlQmxhY2tMaXN0UGF0aHM6IFNldDxzdHJpbmc+O1xuICB0cmFuc2Zvcm1EZWNvcmF0b3JzOiBib29sZWFuO1xuICB0cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZTogYm9vbGVhbjtcbiAgYWRkRHRzQ2x1dHpBbGlhc2VzOiBib29sZWFuO1xuICBpc0pzVHJhbnNwaWxhdGlvbjogYm9vbGVhbjtcbiAgcHJvdmlkZUV4dGVybmFsTW9kdWxlRHRzTmFtZXNwYWNlOiBib29sZWFuO1xuICBvcHRpb25zOiBCYXplbFRzT3B0aW9ucztcbiAgbW9kdWxlUmVzb2x1dGlvbkhvc3Q6IHRzLk1vZHVsZVJlc29sdXRpb25Ib3N0ID0gdGhpcztcbiAgLy8gVE9ETyhldmFubSk6IGRlbGV0ZSB0aGlzIG9uY2UgdHNpY2tsZSBpcyB1cGRhdGVkLlxuICBob3N0OiB0cy5Nb2R1bGVSZXNvbHV0aW9uSG9zdCA9IHRoaXM7XG4gIHByaXZhdGUgYWxsb3dBY3Rpb25JbnB1dFJlYWRzID0gdHJ1ZTtcblxuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIGlucHV0RmlsZXM6IHN0cmluZ1tdLCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsXG4gICAgICByZWFkb25seSBiYXplbE9wdHM6IEJhemVsT3B0aW9ucywgcHJpdmF0ZSBkZWxlZ2F0ZTogdHMuQ29tcGlsZXJIb3N0LFxuICAgICAgcHJpdmF0ZSBmaWxlTG9hZGVyOiBGaWxlTG9hZGVyLFxuICAgICAgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXIgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZSkge1xuICAgIHRoaXMub3B0aW9ucyA9IG5hcnJvd1RzT3B0aW9ucyhvcHRpb25zKTtcbiAgICB0aGlzLnJlbGF0aXZlUm9vdHMgPVxuICAgICAgICB0aGlzLm9wdGlvbnMucm9vdERpcnMubWFwKHIgPT4gcGF0aC5yZWxhdGl2ZSh0aGlzLm9wdGlvbnMucm9vdERpciwgcikpO1xuICAgIGlucHV0RmlsZXMuZm9yRWFjaCgoZikgPT4ge1xuICAgICAgdGhpcy5rbm93bkZpbGVzLmFkZChmKTtcbiAgICB9KTtcblxuICAgIC8vIGdldENhbmNlbGF0aW9uVG9rZW4gaXMgYW4gb3B0aW9uYWwgbWV0aG9kIG9uIHRoZSBkZWxlZ2F0ZS4gSWYgd2VcbiAgICAvLyB1bmNvbmRpdGlvbmFsbHkgaW1wbGVtZW50IHRoZSBtZXRob2QsIHdlIHdpbGwgYmUgZm9yY2VkIHRvIHJldHVybiBudWxsLFxuICAgIC8vIGluIHRoZSBhYnNlbnNlIG9mIHRoZSBkZWxlZ2F0ZSBtZXRob2QuIFRoYXQgd29uJ3QgbWF0Y2ggdGhlIHJldHVybiB0eXBlLlxuICAgIC8vIEluc3RlYWQsIHdlIG9wdGlvbmFsbHkgc2V0IGEgZnVuY3Rpb24gdG8gYSBmaWVsZCB3aXRoIHRoZSBzYW1lIG5hbWUuXG4gICAgaWYgKGRlbGVnYXRlICYmIGRlbGVnYXRlLmdldENhbmNlbGxhdGlvblRva2VuKSB7XG4gICAgICB0aGlzLmdldENhbmNlbGF0aW9uVG9rZW4gPSBkZWxlZ2F0ZS5nZXRDYW5jZWxsYXRpb25Ub2tlbi5iaW5kKGRlbGVnYXRlKTtcbiAgICB9XG5cbiAgICAvLyBPdmVycmlkZSBkaXJlY3RvcnlFeGlzdHMgc28gdGhhdCBUeXBlU2NyaXB0IGNhbiBhdXRvbWF0aWNhbGx5XG4gICAgLy8gaW5jbHVkZSBnbG9iYWwgdHlwaW5ncyBmcm9tIG5vZGVfbW9kdWxlcy9AdHlwZXNcbiAgICAvLyBzZWUgZ2V0QXV0b21hdGljVHlwZURpcmVjdGl2ZU5hbWVzIGluXG4gICAgLy8gVHlwZVNjcmlwdDpzcmMvY29tcGlsZXIvbW9kdWxlTmFtZVJlc29sdmVyXG4gICAgaWYgKHRoaXMuYWxsb3dBY3Rpb25JbnB1dFJlYWRzICYmIGRlbGVnYXRlICYmIGRlbGVnYXRlLmRpcmVjdG9yeUV4aXN0cykge1xuICAgICAgdGhpcy5kaXJlY3RvcnlFeGlzdHMgPSBkZWxlZ2F0ZS5kaXJlY3RvcnlFeGlzdHMuYmluZChkZWxlZ2F0ZSk7XG4gICAgfVxuXG4gICAgdmFsaWRhdGVCYXplbE9wdGlvbnMoYmF6ZWxPcHRzKTtcbiAgICB0aGlzLmdvb2dtb2R1bGUgPSBiYXplbE9wdHMuZ29vZ21vZHVsZTtcbiAgICB0aGlzLmVzNU1vZGUgPSBiYXplbE9wdHMuZXM1TW9kZTtcbiAgICB0aGlzLnByZWx1ZGUgPSBiYXplbE9wdHMucHJlbHVkZTtcbiAgICB0aGlzLnVudHlwZWQgPSBiYXplbE9wdHMudW50eXBlZDtcbiAgICB0aGlzLnR5cGVCbGFja0xpc3RQYXRocyA9IG5ldyBTZXQoYmF6ZWxPcHRzLnR5cGVCbGFja0xpc3RQYXRocyk7XG4gICAgdGhpcy50cmFuc2Zvcm1EZWNvcmF0b3JzID0gYmF6ZWxPcHRzLnRzaWNrbGU7XG4gICAgdGhpcy50cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZSA9IGJhemVsT3B0cy50c2lja2xlO1xuICAgIHRoaXMuYWRkRHRzQ2x1dHpBbGlhc2VzID0gYmF6ZWxPcHRzLmFkZER0c0NsdXR6QWxpYXNlcztcbiAgICB0aGlzLmlzSnNUcmFuc3BpbGF0aW9uID0gQm9vbGVhbihiYXplbE9wdHMuaXNKc1RyYW5zcGlsYXRpb24pO1xuICAgIHRoaXMucHJvdmlkZUV4dGVybmFsTW9kdWxlRHRzTmFtZXNwYWNlID0gIWJhemVsT3B0cy5oYXNJbXBsZW1lbnRhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgdGhlIGdpdmVuIHBvdGVudGlhbGx5IGFic29sdXRlIGlucHV0IGZpbGUgcGF0aCAodHlwaWNhbGx5IC50cyksIHJldHVybnNcbiAgICogdGhlIHJlbGF0aXZlIG91dHB1dCBwYXRoLiBGb3IgZXhhbXBsZSwgZm9yXG4gICAqIC9wYXRoL3RvL3Jvb3QvYmxhemUtb3V0L2s4LWZhc3RidWlsZC9nZW5maWxlcy9teS9maWxlLnRzLCB3aWxsIHJldHVyblxuICAgKiBteS9maWxlLmpzIG9yIG15L2ZpbGUuY2xvc3VyZS5qcyAoZGVwZW5kaW5nIG9uIEVTNSBtb2RlKS5cbiAgICovXG4gIHJlbGF0aXZlT3V0cHV0UGF0aChmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMucm9vdERpcnNSZWxhdGl2ZShmaWxlTmFtZSk7XG4gICAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UoLyhcXC5kKT9cXC5banRdc3g/JC8sICcnKTtcbiAgICBpZiAoIXRoaXMuYmF6ZWxPcHRzLmVzNU1vZGUpIHJlc3VsdCArPSAnLmNsb3N1cmUnO1xuICAgIHJldHVybiByZXN1bHQgKyAnLmpzJztcbiAgfVxuXG4gIC8qKlxuICAgKiBXb3JrYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvODI0NVxuICAgKiBXZSB1c2UgdGhlIGByb290RGlyc2AgcHJvcGVydHkgYm90aCBmb3IgbW9kdWxlIHJlc29sdXRpb24sXG4gICAqIGFuZCAqYWxzbyogdG8gZmxhdHRlbiB0aGUgc3RydWN0dXJlIG9mIHRoZSBvdXRwdXQgZGlyZWN0b3J5XG4gICAqIChhcyBgcm9vdERpcmAgd291bGQgZG8gZm9yIGEgc2luZ2xlIHJvb3QpLlxuICAgKiBUbyBkbyB0aGlzLCBsb29rIGZvciB0aGUgcGF0dGVybiBvdXREaXIvcmVsYXRpdmVSb290c1tpXS9wYXRoL3RvL2ZpbGVcbiAgICogb3IgcmVsYXRpdmVSb290c1tpXS9wYXRoL3RvL2ZpbGVcbiAgICogYW5kIHJlcGxhY2UgdGhhdCB3aXRoIHBhdGgvdG8vZmlsZVxuICAgKi9cbiAgZmxhdHRlbk91dERpcihmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBsZXQgcmVzdWx0ID0gZmlsZU5hbWU7XG5cbiAgICAvLyBvdXREaXIvcmVsYXRpdmVSb290c1tpXS9wYXRoL3RvL2ZpbGUgLT4gcmVsYXRpdmVSb290c1tpXS9wYXRoL3RvL2ZpbGVcbiAgICBpZiAoZmlsZU5hbWUuc3RhcnRzV2l0aCh0aGlzLm9wdGlvbnMucm9vdERpcikpIHtcbiAgICAgIHJlc3VsdCA9IHBhdGgucmVsYXRpdmUodGhpcy5vcHRpb25zLm91dERpciwgZmlsZU5hbWUpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMucmVsYXRpdmVSb290cykge1xuICAgICAgLy8gcmVsYXRpdmVSb290c1tpXS9wYXRoL3RvL2ZpbGUgLT4gcGF0aC90by9maWxlXG4gICAgICBjb25zdCByZWwgPSBwYXRoLnJlbGF0aXZlKGRpciwgcmVzdWx0KTtcbiAgICAgIGlmICghcmVsLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICAgICAgcmVzdWx0ID0gcmVsO1xuICAgICAgICAvLyByZWxhdGl2ZVJvb3RzIGlzIHNvcnRlZCBsb25nZXN0IGZpcnN0IHNvIHdlIGNhbiBzaG9ydC1jaXJjdWl0XG4gICAgICAgIC8vIGFmdGVyIHRoZSBmaXJzdCBtYXRjaFxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKiBBdm9pZCB1c2luZyB0c2lja2xlIG9uIGZpbGVzIHRoYXQgYXJlbid0IGluIHNyY3NbXSAqL1xuICBzaG91bGRTa2lwVHNpY2tsZVByb2Nlc3NpbmcoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmJhemVsT3B0cy5pc0pzVHJhbnNwaWxhdGlvbiB8fFxuICAgICAgICAgICB0aGlzLmJhemVsT3B0cy5jb21waWxhdGlvblRhcmdldFNyYy5pbmRleE9mKGZpbGVOYW1lKSA9PT0gLTE7XG4gIH1cblxuICAvKiogV2hldGhlciB0aGUgZmlsZSBpcyBleHBlY3RlZCB0byBiZSBpbXBvcnRlZCB1c2luZyBhIG5hbWVkIG1vZHVsZSAqL1xuICBzaG91bGROYW1lTW9kdWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5iYXplbE9wdHMuY29tcGlsYXRpb25UYXJnZXRTcmMuaW5kZXhPZihmaWxlTmFtZSkgIT09IC0xO1xuICB9XG5cbiAgLyoqIEFsbG93cyBzdXBwcmVzc2luZyB3YXJuaW5ncyBmb3Igc3BlY2lmaWMga25vd24gbGlicmFyaWVzICovXG4gIHNob3VsZElnbm9yZVdhcm5pbmdzRm9yUGF0aChmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuYmF6ZWxPcHRzLmlnbm9yZVdhcm5pbmdQYXRocy5zb21lKFxuICAgICAgICBwID0+ICEhZmlsZVBhdGgubWF0Y2gobmV3IFJlZ0V4cChwKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIGZpbGVOYW1lVG9Nb2R1bGVJZCBnaXZlcyB0aGUgbW9kdWxlIElEIGZvciBhbiBpbnB1dCBzb3VyY2UgZmlsZSBuYW1lLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgYW4gaW5wdXQgc291cmNlIGZpbGUgbmFtZSwgZS5nLlxuICAgKiAgICAgL3Jvb3QvZGlyL2JhemVsLW91dC9ob3N0L2Jpbi9teS9maWxlLnRzLlxuICAgKiBAcmV0dXJuIHRoZSBjYW5vbmljYWwgcGF0aCBvZiBhIGZpbGUgd2l0aGluIGJsYXplLCB3aXRob3V0IC9nZW5maWxlcy8gb3JcbiAgICogICAgIC9iaW4vIHBhdGggcGFydHMsIGV4Y2x1ZGluZyBhIGZpbGUgZXh0ZW5zaW9uLiBGb3IgZXhhbXBsZSwgXCJteS9maWxlXCIuXG4gICAqL1xuICBmaWxlTmFtZVRvTW9kdWxlSWQoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucmVsYXRpdmVPdXRwdXRQYXRoKFxuICAgICAgICBmaWxlTmFtZS5zdWJzdHJpbmcoMCwgZmlsZU5hbWUubGFzdEluZGV4T2YoJy4nKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFR5cGVTY3JpcHQgU291cmNlRmlsZSdzIGhhdmUgYSBwYXRoIHdpdGggdGhlIHJvb3REaXJzW2ldIHN0aWxsIHByZXNlbnQsIGVnLlxuICAgKiAvYnVpbGQvd29yay9iYXplbC1vdXQvbG9jYWwtZmFzdGJ1aWxkL2Jpbi9wYXRoL3RvL2ZpbGVcbiAgICogQHJldHVybiB0aGUgcGF0aCB3aXRob3V0IGFueSByb290RGlycywgZWcuIHBhdGgvdG8vZmlsZVxuICAgKi9cbiAgcHJpdmF0ZSByb290RGlyc1JlbGF0aXZlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGZvciAoY29uc3Qgcm9vdCBvZiB0aGlzLm9wdGlvbnMucm9vdERpcnMpIHtcbiAgICAgIGlmIChmaWxlTmFtZS5zdGFydHNXaXRoKHJvb3QpKSB7XG4gICAgICAgIC8vIHJvb3REaXJzIGFyZSBzb3J0ZWQgbG9uZ2VzdC1maXJzdCwgc28gc2hvcnQtY2lyY3VpdCB0aGUgaXRlcmF0aW9uXG4gICAgICAgIC8vIHNlZSB0c2NvbmZpZy50cy5cbiAgICAgICAgcmV0dXJuIHBhdGgucG9zaXgucmVsYXRpdmUocm9vdCwgZmlsZU5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmlsZU5hbWU7XG4gIH1cblxuICAvKipcbiAgICogTWFzc2FnZXMgZmlsZSBuYW1lcyBpbnRvIHZhbGlkIGdvb2cubW9kdWxlIG5hbWVzOlxuICAgKiAtIHJlc29sdmVzIHJlbGF0aXZlIHBhdGhzIHRvIHRoZSBnaXZlbiBjb250ZXh0XG4gICAqIC0gcmVzb2x2ZXMgbm9uLXJlbGF0aXZlIHBhdGhzIHdoaWNoIHRha2VzIG1vZHVsZV9yb290IGludG8gYWNjb3VudFxuICAgKiAtIHJlcGxhY2VzICcvJyB3aXRoICcuJyBpbiB0aGUgJzx3b3Jrc3BhY2U+JyBuYW1lc3BhY2VcbiAgICogLSByZXBsYWNlIGZpcnN0IGNoYXIgaWYgbm9uLWFscGhhXG4gICAqIC0gcmVwbGFjZSBzdWJzZXF1ZW50IG5vbi1hbHBoYSBudW1lcmljIGNoYXJzXG4gICAqL1xuICBwYXRoVG9Nb2R1bGVOYW1lKGNvbnRleHQ6IHN0cmluZywgaW1wb3J0UGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyB0c2lja2xlIGhhbmRzIHVzIGFuIG91dHB1dCBwYXRoLCB3ZSBuZWVkIHRvIG1hcCBpdCBiYWNrIHRvIGEgc291cmNlXG4gICAgLy8gcGF0aCBpbiBvcmRlciB0byBkbyBtb2R1bGUgcmVzb2x1dGlvbiB3aXRoIGl0LlxuICAgIC8vIG91dERpci9yZWxhdGl2ZVJvb3RzW2ldL3BhdGgvdG8vZmlsZSAtPlxuICAgIC8vIHJvb3REaXIvcmVsYXRpdmVSb290c1tpXS9wYXRoL3RvL2ZpbGVcbiAgICBpZiAoY29udGV4dC5zdGFydHNXaXRoKHRoaXMub3B0aW9ucy5vdXREaXIpKSB7XG4gICAgICBjb250ZXh0ID0gcGF0aC5qb2luKFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5yb290RGlyLCBwYXRoLnJlbGF0aXZlKHRoaXMub3B0aW9ucy5vdXREaXIsIGNvbnRleHQpKTtcbiAgICB9XG5cbiAgICAvLyBUcnkgdG8gZ2V0IHRoZSByZXNvbHZlZCBwYXRoIG5hbWUgZnJvbSBUUyBjb21waWxlciBob3N0IHdoaWNoIGNhblxuICAgIC8vIGhhbmRsZSByZXNvbHV0aW9uIGZvciBsaWJyYXJpZXMgd2l0aCBtb2R1bGVfcm9vdCBsaWtlIHJ4anMgYW5kIEBhbmd1bGFyLlxuICAgIGxldCByZXNvbHZlZFBhdGg6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBjb25zdCByZXNvbHZlZCA9XG4gICAgICAgIHRoaXMubW9kdWxlUmVzb2x2ZXIoaW1wb3J0UGF0aCwgY29udGV4dCwgdGhpcy5vcHRpb25zLCB0aGlzKTtcbiAgICBpZiAocmVzb2x2ZWQgJiYgcmVzb2x2ZWQucmVzb2x2ZWRNb2R1bGUgJiZcbiAgICAgICAgcmVzb2x2ZWQucmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSkge1xuICAgICAgcmVzb2x2ZWRQYXRoID0gcmVzb2x2ZWQucmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZTtcbiAgICAgIC8vIC9idWlsZC93b3JrL2JhemVsLW91dC9sb2NhbC1mYXN0YnVpbGQvYmluL3BhdGgvdG8vZmlsZSAtPlxuICAgICAgLy8gcGF0aC90by9maWxlXG4gICAgICByZXNvbHZlZFBhdGggPSB0aGlzLnJvb3REaXJzUmVsYXRpdmUocmVzb2x2ZWRQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaW1wb3J0UGF0aCBjYW4gYmUgYW4gYWJzb2x1dGUgZmlsZSBwYXRoIGluIGdvb2dsZTMuXG4gICAgICAvLyBUcnkgdG8gdHJpbSBpdCBhcyBhIHBhdGggcmVsYXRpdmUgdG8gYmluIGFuZCBnZW5maWxlcywgYW5kIGlmIHNvLFxuICAgICAgLy8gaGFuZGxlIGl0cyBmaWxlIGV4dGVuc2lvbiBpbiB0aGUgYmxvY2sgYmVsb3cgYW5kIHByZXBlbmQgdGhlIHdvcmtzcGFjZVxuICAgICAgLy8gbmFtZS5cbiAgICAgIGNvbnN0IHRyaW1tZWQgPSB0aGlzLnJvb3REaXJzUmVsYXRpdmUoaW1wb3J0UGF0aCk7XG4gICAgICBpZiAodHJpbW1lZCAhPT0gaW1wb3J0UGF0aCkge1xuICAgICAgICByZXNvbHZlZFBhdGggPSB0cmltbWVkO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVzb2x2ZWRQYXRoKSB7XG4gICAgICAvLyBTdHJpcCBmaWxlIGV4dGVuc2lvbnMuXG4gICAgICBpbXBvcnRQYXRoID0gcmVzb2x2ZWRQYXRoLnJlcGxhY2UoU09VUkNFX0VYVCwgJycpO1xuICAgICAgLy8gTWFrZSBzdXJlIGFsbCBtb2R1bGUgbmFtZXMgaW5jbHVkZSB0aGUgd29ya3NwYWNlIG5hbWUuXG4gICAgICBpZiAoaW1wb3J0UGF0aC5pbmRleE9mKHRoaXMuYmF6ZWxPcHRzLndvcmtzcGFjZU5hbWUpICE9PSAwKSB7XG4gICAgICAgIGltcG9ydFBhdGggPSBwYXRoLnBvc2l4LmpvaW4odGhpcy5iYXplbE9wdHMud29ya3NwYWNlTmFtZSwgaW1wb3J0UGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHRoZSBfX3tMT0NBTEV9IGZyb20gdGhlIG1vZHVsZSBuYW1lLlxuICAgIGlmICh0aGlzLmJhemVsT3B0cy5sb2NhbGUpIHtcbiAgICAgIGNvbnN0IHN1ZmZpeCA9ICdfXycgKyB0aGlzLmJhemVsT3B0cy5sb2NhbGUudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmIChpbXBvcnRQYXRoLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoc3VmZml4KSkge1xuICAgICAgICBpbXBvcnRQYXRoID0gaW1wb3J0UGF0aC5zdWJzdHJpbmcoMCwgaW1wb3J0UGF0aC5sZW5ndGggLSBzdWZmaXgubGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXBsYWNlIGNoYXJhY3RlcnMgbm90IHN1cHBvcnRlZCBieSBnb29nLm1vZHVsZSBhbmQgJy4nIHdpdGhcbiAgICAvLyAnJDxIZXggY2hhciBjb2RlPicgc28gdGhhdCB0aGUgb3JpZ2luYWwgbW9kdWxlIG5hbWUgY2FuIGJlIHJlLW9idGFpbmVkXG4gICAgLy8gd2l0aG91dCBhbnkgbG9zcy5cbiAgICAvLyBTZWUgZ29vZy5WQUxJRF9NT0RVTEVfUkVfIGluIENsb3N1cmUncyBiYXNlLmpzIGZvciBjaGFyYWN0ZXJzIHN1cHBvcnRlZFxuICAgIC8vIGJ5IGdvb2dsZS5tb2R1bGUuXG5cbiAgICBjb25zdCBlc2NhcGUgPSAoYzogc3RyaW5nKSA9PiB7XG4gICAgICByZXR1cm4gJyQnICsgYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KTtcbiAgICB9O1xuICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBpbXBvcnRQYXRoLnJlcGxhY2UoL15bXmEtekEtWl8vXS8sICdfJylcbiAgICAgICAgLnJlcGxhY2UoL1teYS16QS1aXzAtOV8vLl0vZywgJ18nKVxuICAgICAgICAucmVwbGFjZSgvXFwvL2csICcuJylcbiAgICAgICAgLnJlcGxhY2UoL2x1Y2lkXFwuY2FrZVxcLm5vZGVfbW9kdWxlc1xcLiguKj8oW14uXSspKVxcLlxcMiQvLCAnJDEnKVxuICAgICAgICAucmVwbGFjZSgvbHVjaWRcXC5jYWtlXFwubm9kZV9tb2R1bGVzXFwuLywgJycpXG4gICAgICAgIC5yZXBsYWNlKC9sdWNpZFxcLmV4dGVybmFsXFwuY2xvc3VyZV90eXBlc1xcLmdvb2dsZV9jbG9zdXJlX2xpYnJhcnlfbW9kdWxlc1xcLlthYl1cXC4vLCAnJylcbiAgICAgICAgLnJlcGxhY2UoL1xcLmluZGV4JC8sICcnKVxuICAgICAgICAucmVwbGFjZSgvbHVjaWRcXC5jYWtlXFwuYXBwXFwud2Vicm9vdFxcLnRzXFwuLywgJ19sdWNpZC4nKTtcbiAgICByZXR1cm4gbW9kdWxlTmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBmaWxlIHBhdGggaW50byBhIHZhbGlkIEFNRCBtb2R1bGUgbmFtZS5cbiAgICpcbiAgICogQW4gQU1EIG1vZHVsZSBjYW4gaGF2ZSBhbiBhcmJpdHJhcnkgbmFtZSwgc28gdGhhdCBpdCBpcyByZXF1aXJlJ2QgYnkgbmFtZVxuICAgKiByYXRoZXIgdGhhbiBieSBwYXRoLiBTZWUgaHR0cDovL3JlcXVpcmVqcy5vcmcvZG9jcy93aHlhbWQuaHRtbCNuYW1lZG1vZHVsZXNcbiAgICpcbiAgICogXCJIb3dldmVyLCB0b29scyB0aGF0IGNvbWJpbmUgbXVsdGlwbGUgbW9kdWxlcyB0b2dldGhlciBmb3IgcGVyZm9ybWFuY2UgbmVlZFxuICAgKiAgYSB3YXkgdG8gZ2l2ZSBuYW1lcyB0byBlYWNoIG1vZHVsZSBpbiB0aGUgb3B0aW1pemVkIGZpbGUuIEZvciB0aGF0LCBBTURcbiAgICogIGFsbG93cyBhIHN0cmluZyBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gZGVmaW5lKClcIlxuICAgKi9cbiAgYW1kTW9kdWxlTmFtZShzZjogdHMuU291cmNlRmlsZSk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5zaG91bGROYW1lTW9kdWxlKHNmLmZpbGVOYW1lKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAvLyAvYnVpbGQvd29yay9iYXplbC1vdXQvbG9jYWwtZmFzdGJ1aWxkL2Jpbi9wYXRoL3RvL2ZpbGUudHNcbiAgICAvLyAtPiBwYXRoL3RvL2ZpbGVcbiAgICBsZXQgZmlsZU5hbWUgPSB0aGlzLnJvb3REaXJzUmVsYXRpdmUoc2YuZmlsZU5hbWUpLnJlcGxhY2UoU09VUkNFX0VYVCwgJycpO1xuXG4gICAgbGV0IHdvcmtzcGFjZSA9IHRoaXMuYmF6ZWxPcHRzLndvcmtzcGFjZU5hbWU7XG5cbiAgICAvLyBXb3JrYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL2JhemVsL2lzc3Vlcy8xMjYyXG4gICAgLy9cbiAgICAvLyBXaGVuIHRoZSBmaWxlIGNvbWVzIGZyb20gYW4gZXh0ZXJuYWwgYmF6ZWwgcmVwb3NpdG9yeSxcbiAgICAvLyBhbmQgVHlwZVNjcmlwdCByZXNvbHZlcyBydW5maWxlcyBzeW1saW5rcywgdGhlbiB0aGUgcGF0aCB3aWxsIGxvb2sgbGlrZVxuICAgIC8vIG91dHB1dF9iYXNlL2V4ZWNyb290L2xvY2FsX3JlcG8vZXh0ZXJuYWwvYW5vdGhlcl9yZXBvL2Zvby9iYXJcbiAgICAvLyBXZSB3YW50IHRvIG5hbWUgc3VjaCBhIG1vZHVsZSBcImFub3RoZXJfcmVwby9mb28vYmFyXCIganVzdCBhcyBpdCB3b3VsZCBiZVxuICAgIC8vIG5hbWVkIGJ5IGNvZGUgaW4gdGhhdCByZXBvc2l0b3J5LlxuICAgIC8vIEFzIGEgd29ya2Fyb3VuZCwgY2hlY2sgZm9yIHRoZSAvZXh0ZXJuYWwvIHBhdGggc2VnbWVudCwgYW5kIGZpeCB1cCB0aGVcbiAgICAvLyB3b3Jrc3BhY2UgbmFtZSB0byBiZSB0aGUgbmFtZSBvZiB0aGUgZXh0ZXJuYWwgcmVwb3NpdG9yeS5cbiAgICBpZiAoZmlsZU5hbWUuc3RhcnRzV2l0aCgnZXh0ZXJuYWwvJykpIHtcbiAgICAgIGNvbnN0IHBhcnRzID0gZmlsZU5hbWUuc3BsaXQoJy8nKTtcbiAgICAgIHdvcmtzcGFjZSA9IHBhcnRzWzFdO1xuICAgICAgZmlsZU5hbWUgPSBwYXJ0cy5zbGljZSgyKS5qb2luKCcvJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYmF6ZWxPcHRzLm1vZHVsZU5hbWUpIHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlRmlsZU5hbWUgPSBwYXRoLnBvc2l4LnJlbGF0aXZlKHRoaXMuYmF6ZWxPcHRzLnBhY2thZ2UsIGZpbGVOYW1lKTtcbiAgICAgIGlmICghcmVsYXRpdmVGaWxlTmFtZS5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgICAgIGlmICh0aGlzLmJhemVsT3B0cy5tb2R1bGVSb290ICYmXG4gICAgICAgICAgICB0aGlzLmJhemVsT3B0cy5tb2R1bGVSb290LnJlcGxhY2UoU09VUkNFX0VYVCwgJycpID09PVxuICAgICAgICAgICAgICAgIHJlbGF0aXZlRmlsZU5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5iYXplbE9wdHMubW9kdWxlTmFtZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTdXBwb3J0IHRoZSBjb21tb24gY2FzZSBvZiBjb21tb25qcyBjb252ZW50aW9uIHRoYXQgaW5kZXggaXMgdGhlXG4gICAgICAgIC8vIGRlZmF1bHQgbW9kdWxlIGluIGEgZGlyZWN0b3J5LlxuICAgICAgICAvLyBUaGlzIG1ha2VzIG91ciBtb2R1bGUgbmFtaW5nIHNjaGVtZSBtb3JlIGNvbnZlbnRpb25hbCBhbmQgbGV0cyB1c2Vyc1xuICAgICAgICAvLyByZWZlciB0byBtb2R1bGVzIHdpdGggdGhlIG5hdHVyYWwgbmFtZSB0aGV5J3JlIHVzZWQgdG8uXG4gICAgICAgIGlmIChyZWxhdGl2ZUZpbGVOYW1lID09PSAnaW5kZXgnKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmF6ZWxPcHRzLm1vZHVsZU5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGgucG9zaXguam9pbih0aGlzLmJhemVsT3B0cy5tb2R1bGVOYW1lLCByZWxhdGl2ZUZpbGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwYXRoL3RvL2ZpbGUgLT5cbiAgICAvLyBteVdvcmtzcGFjZS9wYXRoL3RvL2ZpbGVcbiAgICByZXR1cm4gcGF0aC5wb3NpeC5qb2luKHdvcmtzcGFjZSwgZmlsZU5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc29sdmVzIHRoZSB0eXBpbmdzIGZpbGUgZnJvbSBhIHBhY2thZ2UgYXQgdGhlIHNwZWNpZmllZCBwYXRoLiBIZWxwZXJcbiAgICogZnVuY3Rpb24gdG8gYHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlc2AuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVUeXBpbmdGcm9tRGlyZWN0b3J5KHR5cGVQYXRoOiBzdHJpbmcsIHByaW1hcnk6IGJvb2xlYW4pOiB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmUgfCB1bmRlZmluZWQge1xuICAgIC8vIExvb2tzIGZvciB0aGUgYHR5cGluZ3NgIGF0dHJpYnV0ZSBpbiBhIHBhY2thZ2UuanNvbiBmaWxlXG4gICAgLy8gaWYgaXQgZXhpc3RzXG4gICAgY29uc3QgcGtnRmlsZSA9IHBhdGgucG9zaXguam9pbih0eXBlUGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmICh0aGlzLmZpbGVFeGlzdHMocGtnRmlsZSkpIHtcbiAgICAgIGNvbnN0IHBrZyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrZ0ZpbGUsICdVVEYtOCcpKTtcbiAgICAgIGxldCB0eXBpbmdzID0gcGtnWyd0eXBpbmdzJ107XG4gICAgICBpZiAodHlwaW5ncykge1xuICAgICAgICBpZiAodHlwaW5ncyA9PT0gJy4nIHx8IHR5cGluZ3MgPT09ICcuLycpIHtcbiAgICAgICAgICB0eXBpbmdzID0gJ2luZGV4LmQudHMnO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1heWJlID0gcGF0aC5wb3NpeC5qb2luKHR5cGVQYXRoLCB0eXBpbmdzKTtcbiAgICAgICAgaWYgKHRoaXMuZmlsZUV4aXN0cyhtYXliZSkpIHtcbiAgICAgICAgICByZXR1cm4geyBwcmltYXJ5LCByZXNvbHZlZEZpbGVOYW1lOiBtYXliZSB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgYW4gaW5kZXguZC50cyBmaWxlIGluIHRoZSBwYXRoXG4gICAgY29uc3QgbWF5YmUgPSBwYXRoLnBvc2l4LmpvaW4odHlwZVBhdGgsICdpbmRleC5kLnRzJyk7XG4gICAgaWYgKHRoaXMuZmlsZUV4aXN0cyhtYXliZSkpIHtcbiAgICAgIHJldHVybiB7IHByaW1hcnksIHJlc29sdmVkRmlsZU5hbWU6IG1heWJlIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBPdmVycmlkZSB0aGUgZGVmYXVsdCB0eXBlc2NyaXB0IHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcyBmdW5jdGlvbi5cbiAgICogUmVzb2x2ZXMgLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ4XCIgLz4gZGlyZWN0aXZlcyB1bmRlciBiYXplbC4gVGhlIGRlZmF1bHRcbiAgICogdHlwZXNjcmlwdCBzZWNvbmRhcnkgc2VhcmNoIGJlaGF2aW9yIG5lZWRzIHRvIGJlIG92ZXJyaWRkZW4gdG8gc3VwcG9ydFxuICAgKiBsb29raW5nIHVuZGVyIGBiYXplbE9wdHMubm9kZU1vZHVsZXNQcmVmaXhgXG4gICAqL1xuICByZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKTogdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW10ge1xuICAgIGlmICghdGhpcy5hbGxvd0FjdGlvbklucHV0UmVhZHMpIHJldHVybiBbXTtcbiAgICBjb25zdCByZXN1bHQ6IHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZVtdID0gW107XG4gICAgbmFtZXMuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgIGxldCByZXNvbHZlZDogdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlIHwgdW5kZWZpbmVkO1xuXG4gICAgICAvLyBwcmltYXJ5IHNlYXJjaFxuICAgICAgdGhpcy5vcHRpb25zLnR5cGVSb290cy5mb3JFYWNoKHR5cGVSb290ID0+IHtcbiAgICAgICAgaWYgKCFyZXNvbHZlZCkge1xuICAgICAgICAgIHJlc29sdmVkID0gdGhpcy5yZXNvbHZlVHlwaW5nRnJvbURpcmVjdG9yeShwYXRoLnBvc2l4LmpvaW4odHlwZVJvb3QsIG5hbWUpLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIHNlY29uZGFyeSBzZWFyY2hcbiAgICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgICAgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVUeXBpbmdGcm9tRGlyZWN0b3J5KHBhdGgucG9zaXguam9pbih0aGlzLmJhemVsT3B0cy5ub2RlTW9kdWxlc1ByZWZpeCwgbmFtZSksIGZhbHNlKTtcbiAgICAgIH1cblxuICAgICAgLy8gVHlwZXMgbm90IHJlc29sdmVkIHNob3VsZCBiZSBzaWxlbnRseSBpZ25vcmVkLiBMZWF2ZSBpdCB0byBUeXBlc2NyaXB0XG4gICAgICAvLyB0byBlaXRoZXIgZXJyb3Igb3V0IHdpdGggXCJUUzI2ODg6IENhbm5vdCBmaW5kIHR5cGUgZGVmaW5pdGlvbiBmaWxlIGZvclxuICAgICAgLy8gJ2ZvbydcIiBvciBmb3IgdGhlIGJ1aWxkIHRvIGZhaWwgZHVlIHRvIGEgbWlzc2luZyB0eXBlIHRoYXQgaXMgdXNlZC5cbiAgICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgICAgaWYgKERFQlVHKSB7XG4gICAgICAgICAgZGVidWcoYEZhaWxlZCB0byByZXNvbHZlIHR5cGUgcmVmZXJlbmNlIGRpcmVjdGl2ZSAnJHtuYW1lfSdgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBJbiB0eXBlc2NyaXB0IDIueCB0aGUgcmV0dXJuIHR5cGUgZm9yIHRoaXMgZnVuY3Rpb25cbiAgICAgIC8vIGlzIGAodHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlIHwgdW5kZWZpbmVkKVtdYCB0aHVzIHdlIGFjdHVhbGx5XG4gICAgICAvLyBkbyBhbGxvdyByZXR1cm5pbmcgYHVuZGVmaW5lZGAgaW4gdGhlIGFycmF5IGJ1dCB0aGUgZnVuY3Rpb24gaXMgdHlwZWRcbiAgICAgIC8vIGAodHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlKVtdYCB0byBjb21waWxlIHdpdGggYm90aCB0eXBlc2NyaXB0XG4gICAgICAvLyAyLnggYW5kIDMuMC8zLjEgd2l0aG91dCBlcnJvci4gVHlwZXNjcmlwdCAzLjAvMy4xIGRvIGhhbmRsZSB0aGUgYHVuZGVmaW5lZGBcbiAgICAgIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkgY29ycmVjdGx5IGRlc3BpdGUgdGhlIHJldHVybiBzaWduYXR1cmUuXG4gICAgICAvLyBJdCBsb29rcyBsaWtlIHRoZSByZXR1cm4gdHlwZSBjaGFuZ2Ugd2FzIGEgbWlzdGFrZSBiZWNhdXNlXG4gICAgICAvLyBpdCB3YXMgY2hhbmdlZCBiYWNrIHRvIGluY2x1ZGUgYHwgdW5kZWZpbmVkYCByZWNlbnRseTpcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9wdWxsLzI4MDU5LlxuICAgICAgcmVzdWx0LnB1c2gocmVzb2x2ZWQgYXMgdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqIExvYWRzIGEgc291cmNlIGZpbGUgZnJvbSBkaXNrIChvciB0aGUgY2FjaGUpLiAqL1xuICBnZXRTb3VyY2VGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkge1xuICAgIHJldHVybiBwZXJmVHJhY2Uud3JhcChgZ2V0U291cmNlRmlsZSAke2ZpbGVOYW1lfWAsICgpID0+IHtcbiAgICAgIGNvbnN0IHNmID0gdGhpcy5maWxlTG9hZGVyLmxvYWRGaWxlKGZpbGVOYW1lLCBmaWxlTmFtZSwgbGFuZ3VhZ2VWZXJzaW9uKTtcbiAgICAgIGlmICghL1xcLmRcXC50c3g/JC8udGVzdChmaWxlTmFtZSkgJiZcbiAgICAgICAgICAodGhpcy5vcHRpb25zLm1vZHVsZSA9PT0gdHMuTW9kdWxlS2luZC5BTUQgfHxcbiAgICAgICAgICAgdGhpcy5vcHRpb25zLm1vZHVsZSA9PT0gdHMuTW9kdWxlS2luZC5VTUQpKSB7XG4gICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSB0aGlzLmFtZE1vZHVsZU5hbWUoc2YpO1xuICAgICAgICBpZiAoc2YubW9kdWxlTmFtZSA9PT0gbW9kdWxlTmFtZSB8fCAhbW9kdWxlTmFtZSkgcmV0dXJuIHNmO1xuICAgICAgICBpZiAoc2YubW9kdWxlTmFtZSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYEVSUk9SOiAke3NmLmZpbGVOYW1lfSBgICtcbiAgICAgICAgICAgICAgYGNvbnRhaW5zIGEgbW9kdWxlIG5hbWUgZGVjbGFyYXRpb24gJHtzZi5tb2R1bGVOYW1lfSBgICtcbiAgICAgICAgICAgICAgYHdoaWNoIHdvdWxkIGJlIG92ZXJ3cml0dGVuIHdpdGggJHttb2R1bGVOYW1lfSBgICtcbiAgICAgICAgICAgICAgYGJ5IEJhemVsJ3MgVHlwZVNjcmlwdCBjb21waWxlci5gKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXR0aW5nIHRoZSBtb2R1bGVOYW1lIGlzIGVxdWl2YWxlbnQgdG8gdGhlIG9yaWdpbmFsIHNvdXJjZSBoYXZpbmcgYVxuICAgICAgICAvLyAvLy88YW1kLW1vZHVsZSBuYW1lPVwic29tZS9uYW1lXCIvPiBkaXJlY3RpdmVcbiAgICAgICAgc2YubW9kdWxlTmFtZSA9IG1vZHVsZU5hbWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gc2Y7XG4gICAgfSk7XG4gIH1cblxuICB3cml0ZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnx1bmRlZmluZWQpOiB2b2lkIHtcbiAgICBwZXJmVHJhY2Uud3JhcChcbiAgICAgICAgYHdyaXRlRmlsZSAke2ZpbGVOYW1lfWAsXG4gICAgICAgICgpID0+IHRoaXMud3JpdGVGaWxlSW1wbChcbiAgICAgICAgICAgIGZpbGVOYW1lLCBjb250ZW50LCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKSk7XG4gIH1cblxuICB3cml0ZUZpbGVJbXBsKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgY29udGVudDogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT58dW5kZWZpbmVkKTogdm9pZCB7XG4gICAgLy8gV29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzE4NjQ4XG4gICAgLy8gVGhpcyBidWcgaXMgZml4ZWQgaW4gVFMgMi45XG4gICAgY29uc3QgdmVyc2lvbiA9IHRzLnZlcnNpb25NYWpvck1pbm9yO1xuICAgIGNvbnN0IFttYWpvciwgbWlub3JdID0gdmVyc2lvbi5zcGxpdCgnLicpLm1hcChzID0+IE51bWJlcihzKSk7XG4gICAgY29uc3Qgd29ya2Fyb3VuZE5lZWRlZCA9IG1ham9yIDw9IDIgJiYgbWlub3IgPD0gODtcbiAgICBpZiAod29ya2Fyb3VuZE5lZWRlZCAmJlxuICAgICAgICAodGhpcy5vcHRpb25zLm1vZHVsZSA9PT0gdHMuTW9kdWxlS2luZC5BTUQgfHxcbiAgICAgICAgIHRoaXMub3B0aW9ucy5tb2R1bGUgPT09IHRzLk1vZHVsZUtpbmQuVU1EKSAmJlxuICAgICAgICBmaWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSAmJiBzb3VyY2VGaWxlcyAmJiBzb3VyY2VGaWxlcy5sZW5ndGggPiAwICYmXG4gICAgICAgIHNvdXJjZUZpbGVzWzBdLm1vZHVsZU5hbWUpIHtcbiAgICAgIGNvbnRlbnQgPVxuICAgICAgICAgIGAvLy8gPGFtZC1tb2R1bGUgbmFtZT1cIiR7c291cmNlRmlsZXNbMF0ubW9kdWxlTmFtZX1cIiAvPlxcbiR7Y29udGVudH1gO1xuICAgIH1cbiAgICBmaWxlTmFtZSA9IHRoaXMuZmxhdHRlbk91dERpcihmaWxlTmFtZSk7XG5cbiAgICBpZiAodGhpcy5iYXplbE9wdHMuaXNKc1RyYW5zcGlsYXRpb24pIHtcbiAgICAgIGZpbGVOYW1lID0gdGhpcy5iYXplbE9wdHMudHJhbnNwaWxlZEpzT3V0cHV0RmlsZU5hbWUhO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuYmF6ZWxPcHRzLmVzNU1vZGUpIHtcbiAgICAgIC8vIFdyaXRlIEVTNiB0cmFuc3BpbGVkIGZpbGVzIHRvICouY2xvc3VyZS5qcy5cbiAgICAgIGlmICh0aGlzLmJhemVsT3B0cy5sb2NhbGUpIHtcbiAgICAgICAgLy8gaTE4biBwYXRocyBhcmUgcmVxdWlyZWQgdG8gZW5kIHdpdGggX19sb2NhbGUuanMgc28gd2UgcHV0XG4gICAgICAgIC8vIHRoZSAuY2xvc3VyZSBzZWdtZW50IGJlZm9yZSB0aGUgX19sb2NhbGVcbiAgICAgICAgZmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC8oX19bXlxcLl0rKT9cXC5qcyQvLCAnLmNsb3N1cmUkMS5qcycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC9cXC5qcyQvLCAnLmNsb3N1cmUuanMnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQcmVwZW5kIHRoZSBvdXRwdXQgZGlyZWN0b3J5LlxuICAgIGZpbGVOYW1lID0gcGF0aC5qb2luKHRoaXMub3B0aW9ucy5vdXREaXIsIGZpbGVOYW1lKTtcblxuICAgIC8vIE91ciBmaWxlIGNhY2hlIGlzIGJhc2VkIG9uIG10aW1lIC0gc28gYXZvaWQgd3JpdGluZyBmaWxlcyBpZiB0aGV5XG4gICAgLy8gZGlkIG5vdCBjaGFuZ2UuXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGZpbGVOYW1lKSB8fFxuICAgICAgICBmcy5yZWFkRmlsZVN5bmMoZmlsZU5hbWUsICd1dGYtOCcpICE9PSBjb250ZW50KSB7XG4gICAgICB0aGlzLmRlbGVnYXRlLndyaXRlRmlsZShcbiAgICAgICAgICBmaWxlTmFtZSwgY29udGVudCwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1hbmNlIG9wdGltaXphdGlvbjogZG9uJ3QgdHJ5IHRvIHN0YXQgZmlsZXMgd2Ugd2VyZW4ndCBleHBsaWNpdGx5XG4gICAqIGdpdmVuIGFzIGlucHV0cy5cbiAgICogVGhpcyBhbHNvIGFsbG93cyB1cyB0byBkaXNhYmxlIEJhemVsIHNhbmRib3hpbmcsIHdpdGhvdXQgYWNjaWRlbnRhbGx5XG4gICAqIHJlYWRpbmcgLnRzIGlucHV0cyB3aGVuIC5kLnRzIGlucHV0cyBhcmUgaW50ZW5kZWQuXG4gICAqIE5vdGUgdGhhdCBpbiB3b3JrZXIgbW9kZSwgdGhlIGZpbGUgY2FjaGUgd2lsbCBhbHNvIGd1YXJkIGFnYWluc3QgYXJiaXRyYXJ5XG4gICAqIGZpbGUgcmVhZHMuXG4gICAqL1xuICBmaWxlRXhpc3RzKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBVbmRlciBCYXplbCwgdXNlcnMgZG8gbm90IGRlY2xhcmUgZGVwc1tdIG9uIHRoZWlyIG5vZGVfbW9kdWxlcy5cbiAgICAvLyBUaGlzIG1lYW5zIHRoYXQgd2UgZG8gbm90IGxpc3QgYWxsIHRoZSBuZWVkZWQgLmQudHMgZmlsZXMgaW4gdGhlIGZpbGVzW11cbiAgICAvLyBzZWN0aW9uIG9mIHRzY29uZmlnLmpzb24sIGFuZCB0aGF0IGlzIHdoYXQgcG9wdWxhdGVzIHRoZSBrbm93bkZpbGVzIHNldC5cbiAgICAvLyBJbiBhZGRpdGlvbiwgdGhlIG5vZGUgbW9kdWxlIHJlc29sdmVyIG1heSBuZWVkIHRvIHJlYWQgcGFja2FnZS5qc29uIGZpbGVzXG4gICAgLy8gYW5kIHRoZXNlIGFyZSBub3QgcGVybWl0dGVkIGluIHRoZSBmaWxlc1tdIHNlY3Rpb24uXG4gICAgLy8gU28gd2UgcGVybWl0IHJlYWRpbmcgbm9kZV9tb2R1bGVzLyogZnJvbSBhY3Rpb24gaW5wdXRzLCBldmVuIHRob3VnaCB0aGlzXG4gICAgLy8gY2FuIGluY2x1ZGUgZGF0YVtdIGRlcGVuZGVuY2llcyBhbmQgaXMgYnJvYWRlciB0aGFuIHdlIHdvdWxkIGxpa2UuXG4gICAgLy8gVGhpcyBzaG91bGQgb25seSBiZSBlbmFibGVkIHVuZGVyIEJhemVsLCBub3QgQmxhemUuXG4gICAgaWYgKHRoaXMuYWxsb3dBY3Rpb25JbnB1dFJlYWRzICYmIGZpbGVQYXRoLmluZGV4T2YoJy9ub2RlX21vZHVsZXMvJykgPj0gMCkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5maWxlTG9hZGVyLmZpbGVFeGlzdHMoZmlsZVBhdGgpO1xuICAgICAgaWYgKERFQlVHICYmICFyZXN1bHQgJiYgdGhpcy5kZWxlZ2F0ZS5maWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgICBkZWJ1ZyhcIlBhdGggZXhpc3RzLCBidXQgaXMgbm90IHJlZ2lzdGVyZWQgaW4gdGhlIGNhY2hlXCIsIGZpbGVQYXRoKTtcbiAgICAgICAgT2JqZWN0LmtleXMoKHRoaXMuZmlsZUxvYWRlciBhcyBhbnkpLmNhY2hlLmxhc3REaWdlc3RzKS5mb3JFYWNoKGsgPT4ge1xuICAgICAgICAgIGlmIChrLmVuZHNXaXRoKHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpKSkge1xuICAgICAgICAgICAgZGVidWcoXCIgIE1heWJlIHlvdSBtZWFudCB0byBsb2FkIGZyb21cIiwgayk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmtub3duRmlsZXMuaGFzKGZpbGVQYXRoKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbigpOiBzdHJpbmcge1xuICAgIC8vIFNpbmNlIHdlIG92ZXJyaWRlIGdldERlZmF1bHRMaWJGaWxlTmFtZSBiZWxvdywgd2UgbXVzdCBhbHNvIHByb3ZpZGUgdGhlXG4gICAgLy8gZGlyZWN0b3J5IGNvbnRhaW5pbmcgdGhlIGZpbGUuXG4gICAgLy8gT3RoZXJ3aXNlIFR5cGVTY3JpcHQgbG9va3MgaW4gQzpcXGxpYi54eHguZC50cyBmb3IgdGhlIGRlZmF1bHQgbGliLlxuICAgIHJldHVybiBwYXRoLmRpcm5hbWUoXG4gICAgICAgIHRoaXMuZ2V0RGVmYXVsdExpYkZpbGVOYW1lKHt0YXJnZXQ6IHRzLlNjcmlwdFRhcmdldC5FUzV9KSk7XG4gIH1cblxuICBnZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICBpZiAodGhpcy5iYXplbE9wdHMubm9kZU1vZHVsZXNQcmVmaXgpIHtcbiAgICAgIHJldHVybiBwYXRoLmpvaW4oXG4gICAgICAgICAgdGhpcy5iYXplbE9wdHMubm9kZU1vZHVsZXNQcmVmaXgsICd0eXBlc2NyaXB0L2xpYicsXG4gICAgICAgICAgdHMuZ2V0RGVmYXVsdExpYkZpbGVOYW1lKHt0YXJnZXQ6IHRzLlNjcmlwdFRhcmdldC5FUzV9KSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zKTtcbiAgfVxuXG4gIHJlYWxwYXRoKHM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gdHNjLXdyYXBwZWQgcmVsaWVzIG9uIHN0cmluZyBtYXRjaGluZyBvZiBmaWxlIHBhdGhzIGZvciB0aGluZ3MgbGlrZSB0aGVcbiAgICAvLyBmaWxlIGNhY2hlIGFuZCBmb3Igc3RyaWN0IGRlcHMgY2hlY2tpbmcuXG4gICAgLy8gVHlwZVNjcmlwdCB3aWxsIHRyeSB0byByZXNvbHZlIHN5bWxpbmtzIGR1cmluZyBtb2R1bGUgcmVzb2x1dGlvbiB3aGljaFxuICAgIC8vIG1ha2VzIG91ciBjaGVja3MgZmFpbDogdGhlIHBhdGggd2UgcmVzb2x2ZWQgYXMgYW4gaW5wdXQgaXNuJ3QgdGhlIHNhbWVcbiAgICAvLyBvbmUgdGhlIG1vZHVsZSByZXNvbHZlciB3aWxsIGxvb2sgZm9yLlxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvcHVsbC8xMjAyMFxuICAgIC8vIFNvIHdlIHNpbXBseSB0dXJuIG9mZiBzeW1saW5rIHJlc29sdXRpb24uXG4gICAgcmV0dXJuIHM7XG4gIH1cblxuICAvLyBEZWxlZ2F0ZSBldmVyeXRoaW5nIGVsc2UgdG8gdGhlIG9yaWdpbmFsIGNvbXBpbGVyIGhvc3QuXG5cbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q2Fub25pY2FsRmlsZU5hbWUocGF0aCk7XG4gIH1cblxuICBnZXRDdXJyZW50RGlyZWN0b3J5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q3VycmVudERpcmVjdG9yeSgpO1xuICB9XG5cbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS51c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzKCk7XG4gIH1cblxuICBnZXROZXdMaW5lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0TmV3TGluZSgpO1xuICB9XG5cbiAgZ2V0RGlyZWN0b3JpZXMocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0RGlyZWN0b3JpZXMocGF0aCk7XG4gIH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUucmVhZEZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgdHJhY2Uoczogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc29sZS5lcnJvcihzKTtcbiAgfVxufVxuIl19