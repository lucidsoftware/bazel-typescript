/**
 * @fileoverview A Tsetse rule that checks the return value of certain functions
 * must be used.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
        define(["require", "exports", "tsutils", "typescript", "../error_code", "../rule"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tsutils = require("tsutils");
    var ts = require("typescript");
    var error_code_1 = require("../error_code");
    var rule_1 = require("../rule");
    var FAILURE_STRING = 'return value is unused.'
        + '\n\tSee http://tsetse.info/check-return-value';
    // A list of well-known functions that the return value must be used. If unused
    // then the function call is either a no-op (e.g. 'foo.trim()' foo is unchanged)
    // or can be replaced by another (Array.map() should be replaced with a loop or
    // Array.forEach() if the return value is unused).
    var METHODS_TO_CHECK = new Set([
        ['Array', 'concat'],
        ['Array', 'filter'],
        ['Array', 'map'],
        ['Array', 'slice'],
        ['Function', 'bind'],
        ['Object', 'create'],
        ['string', 'concat'],
        ['string', 'normalize'],
        ['string', 'padStart'],
        ['string', 'padEnd'],
        ['string', 'repeat'],
        ['string', 'slice'],
        ['string', 'split'],
        ['string', 'substr'],
        ['string', 'substring'],
        ['string', 'toLocaleLowerCase'],
        ['string', 'toLocaleUpperCase'],
        ['string', 'toLowerCase'],
        ['string', 'toUpperCase'],
        ['string', 'trim'],
    ].map(function (list) { return list.join('#'); }));
    var Rule = /** @class */ (function (_super) {
        __extends(Rule, _super);
        function Rule() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.ruleName = 'check-return-value';
            _this.code = error_code_1.ErrorCode.CHECK_RETURN_VALUE;
            return _this;
        }
        // registers checkCallExpression() function on ts.CallExpression node.
        // TypeScript conformance will traverse the AST of each source file and run
        // checkCallExpression() every time it encounters a ts.CallExpression node.
        Rule.prototype.register = function (checker) {
            checker.on(ts.SyntaxKind.CallExpression, checkCallExpression, this.code);
        };
        return Rule;
    }(rule_1.AbstractRule));
    exports.Rule = Rule;
    function checkCallExpression(checker, node) {
        // Short-circuit before using the typechecker if possible, as its expensive.
        // Workaround for https://github.com/Microsoft/TypeScript/issues/27997
        if (tsutils.isExpressionValueUsed(node)) {
            return;
        }
        // Check if this CallExpression is one of the well-known functions and returns
        // a non-void value that is unused.
        var signature = checker.typeChecker.getResolvedSignature(node);
        if (signature !== undefined) {
            var returnType = checker.typeChecker.getReturnTypeOfSignature(signature);
            if (!!(returnType.flags & ts.TypeFlags.Void)) {
                return;
            }
            // Although hasCheckReturnValueJsDoc() is faster than isBlackListed(), it
            // returns false most of the time and thus isBlackListed() would have to run
            // anyway. Therefore we short-circuit hasCheckReturnValueJsDoc().
            if (!isBlackListed(node, checker.typeChecker) &&
                !hasCheckReturnValueJsDoc(node, checker.typeChecker)) {
                return;
            }
            checker.addFailureAtNode(node, FAILURE_STRING);
        }
    }
    function isBlackListed(node, tc) {
        switch (node.expression.kind) {
            case ts.SyntaxKind.PropertyAccessExpression:
            case ts.SyntaxKind.ElementAccessExpression:
                // Example: foo.bar() or foo[bar]()
                // expressionNode is foo
                var nodeExpression = node.expression.expression;
                var nodeExpressionString = nodeExpression.getText();
                var nodeType = tc.getTypeAtLocation(nodeExpression);
                // nodeTypeString is the string representation of the type of foo
                var nodeTypeString = tc.typeToString(nodeType);
                if (nodeTypeString.endsWith('[]')) {
                    nodeTypeString = 'Array';
                }
                if (nodeTypeString === 'ObjectConstructor') {
                    nodeTypeString = 'Object';
                }
                if (tsutils.isTypeFlagSet(nodeType, ts.TypeFlags.StringLiteral)) {
                    nodeTypeString = 'string';
                }
                // nodeFunction is bar
                var nodeFunction = '';
                if (tsutils.isPropertyAccessExpression(node.expression)) {
                    nodeFunction = node.expression.name.getText();
                }
                if (tsutils.isElementAccessExpression(node.expression)) {
                    var argument = node.expression.argumentExpression;
                    if (argument !== undefined) {
                        nodeFunction = argument.getText();
                    }
                }
                // Check if 'foo#bar' or `${typeof foo}#bar` is in the blacklist.
                if (METHODS_TO_CHECK.has(nodeTypeString + "#" + nodeFunction) ||
                    METHODS_TO_CHECK.has(nodeExpressionString + "#" + nodeFunction)) {
                    return true;
                }
                // For 'str.replace(regexp|substr, newSubstr|function)' only check when
                // the second parameter is 'newSubstr'.
                if ((nodeTypeString + "#" + nodeFunction === 'string#replace') ||
                    (nodeExpressionString + "#" + nodeFunction === 'string#replace')) {
                    return node.arguments.length === 2 &&
                        !tsutils.isFunctionWithBody(node.arguments[1]);
                }
                break;
            case ts.SyntaxKind.Identifier:
                // Example: foo()
                // We currently don't have functions of this kind in blacklist.
                var identifier = node.expression;
                if (METHODS_TO_CHECK.has(identifier.text)) {
                    return true;
                }
                break;
            default:
                break;
        }
        return false;
    }
    function hasCheckReturnValueJsDoc(node, tc) {
        var e_1, _a;
        var symbol = tc.getSymbolAtLocation(node.expression);
        if (symbol === undefined) {
            return false;
        }
        if (tsutils.isSymbolFlagSet(symbol, ts.SymbolFlags.Alias)) {
            symbol = tc.getAliasedSymbol(symbol);
        }
        try {
            for (var _b = __values(symbol.getJsDocTags()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var jsDocTagInfo = _c.value;
                if (jsDocTagInfo.name === 'checkReturnValue') {
                    return true;
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
        return false;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tfcmV0dXJuX3ZhbHVlX3J1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2V0c2UvcnVsZXMvY2hlY2tfcmV0dXJuX3ZhbHVlX3J1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVILGlDQUFtQztJQUNuQywrQkFBaUM7SUFHakMsNENBQXdDO0lBQ3hDLGdDQUFxQztJQUVyQyxJQUFNLGNBQWMsR0FBRyx5QkFBeUI7VUFDMUMsK0NBQStDLENBQUM7SUFFdEQsK0VBQStFO0lBQy9FLGdGQUFnRjtJQUNoRiwrRUFBK0U7SUFDL0Usa0RBQWtEO0lBQ2xELElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQVM7UUFDdkMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO1FBQ25CLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztRQUNuQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUM7UUFDaEIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO1FBQ2xCLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQztRQUNwQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7UUFDcEIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO1FBQ3BCLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQztRQUN2QixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUM7UUFDdEIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO1FBQ3BCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztRQUNwQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7UUFDbkIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO1FBQ25CLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztRQUNwQixDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUM7UUFDdkIsQ0FBQyxRQUFRLEVBQUUsbUJBQW1CLENBQUM7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QUMsVUFBVSxDQUFDLFVBQVU7Z0JBQzNCLGlCQUFpQjtnQkFDakIsK0RBQStEO2dCQUMvRCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBMkIsQ0FBQztnQkFDcEQsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN6QyxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFDRCxNQUFNO1lBQ1I7Z0JBQ0UsTUFBTTtTQUNUO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsU0FBUyx3QkFBd0IsQ0FBQyxJQUF1QixFQUFFLEVBQWtCOztRQUMzRSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3JELElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtZQUN4QixPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pELE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDdEM7O1lBRUQsS0FBMkIsSUFBQSxLQUFBLFNBQUEsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBLGdCQUFBLDRCQUFFO2dCQUE3QyxJQUFNLFlBQVksV0FBQTtnQkFDckIsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO29CQUM1QyxPQUFPLElBQUksQ0FBQztpQkFDYjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcblxuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IEEgVHNldHNlIHJ1bGUgdGhhdCBjaGVja3MgdGhlIHJldHVybiB2YWx1ZSBvZiBjZXJ0YWluIGZ1bmN0aW9uc1xuICogbXVzdCBiZSB1c2VkLlxuICovXG5cbmltcG9ydCAqIGFzIHRzdXRpbHMgZnJvbSAndHN1dGlscyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDaGVja2VyfSBmcm9tICcuLi9jaGVja2VyJztcbmltcG9ydCB7RXJyb3JDb2RlfSBmcm9tICcuLi9lcnJvcl9jb2RlJztcbmltcG9ydCB7QWJzdHJhY3RSdWxlfSBmcm9tICcuLi9ydWxlJztcblxuY29uc3QgRkFJTFVSRV9TVFJJTkcgPSAncmV0dXJuIHZhbHVlIGlzIHVudXNlZC4nXG4gICAgKyAnXFxuXFx0U2VlIGh0dHA6Ly90c2V0c2UuaW5mby9jaGVjay1yZXR1cm4tdmFsdWUnO1xuXG4vLyBBIGxpc3Qgb2Ygd2VsbC1rbm93biBmdW5jdGlvbnMgdGhhdCB0aGUgcmV0dXJuIHZhbHVlIG11c3QgYmUgdXNlZC4gSWYgdW51c2VkXG4vLyB0aGVuIHRoZSBmdW5jdGlvbiBjYWxsIGlzIGVpdGhlciBhIG5vLW9wIChlLmcuICdmb28udHJpbSgpJyBmb28gaXMgdW5jaGFuZ2VkKVxuLy8gb3IgY2FuIGJlIHJlcGxhY2VkIGJ5IGFub3RoZXIgKEFycmF5Lm1hcCgpIHNob3VsZCBiZSByZXBsYWNlZCB3aXRoIGEgbG9vcCBvclxuLy8gQXJyYXkuZm9yRWFjaCgpIGlmIHRoZSByZXR1cm4gdmFsdWUgaXMgdW51c2VkKS5cbmNvbnN0IE1FVEhPRFNfVE9fQ0hFQ0sgPSBuZXcgU2V0PHN0cmluZz4oW1xuICBbJ0FycmF5JywgJ2NvbmNhdCddLFxuICBbJ0FycmF5JywgJ2ZpbHRlciddLFxuICBbJ0FycmF5JywgJ21hcCddLFxuICBbJ0FycmF5JywgJ3NsaWNlJ10sXG4gIFsnRnVuY3Rpb24nLCAnYmluZCddLFxuICBbJ09iamVjdCcsICdjcmVhdGUnXSxcbiAgWydzdHJpbmcnLCAnY29uY2F0J10sXG4gIFsnc3RyaW5nJywgJ25vcm1hbGl6ZSddLFxuICBbJ3N0cmluZycsICdwYWRTdGFydCddLFxuICBbJ3N0cmluZycsICdwYWRFbmQnXSxcbiAgWydzdHJpbmcnLCAncmVwZWF0J10sXG4gIFsnc3RyaW5nJywgJ3NsaWNlJ10sXG4gIFsnc3RyaW5nJywgJ3NwbGl0J10sXG4gIFsnc3RyaW5nJywgJ3N1YnN0ciddLFxuICBbJ3N0cmluZycsICdzdWJzdHJpbmcnXSxcbiAgWydzdHJpbmcnLCAndG9Mb2NhbGVMb3dlckNhc2UnXSxcbiAgWydzdHJpbmcnLCAndG9Mb2NhbGVVcHBlckNhc2UnXSxcbiAgWydzdHJpbmcnLCAndG9Mb3dlckNhc2UnXSxcbiAgWydzdHJpbmcnLCAndG9VcHBlckNhc2UnXSxcbiAgWydzdHJpbmcnLCAndHJpbSddLFxuXS5tYXAobGlzdCA9PiBsaXN0LmpvaW4oJyMnKSkpO1xuXG5leHBvcnQgY2xhc3MgUnVsZSBleHRlbmRzIEFic3RyYWN0UnVsZSB7XG4gIHJlYWRvbmx5IHJ1bGVOYW1lID0gJ2NoZWNrLXJldHVybi12YWx1ZSc7XG4gIHJlYWRvbmx5IGNvZGUgPSBFcnJvckNvZGUuQ0hFQ0tfUkVUVVJOX1ZBTFVFO1xuXG4gIC8vIHJlZ2lzdGVycyBjaGVja0NhbGxFeHByZXNzaW9uKCkgZnVuY3Rpb24gb24gdHMuQ2FsbEV4cHJlc3Npb24gbm9kZS5cbiAgLy8gVHlwZVNjcmlwdCBjb25mb3JtYW5jZSB3aWxsIHRyYXZlcnNlIHRoZSBBU1Qgb2YgZWFjaCBzb3VyY2UgZmlsZSBhbmQgcnVuXG4gIC8vIGNoZWNrQ2FsbEV4cHJlc3Npb24oKSBldmVyeSB0aW1lIGl0IGVuY291bnRlcnMgYSB0cy5DYWxsRXhwcmVzc2lvbiBub2RlLlxuICByZWdpc3RlcihjaGVja2VyOiBDaGVja2VyKSB7XG4gICAgY2hlY2tlci5vbih0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uLCBjaGVja0NhbGxFeHByZXNzaW9uLCB0aGlzLmNvZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoZWNrQ2FsbEV4cHJlc3Npb24oY2hlY2tlcjogQ2hlY2tlciwgbm9kZTogdHMuQ2FsbEV4cHJlc3Npb24pIHtcbiAgLy8gU2hvcnQtY2lyY3VpdCBiZWZvcmUgdXNpbmcgdGhlIHR5cGVjaGVja2VyIGlmIHBvc3NpYmxlLCBhcyBpdHMgZXhwZW5zaXZlLlxuICAvLyBXb3JrYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzI3OTk3XG4gIGlmICh0c3V0aWxzLmlzRXhwcmVzc2lvblZhbHVlVXNlZChub2RlKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIENoZWNrIGlmIHRoaXMgQ2FsbEV4cHJlc3Npb24gaXMgb25lIG9mIHRoZSB3ZWxsLWtub3duIGZ1bmN0aW9ucyBhbmQgcmV0dXJuc1xuICAvLyBhIG5vbi12b2lkIHZhbHVlIHRoYXQgaXMgdW51c2VkLlxuICBjb25zdCBzaWduYXR1cmUgPSBjaGVja2VyLnR5cGVDaGVja2VyLmdldFJlc29sdmVkU2lnbmF0dXJlKG5vZGUpO1xuICBpZiAoc2lnbmF0dXJlICE9PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCByZXR1cm5UeXBlID0gY2hlY2tlci50eXBlQ2hlY2tlci5nZXRSZXR1cm5UeXBlT2ZTaWduYXR1cmUoc2lnbmF0dXJlKTtcbiAgICBpZiAoISEocmV0dXJuVHlwZS5mbGFncyAmIHRzLlR5cGVGbGFncy5Wb2lkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBBbHRob3VnaCBoYXNDaGVja1JldHVyblZhbHVlSnNEb2MoKSBpcyBmYXN0ZXIgdGhhbiBpc0JsYWNrTGlzdGVkKCksIGl0XG4gICAgLy8gcmV0dXJucyBmYWxzZSBtb3N0IG9mIHRoZSB0aW1lIGFuZCB0aHVzIGlzQmxhY2tMaXN0ZWQoKSB3b3VsZCBoYXZlIHRvIHJ1blxuICAgIC8vIGFueXdheS4gVGhlcmVmb3JlIHdlIHNob3J0LWNpcmN1aXQgaGFzQ2hlY2tSZXR1cm5WYWx1ZUpzRG9jKCkuXG4gICAgaWYgKCFpc0JsYWNrTGlzdGVkKG5vZGUsIGNoZWNrZXIudHlwZUNoZWNrZXIpICYmXG4gICAgICAgICFoYXNDaGVja1JldHVyblZhbHVlSnNEb2Mobm9kZSwgY2hlY2tlci50eXBlQ2hlY2tlcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjaGVja2VyLmFkZEZhaWx1cmVBdE5vZGUobm9kZSwgRkFJTFVSRV9TVFJJTkcpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQmxhY2tMaXN0ZWQobm9kZTogdHMuQ2FsbEV4cHJlc3Npb24sIHRjOiB0cy5UeXBlQ2hlY2tlcik6IGJvb2xlYW4ge1xuICB0eXBlIEFjY2Vzc0V4cHJlc3Npb24gPVxuICAgICAgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uO1xuICBzd2l0Y2ggKG5vZGUuZXhwcmVzc2lvbi5raW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbjpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb246XG4gICAgICAvLyBFeGFtcGxlOiBmb28uYmFyKCkgb3IgZm9vW2Jhcl0oKVxuICAgICAgLy8gZXhwcmVzc2lvbk5vZGUgaXMgZm9vXG4gICAgICBjb25zdCBub2RlRXhwcmVzc2lvbiA9IChub2RlLmV4cHJlc3Npb24gYXMgQWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbjtcbiAgICAgIGNvbnN0IG5vZGVFeHByZXNzaW9uU3RyaW5nID0gbm9kZUV4cHJlc3Npb24uZ2V0VGV4dCgpO1xuICAgICAgY29uc3Qgbm9kZVR5cGUgPSB0Yy5nZXRUeXBlQXRMb2NhdGlvbihub2RlRXhwcmVzc2lvbik7XG5cbiAgICAgIC8vIG5vZGVUeXBlU3RyaW5nIGlzIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHR5cGUgb2YgZm9vXG4gICAgICBsZXQgbm9kZVR5cGVTdHJpbmcgPSB0Yy50eXBlVG9TdHJpbmcobm9kZVR5cGUpO1xuICAgICAgaWYgKG5vZGVUeXBlU3RyaW5nLmVuZHNXaXRoKCdbXScpKSB7XG4gICAgICAgIG5vZGVUeXBlU3RyaW5nID0gJ0FycmF5JztcbiAgICAgIH1cbiAgICAgIGlmIChub2RlVHlwZVN0cmluZyA9PT0gJ09iamVjdENvbnN0cnVjdG9yJykge1xuICAgICAgICBub2RlVHlwZVN0cmluZyA9ICdPYmplY3QnO1xuICAgICAgfVxuICAgICAgaWYgKHRzdXRpbHMuaXNUeXBlRmxhZ1NldChub2RlVHlwZSwgdHMuVHlwZUZsYWdzLlN0cmluZ0xpdGVyYWwpKSB7XG4gICAgICAgIG5vZGVUeXBlU3RyaW5nID0gJ3N0cmluZyc7XG4gICAgICB9XG5cbiAgICAgIC8vIG5vZGVGdW5jdGlvbiBpcyBiYXJcbiAgICAgIGxldCBub2RlRnVuY3Rpb24gPSAnJztcbiAgICAgIGlmICh0c3V0aWxzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgbm9kZUZ1bmN0aW9uID0gbm9kZS5leHByZXNzaW9uLm5hbWUuZ2V0VGV4dCgpO1xuICAgICAgfVxuICAgICAgaWYgKHRzdXRpbHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIGNvbnN0IGFyZ3VtZW50ID0gbm9kZS5leHByZXNzaW9uLmFyZ3VtZW50RXhwcmVzc2lvbjtcbiAgICAgICAgaWYgKGFyZ3VtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBub2RlRnVuY3Rpb24gPSBhcmd1bWVudC5nZXRUZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgJ2ZvbyNiYXInIG9yIGAke3R5cGVvZiBmb299I2JhcmAgaXMgaW4gdGhlIGJsYWNrbGlzdC5cbiAgICAgIGlmIChNRVRIT0RTX1RPX0NIRUNLLmhhcyhgJHtub2RlVHlwZVN0cmluZ30jJHtub2RlRnVuY3Rpb259YCkgfHxcbiAgICAgICAgICBNRVRIT0RTX1RPX0NIRUNLLmhhcyhgJHtub2RlRXhwcmVzc2lvblN0cmluZ30jJHtub2RlRnVuY3Rpb259YCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIEZvciAnc3RyLnJlcGxhY2UocmVnZXhwfHN1YnN0ciwgbmV3U3Vic3RyfGZ1bmN0aW9uKScgb25seSBjaGVjayB3aGVuXG4gICAgICAvLyB0aGUgc2Vjb25kIHBhcmFtZXRlciBpcyAnbmV3U3Vic3RyJy5cbiAgICAgIGlmICgoYCR7bm9kZVR5cGVTdHJpbmd9IyR7bm9kZUZ1bmN0aW9ufWAgPT09ICdzdHJpbmcjcmVwbGFjZScpIHx8XG4gICAgICAgICAgKGAke25vZGVFeHByZXNzaW9uU3RyaW5nfSMke25vZGVGdW5jdGlvbn1gID09PSAnc3RyaW5nI3JlcGxhY2UnKSkge1xuICAgICAgICByZXR1cm4gbm9kZS5hcmd1bWVudHMubGVuZ3RoID09PSAyICYmXG4gICAgICAgICAgICAhdHN1dGlscy5pc0Z1bmN0aW9uV2l0aEJvZHkobm9kZS5hcmd1bWVudHNbMV0pO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXI6XG4gICAgICAvLyBFeGFtcGxlOiBmb28oKVxuICAgICAgLy8gV2UgY3VycmVudGx5IGRvbid0IGhhdmUgZnVuY3Rpb25zIG9mIHRoaXMga2luZCBpbiBibGFja2xpc3QuXG4gICAgICBjb25zdCBpZGVudGlmaWVyID0gbm9kZS5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXI7XG4gICAgICBpZiAoTUVUSE9EU19UT19DSEVDSy5oYXMoaWRlbnRpZmllci50ZXh0KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGhhc0NoZWNrUmV0dXJuVmFsdWVKc0RvYyhub2RlOiB0cy5DYWxsRXhwcmVzc2lvbiwgdGM6IHRzLlR5cGVDaGVja2VyKSB7XG4gIGxldCBzeW1ib2wgPSB0Yy5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUuZXhwcmVzc2lvbik7XG4gIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0c3V0aWxzLmlzU3ltYm9sRmxhZ1NldChzeW1ib2wsIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSkge1xuICAgIHN5bWJvbCA9IHRjLmdldEFsaWFzZWRTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIGZvciAoY29uc3QganNEb2NUYWdJbmZvIG9mIHN5bWJvbC5nZXRKc0RvY1RhZ3MoKSkge1xuICAgIGlmIChqc0RvY1RhZ0luZm8ubmFtZSA9PT0gJ2NoZWNrUmV0dXJuVmFsdWUnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuIl19