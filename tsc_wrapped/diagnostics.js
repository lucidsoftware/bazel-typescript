/**
 * @fileoverview extensions to TypeScript functionality around error handling
 * (ts.Diagnostics).
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
        define(["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    /**
     * If the current compilation was a compilation test expecting certain
     * diagnostics, filter out the expected diagnostics, and add new diagnostics
     * (aka errors) for non-matched diagnostics.
     */
    function filterExpected(bazelOpts, diagnostics, formatFn) {
        if (formatFn === void 0) { formatFn = uglyFormat; }
        if (!bazelOpts.expectedDiagnostics.length)
            return diagnostics;
        // The regex contains two parts:
        // 1. Optional position: '\(5,1\)'
        // 2. Required TS error: 'TS2000: message text.'
        // Need triple escapes because the expected diagnostics that we're matching
        // here are regexes, too.
        var ERROR_RE = /^(?:\\\((\d*),(\d*)\\\).*)?TS(\d+):(.*)/;
        var incorrectErrors = bazelOpts.expectedDiagnostics.filter(function (e) { return !e.match(ERROR_RE); });
        if (incorrectErrors.length) {
            var msg = "Expected errors must match regex " + ERROR_RE + "\n\t" +
                ("expected errors are \"" + incorrectErrors.join(', ') + "\"");
            return [{
                    file: undefined,
                    start: 0,
                    length: 0,
                    messageText: msg,
                    category: ts.DiagnosticCategory.Error,
                    code: 0,
                }];
        }
        var expectedDiags = bazelOpts.expectedDiagnostics.map(function (expected) {
            var m = expected.match(/^(?:\\\((\d*),(\d*)\\\).*)?TS(\d+):(.*)$/);
            if (!m) {
                throw new Error('Incorrect expected error, did you forget character escapes in ' +
                    expected);
            }
            var _a = __read(m, 5), lineStr = _a[1], columnStr = _a[2], codeStr = _a[3], regexp = _a[4];
            var _b = __read([lineStr, columnStr, codeStr].map(function (str) {
                var i = Number(str);
                if (Number.isNaN(i)) {
                    return 0;
                }
                return i;
            }), 3), line = _b[0], column = _b[1], code = _b[2];
            return {
                line: line,
                column: column,
                expected: expected,
                code: code,
                regexp: new RegExp(regexp),
                matched: false,
            };
        });
        var unmatchedDiags = diagnostics.filter(function (diag) {
            var _a, e_1, _b;
            var line = -1;
            var character = -1;
            if (diag.file && diag.start) {
                (_a = ts.getLineAndCharacterOfPosition(diag.file, diag.start), line = _a.line, character = _a.character);
            }
            var matched = false;
            var msg = formatFn(bazelOpts.target, [diag]);
            // checkDiagMatchesExpected checks if the expected diagnostics matches the
            // actual diagnostics.
            var checkDiagMatchesExpected = function (expDiag, diag) {
                if (expDiag.code !== diag.code || msg.search(expDiag.regexp) === -1) {
                    return false;
                }
                // line and column are optional fields, only check them if they
                // are explicitly specified.
                // line and character are zero based.
                if (expDiag.line !== 0 && expDiag.line !== line + 1) {
                    return false;
                }
                if (expDiag.column !== 0 && expDiag.column !== character + 1) {
                    return false;
                }
                return true;
            };
            try {
                for (var expectedDiags_1 = __values(expectedDiags), expectedDiags_1_1 = expectedDiags_1.next(); !expectedDiags_1_1.done; expectedDiags_1_1 = expectedDiags_1.next()) {
                    var expDiag = expectedDiags_1_1.value;
                    if (checkDiagMatchesExpected(expDiag, diag)) {
                        expDiag.matched = true;
                        matched = true;
                        // continue, one diagnostic may match multiple expected errors.
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (expectedDiags_1_1 && !expectedDiags_1_1.done && (_b = expectedDiags_1.return)) _b.call(expectedDiags_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return !matched;
        });
        var unmatchedErrors = expectedDiags.filter(function (err) { return !err.matched; }).map(function (err) {
            var file = ts.createSourceFile(bazelOpts.target, '/* fake source as marker */', ts.ScriptTarget.Latest);
            var messageText = "Expected a compilation error matching " + JSON.stringify(err.expected);
            return {
                file: file,
                start: 0,
                length: 0,
                messageText: messageText,
                category: ts.DiagnosticCategory.Error,
                code: err.code,
            };
        });
        return unmatchedDiags.concat(unmatchedErrors);
    }
    exports.filterExpected = filterExpected;
    /**
     * Formats the given diagnostics, without pretty printing.  Without colors, it's
     * better for matching against programmatically.
     * @param target The bazel target, e.g. //my/package:target
     */
    function uglyFormat(target, diagnostics) {
        var diagnosticsHost = {
            getCurrentDirectory: function () { return ts.sys.getCurrentDirectory(); },
            getNewLine: function () { return ts.sys.newLine; },
            // Print filenames including their relativeRoot, so they can be located on
            // disk
            getCanonicalFileName: function (f) { return f; }
        };
        return ts.formatDiagnostics(diagnostics, diagnosticsHost);
    }
    exports.uglyFormat = uglyFormat;
    /**
     * Pretty formats the given diagnostics (matching the --pretty tsc flag).
     * @param target The bazel target, e.g. //my/package:target
     */
    function format(target, diagnostics) {
        var diagnosticsHost = {
            getCurrentDirectory: function () { return ts.sys.getCurrentDirectory(); },
            getNewLine: function () { return ts.sys.newLine; },
            // Print filenames including their relativeRoot, so they can be located on
            // disk
            getCanonicalFileName: function (f) { return f; }
        };
        return ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticsHost);
    }
    exports.format = format;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2Nfd3JhcHBlZC9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBSWpDOzs7O09BSUc7SUFDSCxTQUFnQixjQUFjLENBQzFCLFNBQXVCLEVBQUUsV0FBNEIsRUFDckQsUUFBcUI7UUFBckIseUJBQUEsRUFBQSxxQkFBcUI7UUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNO1lBQUUsT0FBTyxXQUFXLENBQUM7UUFFOUQsZ0NBQWdDO1FBQ2hDLGtDQUFrQztRQUNsQyxnREFBZ0Q7UUFDaEQsMkVBQTJFO1FBQzNFLHlCQUF5QjtRQUN6QixJQUFNLFFBQVEsR0FBRyx5Q0FBeUMsQ0FBQztRQUMzRCxJQUFNLGVBQWUsR0FDakIsU0FBUyxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBbEIsQ0FBa0IsQ0FBQyxDQUFDO1FBQ2xFLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRTtZQUMxQixJQUFNLEdBQUcsR0FBRyxzQ0FBb0MsUUFBUSxTQUFNO2lCQUMxRCwyQkFBd0IsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBRyxDQUFBLENBQUM7WUFDMUQsT0FBTyxDQUFDO29CQUNOLElBQUksRUFBRSxTQUFVO29CQUNoQixLQUFLLEVBQUUsQ0FBQztvQkFDUixNQUFNLEVBQUUsQ0FBQztvQkFDVCxXQUFXLEVBQUUsR0FBRztvQkFDaEIsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO29CQUNyQyxJQUFJLEVBQUUsQ0FBQztpQkFDUixDQUFDLENBQUM7U0FDSjtR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RSxjQUFNLE9BQUEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQWQsQ0FBYztZQUNoQywwRUFBMEU7WUFDMUUsT0FBTztZQUNQLG9CQUFvQixFQUFFLFVBQUMsQ0FBUyxJQUFLLE9BQUEsQ0FBQyxFQUFELENBQUM7U0FDdkMsQ0FBQztRQUNGLE9BQU8sRUFBRSxDQUFDLG9DQUFvQyxDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBVkQsd0JBVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgZXh0ZW5zaW9ucyB0byBUeXBlU2NyaXB0IGZ1bmN0aW9uYWxpdHkgYXJvdW5kIGVycm9yIGhhbmRsaW5nXG4gKiAodHMuRGlhZ25vc3RpY3MpLlxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0JhemVsT3B0aW9uc30gZnJvbSAnLi90c2NvbmZpZyc7XG5cbi8qKlxuICogSWYgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gd2FzIGEgY29tcGlsYXRpb24gdGVzdCBleHBlY3RpbmcgY2VydGFpblxuICogZGlhZ25vc3RpY3MsIGZpbHRlciBvdXQgdGhlIGV4cGVjdGVkIGRpYWdub3N0aWNzLCBhbmQgYWRkIG5ldyBkaWFnbm9zdGljc1xuICogKGFrYSBlcnJvcnMpIGZvciBub24tbWF0Y2hlZCBkaWFnbm9zdGljcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckV4cGVjdGVkKFxuICAgIGJhemVsT3B0czogQmF6ZWxPcHRpb25zLCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdLFxuICAgIGZvcm1hdEZuID0gdWdseUZvcm1hdCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gIGlmICghYmF6ZWxPcHRzLmV4cGVjdGVkRGlhZ25vc3RpY3MubGVuZ3RoKSByZXR1cm4gZGlhZ25vc3RpY3M7XG5cbiAgLy8gVGhlIHJlZ2V4IGNvbnRhaW5zIHR3byBwYXJ0czpcbiAgLy8gMS4gT3B0aW9uYWwgcG9zaXRpb246ICdcXCg1LDFcXCknXG4gIC8vIDIuIFJlcXVpcmVkIFRTIGVycm9yOiAnVFMyMDAwOiBtZXNzYWdlIHRleHQuJ1xuICAvLyBOZWVkIHRyaXBsZSBlc2NhcGVzIGJlY2F1c2UgdGhlIGV4cGVjdGVkIGRpYWdub3N0aWNzIHRoYXQgd2UncmUgbWF0Y2hpbmdcbiAgLy8gaGVyZSBhcmUgcmVnZXhlcywgdG9vLlxuICBjb25zdCBFUlJPUl9SRSA9IC9eKD86XFxcXFxcKChcXGQqKSwoXFxkKilcXFxcXFwpLiopP1RTKFxcZCspOiguKikvO1xuICBjb25zdCBpbmNvcnJlY3RFcnJvcnMgPVxuICAgICAgYmF6ZWxPcHRzLmV4cGVjdGVkRGlhZ25vc3RpY3MuZmlsdGVyKGUgPT4gIWUubWF0Y2goRVJST1JfUkUpKTtcbiAgaWYgKGluY29ycmVjdEVycm9ycy5sZW5ndGgpIHtcbiAgICBjb25zdCBtc2cgPSBgRXhwZWN0ZWQgZXJyb3JzIG11c3QgbWF0Y2ggcmVnZXggJHtFUlJPUl9SRX1cXG5cXHRgICtcbiAgICAgICAgYGV4cGVjdGVkIGVycm9ycyBhcmUgXCIke2luY29ycmVjdEVycm9ycy5qb2luKCcsICcpfVwiYDtcbiAgICByZXR1cm4gW3tcbiAgICAgIGZpbGU6IHVuZGVmaW5lZCEsXG4gICAgICBzdGFydDogMCxcbiAgICAgIGxlbmd0aDogMCxcbiAgICAgIG1lc3NhZ2VUZXh0OiBtc2csXG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgY29kZTogMCxcbiAgICB9XTtcbiAgfVxuXG4gIC8vIEV4cGVjdGVkRGlhZ25vc3RpY3MgcmVwcmVzZW50cyB0aGUgXCJleHBlY3RlZF9kaWFnbm9zdGljc1wiIHVzZXJzIHByb3ZpZGUgaW5cbiAgLy8gdGhlIEJVSUxEIGZpbGUuIEl0IGlzIHVzZWQgZm9yIGVhc2llciBjb21wYXJzaW9uIHdpdGggdGhlIGFjdHVhbFxuICAvLyBkaWFnbm9zdGljcy5cbiAgaW50ZXJmYWNlIEV4cGVjdGVkRGlhZ25vc3RpY3Mge1xuICAgIGxpbmU6IG51bWJlcjtcbiAgICBjb2x1bW46IG51bWJlcjtcbiAgICBleHBlY3RlZDogc3RyaW5nO1xuICAgIGNvZGU6IG51bWJlcjtcbiAgICByZWdleHA6IFJlZ0V4cDtcbiAgICBtYXRjaGVkOiBib29sZWFuO1xuICB9XG5cbiAgY29uc3QgZXhwZWN0ZWREaWFnczogRXhwZWN0ZWREaWFnbm9zdGljc1tdID1cbiAgICAgIGJhemVsT3B0cy5leHBlY3RlZERpYWdub3N0aWNzLm1hcChleHBlY3RlZCA9PiB7XG4gICAgICAgIGNvbnN0IG0gPSBleHBlY3RlZC5tYXRjaCgvXig/OlxcXFxcXCgoXFxkKiksKFxcZCopXFxcXFxcKS4qKT9UUyhcXGQrKTooLiopJC8pO1xuICAgICAgICBpZiAoIW0pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICdJbmNvcnJlY3QgZXhwZWN0ZWQgZXJyb3IsIGRpZCB5b3UgZm9yZ2V0IGNoYXJhY3RlciBlc2NhcGVzIGluICcgK1xuICAgICAgICAgICAgICBleHBlY3RlZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgWywgbGluZVN0ciwgY29sdW1uU3RyLCBjb2RlU3RyLCByZWdleHBdID0gbTtcbiAgICAgICAgY29uc3QgW2xpbmUsIGNvbHVtbiwgY29kZV0gPSBbbGluZVN0ciwgY29sdW1uU3RyLCBjb2RlU3RyXS5tYXAoc3RyID0+IHtcbiAgICAgICAgICBjb25zdCBpID0gTnVtYmVyKHN0cik7XG4gICAgICAgICAgaWYgKE51bWJlci5pc05hTihpKSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBsaW5lLFxuICAgICAgICAgIGNvbHVtbixcbiAgICAgICAgICBleHBlY3RlZCxcbiAgICAgICAgICBjb2RlLFxuICAgICAgICAgIHJlZ2V4cDogbmV3IFJlZ0V4cChyZWdleHApLFxuICAgICAgICAgIG1hdGNoZWQ6IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgY29uc3QgdW5tYXRjaGVkRGlhZ3MgPSBkaWFnbm9zdGljcy5maWx0ZXIoZGlhZyA9PiB7XG4gICAgbGV0IGxpbmUgPSAtMTtcbiAgICBsZXQgY2hhcmFjdGVyID0gLTE7XG4gICAgaWYgKGRpYWcuZmlsZSAmJiBkaWFnLnN0YXJ0KSB7XG4gICAgICAoe2xpbmUsIGNoYXJhY3Rlcn0gPVxuICAgICAgICAgICB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnLmZpbGUsIGRpYWcuc3RhcnQpKTtcbiAgICB9XG4gICAgbGV0IG1hdGNoZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtc2cgPSBmb3JtYXRGbihiYXplbE9wdHMudGFyZ2V0LCBbZGlhZ10pO1xuICAgIC8vIGNoZWNrRGlhZ01hdGNoZXNFeHBlY3RlZCBjaGVja3MgaWYgdGhlIGV4cGVjdGVkIGRpYWdub3N0aWNzIG1hdGNoZXMgdGhlXG4gICAgLy8gYWN0dWFsIGRpYWdub3N0aWNzLlxuICAgIGNvbnN0IGNoZWNrRGlhZ01hdGNoZXNFeHBlY3RlZCA9XG4gICAgICAgIChleHBEaWFnOiBFeHBlY3RlZERpYWdub3N0aWNzLCBkaWFnOiB0cy5EaWFnbm9zdGljKSA9PiB7XG4gICAgICAgICAgaWYgKGV4cERpYWcuY29kZSAhPT0gZGlhZy5jb2RlIHx8IG1zZy5zZWFyY2goZXhwRGlhZy5yZWdleHApID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBsaW5lIGFuZCBjb2x1bW4gYXJlIG9wdGlvbmFsIGZpZWxkcywgb25seSBjaGVjayB0aGVtIGlmIHRoZXlcbiAgICAgICAgICAvLyBhcmUgZXhwbGljaXRseSBzcGVjaWZpZWQuXG4gICAgICAgICAgLy8gbGluZSBhbmQgY2hhcmFjdGVyIGFyZSB6ZXJvIGJhc2VkLlxuICAgICAgICAgIGlmIChleHBEaWFnLmxpbmUgIT09IDAgJiYgZXhwRGlhZy5saW5lICE9PSBsaW5lICsgMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXhwRGlhZy5jb2x1bW4gIT09IDAgJiYgZXhwRGlhZy5jb2x1bW4gIT09IGNoYXJhY3RlciArIDEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IGV4cERpYWcgb2YgZXhwZWN0ZWREaWFncykge1xuICAgICAgaWYgKGNoZWNrRGlhZ01hdGNoZXNFeHBlY3RlZChleHBEaWFnLCBkaWFnKSkge1xuICAgICAgICBleHBEaWFnLm1hdGNoZWQgPSB0cnVlO1xuICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgLy8gY29udGludWUsIG9uZSBkaWFnbm9zdGljIG1heSBtYXRjaCBtdWx0aXBsZSBleHBlY3RlZCBlcnJvcnMuXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAhbWF0Y2hlZDtcbiAgfSk7XG5cbiAgY29uc3QgdW5tYXRjaGVkRXJyb3JzID0gZXhwZWN0ZWREaWFncy5maWx0ZXIoZXJyID0+ICFlcnIubWF0Y2hlZCkubWFwKGVyciA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgIGJhemVsT3B0cy50YXJnZXQsICcvKiBmYWtlIHNvdXJjZSBhcyBtYXJrZXIgKi8nLFxuICAgICAgICB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0KTtcbiAgICBjb25zdCBtZXNzYWdlVGV4dCA9XG4gICAgICAgIGBFeHBlY3RlZCBhIGNvbXBpbGF0aW9uIGVycm9yIG1hdGNoaW5nICR7SlNPTi5zdHJpbmdpZnkoZXJyLmV4cGVjdGVkKX1gO1xuICAgIHJldHVybiB7XG4gICAgICBmaWxlLFxuICAgICAgc3RhcnQ6IDAsXG4gICAgICBsZW5ndGg6IDAsXG4gICAgICBtZXNzYWdlVGV4dCxcbiAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICBjb2RlOiBlcnIuY29kZSxcbiAgICB9O1xuICB9KTtcblxuICByZXR1cm4gdW5tYXRjaGVkRGlhZ3MuY29uY2F0KHVubWF0Y2hlZEVycm9ycyk7XG59XG5cbi8qKlxuICogRm9ybWF0cyB0aGUgZ2l2ZW4gZGlhZ25vc3RpY3MsIHdpdGhvdXQgcHJldHR5IHByaW50aW5nLiAgV2l0aG91dCBjb2xvcnMsIGl0J3NcbiAqIGJldHRlciBmb3IgbWF0Y2hpbmcgYWdhaW5zdCBwcm9ncmFtbWF0aWNhbGx5LlxuICogQHBhcmFtIHRhcmdldCBUaGUgYmF6ZWwgdGFyZ2V0LCBlLmcuIC8vbXkvcGFja2FnZTp0YXJnZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVnbHlGb3JtYXQoXG4gICAgdGFyZ2V0OiBzdHJpbmcsIGRpYWdub3N0aWNzOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+KTogc3RyaW5nIHtcbiAgY29uc3QgZGlhZ25vc3RpY3NIb3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSB7XG4gICAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgICBnZXROZXdMaW5lOiAoKSA9PiB0cy5zeXMubmV3TGluZSxcbiAgICAvLyBQcmludCBmaWxlbmFtZXMgaW5jbHVkaW5nIHRoZWlyIHJlbGF0aXZlUm9vdCwgc28gdGhleSBjYW4gYmUgbG9jYXRlZCBvblxuICAgIC8vIGRpc2tcbiAgICBnZXRDYW5vbmljYWxGaWxlTmFtZTogKGY6IHN0cmluZykgPT4gZlxuICB9O1xuICByZXR1cm4gdHMuZm9ybWF0RGlhZ25vc3RpY3MoZGlhZ25vc3RpY3MsIGRpYWdub3N0aWNzSG9zdCk7XG59XG5cbi8qKlxuICogUHJldHR5IGZvcm1hdHMgdGhlIGdpdmVuIGRpYWdub3N0aWNzIChtYXRjaGluZyB0aGUgLS1wcmV0dHkgdHNjIGZsYWcpLlxuICogQHBhcmFtIHRhcmdldCBUaGUgYmF6ZWwgdGFyZ2V0LCBlLmcuIC8vbXkvcGFja2FnZTp0YXJnZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdChcbiAgICB0YXJnZXQ6IHN0cmluZywgZGlhZ25vc3RpY3M6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4pOiBzdHJpbmcge1xuICBjb25zdCBkaWFnbm9zdGljc0hvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgIGdldE5ld0xpbmU6ICgpID0+IHRzLnN5cy5uZXdMaW5lLFxuICAgIC8vIFByaW50IGZpbGVuYW1lcyBpbmNsdWRpbmcgdGhlaXIgcmVsYXRpdmVSb290LCBzbyB0aGV5IGNhbiBiZSBsb2NhdGVkIG9uXG4gICAgLy8gZGlza1xuICAgIGdldENhbm9uaWNhbEZpbGVOYW1lOiAoZjogc3RyaW5nKSA9PiBmXG4gIH07XG4gIHJldHVybiB0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQoZGlhZ25vc3RpY3MsIGRpYWdub3N0aWNzSG9zdCk7XG59XG4iXX0=