/**
 * @fileoverview Bans using a promise as a condition. Promises are always
 * truthy, and this pattern is likely to be a bug where the developer meant
 * if(await returnsPromise()) {} and forgot the await.
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
    var Rule = /** @class */ (function (_super) {
        __extends(Rule, _super);
        function Rule() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.ruleName = 'ban-promise-as-condition';
            _this.code = error_code_1.ErrorCode.BAN_PROMISE_AS_CONDITION;
            return _this;
        }
        Rule.prototype.register = function (checker) {
            checker.on(ts.SyntaxKind.ConditionalExpression, checkConditional, this.code);
            checker.on(ts.SyntaxKind.BinaryExpression, checkBinaryExpression, this.code);
            checker.on(ts.SyntaxKind.WhileStatement, checkWhileStatement, this.code);
            checker.on(ts.SyntaxKind.IfStatement, checkIfStatement, this.code);
        };
        return Rule;
    }(rule_1.AbstractRule));
    exports.Rule = Rule;
    /** Error message to display. */
    function thenableText(nodeType, isVariable) {
        return "Found a thenable " + (isVariable ? 'variable' : 'return value') + " being" +
            (" used as " + nodeType + ". Promises are always truthy, await the value to get") +
            ' a boolean value.';
    }
    function thenableVariableText(nodeType) {
        return thenableText(nodeType, true);
    }
    function thenableReturnText(nodeType) {
        return thenableText(nodeType, false);
    }
    /** Ternary: prom ? y : z */
    function checkConditional(checker, node) {
        addFailureIfThenableCallExpression(checker, node.condition, thenableReturnText('a conditional'));
        addFailureIfThenableIdentifier(checker, node.condition, thenableVariableText('a conditional'));
    }
    /**
     *  Binary expression: prom || y or prom && y. Only check left side because
     *  myThing && myThing.prom seems legitimate.
     */
    function checkBinaryExpression(checker, node) {
        if (node.operatorToken.kind !== ts.SyntaxKind.BarBarToken &&
            node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) {
            return;
        }
        addFailureIfThenableCallExpression(checker, node.left, thenableReturnText('a binary expression'));
        addFailureIfThenableIdentifier(checker, node.left, thenableVariableText('a binary expression'));
    }
    /** While statement: while (prom) {} */
    function checkWhileStatement(checker, node) {
        addFailureIfThenableCallExpression(checker, node.expression, thenableReturnText('a while statement'));
        addFailureIfThenableIdentifier(checker, node.expression, thenableVariableText('a while  statement'));
    }
    /** If statement: if (prom) {} */
    function checkIfStatement(checker, node) {
        addFailureIfThenableCallExpression(checker, node.expression, thenableReturnText('an if statement'));
        addFailureIfThenableIdentifier(checker, node.expression, thenableVariableText('an if statement'));
    }
    /** Helper methods */
    function addFailureIfThenableCallExpression(checker, callExpression, errorMessage) {
        if (!tsutils.isCallExpression(callExpression)) {
            return;
        }
        var typeChecker = checker.typeChecker;
        var signature = typeChecker.getResolvedSignature(callExpression);
        // Return value of getResolvedSignature is `Signature | undefined` in ts 3.1
        // so we must check if the return value is valid to compile with ts 3.1.
        if (!signature) {
            throw new Error('Unexpected undefined signature for call expression');
        }
        var returnType = typeChecker.getReturnTypeOfSignature(signature);
        if (isNonFalsyThenableType(typeChecker, callExpression, returnType)) {
            checker.addFailureAtNode(callExpression, errorMessage);
        }
    }
    function addFailureIfThenableIdentifier(checker, identifier, errorMessage) {
        if (!tsutils.isIdentifier(identifier)) {
            return;
        }
        if (isNonFalsyThenableType(checker.typeChecker, identifier)) {
            checker.addFailureAtNode(identifier, errorMessage);
        }
    }
    /**
     * If the type is a union type and has a falsy part it may be legitimate to use
     * it as a condition, so allow those through. (e.g. Promise<boolean> | boolean)
     * Otherwise, check if it's thenable. If so it should be awaited.
     */
    function isNonFalsyThenableType(typeChecker, node, type) {
        if (type === void 0) { type = typeChecker.getTypeAtLocation(node); }
        if (hasFalsyParts(typeChecker.getTypeAtLocation(node))) {
            return false;
        }
        return tsutils.isThenableType(typeChecker, node, type);
    }
    function hasFalsyParts(type) {
        var typeParts = tsutils.unionTypeParts(type);
        var hasFalsyParts = typeParts.filter(function (part) { return tsutils.isFalsyType(part); }).length > 0;
        return hasFalsyParts;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFuX3Byb21pc2VfYXNfY29uZGl0aW9uX3J1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2V0c2UvcnVsZXMvYmFuX3Byb21pc2VfYXNfY29uZGl0aW9uX3J1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVILGlDQUFtQztJQUNuQywrQkFBaUM7SUFHakMsNENBQXdDO0lBQ3hDLGdDQUFxQztJQUVyQztRQUEwQix3QkFBWTtRQUF0QztZQUFBLHFFQVlDO1lBWFUsY0FBUSxHQUFHLDBCQUEwQixDQUFDO1lBQ3RDLFVBQUksR0FBRyxzQkFBUyxDQUFDLHdCQUF3QixDQUFDOztRQVVyRCxDQUFDO1FBUkMsdUJBQVEsR0FBUixVQUFTLE9BQWdCO1lBQ3ZCLE9BQU8sQ0FBQyxFQUFFLENBQ04sRUFBRSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEUsT0FBTyxDQUFDLEVBQUUsQ0FDTixFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0RSxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6RSxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBQ0gsV0FBQztJQUFELENBQUMsQUFaRCxDQUEwQixtQkFBWSxHQVlyQztJQVpZLG9CQUFJO0lBY2pCLGdDQUFnQztJQUNoQyxTQUFTLFlBQVksQ0FBQyxRQUFnQixFQUFFLFVBQW1C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cHJvbWlzZSBhcyBhIGNvbmRpdGlvbi4gUHJvbWlzZXMgYXJlIGFsd2F5c1xuICogdHJ1dGh5LCBhbmQgdGhpcyBwYXR0ZXJuIGlzIGxpa2VseSB0byBiZSBhIGJ1ZyB3aGVyZSB0aGUgZGV2ZWxvcGVyIG1lYW50XG4gKiBpZihhd2FpdCByZXR1cm5zUHJvbWlzZSgpKSB7fSBhbmQgZm9yZ290IHRoZSBhd2FpdC5cbiAqL1xuXG5pbXBvcnQgKiBhcyB0c3V0aWxzIGZyb20gJ3RzdXRpbHMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2hlY2tlcn0gZnJvbSAnLi4vY2hlY2tlcic7XG5pbXBvcnQge0Vycm9yQ29kZX0gZnJvbSAnLi4vZXJyb3JfY29kZSc7XG5pbXBvcnQge0Fic3RyYWN0UnVsZX0gZnJvbSAnLi4vcnVsZSc7XG5cbmV4cG9ydCBjbGFzcyBSdWxlIGV4dGVuZHMgQWJzdHJhY3RSdWxlIHtcbiAgcmVhZG9ubHkgcnVsZU5hbWUgPSAnYmFuLXByb21pc2UtYXMtY29uZGl0aW9uJztcbiAgcmVhZG9ubHkgY29kZSA9IEVycm9yQ29kZS5CQU5fUFJPTUlTRV9BU19DT05ESVRJT047XG5cbiAgcmVnaXN0ZXIoY2hlY2tlcjogQ2hlY2tlcikge1xuICAgIGNoZWNrZXIub24oXG4gICAgICAgIHRzLlN5bnRheEtpbmQuQ29uZGl0aW9uYWxFeHByZXNzaW9uLCBjaGVja0NvbmRpdGlvbmFsLCB0aGlzLmNvZGUpO1xuICAgIGNoZWNrZXIub24oXG4gICAgICAgIHRzLlN5bnRheEtpbmQuQmluYXJ5RXhwcmVzc2lvbiwgY2hlY2tCaW5hcnlFeHByZXNzaW9uLCB0aGlzLmNvZGUpO1xuICAgIGNoZWNrZXIub24odHMuU3ludGF4S2luZC5XaGlsZVN0YXRlbWVudCwgY2hlY2tXaGlsZVN0YXRlbWVudCwgdGhpcy5jb2RlKTtcbiAgICBjaGVja2VyLm9uKHRzLlN5bnRheEtpbmQuSWZTdGF0ZW1lbnQsIGNoZWNrSWZTdGF0ZW1lbnQsIHRoaXMuY29kZSk7XG4gIH1cbn1cblxuLyoqIEVycm9yIG1lc3NhZ2UgdG8gZGlzcGxheS4gKi9cbmZ1bmN0aW9uIHRoZW5hYmxlVGV4dChub2RlVHlwZTogc3RyaW5nLCBpc1ZhcmlhYmxlOiBib29sZWFuKSB7XG4gIHJldHVybiBgRm91bmQgYSB0aGVuYWJsZSAke2lzVmFyaWFibGUgPyAndmFyaWFibGUnIDogJ3JldHVybiB2YWx1ZSd9IGJlaW5nYCArXG4gICAgICBgIHVzZWQgYXMgJHtcbiAgICAgICAgICAgICBub2RlVHlwZX0uIFByb21pc2VzIGFyZSBhbHdheXMgdHJ1dGh5LCBhd2FpdCB0aGUgdmFsdWUgdG8gZ2V0YCArXG4gICAgICAnIGEgYm9vbGVhbiB2YWx1ZS4nO1xufVxuXG5mdW5jdGlvbiB0aGVuYWJsZVZhcmlhYmxlVGV4dChub2RlVHlwZTogc3RyaW5nKSB7XG4gIHJldHVybiB0aGVuYWJsZVRleHQobm9kZVR5cGUsIHRydWUpO1xufVxuXG5mdW5jdGlvbiB0aGVuYWJsZVJldHVyblRleHQobm9kZVR5cGU6IHN0cmluZykge1xuICByZXR1cm4gdGhlbmFibGVUZXh0KG5vZGVUeXBlLCBmYWxzZSk7XG59XG5cbi8qKiBUZXJuYXJ5OiBwcm9tID8geSA6IHogKi9cbmZ1bmN0aW9uIGNoZWNrQ29uZGl0aW9uYWwoY2hlY2tlcjogQ2hlY2tlciwgbm9kZTogdHMuQ29uZGl0aW9uYWxFeHByZXNzaW9uKSB7XG4gIGFkZEZhaWx1cmVJZlRoZW5hYmxlQ2FsbEV4cHJlc3Npb24oXG4gICAgICBjaGVja2VyLCBub2RlLmNvbmRpdGlvbiwgdGhlbmFibGVSZXR1cm5UZXh0KCdhIGNvbmRpdGlvbmFsJykpO1xuXG4gIGFkZEZhaWx1cmVJZlRoZW5hYmxlSWRlbnRpZmllcihcbiAgICAgIGNoZWNrZXIsIG5vZGUuY29uZGl0aW9uLCB0aGVuYWJsZVZhcmlhYmxlVGV4dCgnYSBjb25kaXRpb25hbCcpKTtcbn1cblxuLyoqXG4gKiAgQmluYXJ5IGV4cHJlc3Npb246IHByb20gfHwgeSBvciBwcm9tICYmIHkuIE9ubHkgY2hlY2sgbGVmdCBzaWRlIGJlY2F1c2VcbiAqICBteVRoaW5nICYmIG15VGhpbmcucHJvbSBzZWVtcyBsZWdpdGltYXRlLlxuICovXG5mdW5jdGlvbiBjaGVja0JpbmFyeUV4cHJlc3Npb24oY2hlY2tlcjogQ2hlY2tlciwgbm9kZTogdHMuQmluYXJ5RXhwcmVzc2lvbikge1xuICBpZiAobm9kZS5vcGVyYXRvclRva2VuLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4gJiZcbiAgICAgIG5vZGUub3BlcmF0b3JUb2tlbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgYWRkRmFpbHVyZUlmVGhlbmFibGVDYWxsRXhwcmVzc2lvbihcbiAgICAgIGNoZWNrZXIsIG5vZGUubGVmdCwgdGhlbmFibGVSZXR1cm5UZXh0KCdhIGJpbmFyeSBleHByZXNzaW9uJykpO1xuXG4gIGFkZEZhaWx1cmVJZlRoZW5hYmxlSWRlbnRpZmllcihcbiAgICAgIGNoZWNrZXIsIG5vZGUubGVmdCwgdGhlbmFibGVWYXJpYWJsZVRleHQoJ2EgYmluYXJ5IGV4cHJlc3Npb24nKSk7XG59XG5cbi8qKiBXaGlsZSBzdGF0ZW1lbnQ6IHdoaWxlIChwcm9tKSB7fSAqL1xuZnVuY3Rpb24gY2hlY2tXaGlsZVN0YXRlbWVudChjaGVja2VyOiBDaGVja2VyLCBub2RlOiB0cy5XaGlsZVN0YXRlbWVudCkge1xuICBhZGRGYWlsdXJlSWZUaGVuYWJsZUNhbGxFeHByZXNzaW9uKFxuICAgICAgY2hlY2tlciwgbm9kZS5leHByZXNzaW9uLCB0aGVuYWJsZVJldHVyblRleHQoJ2Egd2hpbGUgc3RhdGVtZW50JykpO1xuXG4gIGFkZEZhaWx1cmVJZlRoZW5hYmxlSWRlbnRpZmllcihcbiAgICAgIGNoZWNrZXIsIG5vZGUuZXhwcmVzc2lvbiwgdGhlbmFibGVWYXJpYWJsZVRleHQoJ2Egd2hpbGUgIHN0YXRlbWVudCcpKTtcbn1cblxuLyoqIElmIHN0YXRlbWVudDogaWYgKHByb20pIHt9ICovXG5mdW5jdGlvbiBjaGVja0lmU3RhdGVtZW50KGNoZWNrZXI6IENoZWNrZXIsIG5vZGU6IHRzLklmU3RhdGVtZW50KSB7XG4gIGFkZEZhaWx1cmVJZlRoZW5hYmxlQ2FsbEV4cHJlc3Npb24oXG4gICAgICBjaGVja2VyLCBub2RlLmV4cHJlc3Npb24sIHRoZW5hYmxlUmV0dXJuVGV4dCgnYW4gaWYgc3RhdGVtZW50JykpO1xuXG4gIGFkZEZhaWx1cmVJZlRoZW5hYmxlSWRlbnRpZmllcihcbiAgICAgIGNoZWNrZXIsIG5vZGUuZXhwcmVzc2lvbiwgdGhlbmFibGVWYXJpYWJsZVRleHQoJ2FuIGlmIHN0YXRlbWVudCcpKTtcbn1cblxuLyoqIEhlbHBlciBtZXRob2RzICovXG5cbmZ1bmN0aW9uIGFkZEZhaWx1cmVJZlRoZW5hYmxlQ2FsbEV4cHJlc3Npb24oXG4gICAgY2hlY2tlcjogQ2hlY2tlciwgY2FsbEV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24sIGVycm9yTWVzc2FnZTogc3RyaW5nKSB7XG4gIGlmICghdHN1dGlscy5pc0NhbGxFeHByZXNzaW9uKGNhbGxFeHByZXNzaW9uKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHR5cGVDaGVja2VyID0gY2hlY2tlci50eXBlQ2hlY2tlcjtcbiAgY29uc3Qgc2lnbmF0dXJlID0gdHlwZUNoZWNrZXIuZ2V0UmVzb2x2ZWRTaWduYXR1cmUoY2FsbEV4cHJlc3Npb24pO1xuXG4gIC8vIFJldHVybiB2YWx1ZSBvZiBnZXRSZXNvbHZlZFNpZ25hdHVyZSBpcyBgU2lnbmF0dXJlIHwgdW5kZWZpbmVkYCBpbiB0cyAzLjFcbiAgLy8gc28gd2UgbXVzdCBjaGVjayBpZiB0aGUgcmV0dXJuIHZhbHVlIGlzIHZhbGlkIHRvIGNvbXBpbGUgd2l0aCB0cyAzLjEuXG4gIGlmICghc2lnbmF0dXJlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHVuZGVmaW5lZCBzaWduYXR1cmUgZm9yIGNhbGwgZXhwcmVzc2lvbicpO1xuICB9XG5cbiAgY29uc3QgcmV0dXJuVHlwZSA9IHR5cGVDaGVja2VyLmdldFJldHVyblR5cGVPZlNpZ25hdHVyZShzaWduYXR1cmUpO1xuXG4gIGlmIChpc05vbkZhbHN5VGhlbmFibGVUeXBlKHR5cGVDaGVja2VyLCBjYWxsRXhwcmVzc2lvbiwgcmV0dXJuVHlwZSkpIHtcbiAgICBjaGVja2VyLmFkZEZhaWx1cmVBdE5vZGUoY2FsbEV4cHJlc3Npb24sIGVycm9yTWVzc2FnZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkRmFpbHVyZUlmVGhlbmFibGVJZGVudGlmaWVyKFxuICAgIGNoZWNrZXI6IENoZWNrZXIsIGlkZW50aWZpZXI6IHRzLkV4cHJlc3Npb24sIGVycm9yTWVzc2FnZTogc3RyaW5nKSB7XG4gIGlmICghdHN1dGlscy5pc0lkZW50aWZpZXIoaWRlbnRpZmllcikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoaXNOb25GYWxzeVRoZW5hYmxlVHlwZShjaGVja2VyLnR5cGVDaGVja2VyLCBpZGVudGlmaWVyKSkge1xuICAgIGNoZWNrZXIuYWRkRmFpbHVyZUF0Tm9kZShpZGVudGlmaWVyLCBlcnJvck1lc3NhZ2UpO1xuICB9XG59XG5cbi8qKlxuICogSWYgdGhlIHR5cGUgaXMgYSB1bmlvbiB0eXBlIGFuZCBoYXMgYSBmYWxzeSBwYXJ0IGl0IG1heSBiZSBsZWdpdGltYXRlIHRvIHVzZVxuICogaXQgYXMgYSBjb25kaXRpb24sIHNvIGFsbG93IHRob3NlIHRocm91Z2guIChlLmcuIFByb21pc2U8Ym9vbGVhbj4gfCBib29sZWFuKVxuICogT3RoZXJ3aXNlLCBjaGVjayBpZiBpdCdzIHRoZW5hYmxlLiBJZiBzbyBpdCBzaG91bGQgYmUgYXdhaXRlZC5cbiAqL1xuZnVuY3Rpb24gaXNOb25GYWxzeVRoZW5hYmxlVHlwZShcbiAgICB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIG5vZGU6IHRzLkV4cHJlc3Npb24sXG4gICAgdHlwZSA9IHR5cGVDaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpKSB7XG4gIGlmIChoYXNGYWxzeVBhcnRzKHR5cGVDaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0c3V0aWxzLmlzVGhlbmFibGVUeXBlKHR5cGVDaGVja2VyLCBub2RlLCB0eXBlKTtcbn1cblxuZnVuY3Rpb24gaGFzRmFsc3lQYXJ0cyh0eXBlOiB0cy5UeXBlKSB7XG4gIGNvbnN0IHR5cGVQYXJ0cyA9IHRzdXRpbHMudW5pb25UeXBlUGFydHModHlwZSk7XG4gIGNvbnN0IGhhc0ZhbHN5UGFydHMgPVxuICAgICAgdHlwZVBhcnRzLmZpbHRlcigocGFydCkgPT4gdHN1dGlscy5pc0ZhbHN5VHlwZShwYXJ0KSkubGVuZ3RoID4gMDtcbiAgcmV0dXJuIGhhc0ZhbHN5UGFydHM7XG59XG4iXX0=