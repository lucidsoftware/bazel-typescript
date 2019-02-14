/**
 * @fileoverview Checker contains all the information we need to perform source
 * file AST traversals and report errors.
 */
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
        define(["require", "exports", "typescript", "./failure"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var failure_1 = require("./failure");
    /**
     * Tsetse rules use on() and addFailureAtNode() for rule implementations.
     * Rules can get a ts.TypeChecker from checker.typeChecker so typed rules are
     * possible. Compiler uses execute() to run the Tsetse check.
     */
    var Checker = /** @class */ (function () {
        function Checker(program) {
            /**
             * nodeHandlersMap contains node to handlers mapping for all enabled rules.
             */
            this.nodeHandlersMap = new Map();
            this.failures = [];
            // currentCode will be set before invoking any handler functions so the value
            // initialized here is never used.
            this.currentCode = 0;
            // Avoid the cost for each rule to create a new TypeChecker.
            this.typeChecker = program.getTypeChecker();
        }
        /**
         * This doesn't run any checks yet. Instead, it registers `handlerFunction` on
         * `nodeKind` node in `nodeHandlersMap` map. After all rules register their
         * handlers, the source file AST will be traversed.
         */
        Checker.prototype.on = function (nodeKind, handlerFunction, code) {
            var newHandler = { handlerFunction: handlerFunction, code: code };
            var registeredHandlers = this.nodeHandlersMap.get(nodeKind);
            if (registeredHandlers === undefined) {
                this.nodeHandlersMap.set(nodeKind, [newHandler]);
            }
            else {
                registeredHandlers.push(newHandler);
            }
        };
        /**
         * Add a failure with a span. addFailure() is currently private because
         * `addFailureAtNode` is preferred.
         */
        Checker.prototype.addFailure = function (start, end, failureText) {
            if (!this.currentSourceFile) {
                throw new Error('Source file not defined');
            }
            if (start >= end || end > this.currentSourceFile.end || start < 0) {
                // Since only addFailureAtNode() is exposed for now this shouldn't happen.
                throw new Error("Invalid start and end position: [" + start + ", " + end + "]" +
                    (" in file " + this.currentSourceFile.fileName + "."));
            }
            var failure = new failure_1.Failure(this.currentSourceFile, start, end, failureText, this.currentCode);
            this.failures.push(failure);
        };
        Checker.prototype.addFailureAtNode = function (node, failureText) {
            // node.getStart() takes a sourceFile as argument whereas node.getEnd()
            // doesn't need it.
            this.addFailure(node.getStart(this.currentSourceFile), node.getEnd(), failureText);
        };
        /**
         * Walk `sourceFile`, invoking registered handlers with Checker as the first
         * argument and current node as the second argument. Return failures if there
         * are any.
         */
        Checker.prototype.execute = function (sourceFile) {
            var thisChecker = this;
            this.currentSourceFile = sourceFile;
            this.failures = [];
            ts.forEachChild(sourceFile, run);
            return this.failures;
            function run(node) {
                var e_1, _a;
                var handlers = thisChecker.nodeHandlersMap.get(node.kind);
                if (handlers !== undefined) {
                    try {
                        for (var handlers_1 = __values(handlers), handlers_1_1 = handlers_1.next(); !handlers_1_1.done; handlers_1_1 = handlers_1.next()) {
                            var handler = handlers_1_1.value;
                            thisChecker.currentCode = handler.code;
                            handler.handlerFunction(thisChecker, node);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (handlers_1_1 && !handlers_1_1.done && (_a = handlers_1.return)) _a.call(handlers_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                ts.forEachChild(node, run);
            }
        };
        return Checker;
    }());
    exports.Checker = Checker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL3RzZXRzZS9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUVqQyxxQ0FBa0M7SUFXbEM7Ozs7T0FJRztJQUNIO1FBZUUsaUJBQVksT0FBbUI7WUFkL0I7O2VBRUc7WUFDSyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO1lBQ3RELGFBQVEsR0FBYyxFQUFFLENBQUM7WUFFakMsNkVBQTZFO1lBQzdFLGtDQUFrQztZQUMxQixnQkFBVyxHQUFHLENBQUMsQ0FBQztZQU90Qiw0REFBNEQ7WUFDNUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDOUMsQ0FBQztRQUVEOzs7O1dBSUc7UUFDSCxvQkFBRSxHQUFGLFVBQ0ksUUFBbUIsRUFDbkIsZUFBb0QsRUFBRSxJQUFZO1lBQ3BFLElBQU0sVUFBVSxHQUFZLEVBQUMsZUFBZSxpQkFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUM7WUFDcEQsSUFBTSxrQkFBa0IsR0FDcEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdkMsSUFBSSxrQkFBa0IsS0FBSyxTQUFTLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7YUFDbEQ7aUJBQU07Z0JBQ0wsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ3JDO1FBQ0gsQ0FBQztRQUVEOzs7V0FHRztRQUNLLDRCQUFVLEdBQWxCLFVBQW1CLEtBQWEsRUFBRSxHQUFXLEVBQUUsV0FBbUI7WUFDaEUsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO2FBQzVDO1lBQ0QsSUFBSSxLQUFLLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUU7Z0JBQ2pFLDBFQUEwRTtnQkFDMUUsTUFBTSxJQUFJLEtBQUssQ0FDWCxzQ0FBb0MsS0FBSyxVQUFLLEdBQUcsTUFBRztxQkFDcEQsY0FBWSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxNQUFHLENBQUEsQ0FBQyxDQUFDO2FBQ3JEO1lBRUQsSUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUN2QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxrQ0FBZ0IsR0FBaEIsVUFBaUIsSUFBYSxFQUFFLFdBQW1CO1lBQ2pELHVFQUF1RTtZQUN2RSxtQkFBbUI7WUFDbkIsSUFBSSxDQUFDLFVBQVUsQ0FDWCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBRUQ7Ozs7V0FJRztRQUNILHlCQUFPLEdBQVAsVUFBUSxVQUF5QjtZQUMvQixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFDekIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFVBQVUsQ0FBQztZQUNwQyxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNuQixFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7WUFFckIsU0FBUyxHQUFHLENBQUMsSUFBYTs7Z0JBQ3hCLElBQU0sUUFBUSxHQUNWLFdBQVcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0MsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFOzt3QkFDMUIsS0FBc0IsSUFBQSxhQUFBLFNBQUEsUUFBUSxDQUFBLGtDQUFBLHdEQUFFOzRCQUEzQixJQUFNLE9BQU8scUJBQUE7NEJBQ2hCLFdBQVcsQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQzs0QkFDdkMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7eUJBQzVDOzs7Ozs7Ozs7aUJBQ0Y7Z0JBQ0QsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDN0IsQ0FBQztRQUNILENBQUM7UUFDSCxjQUFDO0lBQUQsQ0FBQyxBQXpGRCxJQXlGQztJQXpGWSwwQkFBTyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGVvdmVydmlldyBDaGVja2VyIGNvbnRhaW5zIGFsbCB0aGUgaW5mb3JtYXRpb24gd2UgbmVlZCB0byBwZXJmb3JtIHNvdXJjZVxuICogZmlsZSBBU1QgdHJhdmVyc2FscyBhbmQgcmVwb3J0IGVycm9ycy5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0ZhaWx1cmV9IGZyb20gJy4vZmFpbHVyZSc7XG5cbi8qKlxuICogQSBIYW5kbGVyIGNvbnRhaW5zIGEgaGFuZGxlciBmdW5jdGlvbiBhbmQgaXRzIGNvcnJlc3BvbmRpbmcgZXJyb3IgY29kZSBzb1xuICogd2hlbiB0aGUgaGFuZGxlciBmdW5jdGlvbiBpcyB0cmlnZ2VyZWQgd2Uga25vdyB3aGljaCBydWxlIGlzIHZpb2xhdGVkLlxuICovXG5pbnRlcmZhY2UgSGFuZGxlciB7XG4gIGhhbmRsZXJGdW5jdGlvbihjaGVja2VyOiBDaGVja2VyLCBub2RlOiB0cy5Ob2RlKTogdm9pZDtcbiAgY29kZTogbnVtYmVyO1xufVxuXG4vKipcbiAqIFRzZXRzZSBydWxlcyB1c2Ugb24oKSBhbmQgYWRkRmFpbHVyZUF0Tm9kZSgpIGZvciBydWxlIGltcGxlbWVudGF0aW9ucy5cbiAqIFJ1bGVzIGNhbiBnZXQgYSB0cy5UeXBlQ2hlY2tlciBmcm9tIGNoZWNrZXIudHlwZUNoZWNrZXIgc28gdHlwZWQgcnVsZXMgYXJlXG4gKiBwb3NzaWJsZS4gQ29tcGlsZXIgdXNlcyBleGVjdXRlKCkgdG8gcnVuIHRoZSBUc2V0c2UgY2hlY2suXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGVja2VyIHtcbiAgLyoqXG4gICAqIG5vZGVIYW5kbGVyc01hcCBjb250YWlucyBub2RlIHRvIGhhbmRsZXJzIG1hcHBpbmcgZm9yIGFsbCBlbmFibGVkIHJ1bGVzLlxuICAgKi9cbiAgcHJpdmF0ZSBub2RlSGFuZGxlcnNNYXAgPSBuZXcgTWFwPHRzLlN5bnRheEtpbmQsIEhhbmRsZXJbXT4oKTtcbiAgcHJpdmF0ZSBmYWlsdXJlczogRmFpbHVyZVtdID0gW107XG4gIHByaXZhdGUgY3VycmVudFNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUgfCB1bmRlZmluZWQ7XG4gIC8vIGN1cnJlbnRDb2RlIHdpbGwgYmUgc2V0IGJlZm9yZSBpbnZva2luZyBhbnkgaGFuZGxlciBmdW5jdGlvbnMgc28gdGhlIHZhbHVlXG4gIC8vIGluaXRpYWxpemVkIGhlcmUgaXMgbmV2ZXIgdXNlZC5cbiAgcHJpdmF0ZSBjdXJyZW50Q29kZSA9IDA7XG4gIC8qKlxuICAgKiBBbGxvdyB0eXBlZCBydWxlcyB2aWEgdHlwZUNoZWNrZXIuXG4gICAqL1xuICB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXI7XG5cbiAgY29uc3RydWN0b3IocHJvZ3JhbTogdHMuUHJvZ3JhbSkge1xuICAgIC8vIEF2b2lkIHRoZSBjb3N0IGZvciBlYWNoIHJ1bGUgdG8gY3JlYXRlIGEgbmV3IFR5cGVDaGVja2VyLlxuICAgIHRoaXMudHlwZUNoZWNrZXIgPSBwcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBkb2Vzbid0IHJ1biBhbnkgY2hlY2tzIHlldC4gSW5zdGVhZCwgaXQgcmVnaXN0ZXJzIGBoYW5kbGVyRnVuY3Rpb25gIG9uXG4gICAqIGBub2RlS2luZGAgbm9kZSBpbiBgbm9kZUhhbmRsZXJzTWFwYCBtYXAuIEFmdGVyIGFsbCBydWxlcyByZWdpc3RlciB0aGVpclxuICAgKiBoYW5kbGVycywgdGhlIHNvdXJjZSBmaWxlIEFTVCB3aWxsIGJlIHRyYXZlcnNlZC5cbiAgICovXG4gIG9uPFQgZXh0ZW5kcyB0cy5Ob2RlPihcbiAgICAgIG5vZGVLaW5kOiBUWydraW5kJ10sXG4gICAgICBoYW5kbGVyRnVuY3Rpb246IChjaGVja2VyOiBDaGVja2VyLCBub2RlOiBUKSA9PiB2b2lkLCBjb2RlOiBudW1iZXIpIHtcbiAgICBjb25zdCBuZXdIYW5kbGVyOiBIYW5kbGVyID0ge2hhbmRsZXJGdW5jdGlvbiwgY29kZX07XG4gICAgY29uc3QgcmVnaXN0ZXJlZEhhbmRsZXJzOiBIYW5kbGVyW118dW5kZWZpbmVkID1cbiAgICAgICAgdGhpcy5ub2RlSGFuZGxlcnNNYXAuZ2V0KG5vZGVLaW5kKTtcbiAgICBpZiAocmVnaXN0ZXJlZEhhbmRsZXJzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubm9kZUhhbmRsZXJzTWFwLnNldChub2RlS2luZCwgW25ld0hhbmRsZXJdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVnaXN0ZXJlZEhhbmRsZXJzLnB1c2gobmV3SGFuZGxlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIGZhaWx1cmUgd2l0aCBhIHNwYW4uIGFkZEZhaWx1cmUoKSBpcyBjdXJyZW50bHkgcHJpdmF0ZSBiZWNhdXNlXG4gICAqIGBhZGRGYWlsdXJlQXROb2RlYCBpcyBwcmVmZXJyZWQuXG4gICAqL1xuICBwcml2YXRlIGFkZEZhaWx1cmUoc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIGZhaWx1cmVUZXh0OiBzdHJpbmcpIHtcbiAgICBpZiAoIXRoaXMuY3VycmVudFNvdXJjZUZpbGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU291cmNlIGZpbGUgbm90IGRlZmluZWQnKTtcbiAgICB9XG4gICAgaWYgKHN0YXJ0ID49IGVuZCB8fCBlbmQgPiB0aGlzLmN1cnJlbnRTb3VyY2VGaWxlLmVuZCB8fCBzdGFydCA8IDApIHtcbiAgICAgIC8vIFNpbmNlIG9ubHkgYWRkRmFpbHVyZUF0Tm9kZSgpIGlzIGV4cG9zZWQgZm9yIG5vdyB0aGlzIHNob3VsZG4ndCBoYXBwZW4uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludmFsaWQgc3RhcnQgYW5kIGVuZCBwb3NpdGlvbjogWyR7c3RhcnR9LCAke2VuZH1dYCArXG4gICAgICAgICAgYCBpbiBmaWxlICR7dGhpcy5jdXJyZW50U291cmNlRmlsZS5maWxlTmFtZX0uYCk7XG4gICAgfVxuXG4gICAgY29uc3QgZmFpbHVyZSA9IG5ldyBGYWlsdXJlKFxuICAgICAgICB0aGlzLmN1cnJlbnRTb3VyY2VGaWxlLCBzdGFydCwgZW5kLCBmYWlsdXJlVGV4dCwgdGhpcy5jdXJyZW50Q29kZSk7XG4gICAgdGhpcy5mYWlsdXJlcy5wdXNoKGZhaWx1cmUpO1xuICB9XG5cbiAgYWRkRmFpbHVyZUF0Tm9kZShub2RlOiB0cy5Ob2RlLCBmYWlsdXJlVGV4dDogc3RyaW5nKSB7XG4gICAgLy8gbm9kZS5nZXRTdGFydCgpIHRha2VzIGEgc291cmNlRmlsZSBhcyBhcmd1bWVudCB3aGVyZWFzIG5vZGUuZ2V0RW5kKClcbiAgICAvLyBkb2Vzbid0IG5lZWQgaXQuXG4gICAgdGhpcy5hZGRGYWlsdXJlKFxuICAgICAgICBub2RlLmdldFN0YXJ0KHRoaXMuY3VycmVudFNvdXJjZUZpbGUpLCBub2RlLmdldEVuZCgpLCBmYWlsdXJlVGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogV2FsayBgc291cmNlRmlsZWAsIGludm9raW5nIHJlZ2lzdGVyZWQgaGFuZGxlcnMgd2l0aCBDaGVja2VyIGFzIHRoZSBmaXJzdFxuICAgKiBhcmd1bWVudCBhbmQgY3VycmVudCBub2RlIGFzIHRoZSBzZWNvbmQgYXJndW1lbnQuIFJldHVybiBmYWlsdXJlcyBpZiB0aGVyZVxuICAgKiBhcmUgYW55LlxuICAgKi9cbiAgZXhlY3V0ZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogRmFpbHVyZVtdIHtcbiAgICBjb25zdCB0aGlzQ2hlY2tlciA9IHRoaXM7XG4gICAgdGhpcy5jdXJyZW50U291cmNlRmlsZSA9IHNvdXJjZUZpbGU7XG4gICAgdGhpcy5mYWlsdXJlcyA9IFtdO1xuICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBydW4pO1xuICAgIHJldHVybiB0aGlzLmZhaWx1cmVzO1xuXG4gICAgZnVuY3Rpb24gcnVuKG5vZGU6IHRzLk5vZGUpIHtcbiAgICAgIGNvbnN0IGhhbmRsZXJzOiBIYW5kbGVyW118dW5kZWZpbmVkID1cbiAgICAgICAgICB0aGlzQ2hlY2tlci5ub2RlSGFuZGxlcnNNYXAuZ2V0KG5vZGUua2luZCk7XG4gICAgICBpZiAoaGFuZGxlcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgaGFuZGxlcnMpIHtcbiAgICAgICAgICB0aGlzQ2hlY2tlci5jdXJyZW50Q29kZSA9IGhhbmRsZXIuY29kZTtcbiAgICAgICAgICBoYW5kbGVyLmhhbmRsZXJGdW5jdGlvbih0aGlzQ2hlY2tlciwgbm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCBydW4pO1xuICAgIH1cbiAgfVxufVxuIl19