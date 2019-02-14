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
    var ErrorCode;
    (function (ErrorCode) {
        ErrorCode[ErrorCode["CHECK_RETURN_VALUE"] = 21222] = "CHECK_RETURN_VALUE";
        ErrorCode[ErrorCode["EQUALS_NAN"] = 21223] = "EQUALS_NAN";
        ErrorCode[ErrorCode["BAN_EXPECT_TRUTHY_PROMISE"] = 21224] = "BAN_EXPECT_TRUTHY_PROMISE";
        ErrorCode[ErrorCode["MUST_USE_PROMISES"] = 21225] = "MUST_USE_PROMISES";
        ErrorCode[ErrorCode["BAN_PROMISE_AS_CONDITION"] = 21226] = "BAN_PROMISE_AS_CONDITION";
    })(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JfY29kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL3RzZXRzZS9lcnJvcl9jb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUEsSUFBWSxTQU1YO0lBTkQsV0FBWSxTQUFTO1FBQ25CLHlFQUEwQixDQUFBO1FBQzFCLHlEQUFrQixDQUFBO1FBQ2xCLHVGQUFpQyxDQUFBO1FBQ2pDLHVFQUF5QixDQUFBO1FBQ3pCLHFGQUFnQyxDQUFBO0lBQ2xDLENBQUMsRUFOVyxTQUFTLEdBQVQsaUJBQVMsS0FBVCxpQkFBUyxRQU1wQiIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBlbnVtIEVycm9yQ29kZSB7XG4gIENIRUNLX1JFVFVSTl9WQUxVRSA9IDIxMjIyLFxuICBFUVVBTFNfTkFOID0gMjEyMjMsXG4gIEJBTl9FWFBFQ1RfVFJVVEhZX1BST01JU0UgPSAyMTIyNCxcbiAgTVVTVF9VU0VfUFJPTUlTRVMgPSAyMTIyNSxcbiAgQkFOX1BST01JU0VfQVNfQ09ORElUSU9OID0gMjEyMjYsXG59XG4iXX0=