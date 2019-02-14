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
        define(["require", "exports", "../tsc_wrapped/plugin_api", "./checker", "./runner"], factory);
    }
})(function (require, exports) {
    "use strict";
    var pluginApi = require("../tsc_wrapped/plugin_api");
    var checker_1 = require("./checker");
    var runner_1 = require("./runner");
    // Installs the Tsetse language server plugin, which checks Tsetse rules in your
    // editor and shows issues as semantic errors (red squiggly underline).
    function init() {
        return {
            create: function (info) {
                var oldService = info.languageService;
                var program = oldService.getProgram();
                // Signature of `getProgram` is `getProgram(): Program | undefined;` in ts 3.1
                // so we must check if the return value is valid to compile with ts 3.1.
                if (!program) {
                    throw new Error('Failed to initialize tsetse language_service_plugin: program is undefined');
                }
                var checker = new checker_1.Checker(program);
                // Add disabledRules to tsconfig to disable specific rules
                // "plugins": [
                //   {"name": "...", "disabledRules": ["equals-nan"]}
                // ]
                runner_1.registerRules(checker, info.config.disabledRules || []);
                var proxy = pluginApi.createProxy(oldService);
                proxy.getSemanticDiagnostics = function (fileName) {
                    var result = __spread(oldService.getSemanticDiagnostics(fileName));
                    result.push.apply(result, __spread(checker.execute(program.getSourceFile(fileName))
                        .map(function (failure) { return failure.toDiagnostic(); })));
                    return result;
                };
                return proxy;
            }
        };
    }
    return init;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZV9wbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2V0c2UvbGFuZ3VhZ2Vfc2VydmljZV9wbHVnaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBRUEscURBQXVEO0lBRXZELHFDQUFrQztJQUNsQyxtQ0FBdUM7SUFFdkMsZ0ZBQWdGO0lBQ2hGLHVFQUF1RTtJQUV2RSxTQUFTLElBQUk7UUFDWCxPQUFPO1lBQ0wsTUFBTSxZQUFDLElBQWdDO2dCQUNyQyxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDO2dCQUN4QyxJQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBRXhDLDhFQUE4RTtnQkFDOUUsd0VBQXdFO2dCQUN4RSxJQUFJLENBQUMsT0FBTyxFQUFFO29CQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsMkVBQTJFLENBQUMsQ0FBQztpQkFDOUY7Z0JBRUQsSUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUVyQywwREFBMEQ7Z0JBQzFELGVBQWU7Z0JBQ2YscURBQXFEO2dCQUNyRCxJQUFJO2dCQUNKLHNCQUFhLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUV4RCxJQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNoRCxLQUFLLENBQUMsc0JBQXNCLEdBQUcsVUFBQyxRQUFnQjtvQkFDOUMsSUFBTSxNQUFNLFlBQU8sVUFBVSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ2hFLE1BQU0sQ0FBQyxJQUFJLE9BQVgsTUFBTSxXQUNDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUUsQ0FBQzt5QkFDL0MsR0FBRyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUF0QixDQUFzQixDQUFDLEdBQUU7b0JBQ2pELE9BQU8sTUFBTSxDQUFDO2dCQUNoQixDQUFDLENBQUM7Z0JBQ0YsT0FBTyxLQUFLLENBQUM7WUFDZixDQUFDO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFTLElBQUksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCAqIGFzIHBsdWdpbkFwaSBmcm9tICcuLi90c2Nfd3JhcHBlZC9wbHVnaW5fYXBpJztcblxuaW1wb3J0IHtDaGVja2VyfSBmcm9tICcuL2NoZWNrZXInO1xuaW1wb3J0IHtyZWdpc3RlclJ1bGVzfSBmcm9tICcuL3J1bm5lcic7XG5cbi8vIEluc3RhbGxzIHRoZSBUc2V0c2UgbGFuZ3VhZ2Ugc2VydmVyIHBsdWdpbiwgd2hpY2ggY2hlY2tzIFRzZXRzZSBydWxlcyBpbiB5b3VyXG4vLyBlZGl0b3IgYW5kIHNob3dzIGlzc3VlcyBhcyBzZW1hbnRpYyBlcnJvcnMgKHJlZCBzcXVpZ2dseSB1bmRlcmxpbmUpLlxuXG5mdW5jdGlvbiBpbml0KCkge1xuICByZXR1cm4ge1xuICAgIGNyZWF0ZShpbmZvOiB0cy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbykge1xuICAgICAgY29uc3Qgb2xkU2VydmljZSA9IGluZm8ubGFuZ3VhZ2VTZXJ2aWNlO1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IG9sZFNlcnZpY2UuZ2V0UHJvZ3JhbSgpO1xuXG4gICAgICAvLyBTaWduYXR1cmUgb2YgYGdldFByb2dyYW1gIGlzIGBnZXRQcm9ncmFtKCk6IFByb2dyYW0gfCB1bmRlZmluZWQ7YCBpbiB0cyAzLjFcbiAgICAgIC8vIHNvIHdlIG11c3QgY2hlY2sgaWYgdGhlIHJldHVybiB2YWx1ZSBpcyB2YWxpZCB0byBjb21waWxlIHdpdGggdHMgMy4xLlxuICAgICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgdHNldHNlIGxhbmd1YWdlX3NlcnZpY2VfcGx1Z2luOiBwcm9ncmFtIGlzIHVuZGVmaW5lZCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjaGVja2VyID0gbmV3IENoZWNrZXIocHJvZ3JhbSk7XG5cbiAgICAgIC8vIEFkZCBkaXNhYmxlZFJ1bGVzIHRvIHRzY29uZmlnIHRvIGRpc2FibGUgc3BlY2lmaWMgcnVsZXNcbiAgICAgIC8vIFwicGx1Z2luc1wiOiBbXG4gICAgICAvLyAgIHtcIm5hbWVcIjogXCIuLi5cIiwgXCJkaXNhYmxlZFJ1bGVzXCI6IFtcImVxdWFscy1uYW5cIl19XG4gICAgICAvLyBdXG4gICAgICByZWdpc3RlclJ1bGVzKGNoZWNrZXIsIGluZm8uY29uZmlnLmRpc2FibGVkUnVsZXMgfHwgW10pO1xuXG4gICAgICBjb25zdCBwcm94eSA9IHBsdWdpbkFwaS5jcmVhdGVQcm94eShvbGRTZXJ2aWNlKTtcbiAgICAgIHByb3h5LmdldFNlbWFudGljRGlhZ25vc3RpY3MgPSAoZmlsZU5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBbLi4ub2xkU2VydmljZS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKV07XG4gICAgICAgIHJlc3VsdC5wdXNoKFxuICAgICAgICAgICAgLi4uY2hlY2tlci5leGVjdXRlKHByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSkhKVxuICAgICAgICAgICAgICAgIC5tYXAoZmFpbHVyZSA9PiBmYWlsdXJlLnRvRGlhZ25vc3RpYygpKSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHByb3h5O1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0ID0gaW5pdDtcbiJdfQ==