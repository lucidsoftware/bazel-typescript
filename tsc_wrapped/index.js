(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./tsconfig", "./cache", "./compiler_host", "./diagnostics", "./worker", "./manifest"], factory);
    }
})(function (require, exports) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    __export(require("./tsconfig"));
    __export(require("./cache"));
    __export(require("./compiler_host"));
    __export(require("./diagnostics"));
    __export(require("./worker"));
    __export(require("./manifest"));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2Nfd3JhcHBlZC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztJQUFBLGdDQUEyQjtJQUMzQiw2QkFBd0I7SUFDeEIscUNBQWdDO0lBQ2hDLG1DQUE4QjtJQUM5Qiw4QkFBeUI7SUFDekIsZ0NBQTJCIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0ICogZnJvbSAnLi90c2NvbmZpZyc7XG5leHBvcnQgKiBmcm9tICcuL2NhY2hlJztcbmV4cG9ydCAqIGZyb20gJy4vY29tcGlsZXJfaG9zdCc7XG5leHBvcnQgKiBmcm9tICcuL2RpYWdub3N0aWNzJztcbmV4cG9ydCAqIGZyb20gJy4vd29ya2VyJztcbmV4cG9ydCAqIGZyb20gJy4vbWFuaWZlc3QnO1xuIl19