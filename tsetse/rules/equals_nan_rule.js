/**
 * @fileoverview Bans `== NaN`, `=== NaN`, `!= NaN`, and `!== NaN` in TypeScript
 * code, since no value (including NaN) is equal to NaN.
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
        define(["require", "exports", "typescript", "../error_code", "../rule"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var error_code_1 = require("../error_code");
    var rule_1 = require("../rule");
    var Rule = /** @class */ (function (_super) {
        __extends(Rule, _super);
        function Rule() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.ruleName = 'equals-nan';
            _this.code = error_code_1.ErrorCode.EQUALS_NAN;
            return _this;
        }
        Rule.prototype.register = function (checker) {
            checker.on(ts.SyntaxKind.BinaryExpression, checkBinaryExpression, this.code);
        };
        return Rule;
    }(rule_1.AbstractRule));
    exports.Rule = Rule;
    function checkBinaryExpression(checker, node) {
        var isLeftNaN = ts.isIdentifier(node.left) && node.left.text === 'NaN';
        var isRightNaN = ts.isIdentifier(node.right) && node.right.text === 'NaN';
        if (!isLeftNaN && !isRightNaN) {
            return;
        }
        // We avoid calling getText() on the node.operatorToken because it's slow.
        // Instead, manually map back from the kind to the string form of the operator
        switch (node.operatorToken.kind) {
            case ts.SyntaxKind.EqualsEqualsToken:
                checker.addFailureAtNode(node, "x == NaN is always false; use isNaN(x) instead");
                break;
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                checker.addFailureAtNode(node, "x === NaN is always false; use isNaN(x) instead");
                break;
            case ts.SyntaxKind.ExclamationEqualsToken:
                checker.addFailureAtNode(node, "x != NaN is always true; use !isNaN(x) instead");
                break;
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                checker.addFailureAtNode(node, "x !== NaN is always true; use !isNaN(x) instead");
                break;
            default:
                // We don't care about other operators acting on NaN
                break;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXF1YWxzX25hbl9ydWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vaW50ZXJuYWwvdHNldHNlL3J1bGVzL2VxdWFsc19uYW5fcnVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakMsNENBQXdDO0lBQ3hDLGdDQUFxQztJQUVyQztRQUEwQix3QkFBWTtRQUF0QztZQUFBLHFFQVFDO1lBUFUsY0FBUSxHQUFHLFlBQVksQ0FBQztZQUN4QixVQUFJLEdBQUcsc0JBQVMsQ0FBQyxVQUFVLENBQUM7O1FBTXZDLENBQUM7UUFKQyx1QkFBUSxHQUFSLFVBQVMsT0FBZ0I7WUFDdkIsT0FBTyxDQUFDLEVBQUUsQ0FDTixFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBQ0gsV0FBQztJQUFELENBQUMsQUFSRCxDQUEwQixtQkFBWSxHQVFyQztJQVJZLG9CQUFJO0lBVWpCLFNBQVMscUJBQXFCLENBQUMsT0FBZ0IsRUFBRSxJQUF5QjtRQUN4RSxJQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUM7UUFDekUsSUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDO1FBQzVFLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDN0IsT0FBTztTQUNSO1FBRUQsMEVBQTBFO1FBQzFFLDhFQUE4RTtRQUM5RSxRQUFRLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFO1lBQy9CLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUI7Z0JBQ2xDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FDdEIsSUFBSSxFQUNKLGdEQUFnRCxDQUNqRCxDQUFDO2dCQUNGLE1BQU07WUFDUixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCO2dCQUN4QyxPQUFPLENBQUMsZ0JBQWdCLENBQ3RCLElBQUksRUFDSixpREFBaUQsQ0FDbEQsQ0FBQztnQkFDRixNQUFNO1lBQ1IsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQjtnQkFDdkMsT0FBTyxDQUFDLGdCQUFnQixDQUN0QixJQUFJLEVBQ0osZ0RBQWdELENBQ2pELENBQUM7Z0JBQ0YsTUFBTTtZQUNSLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyw0QkFBNEI7Z0JBQzdDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FDdEIsSUFBSSxFQUNKLGlEQUFpRCxDQUNsRCxDQUFDO2dCQUNGLE1BQU07WUFDUjtnQkFDRSxvREFBb0Q7Z0JBQ3BELE1BQU07U0FDVDtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQmFucyBgPT0gTmFOYCwgYD09PSBOYU5gLCBgIT0gTmFOYCwgYW5kIGAhPT0gTmFOYCBpbiBUeXBlU2NyaXB0XG4gKiBjb2RlLCBzaW5jZSBubyB2YWx1ZSAoaW5jbHVkaW5nIE5hTikgaXMgZXF1YWwgdG8gTmFOLlxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NoZWNrZXJ9IGZyb20gJy4uL2NoZWNrZXInO1xuaW1wb3J0IHtFcnJvckNvZGV9IGZyb20gJy4uL2Vycm9yX2NvZGUnO1xuaW1wb3J0IHtBYnN0cmFjdFJ1bGV9IGZyb20gJy4uL3J1bGUnO1xuXG5leHBvcnQgY2xhc3MgUnVsZSBleHRlbmRzIEFic3RyYWN0UnVsZSB7XG4gIHJlYWRvbmx5IHJ1bGVOYW1lID0gJ2VxdWFscy1uYW4nO1xuICByZWFkb25seSBjb2RlID0gRXJyb3JDb2RlLkVRVUFMU19OQU47XG5cbiAgcmVnaXN0ZXIoY2hlY2tlcjogQ2hlY2tlcikge1xuICAgIGNoZWNrZXIub24oXG4gICAgICAgIHRzLlN5bnRheEtpbmQuQmluYXJ5RXhwcmVzc2lvbiwgY2hlY2tCaW5hcnlFeHByZXNzaW9uLCB0aGlzLmNvZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoZWNrQmluYXJ5RXhwcmVzc2lvbihjaGVja2VyOiBDaGVja2VyLCBub2RlOiB0cy5CaW5hcnlFeHByZXNzaW9uKSB7XG4gIGNvbnN0IGlzTGVmdE5hTiA9IHRzLmlzSWRlbnRpZmllcihub2RlLmxlZnQpICYmIG5vZGUubGVmdC50ZXh0ID09PSAnTmFOJztcbiAgY29uc3QgaXNSaWdodE5hTiA9IHRzLmlzSWRlbnRpZmllcihub2RlLnJpZ2h0KSAmJiBub2RlLnJpZ2h0LnRleHQgPT09ICdOYU4nO1xuICBpZiAoIWlzTGVmdE5hTiAmJiAhaXNSaWdodE5hTikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFdlIGF2b2lkIGNhbGxpbmcgZ2V0VGV4dCgpIG9uIHRoZSBub2RlLm9wZXJhdG9yVG9rZW4gYmVjYXVzZSBpdCdzIHNsb3cuXG4gIC8vIEluc3RlYWQsIG1hbnVhbGx5IG1hcCBiYWNrIGZyb20gdGhlIGtpbmQgdG8gdGhlIHN0cmluZyBmb3JtIG9mIHRoZSBvcGVyYXRvclxuICBzd2l0Y2ggKG5vZGUub3BlcmF0b3JUb2tlbi5raW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuOlxuICAgICAgY2hlY2tlci5hZGRGYWlsdXJlQXROb2RlKFxuICAgICAgICBub2RlLFxuICAgICAgICBgeCA9PSBOYU4gaXMgYWx3YXlzIGZhbHNlOyB1c2UgaXNOYU4oeCkgaW5zdGVhZGAsXG4gICAgICApO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc0VxdWFsc1Rva2VuOlxuICAgICAgY2hlY2tlci5hZGRGYWlsdXJlQXROb2RlKFxuICAgICAgICBub2RlLFxuICAgICAgICBgeCA9PT0gTmFOIGlzIGFsd2F5cyBmYWxzZTsgdXNlIGlzTmFOKHgpIGluc3RlYWRgLFxuICAgICAgKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc1Rva2VuOlxuICAgICAgY2hlY2tlci5hZGRGYWlsdXJlQXROb2RlKFxuICAgICAgICBub2RlLFxuICAgICAgICBgeCAhPSBOYU4gaXMgYWx3YXlzIHRydWU7IHVzZSAhaXNOYU4oeCkgaW5zdGVhZGAsXG4gICAgICApO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW46XG4gICAgICBjaGVja2VyLmFkZEZhaWx1cmVBdE5vZGUoXG4gICAgICAgIG5vZGUsXG4gICAgICAgIGB4ICE9PSBOYU4gaXMgYWx3YXlzIHRydWU7IHVzZSAhaXNOYU4oeCkgaW5zdGVhZGAsXG4gICAgICApO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIFdlIGRvbid0IGNhcmUgYWJvdXQgb3RoZXIgb3BlcmF0b3JzIGFjdGluZyBvbiBOYU5cbiAgICAgIGJyZWFrO1xuICB9XG59XG4iXX0=