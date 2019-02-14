/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "path", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path = require("path");
    var ts = require("typescript");
    /**
     * Prints messages to stderr if the given config object contains certain known
     * properties that Bazel will override in the generated tsconfig.json.
     * Note that this is not an exhaustive list of such properties; just the ones
     * thought to commonly cause problems.
     * Note that we can't error out, because users might have a legitimate reason:
     * - during a transition to Bazel they can use the same tsconfig with other
     *   tools
     * - if they have multiple packages in their repo, they might need to use path
     *   mapping so the editor knows where to resolve some absolute imports
     *
     * @param userConfig the parsed json for the full tsconfig.json file
     */
    function warnOnOverriddenOptions(userConfig) {
        var e_1, _a;
        var overrideWarnings = [];
        if (userConfig.files) {
            overrideWarnings.push('files is ignored because it is controlled by the srcs[] attribute');
        }
        var options = userConfig.compilerOptions;
        if (options) {
            if (options.target || options.module) {
                overrideWarnings.push('compilerOptions.target and compilerOptions.module are controlled by downstream dependencies, such as ts_devserver');
            }
            if (options.declaration) {
                overrideWarnings.push("compilerOptions.declaration is always true, as it's needed for dependent libraries to type-check");
            }
            if (options.paths) {
                overrideWarnings.push('compilerOptions.paths is determined by the module_name attribute in transitive deps[]');
            }
            if (options.typeRoots) {
                overrideWarnings.push('compilerOptions.typeRoots is always set to the @types subdirectory of the node_modules attribute');
            }
            if (options.traceResolution || options.diagnostics) {
                overrideWarnings.push('compilerOptions.traceResolution and compilerOptions.diagnostics are set by the DEBUG flag in tsconfig.bzl under rules_typescript');
            }
            if (options.rootDir || options.baseUrl) {
                overrideWarnings.push('compilerOptions.rootDir and compilerOptions.baseUrl are always the workspace root directory');
            }
            if (options.preserveConstEnums) {
                overrideWarnings.push('compilerOptions.preserveConstEnums is always false under Bazel');
            }
            if (options.noEmitOnError) {
                // TODO(alexeagle): why??
                overrideWarnings.push('compilerOptions.noEmitOnError is always false under Bazel');
            }
        }
        if (overrideWarnings.length) {
            console.error('\nWARNING: your tsconfig.json file specifies options which are overridden by Bazel:');
            try {
                for (var overrideWarnings_1 = __values(overrideWarnings), overrideWarnings_1_1 = overrideWarnings_1.next(); !overrideWarnings_1_1.done; overrideWarnings_1_1 = overrideWarnings_1.next()) {
                    var w = overrideWarnings_1_1.value;
                    console.error(" - " + w);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (overrideWarnings_1_1 && !overrideWarnings_1_1.done && (_a = overrideWarnings_1.return)) _a.call(overrideWarnings_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            console.error('\n');
        }
    }
    /**
     * The same as Node's path.resolve, however it returns a path with forward
     * slashes rather than joining the resolved path with the platform's path
     * separator.
     * Note that even path.posix.resolve('.') returns C:\Users\... with backslashes.
     */
    function resolveNormalizedPath() {
        var segments = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            segments[_i] = arguments[_i];
        }
        return path.resolve.apply(path, __spread(segments)).replace(/\\/g, '/');
    }
    exports.resolveNormalizedPath = resolveNormalizedPath;
    /**
     * Load a tsconfig.json and convert all referenced paths (including
     * bazelOptions) to absolute paths.
     * Paths seen by TypeScript should be absolute, to match behavior
     * of the tsc ModuleResolution implementation.
     * @param tsconfigFile path to tsconfig, relative to process.cwd() or absolute
     * @return configuration parsed from the file, or error diagnostics
     */
    function parseTsconfig(tsconfigFile, host) {
        if (host === void 0) { host = ts.sys; }
        var e_2, _a;
        // TypeScript expects an absolute path for the tsconfig.json file
        tsconfigFile = resolveNormalizedPath(tsconfigFile);
        var _b = ts.readConfigFile(tsconfigFile, host.readFile), config = _b.config, error = _b.error;
        if (error) {
            // target is in the config file we failed to load...
            return [null, [error], { target: '' }];
        }
        // Handle bazel specific options, but make sure not to crash when reading a
        // vanilla tsconfig.json.
        var bazelOpts = config.bazelOptions || {};
        var target = bazelOpts.target;
        bazelOpts.allowedStrictDeps = bazelOpts.allowedStrictDeps || [];
        bazelOpts.typeBlackListPaths = bazelOpts.typeBlackListPaths || [];
        bazelOpts.compilationTargetSrc = bazelOpts.compilationTargetSrc || [];
        // Allow Bazel users to control some of the bazel options.
        // Since TypeScript's "extends" mechanism applies only to "compilerOptions"
        // we have to repeat some of their logic to get the user's bazelOptions.
        if (config.extends) {
            var userConfigFile = resolveNormalizedPath(path.dirname(tsconfigFile), config.extends);
            if (!userConfigFile.endsWith('.json'))
                userConfigFile += '.json';
            var _c = ts.readConfigFile(userConfigFile, host.readFile), userConfig = _c.config, error_1 = _c.error;
            if (error_1) {
                return [null, [error_1], { target: target }];
            }
            if (userConfig.bazelOptions) {
                bazelOpts.disableStrictDeps = bazelOpts.disableStrictDeps ||
                    userConfig.bazelOptions.disableStrictDeps;
                bazelOpts.suppressTsconfigOverrideWarnings =
                    bazelOpts.suppressTsconfigOverrideWarnings ||
                        userConfig.bazelOptions.suppressTsconfigOverrideWarnings;
                bazelOpts.tsickle = bazelOpts.tsickle || userConfig.bazelOptions.tsickle;
                bazelOpts.googmodule =
                    bazelOpts.googmodule || userConfig.bazelOptions.googmodule;
            }
            if (!bazelOpts.suppressTsconfigOverrideWarnings) {
                warnOnOverriddenOptions(userConfig);
            }
        }
        var _d = ts.parseJsonConfigFileContent(config, host, path.dirname(tsconfigFile)), options = _d.options, errors = _d.errors, fileNames = _d.fileNames;
        if (errors && errors.length) {
            return [null, errors, { target: target }];
        }
        // Sort rootDirs with longest include directories first.
        // When canonicalizing paths, we always want to strip
        // `workspace/bazel-bin/file` to just `file`, not to `bazel-bin/file`.
        if (options.rootDirs)
            options.rootDirs.sort(function (a, b) { return b.length - a.length; });
        // If the user requested goog.module, we need to produce that output even if
        // the generated tsconfig indicates otherwise.
        if (bazelOpts.googmodule)
            options.module = ts.ModuleKind.CommonJS;
        // TypeScript's parseJsonConfigFileContent returns paths that are joined, eg.
        // /path/to/project/bazel-out/arch/bin/path/to/package/../../../../../../path
        // We normalize them to remove the intermediate parent directories.
        // This improves error messages and also matches logic in tsc_wrapped where we
        // expect normalized paths.
        var files = fileNames.map(function (f) { return path.posix.normalize(f); });
        // The bazelOpts paths in the tsconfig are relative to
        // options.rootDir (the workspace root) and aren't transformed by
        // parseJsonConfigFileContent (because TypeScript doesn't know
        // about them). Transform them to also be absolute here.
        bazelOpts.compilationTargetSrc = bazelOpts.compilationTargetSrc.map(function (f) { return resolveNormalizedPath(options.rootDir, f); });
        bazelOpts.allowedStrictDeps = bazelOpts.allowedStrictDeps.map(function (f) { return resolveNormalizedPath(options.rootDir, f); });
        bazelOpts.typeBlackListPaths = bazelOpts.typeBlackListPaths.map(function (f) { return resolveNormalizedPath(options.rootDir, f); });
        if (bazelOpts.nodeModulesPrefix) {
            bazelOpts.nodeModulesPrefix =
                resolveNormalizedPath(options.rootDir, bazelOpts.nodeModulesPrefix);
        }
        var disabledTsetseRules = [];
        try {
            for (var _e = __values(options['plugins'] ||
                []), _f = _e.next(); !_f.done; _f = _e.next()) {
                var pluginConfig = _f.value;
                if (pluginConfig.name && pluginConfig.name === '@bazel/tsetse') {
                    var disabledRules = pluginConfig['disabledRules'];
                    if (disabledRules && !Array.isArray(disabledRules)) {
                        throw new Error('Disabled tsetse rules must be an array of rule names');
                    }
                    disabledTsetseRules = disabledRules;
                    break;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return [
            { options: options, bazelOpts: bazelOpts, files: files, config: config, disabledTsetseRules: disabledTsetseRules }, null, { target: target }
        ];
    }
    exports.parseTsconfig = parseTsconfig;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2Nfd3JhcHBlZC90c2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVILDJCQUE2QjtJQUM3QiwrQkFBaUM7SUEySmpDOzs7Ozs7Ozs7Ozs7T0FZRztJQUNILFNBQVMsdUJBQXVCLENBQUMsVUFBZTs7UUFDOUMsSUFBTSxnQkFBZ0IsR0FBYSxFQUFFLENBQUM7UUFDdEMsSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFO1lBQ3BCLGdCQUFnQixDQUFDLElBQUksQ0FDakIsbUVBQW1FLENBQUMsQ0FBQztTQUMxRTtRQUNELElBQU0sT0FBTyxHQUF1QixVQUFVLENBQUMsZUFBZSxDQUFDO1FBQy9ELElBQUksT0FBTyxFQUFFO1lBQ1gsSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7Z0JBQ3BDLGdCQUFnQixDQUFDLElBQUksQ0FDakIsbUhBQW1ILENBQUMsQ0FBQzthQUMxSDtZQUNELElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRTtnQkFDdkIsZ0JBQWdCLENBQUMsSUFBSSxDQUNqQixrR0FBa0csQ0FBQyxDQUFDO2FBQ3pHO1lBQ0QsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO2dCQUNqQixnQkFBZ0IsQ0FBQyxJQUFJLENBQ2pCLHVGQUF1RixDQUFDLENBQUM7YUFDOUY7WUFDRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUU7Z0JBQ3JCLGdCQUFnQixDQUFDLElBQUksQ0FDakIsa0dBQWtHLENBQUMsQ0FBQzthQUN6RztZQUNELElBQUksT0FBTyxDQUFDLGVBQWUsSUFBSyxPQUFlLENBQUMsV0FBVyxFQUFFO2dCQUMzRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQ2pCLGtJQUFrSSxDQUFDLENB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WUFBWSxXQUFBO2dCQUVyQixJQUFJLFlBQVksQ0FBQyxJQUFJLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxlQUFlLEVBQUU7b0JBQzlELElBQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDcEQsSUFBSSxhQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFO3dCQUNsRCxNQUFNLElBQUksS0FBSyxDQUFDLHNEQUFzRCxDQUFDLENBQUM7cUJBQ3pFO29CQUNELG1CQUFtQixHQUFHLGFBQXlCLENBQUM7b0JBQ2hELE1BQU07aUJBQ1A7YUFDRjs7Ozs7Ozs7O1FBRUQsT0FBTztZQUNMLEVBQUMsT0FBTyxTQUFBLEVBQUUsU0FBUyxXQUFBLEVBQUUsS0FBSyxPQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUUsbUJBQW1CLHFCQUFBLEVBQUMsRUFBRSxJQUFJLEVBQUUsRUFBQyxNQUFNLFFBQUEsRUFBQztTQUN6RSxDQUFDO0lBQ0osQ0FBQztJQXBHRCxzQ0FvR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBUaGUgQmF6ZWwgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICpcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIFRoZSBjb25maWd1cmF0aW9uIGJsb2NrIHByb3ZpZGVkIGJ5IHRoZSB0c2NvbmZpZyBcImJhemVsT3B0aW9uc1wiLlxuICogTm90ZSB0aGF0IGFsbCBwYXRocyBoZXJlIGFyZSByZWxhdGl2ZSB0byB0aGUgcm9vdERpciwgbm90IGFic29sdXRlIG5vclxuICogcmVsYXRpdmUgdG8gdGhlIGxvY2F0aW9uIGNvbnRhaW5pbmcgdGhlIHRzY29uZmlnIGZpbGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQmF6ZWxPcHRpb25zIHtcbiAgLyoqIE5hbWUgb2YgdGhlIGJhemVsIHdvcmtzcGFjZSB3aGVyZSB3ZSBhcmUgYnVpbGRpbmcuICovXG4gIHdvcmtzcGFjZU5hbWU6IHN0cmluZztcblxuICAvKiogVGhlIGZ1bGwgYmF6ZWwgdGFyZ2V0IHRoYXQgaXMgYmVpbmcgYnVpbHQsIGUuZy4gLy9teS9wa2c6bGlicmFyeS4gKi9cbiAgdGFyZ2V0OiBzdHJpbmc7XG5cbiAgLyoqIFRoZSBiYXplbCBwYWNrYWdlLCBlZyBteS9wa2cgKi9cbiAgcGFja2FnZTogc3RyaW5nO1xuXG4gIC8qKiBJZiB0cnVlLCBjb252ZXJ0IHJlcXVpcmUoKXMgaW50byBnb29nLm1vZHVsZSgpLiAqL1xuICBnb29nbW9kdWxlOiBib29sZWFuO1xuXG4gIC8qKiBJZiB0cnVlLCBlbWl0IEVTNSBpbnRvIGZpbGVuYW1lLmVzNS5qcy4gKi9cbiAgZXM1TW9kZTogYm9vbGVhbjtcblxuICAvKiogSWYgdHJ1ZSwgY29udmVydCBUeXBlU2NyaXB0IGNvZGUgaW50byBhIENsb3N1cmUtY29tcGF0aWJsZSB2YXJpYW50LiAqL1xuICB0c2lja2xlOiBib29sZWFuO1xuXG4gIC8qKiBJZiB0cnVlLCBnZW5lcmF0ZSBleHRlcm5zIGZyb20gZGVjbGFyYXRpb25zIGluIGQudHMgZmlsZXMuICovXG4gIHRzaWNrbGVHZW5lcmF0ZUV4dGVybnM6IGJvb2xlYW47XG5cbiAgLyoqIFdyaXRlIGdlbmVyYXRlZCBleHRlcm5zIHRvIHRoZSBnaXZlbiBwYXRoLiAqL1xuICB0c2lja2xlRXh0ZXJuc1BhdGg6IHN0cmluZztcblxuICAvKiogUGF0aHMgb2YgZGVjbGFyYXRpb25zIHdob3NlIHR5cGVzIG11c3Qgbm90IGFwcGVhciBpbiByZXN1bHQgLmQudHMuICovXG4gIHR5cGVCbGFja0xpc3RQYXRoczogc3RyaW5nW107XG5cbiAgLyoqIElmIHRydWUsIGVtaXQgQ2xvc3VyZSB0eXBlcyBpbiBUeXBlU2NyaXB0LT5KUyBvdXRwdXQuICovXG4gIHVudHlwZWQ6IGJvb2xlYW47XG5cbiAgLyoqIFRoZSBsaXN0IG9mIHNvdXJjZXMgd2UncmUgaW50ZXJlc3RlZCBpbiAoZW1pdHRpbmcgYW5kIHR5cGUgY2hlY2tpbmcpLiAqL1xuICBjb21waWxhdGlvblRhcmdldFNyYzogc3RyaW5nW107XG5cbiAgLyoqIFBhdGggdG8gd3JpdGUgdGhlIG1vZHVsZSBkZXBlbmRlbmN5IG1hbmlmZXN0IHRvLiAqL1xuICBtYW5pZmVzdDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGRpc2FibGUgc3RyaWN0IGRlcHMgY2hlY2suIElmIHRydWUgdGhlIG5leHQgcGFyYW1ldGVyIGlzXG4gICAqIGlnbm9yZWQuXG4gICAqL1xuICBkaXNhYmxlU3RyaWN0RGVwcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFBhdGhzIG9mIGRlcGVuZGVuY2llcyB0aGF0IGFyZSBhbGxvd2VkIGJ5IHN0cmljdCBkZXBzLCBpLmUuIHRoYXQgbWF5IGJlXG4gICAqIGltcG9ydGVkIGJ5IHRoZSBzb3VyY2UgZmlsZXMgaW4gY29tcGlsYXRpb25UYXJnZXRTcmMuXG4gICAqL1xuICBhbGxvd2VkU3RyaWN0RGVwczogc3RyaW5nW107XG5cbiAgLyoqIFdyaXRlIGEgcGVyZm9ybWFuY2UgdHJhY2UgdG8gdGhpcyBwYXRoLiBEaXNhYmxlZCB3aGVuIGZhbHN5LiAqL1xuICBwZXJmVHJhY2VQYXRoPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBBbiBhZGRpdGlvbmFsIHByZWx1ZGUgdG8gaW5zZXJ0IGFmdGVyIHRoZSBgZ29vZy5tb2R1bGVgIGNhbGwsXG4gICAqIGUuZy4gd2l0aCBhZGRpdGlvbmFsIGltcG9ydHMgb3IgcmVxdWlyZXMuXG4gICAqL1xuICBwcmVsdWRlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIGN1cnJlbnQgbG9jYWxlIGlmIHByb2Nlc3NpbmcgYSBsb2NhbGUtc3BlY2lmaWMgZmlsZS5cbiAgICovXG4gIGxvY2FsZT86IHN0cmluZztcblxuICAvKipcbiAgICogQSBsaXN0IG9mIGVycm9ycyB0aGlzIGNvbXBpbGF0aW9uIGlzIGV4cGVjdGVkIHRvIGdlbmVyYXRlLCBpbiB0aGUgZm9ybVxuICAgKiBcIlRTMTIzNDpyZWdleHBcIi4gSWYgZW1wdHksIGNvbXBpbGF0aW9uIGlzIGV4cGVjdGVkIHRvIHN1Y2NlZWQuXG4gICAqL1xuICBleHBlY3RlZERpYWdub3N0aWNzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogVG8gc3VwcG9ydCBub2RlX21vZHVsZSByZXNvbHV0aW9uLCBhbGxvdyBUeXBlU2NyaXB0IHRvIG1ha2UgYXJiaXRyYXJ5XG4gICAqIGZpbGUgc3lzdGVtIGFjY2VzcyB0byBwYXRocyB1bmRlciB0aGlzIHByZWZpeC5cbiAgICovXG4gIG5vZGVNb2R1bGVzUHJlZml4OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIExpc3Qgb2YgcmVnZXhlcyBvbiBmaWxlIHBhdGhzIGZvciB3aGljaCB3ZSBzdXBwcmVzcyB0c2lja2xlJ3Mgd2FybmluZ3MuXG4gICAqL1xuICBpZ25vcmVXYXJuaW5nUGF0aHM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGFkZCBhbGlhc2VzIHRvIHRoZSAuZC50cyBmaWxlcyB0byBhZGQgdGhlIGV4cG9ydHMgdG8gdGhlXG4gICAqIOCyoF/gsqAuY2x1dHogbmFtZXNwYWNlLlxuICAgKi9cbiAgYWRkRHRzQ2x1dHpBbGlhc2VzOiB0cnVlO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHR5cGUgY2hlY2sgaW5wdXRzIHRoYXQgYXJlbid0IHNyY3MuICBEaWZmZXJzIGZyb21cbiAgICogLS1za2lwTGliQ2hlY2ssIHdoaWNoIHNraXBzIGFsbCAuZC50cyBmaWxlcywgZXZlbiB0aG9zZSB3aGljaCBhcmVcbiAgICogc3Jjcy5cbiAgICovXG4gIHR5cGVDaGVja0RlcGVuZGVuY2llczogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIG1heGltdW0gY2FjaGUgc2l6ZSBmb3IgYmF6ZWwgb3V0cHV0cywgaW4gbWVnYWJ5dGVzLlxuICAgKi9cbiAgbWF4Q2FjaGVTaXplTWI/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFN1cHByZXNzIHdhcm5pbmdzIGFib3V0IHRzY29uZmlnLmpzb24gcHJvcGVydGllcyB0aGF0IGFyZSBvdmVycmlkZGVuLlxuICAgKi9cbiAgc3VwcHJlc3NUc2NvbmZpZ092ZXJyaWRlV2FybmluZ3M6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFuIGV4cGxpY2l0IG5hbWUgZm9yIHRoaXMgbW9kdWxlLCBnaXZlbiBieSB0aGUgbW9kdWxlX25hbWUgYXR0cmlidXRlIG9uIGFcbiAgICogdHNfbGlicmFyeS5cbiAgICovXG4gIG1vZHVsZU5hbWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEFuIGV4cGxpY2l0IGVudHJ5IHBvaW50IGZvciB0aGlzIG1vZHVsZSwgZ2l2ZW4gYnkgdGhlIG1vZHVsZV9yb290IGF0dHJpYnV0ZVxuICAgKiBvbiBhIHRzX2xpYnJhcnkuXG4gICAqL1xuICBtb2R1bGVSb290Pzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBJZiB0cnVlLCBpbmRpY2F0ZXMgdGhhdCB0aGlzIGpvYiBpcyB0cmFuc3BpbGluZyBKUyBzb3VyY2VzLiBJZiB0cnVlLCBvbmx5XG4gICAqIG9uZSBmaWxlIGNhbiBhcHBlYXIgaW4gY29tcGlsYXRpb25UYXJnZXRTcmMsIGFuZCB0cmFuc3BpbGVkSnNPdXRwdXRGaWxlTmFtZVxuICAgKiBtdXN0IGJlIHNldC5cbiAgICovXG4gIGlzSnNUcmFuc3BpbGF0aW9uPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIHBhdGggd2hlcmUgdGhlIGZpbGUgY29udGFpbmluZyB0aGUgSlMgdHJhbnNwaWxlZCBvdXRwdXQgc2hvdWxkXG4gICAqIGJlIHdyaXR0ZW4uIElnbm9yZWQgaWYgaXNKc1RyYW5zcGlsYXRpb24gaXMgZmFsc2UuXG4gICAqL1xuICB0cmFuc3BpbGVkSnNPdXRwdXRGaWxlTmFtZT86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgdXNlciBwcm92aWRlZCBhbiBpbXBsZW1lbnRhdGlvbiBzaGltIGZvciAuZC50cyBmaWxlcyBpbiB0aGVcbiAgICogY29tcGlsYXRpb24gdW5pdC5cbiAgICovXG4gIGhhc0ltcGxlbWVudGF0aW9uPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRUc0NvbmZpZyB7XG4gIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucztcbiAgYmF6ZWxPcHRzOiBCYXplbE9wdGlvbnM7XG4gIGZpbGVzOiBzdHJpbmdbXTtcbiAgZGlzYWJsZWRUc2V0c2VSdWxlczogc3RyaW5nW107XG4gIGNvbmZpZzoge307XG59XG5cbi8vIFRPRE8oY2FsZWJlZ2cpOiBVcHN0cmVhbT9cbmludGVyZmFjZSBQbHVnaW5JbXBvcnRXaXRoQ29uZmlnIGV4dGVuZHMgdHMuUGx1Z2luSW1wb3J0IHtcbiAgW29wdGlvbk5hbWU6IHN0cmluZ106IHN0cmluZ3x7fTtcbn1cblxuLyoqXG4gKiBQcmludHMgbWVzc2FnZXMgdG8gc3RkZXJyIGlmIHRoZSBnaXZlbiBjb25maWcgb2JqZWN0IGNvbnRhaW5zIGNlcnRhaW4ga25vd25cbiAqIHByb3BlcnRpZXMgdGhhdCBCYXplbCB3aWxsIG92ZXJyaWRlIGluIHRoZSBnZW5lcmF0ZWQgdHNjb25maWcuanNvbi5cbiAqIE5vdGUgdGhhdCB0aGlzIGlzIG5vdCBhbiBleGhhdXN0aXZlIGxpc3Qgb2Ygc3VjaCBwcm9wZXJ0aWVzOyBqdXN0IHRoZSBvbmVzXG4gKiB0aG91Z2h0IHRvIGNvbW1vbmx5IGNhdXNlIHByb2JsZW1zLlxuICogTm90ZSB0aGF0IHdlIGNhbid0IGVycm9yIG91dCwgYmVjYXVzZSB1c2VycyBtaWdodCBoYXZlIGEgbGVnaXRpbWF0ZSByZWFzb246XG4gKiAtIGR1cmluZyBhIHRyYW5zaXRpb24gdG8gQmF6ZWwgdGhleSBjYW4gdXNlIHRoZSBzYW1lIHRzY29uZmlnIHdpdGggb3RoZXJcbiAqICAgdG9vbHNcbiAqIC0gaWYgdGhleSBoYXZlIG11bHRpcGxlIHBhY2thZ2VzIGluIHRoZWlyIHJlcG8sIHRoZXkgbWlnaHQgbmVlZCB0byB1c2UgcGF0aFxuICogICBtYXBwaW5nIHNvIHRoZSBlZGl0b3Iga25vd3Mgd2hlcmUgdG8gcmVzb2x2ZSBzb21lIGFic29sdXRlIGltcG9ydHNcbiAqXG4gKiBAcGFyYW0gdXNlckNvbmZpZyB0aGUgcGFyc2VkIGpzb24gZm9yIHRoZSBmdWxsIHRzY29uZmlnLmpzb24gZmlsZVxuICovXG5mdW5jdGlvbiB3YXJuT25PdmVycmlkZGVuT3B0aW9ucyh1c2VyQ29uZmlnOiBhbnkpIHtcbiAgY29uc3Qgb3ZlcnJpZGVXYXJuaW5nczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKHVzZXJDb25maWcuZmlsZXMpIHtcbiAgICBvdmVycmlkZVdhcm5pbmdzLnB1c2goXG4gICAgICAgICdmaWxlcyBpcyBpZ25vcmVkIGJlY2F1c2UgaXQgaXMgY29udHJvbGxlZCBieSB0aGUgc3Jjc1tdIGF0dHJpYnV0ZScpO1xuICB9XG4gIGNvbnN0IG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyA9IHVzZXJDb25maWcuY29tcGlsZXJPcHRpb25zO1xuICBpZiAob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLnRhcmdldCB8fCBvcHRpb25zLm1vZHVsZSkge1xuICAgICAgb3ZlcnJpZGVXYXJuaW5ncy5wdXNoKFxuICAgICAgICAgICdjb21waWxlck9wdGlvbnMudGFyZ2V0IGFuZCBjb21waWxlck9wdGlvbnMubW9kdWxlIGFyZSBjb250cm9sbGVkIGJ5IGRvd25zdHJlYW0gZGVwZW5kZW5jaWVzLCBzdWNoIGFzIHRzX2RldnNlcnZlcicpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5kZWNsYXJhdGlvbikge1xuICAgICAgb3ZlcnJpZGVXYXJuaW5ncy5wdXNoKFxuICAgICAgICAgIGBjb21waWxlck9wdGlvbnMuZGVjbGFyYXRpb24gaXMgYWx3YXlzIHRydWUsIGFzIGl0J3MgbmVlZGVkIGZvciBkZXBlbmRlbnQgbGlicmFyaWVzIHRvIHR5cGUtY2hlY2tgKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMucGF0aHMpIHtcbiAgICAgIG92ZXJyaWRlV2FybmluZ3MucHVzaChcbiAgICAgICAgICAnY29tcGlsZXJPcHRpb25zLnBhdGhzIGlzIGRldGVybWluZWQgYnkgdGhlIG1vZHVsZV9uYW1lIGF0dHJpYnV0ZSBpbiB0cmFuc2l0aXZlIGRlcHNbXScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50eXBlUm9vdHMpIHtcbiAgICAgIG92ZXJyaWRlV2FybmluZ3MucHVzaChcbiAgICAgICAgICAnY29tcGlsZXJPcHRpb25zLnR5cGVSb290cyBpcyBhbHdheXMgc2V0IHRvIHRoZSBAdHlwZXMgc3ViZGlyZWN0b3J5IG9mIHRoZSBub2RlX21vZHVsZXMgYXR0cmlidXRlJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRyYWNlUmVzb2x1dGlvbiB8fCAob3B0aW9ucyBhcyBhbnkpLmRpYWdub3N0aWNzKSB7XG4gICAgICBvdmVycmlkZVdhcm5pbmdzLnB1c2goXG4gICAgICAgICAgJ2NvbXBpbGVyT3B0aW9ucy50cmFjZVJlc29sdXRpb24gYW5kIGNvbXBpbGVyT3B0aW9ucy5kaWFnbm9zdGljcyBhcmUgc2V0IGJ5IHRoZSBERUJVRyBmbGFnIGluIHRzY29uZmlnLmJ6bCB1bmRlciBydWxlc190eXBlc2NyaXB0Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnJvb3REaXIgfHwgb3B0aW9ucy5iYXNlVXJsKSB7XG4gICAgICBvdmVycmlkZVdhcm5pbmdzLnB1c2goXG4gICAgICAgICAgJ2NvbXBpbGVyT3B0aW9ucy5yb290RGlyIGFuZCBjb21waWxlck9wdGlvbnMuYmFzZVVybCBhcmUgYWx3YXlzIHRoZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnknKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMucHJlc2VydmVDb25zdEVudW1zKSB7XG4gICAgICBvdmVycmlkZVdhcm5pbmdzLnB1c2goXG4gICAgICAgICAgJ2NvbXBpbGVyT3B0aW9ucy5wcmVzZXJ2ZUNvbnN0RW51bXMgaXMgYWx3YXlzIGZhbHNlIHVuZGVyIEJhemVsJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5vRW1pdE9uRXJyb3IpIHtcbiAgICAgIC8vIFRPRE8oYWxleGVhZ2xlKTogd2h5Pz9cbiAgICAgIG92ZXJyaWRlV2FybmluZ3MucHVzaChcbiAgICAgICAgICAnY29tcGlsZXJPcHRpb25zLm5vRW1pdE9uRXJyb3IgaXMgYWx3YXlzIGZhbHNlIHVuZGVyIEJhemVsJyk7XG4gICAgfVxuICB9XG4gIGlmIChvdmVycmlkZVdhcm5pbmdzLmxlbmd0aCkge1xuICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICdcXG5XQVJOSU5HOiB5b3VyIHRzY29uZmlnLmpzb24gZmlsZSBzcGVjaWZpZXMgb3B0aW9ucyB3aGljaCBhcmUgb3ZlcnJpZGRlbiBieSBCYXplbDonKTtcbiAgICBmb3IgKGNvbnN0IHcgb2Ygb3ZlcnJpZGVXYXJuaW5ncykgY29uc29sZS5lcnJvcihgIC0gJHt3fWApO1xuICAgIGNvbnNvbGUuZXJyb3IoJ1xcbicpO1xuICB9XG59XG5cbi8qKlxuICogVGhlIHNhbWUgYXMgTm9kZSdzIHBhdGgucmVzb2x2ZSwgaG93ZXZlciBpdCByZXR1cm5zIGEgcGF0aCB3aXRoIGZvcndhcmRcbiAqIHNsYXNoZXMgcmF0aGVyIHRoYW4gam9pbmluZyB0aGUgcmVzb2x2ZWQgcGF0aCB3aXRoIHRoZSBwbGF0Zm9ybSdzIHBhdGhcbiAqIHNlcGFyYXRvci5cbiAqIE5vdGUgdGhhdCBldmVuIHBhdGgucG9zaXgucmVzb2x2ZSgnLicpIHJldHVybnMgQzpcXFVzZXJzXFwuLi4gd2l0aCBiYWNrc2xhc2hlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVOb3JtYWxpemVkUGF0aCguLi5zZWdtZW50czogc3RyaW5nW10pOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5yZXNvbHZlKC4uLnNlZ21lbnRzKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG59XG5cbi8qKlxuICogTG9hZCBhIHRzY29uZmlnLmpzb24gYW5kIGNvbnZlcnQgYWxsIHJlZmVyZW5jZWQgcGF0aHMgKGluY2x1ZGluZ1xuICogYmF6ZWxPcHRpb25zKSB0byBhYnNvbHV0ZSBwYXRocy5cbiAqIFBhdGhzIHNlZW4gYnkgVHlwZVNjcmlwdCBzaG91bGQgYmUgYWJzb2x1dGUsIHRvIG1hdGNoIGJlaGF2aW9yXG4gKiBvZiB0aGUgdHNjIE1vZHVsZVJlc29sdXRpb24gaW1wbGVtZW50YXRpb24uXG4gKiBAcGFyYW0gdHNjb25maWdGaWxlIHBhdGggdG8gdHNjb25maWcsIHJlbGF0aXZlIHRvIHByb2Nlc3MuY3dkKCkgb3IgYWJzb2x1dGVcbiAqIEByZXR1cm4gY29uZmlndXJhdGlvbiBwYXJzZWQgZnJvbSB0aGUgZmlsZSwgb3IgZXJyb3IgZGlhZ25vc3RpY3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVHNjb25maWcoXG4gICAgdHNjb25maWdGaWxlOiBzdHJpbmcsIGhvc3Q6IHRzLlBhcnNlQ29uZmlnSG9zdCA9IHRzLnN5cyk6XG4gICAgW1BhcnNlZFRzQ29uZmlnfG51bGwsIHRzLkRpYWdub3N0aWNbXXxudWxsLCB7dGFyZ2V0OiBzdHJpbmd9XSB7XG4gIC8vIFR5cGVTY3JpcHQgZXhwZWN0cyBhbiBhYnNvbHV0ZSBwYXRoIGZvciB0aGUgdHNjb25maWcuanNvbiBmaWxlXG4gIHRzY29uZmlnRmlsZSA9IHJlc29sdmVOb3JtYWxpemVkUGF0aCh0c2NvbmZpZ0ZpbGUpO1xuXG4gIGNvbnN0IHtjb25maWcsIGVycm9yfSA9IHRzLnJlYWRDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgaG9zdC5yZWFkRmlsZSk7XG4gIGlmIChlcnJvcikge1xuICAgIC8vIHRhcmdldCBpcyBpbiB0aGUgY29uZmlnIGZpbGUgd2UgZmFpbGVkIHRvIGxvYWQuLi5cbiAgICByZXR1cm4gW251bGwsIFtlcnJvcl0sIHt0YXJnZXQ6ICcnfV07XG4gIH1cblxuICAvLyBIYW5kbGUgYmF6ZWwgc3BlY2lmaWMgb3B0aW9ucywgYnV0IG1ha2Ugc3VyZSBub3QgdG8gY3Jhc2ggd2hlbiByZWFkaW5nIGFcbiAgLy8gdmFuaWxsYSB0c2NvbmZpZy5qc29uLlxuICBjb25zdCBiYXplbE9wdHM6IEJhemVsT3B0aW9ucyA9IGNvbmZpZy5iYXplbE9wdGlvbnMgfHwge307XG4gIGNvbnN0IHRhcmdldCA9IGJhemVsT3B0cy50YXJnZXQ7XG4gIGJhemVsT3B0cy5hbGxvd2VkU3RyaWN0RGVwcyA9IGJhemVsT3B0cy5hbGxvd2VkU3RyaWN0RGVwcyB8fCBbXTtcbiAgYmF6ZWxPcHRzLnR5cGVCbGFja0xpc3RQYXRocyA9IGJhemVsT3B0cy50eXBlQmxhY2tMaXN0UGF0aHMgfHwgW107XG4gIGJhemVsT3B0cy5jb21waWxhdGlvblRhcmdldFNyYyA9IGJhemVsT3B0cy5jb21waWxhdGlvblRhcmdldFNyYyB8fCBbXTtcblxuICAvLyBBbGxvdyBCYXplbCB1c2VycyB0byBjb250cm9sIHNvbWUgb2YgdGhlIGJhemVsIG9wdGlvbnMuXG4gIC8vIFNpbmNlIFR5cGVTY3JpcHQncyBcImV4dGVuZHNcIiBtZWNoYW5pc20gYXBwbGllcyBvbmx5IHRvIFwiY29tcGlsZXJPcHRpb25zXCJcbiAgLy8gd2UgaGF2ZSB0byByZXBlYXQgc29tZSBvZiB0aGVpciBsb2dpYyB0byBnZXQgdGhlIHVzZXIncyBiYXplbE9wdGlvbnMuXG4gIGlmIChjb25maWcuZXh0ZW5kcykge1xuICAgIGxldCB1c2VyQ29uZmlnRmlsZSA9XG4gICAgICAgIHJlc29sdmVOb3JtYWxpemVkUGF0aChwYXRoLmRpcm5hbWUodHNjb25maWdGaWxlKSwgY29uZmlnLmV4dGVuZHMpO1xuICAgIGlmICghdXNlckNvbmZpZ0ZpbGUuZW5kc1dpdGgoJy5qc29uJykpIHVzZXJDb25maWdGaWxlICs9ICcuanNvbic7XG4gICAgY29uc3Qge2NvbmZpZzogdXNlckNvbmZpZywgZXJyb3J9ID1cbiAgICAgICAgdHMucmVhZENvbmZpZ0ZpbGUodXNlckNvbmZpZ0ZpbGUsIGhvc3QucmVhZEZpbGUpO1xuICAgIGlmIChlcnJvcikge1xuICAgICAgcmV0dXJuIFtudWxsLCBbZXJyb3JdLCB7dGFyZ2V0fV07XG4gICAgfVxuICAgIGlmICh1c2VyQ29uZmlnLmJhemVsT3B0aW9ucykge1xuICAgICAgYmF6ZWxPcHRzLmRpc2FibGVTdHJpY3REZXBzID0gYmF6ZWxPcHRzLmRpc2FibGVTdHJpY3REZXBzIHx8XG4gICAgICAgICAgdXNlckNvbmZpZy5iYXplbE9wdGlvbnMuZGlzYWJsZVN0cmljdERlcHM7XG4gICAgICBiYXplbE9wdHMuc3VwcHJlc3NUc2NvbmZpZ092ZXJyaWRlV2FybmluZ3MgPVxuICAgICAgICAgIGJhemVsT3B0cy5zdXBwcmVzc1RzY29uZmlnT3ZlcnJpZGVXYXJuaW5ncyB8fFxuICAgICAgICAgIHVzZXJDb25maWcuYmF6ZWxPcHRpb25zLnN1cHByZXNzVHNjb25maWdPdmVycmlkZVdhcm5pbmdzO1xuICAgICAgYmF6ZWxPcHRzLnRzaWNrbGUgPSBiYXplbE9wdHMudHNpY2tsZSB8fCB1c2VyQ29uZmlnLmJhemVsT3B0aW9ucy50c2lja2xlO1xuICAgICAgYmF6ZWxPcHRzLmdvb2dtb2R1bGUgPVxuICAgICAgICAgIGJhemVsT3B0cy5nb29nbW9kdWxlIHx8IHVzZXJDb25maWcuYmF6ZWxPcHRpb25zLmdvb2dtb2R1bGU7XG4gICAgfVxuICAgIGlmICghYmF6ZWxPcHRzLnN1cHByZXNzVHNjb25maWdPdmVycmlkZVdhcm5pbmdzKSB7XG4gICAgICB3YXJuT25PdmVycmlkZGVuT3B0aW9ucyh1c2VyQ29uZmlnKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCB7b3B0aW9ucywgZXJyb3JzLCBmaWxlTmFtZXN9ID1cbiAgICAgIHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KGNvbmZpZywgaG9zdCwgcGF0aC5kaXJuYW1lKHRzY29uZmlnRmlsZSkpO1xuICBpZiAoZXJyb3JzICYmIGVycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gW251bGwsIGVycm9ycywge3RhcmdldH1dO1xuICB9XG5cbiAgLy8gU29ydCByb290RGlycyB3aXRoIGxvbmdlc3QgaW5jbHVkZSBkaXJlY3RvcmllcyBmaXJzdC5cbiAgLy8gV2hlbiBjYW5vbmljYWxpemluZyBwYXRocywgd2UgYWx3YXlzIHdhbnQgdG8gc3RyaXBcbiAgLy8gYHdvcmtzcGFjZS9iYXplbC1iaW4vZmlsZWAgdG8ganVzdCBgZmlsZWAsIG5vdCB0byBgYmF6ZWwtYmluL2ZpbGVgLlxuICBpZiAob3B0aW9ucy5yb290RGlycykgb3B0aW9ucy5yb290RGlycy5zb3J0KChhLCBiKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoKTtcblxuICAvLyBJZiB0aGUgdXNlciByZXF1ZXN0ZWQgZ29vZy5tb2R1bGUsIHdlIG5lZWQgdG8gcHJvZHVjZSB0aGF0IG91dHB1dCBldmVuIGlmXG4gIC8vIHRoZSBnZW5lcmF0ZWQgdHNjb25maWcgaW5kaWNhdGVzIG90aGVyd2lzZS5cbiAgaWYgKGJhemVsT3B0cy5nb29nbW9kdWxlKSBvcHRpb25zLm1vZHVsZSA9IHRzLk1vZHVsZUtpbmQuQ29tbW9uSlM7XG5cbiAgLy8gVHlwZVNjcmlwdCdzIHBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50IHJldHVybnMgcGF0aHMgdGhhdCBhcmUgam9pbmVkLCBlZy5cbiAgLy8gL3BhdGgvdG8vcHJvamVjdC9iYXplbC1vdXQvYXJjaC9iaW4vcGF0aC90by9wYWNrYWdlLy4uLy4uLy4uLy4uLy4uLy4uL3BhdGhcbiAgLy8gV2Ugbm9ybWFsaXplIHRoZW0gdG8gcmVtb3ZlIHRoZSBpbnRlcm1lZGlhdGUgcGFyZW50IGRpcmVjdG9yaWVzLlxuICAvLyBUaGlzIGltcHJvdmVzIGVycm9yIG1lc3NhZ2VzIGFuZCBhbHNvIG1hdGNoZXMgbG9naWMgaW4gdHNjX3dyYXBwZWQgd2hlcmUgd2VcbiAgLy8gZXhwZWN0IG5vcm1hbGl6ZWQgcGF0aHMuXG4gIGNvbnN0IGZpbGVzID0gZmlsZU5hbWVzLm1hcChmID0+IHBhdGgucG9zaXgubm9ybWFsaXplKGYpKTtcblxuICAvLyBUaGUgYmF6ZWxPcHRzIHBhdGhzIGluIHRoZSB0c2NvbmZpZyBhcmUgcmVsYXRpdmUgdG9cbiAgLy8gb3B0aW9ucy5yb290RGlyICh0aGUgd29ya3NwYWNlIHJvb3QpIGFuZCBhcmVuJ3QgdHJhbnNmb3JtZWQgYnlcbiAgLy8gcGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQgKGJlY2F1c2UgVHlwZVNjcmlwdCBkb2Vzbid0IGtub3dcbiAgLy8gYWJvdXQgdGhlbSkuIFRyYW5zZm9ybSB0aGVtIHRvIGFsc28gYmUgYWJzb2x1dGUgaGVyZS5cbiAgYmF6ZWxPcHRzLmNvbXBpbGF0aW9uVGFyZ2V0U3JjID0gYmF6ZWxPcHRzLmNvbXBpbGF0aW9uVGFyZ2V0U3JjLm1hcChcbiAgICAgIGYgPT4gcmVzb2x2ZU5vcm1hbGl6ZWRQYXRoKG9wdGlvbnMucm9vdERpciEsIGYpKTtcbiAgYmF6ZWxPcHRzLmFsbG93ZWRTdHJpY3REZXBzID0gYmF6ZWxPcHRzLmFsbG93ZWRTdHJpY3REZXBzLm1hcChcbiAgICAgIGYgPT4gcmVzb2x2ZU5vcm1hbGl6ZWRQYXRoKG9wdGlvbnMucm9vdERpciEsIGYpKTtcbiAgYmF6ZWxPcHRzLnR5cGVCbGFja0xpc3RQYXRocyA9IGJhemVsT3B0cy50eXBlQmxhY2tMaXN0UGF0aHMubWFwKFxuICAgICAgZiA9PiByZXNvbHZlTm9ybWFsaXplZFBhdGgob3B0aW9ucy5yb290RGlyISwgZikpO1xuICBpZiAoYmF6ZWxPcHRzLm5vZGVNb2R1bGVzUHJlZml4KSB7XG4gICAgYmF6ZWxPcHRzLm5vZGVNb2R1bGVzUHJlZml4ID1cbiAgICAgICAgcmVzb2x2ZU5vcm1hbGl6ZWRQYXRoKG9wdGlvbnMucm9vdERpciEsIGJhemVsT3B0cy5ub2RlTW9kdWxlc1ByZWZpeCk7XG4gIH1cblxuICBsZXQgZGlzYWJsZWRUc2V0c2VSdWxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBwbHVnaW5Db25maWcgb2Ygb3B0aW9uc1sncGx1Z2lucyddIGFzIFBsdWdpbkltcG9ydFdpdGhDb25maWdbXSB8fFxuICAgICAgIFtdKSB7XG4gICAgaWYgKHBsdWdpbkNvbmZpZy5uYW1lICYmIHBsdWdpbkNvbmZpZy5uYW1lID09PSAnQGJhemVsL3RzZXRzZScpIHtcbiAgICAgIGNvbnN0IGRpc2FibGVkUnVsZXMgPSBwbHVnaW5Db25maWdbJ2Rpc2FibGVkUnVsZXMnXTtcbiAgICAgIGlmIChkaXNhYmxlZFJ1bGVzICYmICFBcnJheS5pc0FycmF5KGRpc2FibGVkUnVsZXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRGlzYWJsZWQgdHNldHNlIHJ1bGVzIG11c3QgYmUgYW4gYXJyYXkgb2YgcnVsZSBuYW1lcycpO1xuICAgICAgfVxuICAgICAgZGlzYWJsZWRUc2V0c2VSdWxlcyA9IGRpc2FibGVkUnVsZXMgYXMgc3RyaW5nW107XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gW1xuICAgIHtvcHRpb25zLCBiYXplbE9wdHMsIGZpbGVzLCBjb25maWcsIGRpc2FibGVkVHNldHNlUnVsZXN9LCBudWxsLCB7dGFyZ2V0fVxuICBdO1xufVxuIl19