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
     * Tsetse rules should extend AbstractRule and provide a `register` function.
     * Rules are instantiated once per compilation operation and used across many
     * files.
     */
    var AbstractRule = /** @class */ (function () {
        function AbstractRule() {
        }
        return AbstractRule;
    }());
    exports.AbstractRule = AbstractRule;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL3RzZXRzZS9ydWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBRUE7Ozs7T0FJRztJQUNIO1FBQUE7UUFRQSxDQUFDO1FBQUQsbUJBQUM7SUFBRCxDQUFDLEFBUkQsSUFRQztJQVJxQixvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2hlY2tlcn0gZnJvbSAnLi9jaGVja2VyJztcblxuLyoqXG4gKiBUc2V0c2UgcnVsZXMgc2hvdWxkIGV4dGVuZCBBYnN0cmFjdFJ1bGUgYW5kIHByb3ZpZGUgYSBgcmVnaXN0ZXJgIGZ1bmN0aW9uLlxuICogUnVsZXMgYXJlIGluc3RhbnRpYXRlZCBvbmNlIHBlciBjb21waWxhdGlvbiBvcGVyYXRpb24gYW5kIHVzZWQgYWNyb3NzIG1hbnlcbiAqIGZpbGVzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQWJzdHJhY3RSdWxlIHtcbiAgYWJzdHJhY3QgcmVhZG9ubHkgcnVsZU5hbWU6IHN0cmluZztcbiAgYWJzdHJhY3QgcmVhZG9ubHkgY29kZTogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgaGFuZGxlciBmdW5jdGlvbnMgb24gbm9kZXMgaW4gQ2hlY2tlci5cbiAgICovXG4gIGFic3RyYWN0IHJlZ2lzdGVyKGNoZWNrZXI6IENoZWNrZXIpOiB2b2lkO1xufVxuIl19