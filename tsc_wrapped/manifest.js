/**
 * @fileoverview utilities to construct a static graph representation of the
 * import graph discovered in typescript inputs.
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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Recursively walk the import graph provided by tsickle, populating entries
     * in the result map such that if foo imports bar, foo will appear before bar
     * in the map.
     */
    function topologicalSort(result, current, modulesManifest, visiting) {
        var e_1, _a;
        var referencedModules = modulesManifest.getReferencedModules(current);
        if (!referencedModules)
            return; // not in the local set of sources.
        try {
            for (var referencedModules_1 = __values(referencedModules), referencedModules_1_1 = referencedModules_1.next(); !referencedModules_1_1.done; referencedModules_1_1 = referencedModules_1.next()) {
                var referencedModule = referencedModules_1_1.value;
                var referencedFileName = modulesManifest.getFileNameFromModule(referencedModule);
                if (!referencedFileName)
                    continue; // Ambient modules.
                if (!result[referencedFileName]) {
                    if (visiting[referencedFileName]) {
                        var path = current + ' -> ' + Object.keys(visiting).join(' -> ');
                        throw new Error('Cyclical dependency between files:\n' + path);
                    }
                    visiting[referencedFileName] = true;
                    topologicalSort(result, referencedFileName, modulesManifest, visiting);
                    delete visiting[referencedFileName];
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (referencedModules_1_1 && !referencedModules_1_1.done && (_a = referencedModules_1.return)) _a.call(referencedModules_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        result[current] = true;
    }
    /**
     * Create the contents of the .es5.MF file which propagates partial ordering of
     * the import graph to later actions.
     * Each line in the resulting text corresponds with a workspace-relative file
     * path, and the lines are ordered to match the expected load order in a
     * browser.
     */
    function constructManifest(modulesManifest, host) {
        var e_2, _a;
        var result = {};
        try {
            for (var _b = __values(modulesManifest.fileNames), _c = _b.next(); !_c.done; _c = _b.next()) {
                var file = _c.value;
                topologicalSort(result, file, modulesManifest, {});
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        // NB: The object literal maintains insertion order.
        return Object.keys(result).map(function (fn) { return host.relativeOutputPath(fn); }).join('\n') +
            '\n';
    }
    exports.constructManifest = constructManifest;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuaWZlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2Nfd3JhcHBlZC9tYW5pZmVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFJSDs7OztPQUlHO0lBQ0gsU0FBUyxlQUFlLENBQ3BCLE1BQWdDLEVBQUUsT0FBZSxFQUNqRCxlQUF3QyxFQUN4QyxRQUFrQzs7UUFDcEMsSUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLGlCQUFpQjtZQUFFLE9BQU8sQ0FBRSxtQ0FBbUM7O1lBQ3BFLEtBQStCLElBQUEsc0JBQUEsU0FBQSxpQkFBaUIsQ0FBQSxvREFBQSxtRkFBRTtnQkFBN0MsSUFBTSxnQkFBZ0IsOEJBQUE7Z0JBQ3pCLElBQU0sa0JBQWtCLEdBQ3BCLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUM1RCxJQUFJLENBQUMsa0JBQWtCO29CQUFFLFNBQVMsQ0FBRSxtQkFBbUI7Z0JBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsRUFBRTtvQkFDL0IsSUFBSSxRQUFRLENBQUMsa0JBQWtCLENBQUMsRUFBRTt3QkFDaEMsSUFBTSxJQUFJLEdBQUcsT0FBTyxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDbkUsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsR0FBRyxJQUFJLENBQUMsQ0FBQztxQkFDaEU7b0JBQ0QsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUNwQyxlQUFlLENBQUMsTUFBTSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQztvQkFDdkUsT0FBTyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQztpQkFDckM7YUFDRjs7Ozs7Ozs7O1FBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQztJQUN6QixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLGVBQXdDLEVBQ3hDLElBQWlEOztRQUNuRCxJQUFNLE1BQU0sR0FBNkIsRUFBRSxDQUFDOztZQUM1QyxLQUFtQixJQUFBLEtBQUEsU0FBQSxlQUFlLENBQUMsU0FBUyxDQUFBLGdCQUFBLDRCQUFFO2dCQUF6QyxJQUFNLElBQUksV0FBQTtnQkFDYixlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDcEQ7Ozs7Ozs7OztRQUVELG9EQUFvRDtRQUNwRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxFQUEzQixDQUEyQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUN4RSxJQUFJLENBQUM7SUFDWCxDQUFDO0lBWEQsOENBV0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgdXRpbGl0aWVzIHRvIGNvbnN0cnVjdCBhIHN0YXRpYyBncmFwaCByZXByZXNlbnRhdGlvbiBvZiB0aGVcbiAqIGltcG9ydCBncmFwaCBkaXNjb3ZlcmVkIGluIHR5cGVzY3JpcHQgaW5wdXRzLlxuICovXG5cbmltcG9ydCAqIGFzIHRzaWNrbGUgZnJvbSAndHNpY2tsZSc7XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgd2FsayB0aGUgaW1wb3J0IGdyYXBoIHByb3ZpZGVkIGJ5IHRzaWNrbGUsIHBvcHVsYXRpbmcgZW50cmllc1xuICogaW4gdGhlIHJlc3VsdCBtYXAgc3VjaCB0aGF0IGlmIGZvbyBpbXBvcnRzIGJhciwgZm9vIHdpbGwgYXBwZWFyIGJlZm9yZSBiYXJcbiAqIGluIHRoZSBtYXAuXG4gKi9cbmZ1bmN0aW9uIHRvcG9sb2dpY2FsU29ydChcbiAgICByZXN1bHQ6IHRzaWNrbGUuRmlsZU1hcDxib29sZWFuPiwgY3VycmVudDogc3RyaW5nLFxuICAgIG1vZHVsZXNNYW5pZmVzdDogdHNpY2tsZS5Nb2R1bGVzTWFuaWZlc3QsXG4gICAgdmlzaXRpbmc6IHRzaWNrbGUuRmlsZU1hcDxib29sZWFuPikge1xuICBjb25zdCByZWZlcmVuY2VkTW9kdWxlcyA9IG1vZHVsZXNNYW5pZmVzdC5nZXRSZWZlcmVuY2VkTW9kdWxlcyhjdXJyZW50KTtcbiAgaWYgKCFyZWZlcmVuY2VkTW9kdWxlcykgcmV0dXJuOyAgLy8gbm90IGluIHRoZSBsb2NhbCBzZXQgb2Ygc291cmNlcy5cbiAgZm9yIChjb25zdCByZWZlcmVuY2VkTW9kdWxlIG9mIHJlZmVyZW5jZWRNb2R1bGVzKSB7XG4gICAgY29uc3QgcmVmZXJlbmNlZEZpbGVOYW1lID1cbiAgICAgICAgbW9kdWxlc01hbmlmZXN0LmdldEZpbGVOYW1lRnJvbU1vZHVsZShyZWZlcmVuY2VkTW9kdWxlKTtcbiAgICBpZiAoIXJlZmVyZW5jZWRGaWxlTmFtZSkgY29udGludWU7ICAvLyBBbWJpZW50IG1vZHVsZXMuXG4gICAgaWYgKCFyZXN1bHRbcmVmZXJlbmNlZEZpbGVOYW1lXSkge1xuICAgICAgaWYgKHZpc2l0aW5nW3JlZmVyZW5jZWRGaWxlTmFtZV0pIHtcbiAgICAgICAgY29uc3QgcGF0aCA9IGN1cnJlbnQgKyAnIC0+ICcgKyBPYmplY3Qua2V5cyh2aXNpdGluZykuam9pbignIC0+ICcpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0N5Y2xpY2FsIGRlcGVuZGVuY3kgYmV0d2VlbiBmaWxlczpcXG4nICsgcGF0aCk7XG4gICAgICB9XG4gICAgICB2aXNpdGluZ1tyZWZlcmVuY2VkRmlsZU5hbWVdID0gdHJ1ZTtcbiAgICAgIHRvcG9sb2dpY2FsU29ydChyZXN1bHQsIHJlZmVyZW5jZWRGaWxlTmFtZSwgbW9kdWxlc01hbmlmZXN0LCB2aXNpdGluZyk7XG4gICAgICBkZWxldGUgdmlzaXRpbmdbcmVmZXJlbmNlZEZpbGVOYW1lXTtcbiAgICB9XG4gIH1cbiAgcmVzdWx0W2N1cnJlbnRdID0gdHJ1ZTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIGNvbnRlbnRzIG9mIHRoZSAuZXM1Lk1GIGZpbGUgd2hpY2ggcHJvcGFnYXRlcyBwYXJ0aWFsIG9yZGVyaW5nIG9mXG4gKiB0aGUgaW1wb3J0IGdyYXBoIHRvIGxhdGVyIGFjdGlvbnMuXG4gKiBFYWNoIGxpbmUgaW4gdGhlIHJlc3VsdGluZyB0ZXh0IGNvcnJlc3BvbmRzIHdpdGggYSB3b3Jrc3BhY2UtcmVsYXRpdmUgZmlsZVxuICogcGF0aCwgYW5kIHRoZSBsaW5lcyBhcmUgb3JkZXJlZCB0byBtYXRjaCB0aGUgZXhwZWN0ZWQgbG9hZCBvcmRlciBpbiBhXG4gKiBicm93c2VyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29uc3RydWN0TWFuaWZlc3QoXG4gICAgbW9kdWxlc01hbmlmZXN0OiB0c2lja2xlLk1vZHVsZXNNYW5pZmVzdCxcbiAgICBob3N0OiB7cmVsYXRpdmVPdXRwdXRQYXRoOiAoZjogc3RyaW5nKSA9PiBzdHJpbmd9KTogc3RyaW5nIHtcbiAgY29uc3QgcmVzdWx0OiB0c2lja2xlLkZpbGVNYXA8Ym9vbGVhbj4gPSB7fTtcbiAgZm9yIChjb25zdCBmaWxlIG9mIG1vZHVsZXNNYW5pZmVzdC5maWxlTmFtZXMpIHtcbiAgICB0b3BvbG9naWNhbFNvcnQocmVzdWx0LCBmaWxlLCBtb2R1bGVzTWFuaWZlc3QsIHt9KTtcbiAgfVxuXG4gIC8vIE5COiBUaGUgb2JqZWN0IGxpdGVyYWwgbWFpbnRhaW5zIGluc2VydGlvbiBvcmRlci5cbiAgcmV0dXJuIE9iamVjdC5rZXlzKHJlc3VsdCkubWFwKGZuID0+IGhvc3QucmVsYXRpdmVPdXRwdXRQYXRoKGZuKSkuam9pbignXFxuJykgK1xuICAgICAgJ1xcbic7XG59XG4iXX0=