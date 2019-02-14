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
        define(["require", "exports", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path = require("path");
    /* tslint:disable:no-require-imports */
    var protobufjs = require('protobufjs');
    // tslint:disable-next-line:variable-name: ByteBuffer is instantiatable.
    var ByteBuffer = require('bytebuffer');
    protobufjs.convertFieldsToCamelCase = true;
    exports.DEBUG = false;
    function debug() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (exports.DEBUG)
            console.error.apply(console, args);
    }
    exports.debug = debug;
    /**
     * Write a message to stderr, which appears in the bazel log and is visible to
     * the end user.
     */
    function log() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.error.apply(console, args);
    }
    exports.log = log;
    function runAsWorker(args) {
        return args.indexOf('--persistent_worker') !== -1;
    }
    exports.runAsWorker = runAsWorker;
    var workerpb = (function loadWorkerPb() {
        var protoPath = '../worker_protocol.proto';
        // Use node module resolution so we can find the .proto file in any of the root dirs
        var protofile;
        try {
            // Look for the .proto file relative in its @bazel/typescript npm package
            // location
            protofile = require.resolve(protoPath);
        }
        catch (e) {
        }
        if (!protofile) {
            // If not found above, look for the .proto file in its rules_typescript
            // workspace location
            // This extra lookup should never happen in google3. It's only needed for
            // local development in the rules_typescript repo.
            protofile = require.resolve('../../third_party/github.com/bazelbuild/bazel/src/main/protobuf/worker_protocol.proto');
        }
        // Under Bazel, we use the version of TypeScript installed in the user's
        // workspace This means we also use their version of protobuf.js. Handle both.
        // v5 and v6 by checking which one is present.
        if (protobufjs.loadProtoFile) {
            // Protobuf.js v5
            var protoNamespace = protobufjs.loadProtoFile(protofile);
            if (!protoNamespace) {
                throw new Error('Cannot find ' + path.resolve(protoPath));
            }
            return protoNamespace.build('blaze.worker');
        }
        else {
            // Protobuf.js v6
            var protoNamespace = protobufjs.loadSync(protofile);
            if (!protoNamespace) {
                throw new Error('Cannot find ' + path.resolve(protoPath));
            }
            return protoNamespace.lookup('blaze.worker');
        }
    })();
    function runWorkerLoop(runOneBuild) {
        // Hook all output to stderr and write it to a buffer, then include
        // that buffer's in the worker protcol proto's textual output.  This
        // means you can log via console.error() and it will appear to the
        // user as expected.
        var consoleOutput = '';
        process.stderr.write =
            function (chunk) {
                var otherArgs = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    otherArgs[_i - 1] = arguments[_i];
                }
                consoleOutput += chunk.toString();
                return true;
            };
        // Accumulator for asynchronously read input.
        // tslint:disable-next-line:no-any protobufjs is untyped
        var buf;
        process.stdin.on('readable', function () {
            var e_1, _a;
            var chunk = process.stdin.read();
            if (!chunk)
                return;
            var wrapped = ByteBuffer.wrap(chunk);
            buf = buf ? ByteBuffer.concat([buf, wrapped]) : wrapped;
            try {
                var req = void 0;
                // Read all requests that have accumulated in the buffer.
                while ((req = workerpb.WorkRequest.decodeDelimited(buf)) != null) {
                    debug('=== Handling new build request');
                    // Reset accumulated log output.
                    consoleOutput = '';
                    var args = req.getArguments();
                    var inputs = {};
                    try {
                        for (var _b = __values(req.getInputs()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var input = _c.value;
                            inputs[input.getPath()] = input.getDigest().toString('hex');
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    debug('Compiling with:\n\t' + args.join('\n\t'));
                    var exitCode = runOneBuild(args, inputs) ? 0 : 1;
                    process.stdout.write(new workerpb.WorkResponse()
                        .setExitCode(exitCode)
                        .setOutput(consoleOutput)
                        .encodeDelimited()
                        .toBuffer());
                    // Force a garbage collection pass.  This keeps our memory usage
                    // consistent across multiple compilations, and allows the file
                    // cache to use the current memory usage as a guideline for expiring
                    // data.  Note: this is intentionally not within runOneBuild(), as
                    // we want to gc only after all its locals have gone out of scope.
                    global.gc();
                }
                // Avoid growing the buffer indefinitely.
                buf.compact();
            }
            catch (e) {
                log('Compilation failed', e.stack);
                process.stdout.write(new workerpb.WorkResponse()
                    .setExitCode(1)
                    .setOutput(consoleOutput)
                    .encodeDelimited()
                    .toBuffer());
                // Clear buffer so the next build won't read an incomplete request.
                buf = null;
            }
        });
    }
    exports.runWorkerLoop = runWorkerLoop;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vaW50ZXJuYWwvdHNjX3dyYXBwZWQvd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBLDJCQUE2QjtJQUM3Qix1Q0FBdUM7SUFDdkMsSUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3pDLHdFQUF3RTtJQUN4RSxJQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFekMsVUFBVSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQztJQUU5QixRQUFBLEtBQUssR0FBRyxLQUFLLENBQUM7SUFFM0IsU0FBZ0IsS0FBSztRQUFDLGNBQWtCO2FBQWxCLFVBQWtCLEVBQWxCLHFCQUFrQixFQUFsQixJQUFrQjtZQUFsQix5QkFBa0I7O1FBQ3RDLElBQUksYUFBSztZQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRkQsc0JBRUM7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixHQUFHO1FBQUMsY0FBa0I7YUFBbEIsVUFBa0IsRUFBbEIscUJBQWtCLEVBQWxCLElBQWtCO1lBQWxCLHlCQUFrQjs7UUFDcEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFGRCxrQkFFQztJQUVELFNBQWdCLFdBQVcsQ0FBQyxJQUFjO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFGRCxrQ0FFQztJQUVELElBQU0sUUFBUSxHQUFHLENBQUMsU0FBUyxZQUFZO1FBQ3JDLElBQU0sU0FBUyxHQUFHLDBCQUEwQixDQUFDO1FBRTdDLG9GQUFvRjtRQUNwRixJ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RyxHQUFHLElBQUksQ0FBQzthQUNaO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBOURELHNDQThEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG4vKiB0c2xpbnQ6ZGlzYWJsZTpuby1yZXF1aXJlLWltcG9ydHMgKi9cbmNvbnN0IHByb3RvYnVmanMgPSByZXF1aXJlKCdwcm90b2J1ZmpzJyk7XG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6dmFyaWFibGUtbmFtZTogQnl0ZUJ1ZmZlciBpcyBpbnN0YW50aWF0YWJsZS5cbmNvbnN0IEJ5dGVCdWZmZXIgPSByZXF1aXJlKCdieXRlYnVmZmVyJyk7XG5cbnByb3RvYnVmanMuY29udmVydEZpZWxkc1RvQ2FtZWxDYXNlID0gdHJ1ZTtcblxuZXhwb3J0IGNvbnN0IERFQlVHID0gZmFsc2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWJ1ZyguLi5hcmdzOiBBcnJheTx7fT4pIHtcbiAgaWYgKERFQlVHKSBjb25zb2xlLmVycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xufVxuXG4vKipcbiAqIFdyaXRlIGEgbWVzc2FnZSB0byBzdGRlcnIsIHdoaWNoIGFwcGVhcnMgaW4gdGhlIGJhemVsIGxvZyBhbmQgaXMgdmlzaWJsZSB0b1xuICogdGhlIGVuZCB1c2VyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nKC4uLmFyZ3M6IEFycmF5PHt9Pikge1xuICBjb25zb2xlLmVycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuQXNXb3JrZXIoYXJnczogc3RyaW5nW10pIHtcbiAgcmV0dXJuIGFyZ3MuaW5kZXhPZignLS1wZXJzaXN0ZW50X3dvcmtlcicpICE9PSAtMTtcbn1cblxuY29uc3Qgd29ya2VycGIgPSAoZnVuY3Rpb24gbG9hZFdvcmtlclBiKCkge1xuICBjb25zdCBwcm90b1BhdGggPSAnLi4vd29ya2VyX3Byb3RvY29sLnByb3RvJztcblxuICAvLyBVc2Ugbm9kZSBtb2R1bGUgcmVzb2x1dGlvbiBzbyB3ZSBjYW4gZmluZCB0aGUgLnByb3RvIGZpbGUgaW4gYW55IG9mIHRoZSByb290IGRpcnNcbiAgbGV0IHByb3RvZmlsZTtcbiAgdHJ5IHtcbiAgICAvLyBMb29rIGZvciB0aGUgLnByb3RvIGZpbGUgcmVsYXRpdmUgaW4gaXRzIEBiYXplbC90eXBlc2NyaXB0IG5wbSBwYWNrYWdlXG4gICAgLy8gbG9jYXRpb25cbiAgICBwcm90b2ZpbGUgPSByZXF1aXJlLnJlc29sdmUocHJvdG9QYXRoKTtcbiAgfSBjYXRjaCAoZSkge1xuICB9XG4gIGlmICghcHJvdG9maWxlKSB7XG4gICAgLy8gSWYgbm90IGZvdW5kIGFib3ZlLCBsb29rIGZvciB0aGUgLnByb3RvIGZpbGUgaW4gaXRzIHJ1bGVzX3R5cGVzY3JpcHRcbiAgICAvLyB3b3Jrc3BhY2UgbG9jYXRpb25cbiAgICAvLyBUaGlzIGV4dHJhIGxvb2t1cCBzaG91bGQgbmV2ZXIgaGFwcGVuIGluIGdvb2dsZTMuIEl0J3Mgb25seSBuZWVkZWQgZm9yXG4gICAgLy8gbG9jYWwgZGV2ZWxvcG1lbnQgaW4gdGhlIHJ1bGVzX3R5cGVzY3JpcHQgcmVwby5cbiAgICBwcm90b2ZpbGUgPSByZXF1aXJlLnJlc29sdmUoXG4gICAgICAgICcuLi8uLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvc3JjL21haW4vcHJvdG9idWYvd29ya2VyX3Byb3RvY29sLnByb3RvJyk7XG4gIH1cblxuICAvLyBVbmRlciBCYXplbCwgd2UgdXNlIHRoZSB2ZXJzaW9uIG9mIFR5cGVTY3JpcHQgaW5zdGFsbGVkIGluIHRoZSB1c2VyJ3NcbiAgLy8gd29ya3NwYWNlIFRoaXMgbWVhbnMgd2UgYWxzbyB1c2UgdGhlaXIgdmVyc2lvbiBvZiBwcm90b2J1Zi5qcy4gSGFuZGxlIGJvdGguXG4gIC8vIHY1IGFuZCB2NiBieSBjaGVja2luZyB3aGljaCBvbmUgaXMgcHJlc2VudC5cbiAgaWYgKHByb3RvYnVmanMubG9hZFByb3RvRmlsZSkge1xuICAgIC8vIFByb3RvYnVmLmpzIHY1XG4gICAgY29uc3QgcHJvdG9OYW1lc3BhY2UgPSBwcm90b2J1ZmpzLmxvYWRQcm90b0ZpbGUocHJvdG9maWxlKTtcbiAgICBpZiAoIXByb3RvTmFtZXNwYWNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kICcgKyBwYXRoLnJlc29sdmUocHJvdG9QYXRoKSk7XG4gICAgfVxuICAgIHJldHVybiBwcm90b05hbWVzcGFjZS5idWlsZCgnYmxhemUud29ya2VyJyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gUHJvdG9idWYuanMgdjZcbiAgICBjb25zdCBwcm90b05hbWVzcGFjZSA9IHByb3RvYnVmanMubG9hZFN5bmMocHJvdG9maWxlKTtcbiAgICBpZiAoIXByb3RvTmFtZXNwYWNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kICcgKyBwYXRoLnJlc29sdmUocHJvdG9QYXRoKSk7XG4gICAgfVxuICAgIHJldHVybiBwcm90b05hbWVzcGFjZS5sb29rdXAoJ2JsYXplLndvcmtlcicpO1xuICB9XG59KSgpO1xuXG5pbnRlcmZhY2UgSW5wdXQge1xuICBnZXRQYXRoKCk6IHN0cmluZztcbiAgZ2V0RGlnZXN0KCk6IHt0b1N0cmluZyhlbmNvZGluZzogc3RyaW5nKTogc3RyaW5nfTsgIC8vIG5wbTpCeXRlQnVmZmVyXG59XG5pbnRlcmZhY2UgV29ya1JlcXVlc3Qge1xuICBnZXRBcmd1bWVudHMoKTogc3RyaW5nW107XG4gIGdldElucHV0cygpOiBJbnB1dFtdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuV29ya2VyTG9vcChcbiAgICBydW5PbmVCdWlsZDogKGFyZ3M6IHN0cmluZ1tdLCBpbnB1dHM/OiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ30pID0+XG4gICAgICAgIGJvb2xlYW4pIHtcbiAgLy8gSG9vayBhbGwgb3V0cHV0IHRvIHN0ZGVyciBhbmQgd3JpdGUgaXQgdG8gYSBidWZmZXIsIHRoZW4gaW5jbHVkZVxuICAvLyB0aGF0IGJ1ZmZlcidzIGluIHRoZSB3b3JrZXIgcHJvdGNvbCBwcm90bydzIHRleHR1YWwgb3V0cHV0LiAgVGhpc1xuICAvLyBtZWFucyB5b3UgY2FuIGxvZyB2aWEgY29uc29sZS5lcnJvcigpIGFuZCBpdCB3aWxsIGFwcGVhciB0byB0aGVcbiAgLy8gdXNlciBhcyBleHBlY3RlZC5cbiAgbGV0IGNvbnNvbGVPdXRwdXQgPSAnJztcbiAgcHJvY2Vzcy5zdGRlcnIud3JpdGUgPVxuICAgICAgKGNodW5rOiBzdHJpbmcgfCBCdWZmZXIsIC4uLm90aGVyQXJnczogYW55W10pOiBib29sZWFuID0+IHtcbiAgICAgICAgY29uc29sZU91dHB1dCArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH07XG5cbiAgLy8gQWNjdW11bGF0b3IgZm9yIGFzeW5jaHJvbm91c2x5IHJlYWQgaW5wdXQuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnkgcHJvdG9idWZqcyBpcyB1bnR5cGVkXG4gIGxldCBidWY6IGFueTtcbiAgcHJvY2Vzcy5zdGRpbi5vbigncmVhZGFibGUnLCAoKSA9PiB7XG4gICAgY29uc3QgY2h1bmsgPSBwcm9jZXNzLnN0ZGluLnJlYWQoKTtcbiAgICBpZiAoIWNodW5rKSByZXR1cm47XG5cbiAgICBjb25zdCB3cmFwcGVkID0gQnl0ZUJ1ZmZlci53cmFwKGNodW5rKTtcbiAgICBidWYgPSBidWYgPyBCeXRlQnVmZmVyLmNvbmNhdChbYnVmLCB3cmFwcGVkXSkgOiB3cmFwcGVkO1xuICAgIHRyeSB7XG4gICAgICBsZXQgcmVxOiBXb3JrUmVxdWVzdDtcbiAgICAgIC8vIFJlYWQgYWxsIHJlcXVlc3RzIHRoYXQgaGF2ZSBhY2N1bXVsYXRlZCBpbiB0aGUgYnVmZmVyLlxuICAgICAgd2hpbGUgKChyZXEgPSB3b3JrZXJwYi5Xb3JrUmVxdWVzdC5kZWNvZGVEZWxpbWl0ZWQoYnVmKSkgIT0gbnVsbCkge1xuICAgICAgICBkZWJ1ZygnPT09IEhhbmRsaW5nIG5ldyBidWlsZCByZXF1ZXN0Jyk7XG4gICAgICAgIC8vIFJlc2V0IGFjY3VtdWxhdGVkIGxvZyBvdXRwdXQuXG4gICAgICAgIGNvbnNvbGVPdXRwdXQgPSAnJztcbiAgICAgICAgY29uc3QgYXJncyA9IHJlcS5nZXRBcmd1bWVudHMoKTtcbiAgICAgICAgY29uc3QgaW5wdXRzOiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBpbnB1dCBvZiByZXEuZ2V0SW5wdXRzKCkpIHtcbiAgICAgICAgICBpbnB1dHNbaW5wdXQuZ2V0UGF0aCgpXSA9IGlucHV0LmdldERpZ2VzdCgpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1ZygnQ29tcGlsaW5nIHdpdGg6XFxuXFx0JyArIGFyZ3Muam9pbignXFxuXFx0JykpO1xuICAgICAgICBjb25zdCBleGl0Q29kZSA9IHJ1bk9uZUJ1aWxkKGFyZ3MsIGlucHV0cykgPyAwIDogMTtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobmV3IHdvcmtlcnBiLldvcmtSZXNwb25zZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0RXhpdENvZGUoZXhpdENvZGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0T3V0cHV0KGNvbnNvbGVPdXRwdXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZW5jb2RlRGVsaW1pdGVkKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50b0J1ZmZlcigpKTtcbiAgICAgICAgLy8gRm9yY2UgYSBnYXJiYWdlIGNvbGxlY3Rpb24gcGFzcy4gIFRoaXMga2VlcHMgb3VyIG1lbW9yeSB1c2FnZVxuICAgICAgICAvLyBjb25zaXN0ZW50IGFjcm9zcyBtdWx0aXBsZSBjb21waWxhdGlvbnMsIGFuZCBhbGxvd3MgdGhlIGZpbGVcbiAgICAgICAgLy8gY2FjaGUgdG8gdXNlIHRoZSBjdXJyZW50IG1lbW9yeSB1c2FnZSBhcyBhIGd1aWRlbGluZSBmb3IgZXhwaXJpbmdcbiAgICAgICAgLy8gZGF0YS4gIE5vdGU6IHRoaXMgaXMgaW50ZW50aW9uYWxseSBub3Qgd2l0aGluIHJ1bk9uZUJ1aWxkKCksIGFzXG4gICAgICAgIC8vIHdlIHdhbnQgdG8gZ2Mgb25seSBhZnRlciBhbGwgaXRzIGxvY2FscyBoYXZlIGdvbmUgb3V0IG9mIHNjb3BlLlxuICAgICAgICBnbG9iYWwuZ2MoKTtcbiAgICAgIH1cbiAgICAgIC8vIEF2b2lkIGdyb3dpbmcgdGhlIGJ1ZmZlciBpbmRlZmluaXRlbHkuXG4gICAgICBidWYuY29tcGFjdCgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZygnQ29tcGlsYXRpb24gZmFpbGVkJywgZS5zdGFjayk7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShuZXcgd29ya2VycGIuV29ya1Jlc3BvbnNlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0RXhpdENvZGUoMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0T3V0cHV0KGNvbnNvbGVPdXRwdXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmVuY29kZURlbGltaXRlZCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvQnVmZmVyKCkpO1xuICAgICAgLy8gQ2xlYXIgYnVmZmVyIHNvIHRoZSBuZXh0IGJ1aWxkIHdvbid0IHJlYWQgYW4gaW5jb21wbGV0ZSByZXF1ZXN0LlxuICAgICAgYnVmID0gbnVsbDtcbiAgICB9XG4gIH0pO1xufVxuIl19