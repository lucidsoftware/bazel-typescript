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
        define(["require", "exports", "path", "typescript", "./perf_trace", "./plugin_api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path = require("path");
    var ts = require("typescript");
    var perfTrace = require("./perf_trace");
    var pluginApi = require("./plugin_api");
    /** The TypeScript diagnostic code for "Cannot find module ...". */
    exports.TS_ERR_CANNOT_FIND_MODULE = 2307;
    /**
     * The strict_deps plugin checks the imports of the compiled modules.
     *
     * It implements strict deps, i.e. enforces that each file in
     * `config.compilationTargetSrc` only imports from files in
     * `config.allowedStrictDeps`.
     *
     * This is used to implement strict dependency checking -
     * source files in a build target may only import sources of their immediate
     * dependencies, but not sources of their transitive dependencies.
     *
     * strict_deps also makes sure that no imports ends in '.ts'. TypeScript
     * allows imports including the file extension, but our runtime loading support
     * fails with it.
     *
     * strict_deps currently does not check ambient/global definitions.
     */
    exports.PLUGIN = {
        wrap: function (program, config) {
            var proxy = pluginApi.createProxy(program);
            proxy.getSemanticDiagnostics = function (sourceFile) {
                var result = __spread(program.getSemanticDiagnostics(sourceFile));
                perfTrace.wrap('checkModuleDeps', function () {
                    result.push.apply(result, __spread(checkModuleDeps(sourceFile, program.getTypeChecker(), config.allowedStrictDeps, config.rootDir, config.ignoredFilesPrefixes)));
                });
                return result;
            };
            return proxy;
        }
    };
    // Exported for testing
    function checkModuleDeps(sf, tc, allowedDeps, rootDir, ignoredFilesPrefixes) {
        if (ignoredFilesPrefixes === void 0) { ignoredFilesPrefixes = []; }
        var e_1, _a, e_2, _b;
        function stripExt(fn) {
            return fn.replace(/(\.d)?\.tsx?$/, '');
        }
        var allowedMap = {};
        try {
            for (var allowedDeps_1 = __values(allowedDeps), allowedDeps_1_1 = allowedDeps_1.next(); !allowedDeps_1_1.done; allowedDeps_1_1 = allowedDeps_1.next()) {
                var d = allowedDeps_1_1.value;
                allowedMap[stripExt(d)] = true;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (allowedDeps_1_1 && !allowedDeps_1_1.done && (_a = allowedDeps_1.return)) _a.call(allowedDeps_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var result = [];
        var _loop_1 = function (stmt) {
            if (stmt.kind !== ts.SyntaxKind.ImportDeclaration &&
                stmt.kind !== ts.SyntaxKind.ExportDeclaration) {
                return "continue";
            }
            var id = stmt;
            var modSpec = id.moduleSpecifier;
            if (!modSpec)
                return "continue"; // E.g. a bare "export {x};"
            var sym = tc.getSymbolAtLocation(modSpec);
            if (!sym || !sym.declarations || sym.declarations.length < 1) {
                return "continue";
            }
            // Module imports can only have one declaration location.
            var declFileName = sym.declarations[0].getSourceFile().fileName;
            if (allowedMap[stripExt(declFileName)])
                return "continue";
            if (ignoredFilesPrefixes.some(function (p) { return declFileName.startsWith(p); }))
                return "continue";
            var importName = path.posix.relative(rootDir, declFileName);
            result.push({
                file: sf,
                start: modSpec.getStart(),
                length: modSpec.getEnd() - modSpec.getStart(),
                messageText: "transitive dependency on " + importName + " not allowed. " +
                    "Please add the BUILD target to your rule's deps.",
                category: ts.DiagnosticCategory.Error,
                // semantics are close enough, needs taze.
                code: exports.TS_ERR_CANNOT_FIND_MODULE,
            });
        };
        try {
            for (var _c = __values(sf.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
                var stmt = _d.value;
                _loop_1(stmt);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return result;
    }
    exports.checkModuleDeps = checkModuleDeps;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaWN0X2RlcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2Nfd3JhcHBlZC9zdHJpY3RfZGVwcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVILDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFFakMsd0NBQTBDO0lBQzFDLHdDQUEwQztJQWExQyxtRUFBbUU7SUFDdEQsUUFBQSx5QkFBeUIsR0FBRyxJQUFJLENBQUM7SUFFOUM7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDVSxRQUFBLE1BQU0sR0FBcUI7UUFDdEMsSUFBSSxFQUFFLFVBQUMsT0FBbUIsRUFBRSxNQUE4QjtZQUN4RCxJQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdDLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxVQUFTLFVBQXlCO2dCQUMvRCxJQUFNLE1BQU0sWUFBTyxPQUFPLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDL0QsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtvQkFDaEMsTUFBTSxDQUFDLElBQUksT0FBWCxNQUFNLFdBQVMsZUFBZSxDQUMxQixVQUFVLEVBQUUsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsRUFDOUQsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRTtnQkFDcEQsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQyxDQUFDO1lBQ0YsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0tBQ0YsQ0FBQztJQUVGLHVCQUF1QjtJQUN2QixTQUFnQixlQUFlLENBQzNCLEVBQWlCLEVBQUUsRUFBa0IsRUFBRSxXQUFxQixFQUM1RCxPQUFlLEVBQUUsb0JBQW1DO1FBQW5DLHFDQUFBLEVBQUEseUJBQW1DOztRQUN0RCxTQUFTLFFBQVEsQ0FBQyxFQUFVO1lBQzFCLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUNELElBQU0sVUFBVSxHQUFrQyxFQUFFLENBQUM7O1lBQ3JELEtBQWdCLElBQUEsZ0JBQUEsU0FBQSxXQUFXLENBQUEsd0NBQUE7Z0JBQXRCLElBQU0sQ0FBQyx3QkFBQTtnQkFBaUIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQzthQUFBOzs7Ozs7Ozs7UUFFNUQsSUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQztnQ0FDeEIsSUFBSTtZQUNiLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQjtnQkFDN0MsSUFBSSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFOzthQUVsRDtZQUNELElBQU0sRUFBRSxHQUFHLElBQW1ELENBQUM7WUFDL0QsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQztZQUNuQyxJQUFJLENBQUMsT0FBTztrQ0FBVyxDQUFFLDRCQUE0QjtZQUVyRCxJQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFOzthQUU3RDtZQUNELHlEQUF5RDtZQUN6RCxJQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUNsRSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7a0NBQVc7WUFDakQsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUExQixDQUEwQixDQUFDO2tDQUFXO1lBQ3pFLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNWLElBQUksRUFBRSxFQUFFO2dCQUNSLEtBQUssRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFO2dCQUN6QixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUU7Z0JBQzdDLFdBQVcsRUFBRSw4QkFBNEIsVUFBVSxtQkFBZ0I7b0JBQy9ELGtEQUFrRDtnQkFDdEQsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO2dCQUNyQywwQ0FBMEM7Z0JBQzFDLElBQUksRUFBRSxpQ0FBeUI7YUFDaEMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQzs7WUE1QkQsS0FBbUIsSUFBQSxLQUFBLFNBQUEsRUFBRSxDQUFDLFVBQVUsQ0FBQSxnQkFBQTtnQkFBM0IsSUFBTSxJQUFJLFdBQUE7d0JBQUosSUFBSTthQTRCZDs7Ozs7Ozs7O1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQXhDRCwwQ0F3Q0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBUaGUgQmF6ZWwgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICpcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQgKiBhcyBwZXJmVHJhY2UgZnJvbSAnLi9wZXJmX3RyYWNlJztcbmltcG9ydCAqIGFzIHBsdWdpbkFwaSBmcm9tICcuL3BsdWdpbl9hcGknO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0cmljdERlcHNQbHVnaW5Db25maWcge1xuICBjb21waWxhdGlvblRhcmdldFNyYzogc3RyaW5nW107XG4gIGFsbG93ZWRTdHJpY3REZXBzOiBzdHJpbmdbXTtcbiAgcm9vdERpcjogc3RyaW5nO1xuICAvKipcbiAgICogUGF0aHMgd2hlcmUgdXNlcnMgbWF5IGZyZWVseSBpbXBvcnQgd2l0aG91dCBkZWNsYXJlZCBkZXBlbmRlbmNpZXMuXG4gICAqIFRoaXMgaXMgdXNlZCBpbiBCYXplbCB3aGVyZSBkZXBlbmRlbmNpZXMgb24gbm9kZV9tb2R1bGVzIG1heSBiZSB1bmRlY2xhcmVkLlxuICAgKi9cbiAgaWdub3JlZEZpbGVzUHJlZml4ZXM/OiBzdHJpbmdbXTtcbn1cblxuLyoqIFRoZSBUeXBlU2NyaXB0IGRpYWdub3N0aWMgY29kZSBmb3IgXCJDYW5ub3QgZmluZCBtb2R1bGUgLi4uXCIuICovXG5leHBvcnQgY29uc3QgVFNfRVJSX0NBTk5PVF9GSU5EX01PRFVMRSA9IDIzMDc7XG5cbi8qKlxuICogVGhlIHN0cmljdF9kZXBzIHBsdWdpbiBjaGVja3MgdGhlIGltcG9ydHMgb2YgdGhlIGNvbXBpbGVkIG1vZHVsZXMuXG4gKlxuICogSXQgaW1wbGVtZW50cyBzdHJpY3QgZGVwcywgaS5lLiBlbmZvcmNlcyB0aGF0IGVhY2ggZmlsZSBpblxuICogYGNvbmZpZy5jb21waWxhdGlvblRhcmdldFNyY2Agb25seSBpbXBvcnRzIGZyb20gZmlsZXMgaW5cbiAqIGBjb25maWcuYWxsb3dlZFN0cmljdERlcHNgLlxuICpcbiAqIFRoaXMgaXMgdXNlZCB0byBpbXBsZW1lbnQgc3RyaWN0IGRlcGVuZGVuY3kgY2hlY2tpbmcgLVxuICogc291cmNlIGZpbGVzIGluIGEgYnVpbGQgdGFyZ2V0IG1heSBvbmx5IGltcG9ydCBzb3VyY2VzIG9mIHRoZWlyIGltbWVkaWF0ZVxuICogZGVwZW5kZW5jaWVzLCBidXQgbm90IHNvdXJjZXMgb2YgdGhlaXIgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMuXG4gKlxuICogc3RyaWN0X2RlcHMgYWxzbyBtYWtlcyBzdXJlIHRoYXQgbm8gaW1wb3J0cyBlbmRzIGluICcudHMnLiBUeXBlU2NyaXB0XG4gKiBhbGxvd3MgaW1wb3J0cyBpbmNsdWRpbmcgdGhlIGZpbGUgZXh0ZW5zaW9uLCBidXQgb3VyIHJ1bnRpbWUgbG9hZGluZyBzdXBwb3J0XG4gKiBmYWlscyB3aXRoIGl0LlxuICpcbiAqIHN0cmljdF9kZXBzIGN1cnJlbnRseSBkb2VzIG5vdCBjaGVjayBhbWJpZW50L2dsb2JhbCBkZWZpbml0aW9ucy5cbiAqL1xuZXhwb3J0IGNvbnN0IFBMVUdJTjogcGx1Z2luQXBpLlBsdWdpbiA9IHtcbiAgd3JhcDogKHByb2dyYW06IHRzLlByb2dyYW0sIGNvbmZpZzogU3RyaWN0RGVwc1BsdWdpbkNvbmZpZyk6IHRzLlByb2dyYW0gPT4ge1xuICAgIGNvbnN0IHByb3h5ID0gcGx1Z2luQXBpLmNyZWF0ZVByb3h5KHByb2dyYW0pO1xuICAgIHByb3h5LmdldFNlbWFudGljRGlhZ25vc3RpY3MgPSBmdW5jdGlvbihzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBbLi4ucHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUpXTtcbiAgICAgIHBlcmZUcmFjZS53cmFwKCdjaGVja01vZHVsZURlcHMnLCAoKSA9PiB7XG4gICAgICAgIHJlc3VsdC5wdXNoKC4uLmNoZWNrTW9kdWxlRGVwcyhcbiAgICAgICAgICAgIHNvdXJjZUZpbGUsIHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgY29uZmlnLmFsbG93ZWRTdHJpY3REZXBzLFxuICAgICAgICAgICAgY29uZmlnLnJvb3REaXIsIGNvbmZpZy5pZ25vcmVkRmlsZXNQcmVmaXhlcykpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gICAgcmV0dXJuIHByb3h5O1xuICB9XG59O1xuXG4vLyBFeHBvcnRlZCBmb3IgdGVzdGluZ1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrTW9kdWxlRGVwcyhcbiAgICBzZjogdHMuU291cmNlRmlsZSwgdGM6IHRzLlR5cGVDaGVja2VyLCBhbGxvd2VkRGVwczogc3RyaW5nW10sXG4gICAgcm9vdERpcjogc3RyaW5nLCBpZ25vcmVkRmlsZXNQcmVmaXhlczogc3RyaW5nW10gPSBbXSk6IHRzLkRpYWdub3N0aWNbXSB7XG4gIGZ1bmN0aW9uIHN0cmlwRXh0KGZuOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gZm4ucmVwbGFjZSgvKFxcLmQpP1xcLnRzeD8kLywgJycpO1xuICB9XG4gIGNvbnN0IGFsbG93ZWRNYXA6IHtbZmlsZU5hbWU6IHN0cmluZ106IGJvb2xlYW59ID0ge307XG4gIGZvciAoY29uc3QgZCBvZiBhbGxvd2VkRGVwcykgYWxsb3dlZE1hcFtzdHJpcEV4dChkKV0gPSB0cnVlO1xuXG4gIGNvbnN0IHJlc3VsdDogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGZvciAoY29uc3Qgc3RtdCBvZiBzZi5zdGF0ZW1lbnRzKSB7XG4gICAgaWYgKHN0bXQua2luZCAhPT0gdHMuU3ludGF4S2luZC5JbXBvcnREZWNsYXJhdGlvbiAmJlxuICAgICAgICBzdG10LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuRXhwb3J0RGVjbGFyYXRpb24pIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBpZCA9IHN0bXQgYXMgdHMuSW1wb3J0RGVjbGFyYXRpb24gfCB0cy5FeHBvcnREZWNsYXJhdGlvbjtcbiAgICBjb25zdCBtb2RTcGVjID0gaWQubW9kdWxlU3BlY2lmaWVyO1xuICAgIGlmICghbW9kU3BlYykgY29udGludWU7ICAvLyBFLmcuIGEgYmFyZSBcImV4cG9ydCB7eH07XCJcblxuICAgIGNvbnN0IHN5bSA9IHRjLmdldFN5bWJvbEF0TG9jYXRpb24obW9kU3BlYyk7XG4gICAgaWYgKCFzeW0gfHwgIXN5bS5kZWNsYXJhdGlvbnMgfHwgc3ltLmRlY2xhcmF0aW9ucy5sZW5ndGggPCAxKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgLy8gTW9kdWxlIGltcG9ydHMgY2FuIG9ubHkgaGF2ZSBvbmUgZGVjbGFyYXRpb24gbG9jYXRpb24uXG4gICAgY29uc3QgZGVjbEZpbGVOYW1lID0gc3ltLmRlY2xhcmF0aW9uc1swXS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgaWYgKGFsbG93ZWRNYXBbc3RyaXBFeHQoZGVjbEZpbGVOYW1lKV0pIGNvbnRpbnVlO1xuICAgIGlmIChpZ25vcmVkRmlsZXNQcmVmaXhlcy5zb21lKHAgPT4gZGVjbEZpbGVOYW1lLnN0YXJ0c1dpdGgocCkpKSBjb250aW51ZTtcbiAgICBjb25zdCBpbXBvcnROYW1lID0gcGF0aC5wb3NpeC5yZWxhdGl2ZShyb290RGlyLCBkZWNsRmlsZU5hbWUpO1xuICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgIGZpbGU6IHNmLFxuICAgICAgc3RhcnQ6IG1vZFNwZWMuZ2V0U3RhcnQoKSxcbiAgICAgIGxlbmd0aDogbW9kU3BlYy5nZXRFbmQoKSAtIG1vZFNwZWMuZ2V0U3RhcnQoKSxcbiAgICAgIG1lc3NhZ2VUZXh0OiBgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5IG9uICR7aW1wb3J0TmFtZX0gbm90IGFsbG93ZWQuIGAgK1xuICAgICAgICAgIGBQbGVhc2UgYWRkIHRoZSBCVUlMRCB0YXJnZXQgdG8geW91ciBydWxlJ3MgZGVwcy5gLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIC8vIHNlbWFudGljcyBhcmUgY2xvc2UgZW5vdWdoLCBuZWVkcyB0YXplLlxuICAgICAgY29kZTogVFNfRVJSX0NBTk5PVF9GSU5EX01PRFVMRSxcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19