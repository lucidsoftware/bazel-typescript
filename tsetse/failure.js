(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    /**
     * A Tsetse check Failure is almost identical to a Diagnostic from TypeScript
     * except that:
     * (1) The error code is defined by each individual Tsetse rule.
     * (2) The optional `source` property is set to `Tsetse` so the host (VS Code
     * for instance) would use that to indicate where the error comes from.
     */
    var Failure = /** @class */ (function () {
        function Failure(sourceFile, start, end, failureText, code) {
            this.sourceFile = sourceFile;
            this.start = start;
            this.end = end;
            this.failureText = failureText;
            this.code = code;
        }
        Failure.prototype.toDiagnostic = function () {
            return {
                file: this.sourceFile,
                start: this.start,
                length: this.end - this.start,
                messageText: this.failureText,
                category: ts.DiagnosticCategory.Error,
                code: this.code,
                // source is the name of the plugin.
                source: 'Tsetse',
            };
        };
        return Failure;
    }());
    exports.Failure = Failure;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFpbHVyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL3RzZXRzZS9mYWlsdXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUEsK0JBQWlDO0lBRWpDOzs7Ozs7T0FNRztJQUNIO1FBQ0UsaUJBQ1ksVUFBeUIsRUFBVSxLQUFhLEVBQ2hELEdBQVcsRUFBVSxXQUFtQixFQUFVLElBQVk7WUFEOUQsZUFBVSxHQUFWLFVBQVUsQ0FBZTtZQUFVLFVBQUssR0FBTCxLQUFLLENBQVE7WUFDaEQsUUFBRyxHQUFILEdBQUcsQ0FBUTtZQUFVLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFHLENBQUM7UUFFOUUsOEJBQVksR0FBWjtZQUNFLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUNyQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLO2dCQUM3QixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQzdCLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSztnQkFDckMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLG9DQUFvQztnQkFDcEMsTUFBTSxFQUFFLFFBQVE7YUFDakIsQ0FBQztRQUNKLENBQUM7UUFDSCxjQUFDO0lBQUQsQ0FBQyxBQWpCRCxJQWlCQztJQWpCWSwwQkFBTyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIEEgVHNldHNlIGNoZWNrIEZhaWx1cmUgaXMgYWxtb3N0IGlkZW50aWNhbCB0byBhIERpYWdub3N0aWMgZnJvbSBUeXBlU2NyaXB0XG4gKiBleGNlcHQgdGhhdDpcbiAqICgxKSBUaGUgZXJyb3IgY29kZSBpcyBkZWZpbmVkIGJ5IGVhY2ggaW5kaXZpZHVhbCBUc2V0c2UgcnVsZS5cbiAqICgyKSBUaGUgb3B0aW9uYWwgYHNvdXJjZWAgcHJvcGVydHkgaXMgc2V0IHRvIGBUc2V0c2VgIHNvIHRoZSBob3N0IChWUyBDb2RlXG4gKiBmb3IgaW5zdGFuY2UpIHdvdWxkIHVzZSB0aGF0IHRvIGluZGljYXRlIHdoZXJlIHRoZSBlcnJvciBjb21lcyBmcm9tLlxuICovXG5leHBvcnQgY2xhc3MgRmFpbHVyZSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBwcml2YXRlIHN0YXJ0OiBudW1iZXIsXG4gICAgICBwcml2YXRlIGVuZDogbnVtYmVyLCBwcml2YXRlIGZhaWx1cmVUZXh0OiBzdHJpbmcsIHByaXZhdGUgY29kZTogbnVtYmVyKSB7fVxuXG4gIHRvRGlhZ25vc3RpYygpOiB0cy5EaWFnbm9zdGljIHtcbiAgICByZXR1cm4ge1xuICAgICAgZmlsZTogdGhpcy5zb3VyY2VGaWxlLFxuICAgICAgc3RhcnQ6IHRoaXMuc3RhcnQsXG4gICAgICBsZW5ndGg6IHRoaXMuZW5kIC0gdGhpcy5zdGFydCxcbiAgICAgIG1lc3NhZ2VUZXh0OiB0aGlzLmZhaWx1cmVUZXh0LFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIGNvZGU6IHRoaXMuY29kZSxcbiAgICAgIC8vIHNvdXJjZSBpcyB0aGUgbmFtZSBvZiB0aGUgcGx1Z2luLlxuICAgICAgc291cmNlOiAnVHNldHNlJyxcbiAgICB9O1xuICB9XG59XG4iXX0=