/**
 * @fileoverview Runner is the entry point of running Tsetse checks in compiler.
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
        define(["require", "exports", "../tsc_wrapped/perf_trace", "../tsc_wrapped/plugin_api", "./checker", "./rules/ban_expect_truthy_promise_rule", "./rules/ban_promise_as_condition_rule", "./rules/check_return_value_rule", "./rules/equals_nan_rule", "./rules/must_use_promises_rule"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var perfTrace = require("../tsc_wrapped/perf_trace");
    var pluginApi = require("../tsc_wrapped/plugin_api");
    var checker_1 = require("./checker");
    var ban_expect_truthy_promise_rule_1 = require("./rules/ban_expect_truthy_promise_rule");
    var ban_promise_as_condition_rule_1 = require("./rules/ban_promise_as_condition_rule");
    var check_return_value_rule_1 = require("./rules/check_return_value_rule");
    var equals_nan_rule_1 = require("./rules/equals_nan_rule");
    var must_use_promises_rule_1 = require("./rules/must_use_promises_rule");
    /**
     * List of Tsetse rules. Shared between the program plugin and the language
     * service plugin.
     */
    var ENABLED_RULES = [
        new check_return_value_rule_1.Rule(),
        new equals_nan_rule_1.Rule(),
        new ban_expect_truthy_promise_rule_1.Rule(),
        new must_use_promises_rule_1.Rule(),
        new ban_promise_as_condition_rule_1.Rule(),
    ];
    /**
     * The Tsetse check plugin performs compile-time static analysis for TypeScript
     * code.
     */
    exports.PLUGIN = {
        wrap: function (program, disabledTsetseRules) {
            if (disabledTsetseRules === void 0) { disabledTsetseRules = []; }
            var checker = new checker_1.Checker(program);
            registerRules(checker, disabledTsetseRules);
            var proxy = pluginApi.createProxy(program);
            proxy.getSemanticDiagnostics = function (sourceFile) {
                var result = __spread(program.getSemanticDiagnostics(sourceFile));
                perfTrace.wrap('checkConformance', function () {
                    result.push.apply(result, __spread(checker.execute(sourceFile)
                        .map(function (failure) { return failure.toDiagnostic(); })));
                });
                return result;
            };
            return proxy;
        },
    };
    function registerRules(checker, disabledTsetseRules) {
        var e_1, _a;
        try {
            for (var ENABLED_RULES_1 = __values(ENABLED_RULES), ENABLED_RULES_1_1 = ENABLED_RULES_1.next(); !ENABLED_RULES_1_1.done; ENABLED_RULES_1_1 = ENABLED_RULES_1.next()) {
                var rule = ENABLED_RULES_1_1.value;
                if (disabledTsetseRules.indexOf(rule.ruleName) === -1) {
                    rule.register(checker);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (ENABLED_RULES_1_1 && !ENABLED_RULES_1_1.done && (_a = ENABLED_RULES_1.return)) _a.call(ENABLED_RULES_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    exports.registerRules = registerRules;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVubmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vaW50ZXJuYWwvdHNldHNlL3J1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBSUgscURBQXVEO0lBQ3ZELHFEQUF1RDtJQUV2RCxxQ0FBa0M7SUFFbEMseUZBQTBGO0lBQzFGLHVGQUF3RjtJQUN4RiwyRUFBNkU7SUFDN0UsMkRBQThEO0lBQzlELHlFQUEyRTtJQUUzRTs7O09BR0c7SUFDSCxJQUFNLGFBQWEsR0FBbUI7UUFDcEMsSUFBSSw4QkFBb0IsRUFBRTtRQUMxQixJQUFJLHNCQUFhLEVBQUU7UUFDbkIsSUFBSSxxQ0FBMEIsRUFBRTtRQUNoQyxJQUFJLDZCQUFtQixFQUFFO1FBQ3pCLElBQUksb0NBQXlCLEVBQUU7S0FDaEMsQ0FBQztJQUVGOzs7T0FHRztJQUNVLFFBQUEsTUFBTSxHQUFxQjtRQUN0QyxJQUFJLEVBQUosVUFBSyxPQUFtQixFQUFFLG1CQUFrQztZQUFsQyxvQ0FBQSxFQUFBLHdCQUFrQztZQUMxRCxJQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDckMsYUFBYSxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBQzVDLElBQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDN0MsS0FBSyxDQUFDLHNCQUFzQixHQUFHLFVBQUMsVUFBeUI7Z0JBQ3ZELElBQU0sTUFBTSxZQUFPLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUMvRCxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFO29CQUNqQyxNQUFNLENBQUMsSUFBSSxPQUFYLE1BQU0sV0FBUyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQzt5QkFDekIsR0FBRyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUF0QixDQUFzQixDQUFDLEdBQUU7Z0JBQzNELENBQUMsQ0FBQyxDQUFDO2dCQUNILE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUMsQ0FBQztZQUNGLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztLQUNGLENBQUM7SUFFRixTQUFnQixhQUFhLENBQUMsT0FBZ0IsRUFBRSxtQkFBNkI7OztZQUMzRSxLQUFtQixJQUFBLGtCQUFBLFNBQUEsYUFBYSxDQUFBLDRDQUFBLHVFQUFFO2dCQUE3QixJQUFNLElBQUksMEJBQUE7Z0JBQ2IsSUFBSSxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO29CQUNyRCxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUN4QjthQUNGOzs7Ozs7Ozs7SUFDSCxDQUFDO0lBTkQsc0NBTUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgUnVubmVyIGlzIHRoZSBlbnRyeSBwb2ludCBvZiBydW5uaW5nIFRzZXRzZSBjaGVja3MgaW4gY29tcGlsZXIuXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCAqIGFzIHBlcmZUcmFjZSBmcm9tICcuLi90c2Nfd3JhcHBlZC9wZXJmX3RyYWNlJztcbmltcG9ydCAqIGFzIHBsdWdpbkFwaSBmcm9tICcuLi90c2Nfd3JhcHBlZC9wbHVnaW5fYXBpJztcblxuaW1wb3J0IHtDaGVja2VyfSBmcm9tICcuL2NoZWNrZXInO1xuaW1wb3J0IHtBYnN0cmFjdFJ1bGV9IGZyb20gJy4vcnVsZSc7XG5pbXBvcnQge1J1bGUgYXMgQmFuRXhwZWN0VHJ1dGh5UHJvbWlzZVJ1bGV9IGZyb20gJy4vcnVsZXMvYmFuX2V4cGVjdF90cnV0aHlfcHJvbWlzZV9ydWxlJztcbmltcG9ydCB7UnVsZSBhcyBCYW5Qcm9taXNlQXNDb25kaXRpb25SdWxlfSBmcm9tICcuL3J1bGVzL2Jhbl9wcm9taXNlX2FzX2NvbmRpdGlvbl9ydWxlJztcbmltcG9ydCB7UnVsZSBhcyBDaGVja1JldHVyblZhbHVlUnVsZX0gZnJvbSAnLi9ydWxlcy9jaGVja19yZXR1cm5fdmFsdWVfcnVsZSc7XG5pbXBvcnQge1J1bGUgYXMgRXF1YWxzTmFuUnVsZX0gZnJvbSAnLi9ydWxlcy9lcXVhbHNfbmFuX3J1bGUnO1xuaW1wb3J0IHtSdWxlIGFzIE11c3RVc2VQcm9taXNlc1J1bGV9IGZyb20gJy4vcnVsZXMvbXVzdF91c2VfcHJvbWlzZXNfcnVsZSc7XG5cbi8qKlxuICogTGlzdCBvZiBUc2V0c2UgcnVsZXMuIFNoYXJlZCBiZXR3ZWVuIHRoZSBwcm9ncmFtIHBsdWdpbiBhbmQgdGhlIGxhbmd1YWdlXG4gKiBzZXJ2aWNlIHBsdWdpbi5cbiAqL1xuY29uc3QgRU5BQkxFRF9SVUxFUzogQWJzdHJhY3RSdWxlW10gPSBbXG4gIG5ldyBDaGVja1JldHVyblZhbHVlUnVsZSgpLFxuICBuZXcgRXF1YWxzTmFuUnVsZSgpLFxuICBuZXcgQmFuRXhwZWN0VHJ1dGh5UHJvbWlzZVJ1bGUoKSxcbiAgbmV3IE11c3RVc2VQcm9taXNlc1J1bGUoKSxcbiAgbmV3IEJhblByb21pc2VBc0NvbmRpdGlvblJ1bGUoKSxcbl07XG5cbi8qKlxuICogVGhlIFRzZXRzZSBjaGVjayBwbHVnaW4gcGVyZm9ybXMgY29tcGlsZS10aW1lIHN0YXRpYyBhbmFseXNpcyBmb3IgVHlwZVNjcmlwdFxuICogY29kZS5cbiAqL1xuZXhwb3J0IGNvbnN0IFBMVUdJTjogcGx1Z2luQXBpLlBsdWdpbiA9IHtcbiAgd3JhcChwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkaXNhYmxlZFRzZXRzZVJ1bGVzOiBzdHJpbmdbXSA9IFtdKTogdHMuUHJvZ3JhbSB7XG4gICAgY29uc3QgY2hlY2tlciA9IG5ldyBDaGVja2VyKHByb2dyYW0pO1xuICAgIHJlZ2lzdGVyUnVsZXMoY2hlY2tlciwgZGlzYWJsZWRUc2V0c2VSdWxlcyk7XG4gICAgY29uc3QgcHJveHkgPSBwbHVnaW5BcGkuY3JlYXRlUHJveHkocHJvZ3JhbSk7XG4gICAgcHJveHkuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyA9IChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBbLi4ucHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUpXTtcbiAgICAgIHBlcmZUcmFjZS53cmFwKCdjaGVja0NvbmZvcm1hbmNlJywgKCkgPT4ge1xuICAgICAgICByZXN1bHQucHVzaCguLi5jaGVja2VyLmV4ZWN1dGUoc291cmNlRmlsZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZmFpbHVyZSA9PiBmYWlsdXJlLnRvRGlhZ25vc3RpYygpKSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgICByZXR1cm4gcHJveHk7XG4gIH0sXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJSdWxlcyhjaGVja2VyOiBDaGVja2VyLCBkaXNhYmxlZFRzZXRzZVJ1bGVzOiBzdHJpbmdbXSkge1xuICBmb3IgKGNvbnN0IHJ1bGUgb2YgRU5BQkxFRF9SVUxFUykge1xuICAgIGlmIChkaXNhYmxlZFRzZXRzZVJ1bGVzLmluZGV4T2YocnVsZS5ydWxlTmFtZSkgPT09IC0xKSB7XG4gICAgICBydWxlLnJlZ2lzdGVyKGNoZWNrZXIpO1xuICAgIH1cbiAgfVxufVxuIl19