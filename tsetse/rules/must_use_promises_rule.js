/**
 * @fileoverview A Tsetse rule that checks that all promises in async function
 * blocks are awaited or used.
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
    var FAILURE_STRING = 'All Promises in async functions must either be awaited or used in an expression.' +
        '\n\tSee http://tsetse.info/must-use-promises';
    var Rule = /** @class */ (function (_super) {
        __extends(Rule, _super);
        function Rule() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.ruleName = 'must-use-promises';
            _this.code = error_code_1.ErrorCode.MUST_USE_PROMISES;
            return _this;
        }
        Rule.prototype.register = function (checker) {
            checker.on(ts.SyntaxKind.CallExpression, checkCallExpression, this.code);
        };
        return Rule;
    }(rule_1.AbstractRule));
    exports.Rule = Rule;
    function checkCallExpression(checker, node) {
        // Short-circuit before using the typechecker if possible, as its expensive.
        // Workaround for https://github.com/Microsoft/TypeScript/issues/27997
        if (tsutils.isExpressionValueUsed(node) || !inAsyncFunction(node)) {
            return;
        }
        var signature = checker.typeChecker.getResolvedSignature(node);
        if (signature === undefined) {
            return;
        }
        var returnType = checker.typeChecker.getReturnTypeOfSignature(signature);
        if (!!(returnType.flags & ts.TypeFlags.Void)) {
            return;
        }
        if (tsutils.isThenableType(checker.typeChecker, node)) {
            checker.addFailureAtNode(node, FAILURE_STRING);
        }
    }
    function inAsyncFunction(node) {
        var isFunction = tsutils.isFunctionDeclaration(node) ||
            tsutils.isArrowFunction(node) || tsutils.isMethodDeclaration(node) ||
            tsutils.isFunctionExpression(node);
        if (isFunction) {
            return tsutils.hasModifier(node.modifiers, ts.SyntaxKind.AsyncKeyword);
        }
        if (node.parent) {
            return inAsyncFunction(node.parent);
        }
        return false;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVzdF91c2VfcHJvbWlzZXNfcnVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL2ludGVybmFsL3RzZXRzZS9ydWxlcy9tdXN0X3VzZV9wcm9taXNlc19ydWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVILGlDQUFtQztJQUNuQywrQkFBaUM7SUFHakMsNENBQXdDO0lBQ3hDLGdDQUFxQztJQUVyQyxJQUFNLGNBQWMsR0FDaEIsa0ZBQWtGO1FBQ2xGLDhDQUE4QyxDQUFDO0lBRW5EO1FBQTBCLHdCQUFZO1FBQXRDO1lBQUEscUVBT0M7WUFOVSxjQUFRLEdBQUcsbUJBQW1CLENBQUM7WUFDL0IsVUFBSSxHQUFHLHNCQUFTLENBQUMsaUJBQWlCLENBQUM7O1FBSzlDLENBQUM7UUFIQyx1QkFBUSxHQUFSLFVBQVMsT0FBZ0I7WUFDdkIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0UsQ0FBQztRQUNILFdBQUM7SUFBRCxDQUFDLEFBUEQsQ0FBMEIsbUJBQVksR0FPckM7SUFQWSxvQkFBSTtJQVNqQixTQUFTLG1CQUFtQixDQUFDLE9BQWdCLEVBQUUsSUFBdUI7UUFDcEUsNEVBQTRFO1FBQzVFLHNFQUFzRTtRQUN0RSxJQUFJLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNqRSxPQUFPO1NBQ1I7UUFFRCxJQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pFLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtZQUMzQixPQUFPO1NBQ1I7UUFFRCxJQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVDLE9BQU87U0FDUjtRQUVELElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ3JELE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDaEQ7SUFDSCxDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsSUFBYTtRQUNwQyxJQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO1lBQ2xELE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQztZQUNsRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsSUFBSSxVQUFVLEVBQUU7WUFDZCxPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQ3hFO1FBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2YsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IEEgVHNldHNlIHJ1bGUgdGhhdCBjaGVja3MgdGhhdCBhbGwgcHJvbWlzZXMgaW4gYXN5bmMgZnVuY3Rpb25cbiAqIGJsb2NrcyBhcmUgYXdhaXRlZCBvciB1c2VkLlxuICovXG5cbmltcG9ydCAqIGFzIHRzdXRpbHMgZnJvbSAndHN1dGlscyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDaGVja2VyfSBmcm9tICcuLi9jaGVja2VyJztcbmltcG9ydCB7RXJyb3JDb2RlfSBmcm9tICcuLi9lcnJvcl9jb2RlJztcbmltcG9ydCB7QWJzdHJhY3RSdWxlfSBmcm9tICcuLi9ydWxlJztcblxuY29uc3QgRkFJTFVSRV9TVFJJTkcgPVxuICAgICdBbGwgUHJvbWlzZXMgaW4gYXN5bmMgZnVuY3Rpb25zIG11c3QgZWl0aGVyIGJlIGF3YWl0ZWQgb3IgdXNlZCBpbiBhbiBleHByZXNzaW9uLicgK1xuICAgICdcXG5cXHRTZWUgaHR0cDovL3RzZXRzZS5pbmZvL211c3QtdXNlLXByb21pc2VzJztcblxuZXhwb3J0IGNsYXNzIFJ1bGUgZXh0ZW5kcyBBYnN0cmFjdFJ1bGUge1xuICByZWFkb25seSBydWxlTmFtZSA9ICdtdXN0LXVzZS1wcm9taXNlcyc7XG4gIHJlYWRvbmx5IGNvZGUgPSBFcnJvckNvZGUuTVVTVF9VU0VfUFJPTUlTRVM7XG5cbiAgcmVnaXN0ZXIoY2hlY2tlcjogQ2hlY2tlcikge1xuICAgIGNoZWNrZXIub24odHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbiwgY2hlY2tDYWxsRXhwcmVzc2lvbiwgdGhpcy5jb2RlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGVja0NhbGxFeHByZXNzaW9uKGNoZWNrZXI6IENoZWNrZXIsIG5vZGU6IHRzLkNhbGxFeHByZXNzaW9uKSB7XG4gIC8vIFNob3J0LWNpcmN1aXQgYmVmb3JlIHVzaW5nIHRoZSB0eXBlY2hlY2tlciBpZiBwb3NzaWJsZSwgYXMgaXRzIGV4cGVuc2l2ZS5cbiAgLy8gV29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8yNzk5N1xuICBpZiAodHN1dGlscy5pc0V4cHJlc3Npb25WYWx1ZVVzZWQobm9kZSkgfHwgIWluQXN5bmNGdW5jdGlvbihub2RlKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHNpZ25hdHVyZSA9IGNoZWNrZXIudHlwZUNoZWNrZXIuZ2V0UmVzb2x2ZWRTaWduYXR1cmUobm9kZSk7XG4gIGlmIChzaWduYXR1cmUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHJldHVyblR5cGUgPSBjaGVja2VyLnR5cGVDaGVja2VyLmdldFJldHVyblR5cGVPZlNpZ25hdHVyZShzaWduYXR1cmUpO1xuICBpZiAoISEocmV0dXJuVHlwZS5mbGFncyAmIHRzLlR5cGVGbGFncy5Wb2lkKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0c3V0aWxzLmlzVGhlbmFibGVUeXBlKGNoZWNrZXIudHlwZUNoZWNrZXIsIG5vZGUpKSB7XG4gICAgY2hlY2tlci5hZGRGYWlsdXJlQXROb2RlKG5vZGUsIEZBSUxVUkVfU1RSSU5HKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbkFzeW5jRnVuY3Rpb24obm9kZTogdHMuTm9kZSk6IGJvb2xlYW4ge1xuICBjb25zdCBpc0Z1bmN0aW9uID0gdHN1dGlscy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkgfHxcbiAgICAgIHRzdXRpbHMuaXNBcnJvd0Z1bmN0aW9uKG5vZGUpIHx8IHRzdXRpbHMuaXNNZXRob2REZWNsYXJhdGlvbihub2RlKSB8fFxuICAgICAgdHN1dGlscy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihub2RlKTtcbiAgaWYgKGlzRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gdHN1dGlscy5oYXNNb2RpZmllcihub2RlLm1vZGlmaWVycywgdHMuU3ludGF4S2luZC5Bc3luY0tleXdvcmQpO1xuICB9XG4gIGlmIChub2RlLnBhcmVudCkge1xuICAgIHJldHVybiBpbkFzeW5jRnVuY3Rpb24obm9kZS5wYXJlbnQpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiJdfQ==