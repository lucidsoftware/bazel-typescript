/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * The proxy design pattern, allowing us to customize behavior of the delegate
     * object.
     * This creates a property-by-property copy of the object, so it can be mutated
     * without affecting other users of the original object.
     * See https://en.wikipedia.org/wiki/Proxy_pattern
     */
    function createProxy(delegate) {
        var e_1, _a;
        var proxy = Object.create(null);
        var _loop_1 = function (k) {
            proxy[k] = function () {
                return delegate[k].apply(delegate, arguments);
            };
        };
        try {
            for (var _b = __values(Object.keys(delegate)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var k = _c.value;
                _loop_1(k);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return proxy;
    }
    exports.createProxy = createProxy;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGx1Z2luX2FwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2ludGVybmFsL3RzY193cmFwcGVkL3BsdWdpbl9hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBdUJIOzs7Ozs7T0FNRztJQUNILFNBQWdCLFdBQVcsQ0FBSSxRQUFXOztRQUN4QyxJQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUN2QixDQUFDO1lBQ1YsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHO2dCQUNULE9BQVEsUUFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQztRQUNKLENBQUM7O1lBSkQsS0FBZ0IsSUFBQSxLQUFBLFNBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQSxnQkFBQTtnQkFBaEMsSUFBTSxDQUFDLFdBQUE7d0JBQUQsQ0FBQzthQUlYOzs7Ozs7Ozs7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFSRCxrQ0FRQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IFRoZSBCYXplbCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXdcbiAqIFByb3ZpZGVzIEFQSXMgZm9yIGV4dGVuZGluZyBUeXBlU2NyaXB0LlxuICogQmFzZWQgb24gdGhlIExhbmd1YWdlU2VydmljZSBwbHVnaW4gQVBJIGluIFRTIDIuM1xuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIFRoaXMgQVBJIGlzIHNpbXBsZXIgdGhhbiBMYW5ndWFnZVNlcnZpY2UgcGx1Z2lucy5cbiAqIEl0J3MgdXNlZCBmb3IgcGx1Z2lucyB0aGF0IG9ubHkgdGFyZ2V0IHRoZSBjb21tYW5kLWxpbmUgYW5kIG5ldmVyIHJ1biBpbiBhblxuICogZWRpdG9yIGNvbnRleHQuXG4gKiBJTVBPUlRBTlQ6IHBsdWdpbnMgbXVzdCBwcm9wYWdhdGUgdGhlIGRpYWdub3N0aWNzIGZyb20gdGhlIG9yaWdpbmFsIHByb2dyYW0uXG4gKiBFeGVjdXRpb24gb2YgcGx1Z2lucyBpcyBub3QgYWRkaXRpdmU7IG9ubHkgdGhlIHJlc3VsdCBmcm9tIHRoZSB0b3AtbW9zdFxuICogd3JhcHBlZCBQcm9ncmFtIGlzIHVzZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHNjUGx1Z2luIHsgd3JhcChwOiB0cy5Qcm9ncmFtLCBjb25maWc/OiB7fSk6IHRzLlByb2dyYW07IH1cblxuLy8gVE9ETyhhbGV4ZWFnbGUpOiB0aGlzIHNob3VsZCBiZSB1bmlvbmVkIHdpdGggdHNzZXJ2ZXJsaWJyYXJ5LlBsdWdpbk1vZHVsZVxuZXhwb3J0IHR5cGUgUGx1Z2luID0gVHNjUGx1Z2luO1xuXG4vKipcbiAqIFRoZSBwcm94eSBkZXNpZ24gcGF0dGVybiwgYWxsb3dpbmcgdXMgdG8gY3VzdG9taXplIGJlaGF2aW9yIG9mIHRoZSBkZWxlZ2F0ZVxuICogb2JqZWN0LlxuICogVGhpcyBjcmVhdGVzIGEgcHJvcGVydHktYnktcHJvcGVydHkgY29weSBvZiB0aGUgb2JqZWN0LCBzbyBpdCBjYW4gYmUgbXV0YXRlZFxuICogd2l0aG91dCBhZmZlY3Rpbmcgb3RoZXIgdXNlcnMgb2YgdGhlIG9yaWdpbmFsIG9iamVjdC5cbiAqIFNlZSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Qcm94eV9wYXR0ZXJuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm94eTxUPihkZWxlZ2F0ZTogVCk6IFQge1xuICBjb25zdCBwcm94eSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGZvciAoY29uc3QgayBvZiBPYmplY3Qua2V5cyhkZWxlZ2F0ZSkpIHtcbiAgICBwcm94eVtrXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChkZWxlZ2F0ZSBhcyBhbnkpW2tdLmFwcGx5KGRlbGVnYXRlLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIHByb3h5O1xufVxuIl19