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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs", "typescript", "./perf_trace"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs = require("fs");
    var ts = require("typescript");
    var perfTrace = require("./perf_trace");
    /**
     * Cache exposes a trivial LRU cache.
     *
     * This code uses the fact that JavaScript hash maps are linked lists - after
     * reaching the cache size limit, it deletes the oldest (first) entries. Used
     * cache entries are moved to the end of the list by deleting and re-inserting.
     */
    var Cache = /** @class */ (function () {
        function Cache(name, debug) {
            this.name = name;
            this.debug = debug;
            this.map = new Map();
            this.stats = { reads: 0, hits: 0, evictions: 0 };
        }
        Cache.prototype.set = function (key, value) {
            this.map.set(key, value);
        };
        Cache.prototype.get = function (key, updateCache) {
            if (updateCache === void 0) { updateCache = true; }
            this.stats.reads++;
            var entry = this.map.get(key);
            if (updateCache) {
                if (entry) {
                    this.debug(this.name, 'cache hit:', key);
                    this.stats.hits++;
                    // Move an entry to the end of the cache by deleting and re-inserting
                    // it.
                    this.map.delete(key);
                    this.map.set(key, entry);
                }
                else {
                    this.debug(this.name, 'cache miss:', key);
                }
                this.traceStats();
            }
            return entry;
        };
        Cache.prototype.delete = function (key) {
            this.map.delete(key);
        };
        Cache.prototype.evict = function (unevictableKeys) {
            var e_1, _a;
            // Drop half the cache, the least recently used entry == the first entry.
            this.debug('Evicting from the', this.name, 'cache...');
            var originalSize = this.map.size;
            var numberKeysToDrop = originalSize / 2;
            if (numberKeysToDrop === 0) {
                return 0;
            }
            try {
                // Map keys are iterated in insertion order, since we reinsert on access
                // this is indeed a LRU strategy.
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys
                for (var _b = __values(this.map.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var key = _c.value;
                    if (numberKeysToDrop === 0)
                        break;
                    if (unevictableKeys && unevictableKeys.has(key))
                        continue;
                    this.map.delete(key);
                    numberKeysToDrop--;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var keysDropped = originalSize - this.map.size;
            this.stats.evictions += keysDropped;
            this.debug('Evicted', keysDropped, this.name, 'cache entries');
            this.traceStats();
            return keysDropped;
        };
        Cache.prototype.keys = function () {
            return this.map.keys();
        };
        Cache.prototype.resetStats = function () {
            this.stats = { hits: 0, reads: 0, evictions: 0 };
        };
        Cache.prototype.printStats = function () {
            var percentage;
            if (this.stats.reads === 0) {
                percentage = 100.00; // avoid "NaN %"
            }
            else {
                percentage = (this.stats.hits / this.stats.reads * 100).toFixed(2);
            }
            this.debug(this.name + " cache stats: " + percentage + "% hits", this.stats);
        };
        Cache.prototype.traceStats = function () {
            var _a;
            // counters are rendered as stacked bar charts, so record cache
            // hits/misses rather than the 'reads' stat tracked in stats
            // so the chart makes sense.
            perfTrace.counter(this.name + " cache hit rate", {
                'hits': this.stats.hits,
                'misses': this.stats.reads - this.stats.hits,
            });
            perfTrace.counter(this.name + " cache evictions", {
                'evictions': this.stats.evictions,
            });
            perfTrace.counter(this.name + " cache size", (_a = {},
                _a[this.name + "s"] = this.map.size,
                _a));
        };
        return Cache;
    }());
    /**
     * Default memory size, beyond which we evict from the cache.
     */
    var DEFAULT_MAX_MEM_USAGE = 1024 * (1 << 20 /* 1 MB */);
    /**
     * FileCache is a trivial LRU cache for typescript-parsed bazel-output files.
     *
     * Cache entries include an opaque bazel-supplied digest to track staleness.
     * Expected digests must be set (using updateCache) before using the cache.
     */
    // TODO(martinprobst): Drop the <T> parameter, it's no longer used.
    var FileCache = /** @class */ (function () {
        function FileCache(debug) {
            var _this = this;
            this.debug = debug;
            this.fileCache = new Cache('file', this.debug);
            /**
             * FileCache does not know how to construct bazel's opaque digests. This
             * field caches the last (or current) compile run's digests, so that code
             * below knows what digest to assign to a newly loaded file.
             */
            this.lastDigests = new Map();
            /**
             * FileCache can enter a degenerate state, where all cache entries are pinned
             * by lastDigests, but the system is still out of memory. In that case, do not
             * attempt to free memory until lastDigests has changed.
             */
            this.cannotEvict = false;
            /**
             * Because we cannot measuse the cache memory footprint directly, we evict
             * when the process' total memory usage goes beyond this number.
             */
            this.maxMemoryUsage = DEFAULT_MAX_MEM_USAGE;
            /**
             * Returns whether the cache should free some memory.
             *
             * Defined as a property so it can be overridden in tests.
             */
            this.shouldFreeMemory = function () {
                return process.memoryUsage().heapUsed > _this.maxMemoryUsage;
            };
        }
        FileCache.prototype.setMaxCacheSize = function (maxCacheSize) {
            if (maxCacheSize < 0) {
                throw new Error("FileCache max size is negative: " + maxCacheSize);
            }
            this.debug('Cache max size is', maxCacheSize >> 20, 'MB');
            this.maxMemoryUsage = maxCacheSize;
            this.maybeFreeMemory();
        };
        FileCache.prototype.resetMaxCacheSize = function () {
            this.setMaxCacheSize(DEFAULT_MAX_MEM_USAGE);
        };
        FileCache.prototype.updateCache = function (digests) {
            var e_2, _a;
            // TODO(martinprobst): drop the Object based version, it's just here for
            // backwards compatibility.
            if (!(digests instanceof Map)) {
                digests = new Map(Object.keys(digests).map(function (k) { return [k, digests[k]]; }));
            }
            this.debug('updating digests:', digests);
            this.lastDigests = digests;
            this.cannotEvict = false;
            try {
                for (var _b = __values(digests.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), filePath = _d[0], newDigest = _d[1];
                    var entry = this.fileCache.get(filePath, /*updateCache=*/ false);
                    if (entry && entry.digest !== newDigest) {
                        this.debug('dropping file cache entry for', filePath, 'digests', entry.digest, newDigest);
                        this.fileCache.delete(filePath);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        FileCache.prototype.getLastDigest = function (filePath) {
            var digest = this.lastDigests.get(filePath);
            if (!digest) {
                throw new Error("missing input digest for " + filePath + "." +
                    ("(only have " + Array.from(this.lastDigests.keys()) + ")"));
            }
            return digest;
        };
        FileCache.prototype.getCache = function (filePath) {
            var entry = this.fileCache.get(filePath);
            if (entry)
                return entry.value;
            return undefined;
        };
        FileCache.prototype.putCache = function (filePath, entry) {
            var dropped = this.maybeFreeMemory();
            this.fileCache.set(filePath, entry);
            this.debug('Loaded file:', filePath, 'dropped', dropped, 'files');
        };
        /**
         * Returns true if the given filePath was reported as an input up front and
         * has a known cache digest. FileCache can only cache known files.
         */
        FileCache.prototype.isKnownInput = function (filePath) {
            return this.lastDigests.has(filePath);
        };
        FileCache.prototype.inCache = function (filePath) {
            return !!this.getCache(filePath);
        };
        FileCache.prototype.resetStats = function () {
            this.fileCache.resetStats();
        };
        FileCache.prototype.printStats = function () {
            this.fileCache.printStats();
        };
        FileCache.prototype.traceStats = function () {
            this.fileCache.traceStats();
        };
        /**
         * Frees memory if required. Returns the number of dropped entries.
         */
        FileCache.prototype.maybeFreeMemory = function () {
            if (!this.shouldFreeMemory() || this.cannotEvict) {
                return 0;
            }
            var dropped = this.fileCache.evict(this.lastDigests);
            if (dropped === 0) {
                // Freeing memory did not drop any cache entries, because all are pinned.
                // Stop evicting until the pinned list changes again. This prevents
                // degenerating into an O(n^2) situation where each file load iterates
                // through the list of all files, trying to evict cache keys in vain
                // because all are pinned.
                this.cannotEvict = true;
            }
            return dropped;
        };
        FileCache.prototype.getFileCacheKeysForTest = function () {
            return Array.from(this.fileCache.keys());
        };
        return FileCache;
    }());
    exports.FileCache = FileCache;
    /**
     * ProgramAndFileCache is a trivial LRU cache for typescript-parsed programs and
     * bazel-output files.
     *
     * Programs are evicted before source files because they have less reuse across
     * compilations.
     */
    var ProgramAndFileCache = /** @class */ (function (_super) {
        __extends(ProgramAndFileCache, _super);
        function ProgramAndFileCache() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.programCache = new Cache('program', _this.debug);
            return _this;
        }
        ProgramAndFileCache.prototype.getProgram = function (target) {
            return this.programCache.get(target);
        };
        ProgramAndFileCache.prototype.putProgram = function (target, program) {
            var dropped = this.maybeFreeMemory();
            this.programCache.set(target, program);
            this.debug('Loaded program:', target, 'dropped', dropped, 'entries');
        };
        ProgramAndFileCache.prototype.resetStats = function () {
            _super.prototype.resetStats.call(this);
            this.programCache.resetStats();
        };
        ProgramAndFileCache.prototype.printStats = function () {
            _super.prototype.printStats.call(this);
            this.programCache.printStats();
        };
        ProgramAndFileCache.prototype.traceStats = function () {
            _super.prototype.traceStats.call(this);
            this.programCache.traceStats();
        };
        ProgramAndFileCache.prototype.maybeFreeMemory = function () {
            if (!this.shouldFreeMemory())
                return 0;
            var dropped = this.programCache.evict();
            if (dropped > 0)
                return dropped;
            return _super.prototype.maybeFreeMemory.call(this);
        };
        ProgramAndFileCache.prototype.getProgramCacheKeysForTest = function () {
            return Array.from(this.programCache.keys());
        };
        return ProgramAndFileCache;
    }(FileCache));
    exports.ProgramAndFileCache = ProgramAndFileCache;
    /**
     * Load a source file from disk, or possibly return a cached version.
     */
    var CachedFileLoader = /** @class */ (function () {
        // TODO(alexeagle): remove unused param after usages updated:
        // angular:packages/bazel/src/ngc-wrapped/index.ts
        function CachedFileLoader(cache, unused) {
            this.cache = cache;
            /** Total amount of time spent loading files, for the perf trace. */
            this.totalReadTimeMs = 0;
        }
        CachedFileLoader.prototype.fileExists = function (filePath) {
            return this.cache.isKnownInput(filePath);
        };
        CachedFileLoader.prototype.loadFile = function (fileName, filePath, langVer) {
            var sourceFile = this.cache.getCache(filePath);
            if (!sourceFile) {
                var readStart = Date.now();
                var sourceText = fs.readFileSync(filePath, 'utf8');
                sourceFile = ts.createSourceFile(fileName, sourceText, langVer, true);
                var entry = {
                    digest: this.cache.getLastDigest(filePath),
                    value: sourceFile
                };
                var readEnd = Date.now();
                this.cache.putCache(filePath, entry);
                this.totalReadTimeMs += readEnd - readStart;
                perfTrace.counter('file load time', {
                    'read': this.totalReadTimeMs,
                });
                perfTrace.snapshotMemoryUsage();
            }
            return sourceFile;
        };
        return CachedFileLoader;
    }());
    exports.CachedFileLoader = CachedFileLoader;
    /** Load a source file from disk. */
    var UncachedFileLoader = /** @class */ (function () {
        function UncachedFileLoader() {
        }
        UncachedFileLoader.prototype.fileExists = function (filePath) {
            return ts.sys.fileExists(filePath);
        };
        UncachedFileLoader.prototype.loadFile = function (fileName, filePath, langVer) {
            var sourceText = fs.readFileSync(filePath, 'utf8');
            return ts.createSourceFile(fileName, sourceText, langVer, true);
        };
        return UncachedFileLoader;
    }());
    exports.UncachedFileLoader = UncachedFileLoader;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC90c2Nfd3JhcHBlZC9jYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVILHVCQUF5QjtJQUN6QiwrQkFBaUM7SUFDakMsd0NBQTBDO0lBVTFDOzs7Ozs7T0FNRztJQUNIO1FBSUUsZUFBb0IsSUFBWSxFQUFVLEtBQVk7WUFBbEMsU0FBSSxHQUFKLElBQUksQ0FBUTtZQUFVLFVBQUssR0FBTCxLQUFLLENBQU87WUFIOUMsUUFBRyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7WUFDM0IsVUFBSyxHQUFlLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUMsQ0FBQztRQUVMLENBQUM7UUFFMUQsbUJBQUcsR0FBSCxVQUFJLEdBQVcsRUFBRSxLQUFRO1lBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzQixDQUFDO1FBRUQsbUJBQUcsR0FBSCxVQUFJLEdBQVcsRUFBRSxXQUFrQjtZQUFsQiw0QkFBQSxFQUFBLGtCQUFrQjtZQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRW5CLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLElBQUksV0FBVyxFQUFFO2dCQUNmLElBQUksS0FBSyxFQUFFO29CQUNULElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENB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QUFDLEFBVkQsSUFVQztJQVZZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IFRoZSBCYXplbCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIHBlcmZUcmFjZSBmcm9tICcuL3BlcmZfdHJhY2UnO1xuXG50eXBlIERlYnVnID0gKC4uLm1zZzogQXJyYXk8e30+KSA9PiB2b2lkO1xuXG5pbnRlcmZhY2UgQ2FjaGVTdGF0cyB7XG4gIHJlYWRzOiBudW1iZXI7XG4gIGhpdHM6IG51bWJlcjtcbiAgZXZpY3Rpb25zOiBudW1iZXI7XG59XG5cbi8qKlxuICogQ2FjaGUgZXhwb3NlcyBhIHRyaXZpYWwgTFJVIGNhY2hlLlxuICpcbiAqIFRoaXMgY29kZSB1c2VzIHRoZSBmYWN0IHRoYXQgSmF2YVNjcmlwdCBoYXNoIG1hcHMgYXJlIGxpbmtlZCBsaXN0cyAtIGFmdGVyXG4gKiByZWFjaGluZyB0aGUgY2FjaGUgc2l6ZSBsaW1pdCwgaXQgZGVsZXRlcyB0aGUgb2xkZXN0IChmaXJzdCkgZW50cmllcy4gVXNlZFxuICogY2FjaGUgZW50cmllcyBhcmUgbW92ZWQgdG8gdGhlIGVuZCBvZiB0aGUgbGlzdCBieSBkZWxldGluZyBhbmQgcmUtaW5zZXJ0aW5nLlxuICovXG5jbGFzcyBDYWNoZTxUPiB7XG4gIHByaXZhdGUgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFQ+KCk7XG4gIHByaXZhdGUgc3RhdHM6IENhY2hlU3RhdHMgPSB7cmVhZHM6IDAsIGhpdHM6IDAsIGV2aWN0aW9uczogMH07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBuYW1lOiBzdHJpbmcsIHByaXZhdGUgZGVidWc6IERlYnVnKSB7fVxuXG4gIHNldChrZXk6IHN0cmluZywgdmFsdWU6IFQpIHtcbiAgICB0aGlzLm1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gIH1cblxuICBnZXQoa2V5OiBzdHJpbmcsIHVwZGF0ZUNhY2hlID0gdHJ1ZSk6IFR8dW5kZWZpbmVkIHtcbiAgICB0aGlzLnN0YXRzLnJlYWRzKys7XG5cbiAgICBjb25zdCBlbnRyeSA9IHRoaXMubWFwLmdldChrZXkpO1xuICAgIGlmICh1cGRhdGVDYWNoZSkge1xuICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgIHRoaXMuZGVidWcodGhpcy5uYW1lLCAnY2FjaGUgaGl0OicsIGtleSk7XG4gICAgICAgIHRoaXMuc3RhdHMuaGl0cysrO1xuICAgICAgICAvLyBNb3ZlIGFuIGVudHJ5IHRvIHRoZSBlbmQgb2YgdGhlIGNhY2hlIGJ5IGRlbGV0aW5nIGFuZCByZS1pbnNlcnRpbmdcbiAgICAgICAgLy8gaXQuXG4gICAgICAgIHRoaXMubWFwLmRlbGV0ZShrZXkpO1xuICAgICAgICB0aGlzLm1hcC5zZXQoa2V5LCBlbnRyeSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRlYnVnKHRoaXMubmFtZSwgJ2NhY2hlIG1pc3M6Jywga2V5KTtcbiAgICAgIH1cbiAgICAgIHRoaXMudHJhY2VTdGF0cygpO1xuICAgIH1cbiAgICByZXR1cm4gZW50cnk7XG4gIH1cblxuICBkZWxldGUoa2V5OiBzdHJpbmcpIHtcbiAgICB0aGlzLm1hcC5kZWxldGUoa2V5KTtcbiAgfVxuXG4gIGV2aWN0KHVuZXZpY3RhYmxlS2V5cz86IHtoYXM6IChrZXk6IHN0cmluZykgPT4gYm9vbGVhbn0pOiBudW1iZXIge1xuICAgIC8vIERyb3AgaGFsZiB0aGUgY2FjaGUsIHRoZSBsZWFzdCByZWNlbnRseSB1c2VkIGVudHJ5ID09IHRoZSBmaXJzdCBlbnRyeS5cbiAgICB0aGlzLmRlYnVnKCdFdmljdGluZyBmcm9tIHRoZScsIHRoaXMubmFtZSwgJ2NhY2hlLi4uJyk7XG4gICAgY29uc3Qgb3JpZ2luYWxTaXplID0gdGhpcy5tYXAuc2l6ZTtcbiAgICBsZXQgbnVtYmVyS2V5c1RvRHJvcCA9IG9yaWdpbmFsU2l6ZSAvIDI7XG4gICAgaWYgKG51bWJlcktleXNUb0Ryb3AgPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICAvLyBNYXAga2V5cyBhcmUgaXRlcmF0ZWQgaW4gaW5zZXJ0aW9uIG9yZGVyLCBzaW5jZSB3ZSByZWluc2VydCBvbiBhY2Nlc3NcbiAgICAvLyB0aGlzIGlzIGluZGVlZCBhIExSVSBzdHJhdGVneS5cbiAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9NYXAva2V5c1xuICAgIGZvciAoY29uc3Qga2V5IG9mIHRoaXMubWFwLmtleXMoKSkge1xuICAgICAgaWYgKG51bWJlcktleXNUb0Ryb3AgPT09IDApIGJyZWFrO1xuICAgICAgaWYgKHVuZXZpY3RhYmxlS2V5cyAmJiB1bmV2aWN0YWJsZUtleXMuaGFzKGtleSkpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5tYXAuZGVsZXRlKGtleSk7XG4gICAgICBudW1iZXJLZXlzVG9Ecm9wLS07XG4gICAgfVxuICAgIGNvbnN0IGtleXNEcm9wcGVkID0gb3JpZ2luYWxTaXplIC0gdGhpcy5tYXAuc2l6ZTtcbiAgICB0aGlzLnN0YXRzLmV2aWN0aW9ucyArPSBrZXlzRHJvcHBlZDtcbiAgICB0aGlzLmRlYnVnKCdFdmljdGVkJywga2V5c0Ryb3BwZWQsIHRoaXMubmFtZSwgJ2NhY2hlIGVudHJpZXMnKTtcbiAgICB0aGlzLnRyYWNlU3RhdHMoKTtcbiAgICByZXR1cm4ga2V5c0Ryb3BwZWQ7XG4gIH1cblxuICBrZXlzKCkge1xuICAgIHJldHVybiB0aGlzLm1hcC5rZXlzKCk7XG4gIH1cblxuICByZXNldFN0YXRzKCkge1xuICAgIHRoaXMuc3RhdHMgPSB7aGl0czogMCwgcmVhZHM6IDAsIGV2aWN0aW9uczogMH07XG4gIH1cblxuICBwcmludFN0YXRzKCkge1xuICAgIGxldCBwZXJjZW50YWdlO1xuICAgIGlmICh0aGlzLnN0YXRzLnJlYWRzID09PSAwKSB7XG4gICAgICBwZXJjZW50YWdlID0gMTAwLjAwOyAgLy8gYXZvaWQgXCJOYU4gJVwiXG4gICAgfSBlbHNlIHtcbiAgICAgIHBlcmNlbnRhZ2UgPSAodGhpcy5zdGF0cy5oaXRzIC8gdGhpcy5zdGF0cy5yZWFkcyAqIDEwMCkudG9GaXhlZCgyKTtcbiAgICB9XG4gICAgdGhpcy5kZWJ1ZyhgJHt0aGlzLm5hbWV9IGNhY2hlIHN0YXRzOiAke3BlcmNlbnRhZ2V9JSBoaXRzYCwgdGhpcy5zdGF0cyk7XG4gIH1cblxuICB0cmFjZVN0YXRzKCkge1xuICAgIC8vIGNvdW50ZXJzIGFyZSByZW5kZXJlZCBhcyBzdGFja2VkIGJhciBjaGFydHMsIHNvIHJlY29yZCBjYWNoZVxuICAgIC8vIGhpdHMvbWlzc2VzIHJhdGhlciB0aGFuIHRoZSAncmVhZHMnIHN0YXQgdHJhY2tlZCBpbiBzdGF0c1xuICAgIC8vIHNvIHRoZSBjaGFydCBtYWtlcyBzZW5zZS5cbiAgICBwZXJmVHJhY2UuY291bnRlcihgJHt0aGlzLm5hbWV9IGNhY2hlIGhpdCByYXRlYCwge1xuICAgICAgJ2hpdHMnOiB0aGlzLnN0YXRzLmhpdHMsXG4gICAgICAnbWlzc2VzJzogdGhpcy5zdGF0cy5yZWFkcyAtIHRoaXMuc3RhdHMuaGl0cyxcbiAgICB9KTtcbiAgICBwZXJmVHJhY2UuY291bnRlcihgJHt0aGlzLm5hbWV9IGNhY2hlIGV2aWN0aW9uc2AsIHtcbiAgICAgICdldmljdGlvbnMnOiB0aGlzLnN0YXRzLmV2aWN0aW9ucyxcbiAgICB9KTtcbiAgICBwZXJmVHJhY2UuY291bnRlcihgJHt0aGlzLm5hbWV9IGNhY2hlIHNpemVgLCB7XG4gICAgICBbYCR7dGhpcy5uYW1lfXNgXTogdGhpcy5tYXAuc2l6ZSxcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNvdXJjZUZpbGVFbnRyeSB7XG4gIGRpZ2VzdDogc3RyaW5nOyAgLy8gYmxhemUncyBvcGFxdWUgZGlnZXN0IG9mIHRoZSBmaWxlXG4gIHZhbHVlOiB0cy5Tb3VyY2VGaWxlO1xufVxuXG4vKipcbiAqIERlZmF1bHQgbWVtb3J5IHNpemUsIGJleW9uZCB3aGljaCB3ZSBldmljdCBmcm9tIHRoZSBjYWNoZS5cbiAqL1xuY29uc3QgREVGQVVMVF9NQVhfTUVNX1VTQUdFID0gMTAyNCAqICgxIDw8IDIwIC8qIDEgTUIgKi8pO1xuXG4vKipcbiAqIEZpbGVDYWNoZSBpcyBhIHRyaXZpYWwgTFJVIGNhY2hlIGZvciB0eXBlc2NyaXB0LXBhcnNlZCBiYXplbC1vdXRwdXQgZmlsZXMuXG4gKlxuICogQ2FjaGUgZW50cmllcyBpbmNsdWRlIGFuIG9wYXF1ZSBiYXplbC1zdXBwbGllZCBkaWdlc3QgdG8gdHJhY2sgc3RhbGVuZXNzLlxuICogRXhwZWN0ZWQgZGlnZXN0cyBtdXN0IGJlIHNldCAodXNpbmcgdXBkYXRlQ2FjaGUpIGJlZm9yZSB1c2luZyB0aGUgY2FjaGUuXG4gKi9cbi8vIFRPRE8obWFydGlucHJvYnN0KTogRHJvcCB0aGUgPFQ+IHBhcmFtZXRlciwgaXQncyBubyBsb25nZXIgdXNlZC5cbmV4cG9ydCBjbGFzcyBGaWxlQ2FjaGU8VCA9IHt9PiB7XG4gIHByaXZhdGUgZmlsZUNhY2hlID0gbmV3IENhY2hlPFNvdXJjZUZpbGVFbnRyeT4oJ2ZpbGUnLCB0aGlzLmRlYnVnKTtcbiAgLyoqXG4gICAqIEZpbGVDYWNoZSBkb2VzIG5vdCBrbm93IGhvdyB0byBjb25zdHJ1Y3QgYmF6ZWwncyBvcGFxdWUgZGlnZXN0cy4gVGhpc1xuICAgKiBmaWVsZCBjYWNoZXMgdGhlIGxhc3QgKG9yIGN1cnJlbnQpIGNvbXBpbGUgcnVuJ3MgZGlnZXN0cywgc28gdGhhdCBjb2RlXG4gICAqIGJlbG93IGtub3dzIHdoYXQgZGlnZXN0IHRvIGFzc2lnbiB0byBhIG5ld2x5IGxvYWRlZCBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBsYXN0RGlnZXN0cyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIC8qKlxuICAgKiBGaWxlQ2FjaGUgY2FuIGVudGVyIGEgZGVnZW5lcmF0ZSBzdGF0ZSwgd2hlcmUgYWxsIGNhY2hlIGVudHJpZXMgYXJlIHBpbm5lZFxuICAgKiBieSBsYXN0RGlnZXN0cywgYnV0IHRoZSBzeXN0ZW0gaXMgc3RpbGwgb3V0IG9mIG1lbW9yeS4gSW4gdGhhdCBjYXNlLCBkbyBub3RcbiAgICogYXR0ZW1wdCB0byBmcmVlIG1lbW9yeSB1bnRpbCBsYXN0RGlnZXN0cyBoYXMgY2hhbmdlZC5cbiAgICovXG4gIHByaXZhdGUgY2Fubm90RXZpY3QgPSBmYWxzZTtcblxuICAvKipcbiAgICogQmVjYXVzZSB3ZSBjYW5ub3QgbWVhc3VzZSB0aGUgY2FjaGUgbWVtb3J5IGZvb3RwcmludCBkaXJlY3RseSwgd2UgZXZpY3RcbiAgICogd2hlbiB0aGUgcHJvY2VzcycgdG90YWwgbWVtb3J5IHVzYWdlIGdvZXMgYmV5b25kIHRoaXMgbnVtYmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBtYXhNZW1vcnlVc2FnZSA9IERFRkFVTFRfTUFYX01FTV9VU0FHRTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZGVidWc6ICguLi5tc2c6IEFycmF5PHt9PikgPT4gdm9pZCkge31cblxuICBzZXRNYXhDYWNoZVNpemUobWF4Q2FjaGVTaXplOiBudW1iZXIpIHtcbiAgICBpZiAobWF4Q2FjaGVTaXplIDwgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlQ2FjaGUgbWF4IHNpemUgaXMgbmVnYXRpdmU6ICR7bWF4Q2FjaGVTaXplfWApO1xuICAgIH1cbiAgICB0aGlzLmRlYnVnKCdDYWNoZSBtYXggc2l6ZSBpcycsIG1heENhY2hlU2l6ZSA+PiAyMCwgJ01CJyk7XG4gICAgdGhpcy5tYXhNZW1vcnlVc2FnZSA9IG1heENhY2hlU2l6ZTtcbiAgICB0aGlzLm1heWJlRnJlZU1lbW9yeSgpO1xuICB9XG5cbiAgcmVzZXRNYXhDYWNoZVNpemUoKSB7XG4gICAgdGhpcy5zZXRNYXhDYWNoZVNpemUoREVGQVVMVF9NQVhfTUVNX1VTQUdFKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBjYWNoZSB3aXRoIHRoZSBnaXZlbiBkaWdlc3RzLlxuICAgKlxuICAgKiB1cGRhdGVDYWNoZSBtdXN0IGJlIGNhbGxlZCBiZWZvcmUgbG9hZGluZyBmaWxlcyAtIG9ubHkgZmlsZXMgdGhhdCB3ZXJlXG4gICAqIHVwZGF0ZWQgKHdpdGggYSBkaWdlc3QpIHByZXZpb3VzbHkgY2FuIGJlIGxvYWRlZC5cbiAgICovXG4gIHVwZGF0ZUNhY2hlKGRpZ2VzdHM6IHtbazogc3RyaW5nXTogc3RyaW5nfSk6IHZvaWQ7XG4gIHVwZGF0ZUNhY2hlKGRpZ2VzdHM6IE1hcDxzdHJpbmcsIHN0cmluZz4pOiB2b2lkO1xuICB1cGRhdGVDYWNoZShkaWdlc3RzOiBNYXA8c3RyaW5nLCBzdHJpbmc+fHtbazogc3RyaW5nXTogc3RyaW5nfSkge1xuICAgIC8vIFRPRE8obWFydGlucHJvYnN0KTogZHJvcCB0aGUgT2JqZWN0IGJhc2VkIHZlcnNpb24sIGl0J3MganVzdCBoZXJlIGZvclxuICAgIC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICAgIGlmICghKGRpZ2VzdHMgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICBkaWdlc3RzID0gbmV3IE1hcChPYmplY3Qua2V5cyhkaWdlc3RzKS5tYXAoXG4gICAgICAgICAgKGspOiBbc3RyaW5nLCBzdHJpbmddID0+IFtrLCAoZGlnZXN0cyBhcyB7W2s6IHN0cmluZ106IHN0cmluZ30pW2tdXSkpO1xuICAgIH1cbiAgICB0aGlzLmRlYnVnKCd1cGRhdGluZyBkaWdlc3RzOicsIGRpZ2VzdHMpO1xuICAgIHRoaXMubGFzdERpZ2VzdHMgPSBkaWdlc3RzO1xuICAgIHRoaXMuY2Fubm90RXZpY3QgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IFtmaWxlUGF0aCwgbmV3RGlnZXN0XSBvZiBkaWdlc3RzLmVudHJpZXMoKSkge1xuICAgICAgY29uc3QgZW50cnkgPSB0aGlzLmZpbGVDYWNoZS5nZXQoZmlsZVBhdGgsIC8qdXBkYXRlQ2FjaGU9Ki8gZmFsc2UpO1xuICAgICAgaWYgKGVudHJ5ICYmIGVudHJ5LmRpZ2VzdCAhPT0gbmV3RGlnZXN0KSB7XG4gICAgICAgIHRoaXMuZGVidWcoXG4gICAgICAgICAgICAnZHJvcHBpbmcgZmlsZSBjYWNoZSBlbnRyeSBmb3InLCBmaWxlUGF0aCwgJ2RpZ2VzdHMnLCBlbnRyeS5kaWdlc3QsXG4gICAgICAgICAgICBuZXdEaWdlc3QpO1xuICAgICAgICB0aGlzLmZpbGVDYWNoZS5kZWxldGUoZmlsZVBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldExhc3REaWdlc3QoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgZGlnZXN0ID0gdGhpcy5sYXN0RGlnZXN0cy5nZXQoZmlsZVBhdGgpO1xuICAgIGlmICghZGlnZXN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYG1pc3NpbmcgaW5wdXQgZGlnZXN0IGZvciAke2ZpbGVQYXRofS5gICtcbiAgICAgICAgICBgKG9ubHkgaGF2ZSAke0FycmF5LmZyb20odGhpcy5sYXN0RGlnZXN0cy5rZXlzKCkpfSlgKTtcbiAgICB9XG4gICAgcmV0dXJuIGRpZ2VzdDtcbiAgfVxuXG4gIGdldENhY2hlKGZpbGVQYXRoOiBzdHJpbmcpOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZW50cnkgPSB0aGlzLmZpbGVDYWNoZS5nZXQoZmlsZVBhdGgpO1xuICAgIGlmIChlbnRyeSkgcmV0dXJuIGVudHJ5LnZhbHVlO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBwdXRDYWNoZShmaWxlUGF0aDogc3RyaW5nLCBlbnRyeTogU291cmNlRmlsZUVudHJ5KTogdm9pZCB7XG4gICAgY29uc3QgZHJvcHBlZCA9IHRoaXMubWF5YmVGcmVlTWVtb3J5KCk7XG4gICAgdGhpcy5maWxlQ2FjaGUuc2V0KGZpbGVQYXRoLCBlbnRyeSk7XG4gICAgdGhpcy5kZWJ1ZygnTG9hZGVkIGZpbGU6JywgZmlsZVBhdGgsICdkcm9wcGVkJywgZHJvcHBlZCwgJ2ZpbGVzJyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBmaWxlUGF0aCB3YXMgcmVwb3J0ZWQgYXMgYW4gaW5wdXQgdXAgZnJvbnQgYW5kXG4gICAqIGhhcyBhIGtub3duIGNhY2hlIGRpZ2VzdC4gRmlsZUNhY2hlIGNhbiBvbmx5IGNhY2hlIGtub3duIGZpbGVzLlxuICAgKi9cbiAgaXNLbm93bklucHV0KGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5sYXN0RGlnZXN0cy5oYXMoZmlsZVBhdGgpO1xuICB9XG5cbiAgaW5DYWNoZShmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5nZXRDYWNoZShmaWxlUGF0aCk7XG4gIH1cblxuICByZXNldFN0YXRzKCkge1xuICAgIHRoaXMuZmlsZUNhY2hlLnJlc2V0U3RhdHMoKTtcbiAgfVxuXG4gIHByaW50U3RhdHMoKSB7XG4gICAgdGhpcy5maWxlQ2FjaGUucHJpbnRTdGF0cygpO1xuICB9XG5cbiAgdHJhY2VTdGF0cygpIHtcbiAgICB0aGlzLmZpbGVDYWNoZS50cmFjZVN0YXRzKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSBjYWNoZSBzaG91bGQgZnJlZSBzb21lIG1lbW9yeS5cbiAgICpcbiAgICogRGVmaW5lZCBhcyBhIHByb3BlcnR5IHNvIGl0IGNhbiBiZSBvdmVycmlkZGVuIGluIHRlc3RzLlxuICAgKi9cbiAgc2hvdWxkRnJlZU1lbW9yeTogKCkgPT4gYm9vbGVhbiA9ICgpID0+IHtcbiAgICByZXR1cm4gcHJvY2Vzcy5tZW1vcnlVc2FnZSgpLmhlYXBVc2VkID4gdGhpcy5tYXhNZW1vcnlVc2FnZTtcbiAgfTtcblxuICAvKipcbiAgICogRnJlZXMgbWVtb3J5IGlmIHJlcXVpcmVkLiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZHJvcHBlZCBlbnRyaWVzLlxuICAgKi9cbiAgbWF5YmVGcmVlTWVtb3J5KCkge1xuICAgIGlmICghdGhpcy5zaG91bGRGcmVlTWVtb3J5KCkgfHwgdGhpcy5jYW5ub3RFdmljdCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGNvbnN0IGRyb3BwZWQgPSB0aGlzLmZpbGVDYWNoZS5ldmljdCh0aGlzLmxhc3REaWdlc3RzKTtcbiAgICBpZiAoZHJvcHBlZCA9PT0gMCkge1xuICAgICAgLy8gRnJlZWluZyBtZW1vcnkgZGlkIG5vdCBkcm9wIGFueSBjYWNoZSBlbnRyaWVzLCBiZWNhdXNlIGFsbCBhcmUgcGlubmVkLlxuICAgICAgLy8gU3RvcCBldmljdGluZyB1bnRpbCB0aGUgcGlubmVkIGxpc3QgY2hhbmdlcyBhZ2Fpbi4gVGhpcyBwcmV2ZW50c1xuICAgICAgLy8gZGVnZW5lcmF0aW5nIGludG8gYW4gTyhuXjIpIHNpdHVhdGlvbiB3aGVyZSBlYWNoIGZpbGUgbG9hZCBpdGVyYXRlc1xuICAgICAgLy8gdGhyb3VnaCB0aGUgbGlzdCBvZiBhbGwgZmlsZXMsIHRyeWluZyB0byBldmljdCBjYWNoZSBrZXlzIGluIHZhaW5cbiAgICAgIC8vIGJlY2F1c2UgYWxsIGFyZSBwaW5uZWQuXG4gICAgICB0aGlzLmNhbm5vdEV2aWN0ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGRyb3BwZWQ7XG4gIH1cblxuICBnZXRGaWxlQ2FjaGVLZXlzRm9yVGVzdCgpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmZpbGVDYWNoZS5rZXlzKCkpO1xuICB9XG59XG5cbi8qKlxuICogUHJvZ3JhbUFuZEZpbGVDYWNoZSBpcyBhIHRyaXZpYWwgTFJVIGNhY2hlIGZvciB0eXBlc2NyaXB0LXBhcnNlZCBwcm9ncmFtcyBhbmRcbiAqIGJhemVsLW91dHB1dCBmaWxlcy5cbiAqXG4gKiBQcm9ncmFtcyBhcmUgZXZpY3RlZCBiZWZvcmUgc291cmNlIGZpbGVzIGJlY2F1c2UgdGhleSBoYXZlIGxlc3MgcmV1c2UgYWNyb3NzXG4gKiBjb21waWxhdGlvbnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9ncmFtQW5kRmlsZUNhY2hlIGV4dGVuZHMgRmlsZUNhY2hlIHtcbiAgcHJpdmF0ZSBwcm9ncmFtQ2FjaGUgPSBuZXcgQ2FjaGU8dHMuUHJvZ3JhbT4oJ3Byb2dyYW0nLCB0aGlzLmRlYnVnKTtcblxuICBnZXRQcm9ncmFtKHRhcmdldDogc3RyaW5nKTogdHMuUHJvZ3JhbXx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByb2dyYW1DYWNoZS5nZXQodGFyZ2V0KTtcbiAgfVxuXG4gIHB1dFByb2dyYW0odGFyZ2V0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0pOiB2b2lkIHtcbiAgICBjb25zdCBkcm9wcGVkID0gdGhpcy5tYXliZUZyZWVNZW1vcnkoKTtcbiAgICB0aGlzLnByb2dyYW1DYWNoZS5zZXQodGFyZ2V0LCBwcm9ncmFtKTtcbiAgICB0aGlzLmRlYnVnKCdMb2FkZWQgcHJvZ3JhbTonLCB0YXJnZXQsICdkcm9wcGVkJywgZHJvcHBlZCwgJ2VudHJpZXMnKTtcbiAgfVxuXG4gIHJlc2V0U3RhdHMoKSB7XG4gICAgc3VwZXIucmVzZXRTdGF0cygpXG4gICAgdGhpcy5wcm9ncmFtQ2FjaGUucmVzZXRTdGF0cygpO1xuICB9XG5cbiAgcHJpbnRTdGF0cygpIHtcbiAgICBzdXBlci5wcmludFN0YXRzKCk7XG4gICAgdGhpcy5wcm9ncmFtQ2FjaGUucHJpbnRTdGF0cygpO1xuICB9XG5cbiAgdHJhY2VTdGF0cygpIHtcbiAgICBzdXBlci50cmFjZVN0YXRzKCk7XG4gICAgdGhpcy5wcm9ncmFtQ2FjaGUudHJhY2VTdGF0cygpO1xuICB9XG5cbiAgbWF5YmVGcmVlTWVtb3J5KCkge1xuICAgIGlmICghdGhpcy5zaG91bGRGcmVlTWVtb3J5KCkpIHJldHVybiAwO1xuXG4gICAgY29uc3QgZHJvcHBlZCA9IHRoaXMucHJvZ3JhbUNhY2hlLmV2aWN0KCk7XG4gICAgaWYgKGRyb3BwZWQgPiAwKSByZXR1cm4gZHJvcHBlZDtcblxuICAgIHJldHVybiBzdXBlci5tYXliZUZyZWVNZW1vcnkoKTtcbiAgfVxuXG4gIGdldFByb2dyYW1DYWNoZUtleXNGb3JUZXN0KCkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMucHJvZ3JhbUNhY2hlLmtleXMoKSk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBGaWxlTG9hZGVyIHtcbiAgbG9hZEZpbGUoZmlsZU5hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZywgbGFuZ1ZlcjogdHMuU2NyaXB0VGFyZ2V0KTpcbiAgICAgIHRzLlNvdXJjZUZpbGU7XG4gIGZpbGVFeGlzdHMoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW47XG59XG5cbi8qKlxuICogTG9hZCBhIHNvdXJjZSBmaWxlIGZyb20gZGlzaywgb3IgcG9zc2libHkgcmV0dXJuIGEgY2FjaGVkIHZlcnNpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBDYWNoZWRGaWxlTG9hZGVyIGltcGxlbWVudHMgRmlsZUxvYWRlciB7XG4gIC8qKiBUb3RhbCBhbW91bnQgb2YgdGltZSBzcGVudCBsb2FkaW5nIGZpbGVzLCBmb3IgdGhlIHBlcmYgdHJhY2UuICovXG4gIHByaXZhdGUgdG90YWxSZWFkVGltZU1zID0gMDtcblxuICAvLyBUT0RPKGFsZXhlYWdsZSk6IHJlbW92ZSB1bnVzZWQgcGFyYW0gYWZ0ZXIgdXNhZ2VzIHVwZGF0ZWQ6XG4gIC8vIGFuZ3VsYXI6cGFja2FnZXMvYmF6ZWwvc3JjL25nYy13cmFwcGVkL2luZGV4LnRzXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY2FjaGU6IEZpbGVDYWNoZSwgdW51c2VkPzogYm9vbGVhbikge31cblxuICBmaWxlRXhpc3RzKGZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5jYWNoZS5pc0tub3duSW5wdXQoZmlsZVBhdGgpO1xuICB9XG5cbiAgbG9hZEZpbGUoZmlsZU5hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZywgbGFuZ1ZlcjogdHMuU2NyaXB0VGFyZ2V0KTpcbiAgICAgIHRzLlNvdXJjZUZpbGUge1xuICAgIGxldCBzb3VyY2VGaWxlID0gdGhpcy5jYWNoZS5nZXRDYWNoZShmaWxlUGF0aCk7XG4gICAgaWYgKCFzb3VyY2VGaWxlKSB7XG4gICAgICBjb25zdCByZWFkU3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgY29uc3Qgc291cmNlVGV4dCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgIHNvdXJjZUZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGVOYW1lLCBzb3VyY2VUZXh0LCBsYW5nVmVyLCB0cnVlKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0ge1xuICAgICAgICBkaWdlc3Q6IHRoaXMuY2FjaGUuZ2V0TGFzdERpZ2VzdChmaWxlUGF0aCksXG4gICAgICAgIHZhbHVlOiBzb3VyY2VGaWxlXG4gICAgICB9O1xuICAgICAgY29uc3QgcmVhZEVuZCA9IERhdGUubm93KCk7XG4gICAgICB0aGlzLmNhY2hlLnB1dENhY2hlKGZpbGVQYXRoLCBlbnRyeSk7XG5cbiAgICAgIHRoaXMudG90YWxSZWFkVGltZU1zICs9IHJlYWRFbmQgLSByZWFkU3RhcnQ7XG4gICAgICBwZXJmVHJhY2UuY291bnRlcignZmlsZSBsb2FkIHRpbWUnLCB7XG4gICAgICAgICdyZWFkJzogdGhpcy50b3RhbFJlYWRUaW1lTXMsXG4gICAgICB9KTtcbiAgICAgIHBlcmZUcmFjZS5zbmFwc2hvdE1lbW9yeVVzYWdlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNvdXJjZUZpbGU7XG4gIH1cbn1cblxuLyoqIExvYWQgYSBzb3VyY2UgZmlsZSBmcm9tIGRpc2suICovXG5leHBvcnQgY2xhc3MgVW5jYWNoZWRGaWxlTG9hZGVyIGltcGxlbWVudHMgRmlsZUxvYWRlciB7XG4gIGZpbGVFeGlzdHMoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cy5zeXMuZmlsZUV4aXN0cyhmaWxlUGF0aCk7XG4gIH1cblxuICBsb2FkRmlsZShmaWxlTmFtZTogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nLCBsYW5nVmVyOiB0cy5TY3JpcHRUYXJnZXQpOlxuICAgICAgdHMuU291cmNlRmlsZSB7XG4gICAgY29uc3Qgc291cmNlVGV4dCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICByZXR1cm4gdHMuY3JlYXRlU291cmNlRmlsZShmaWxlTmFtZSwgc291cmNlVGV4dCwgbGFuZ1ZlciwgdHJ1ZSk7XG4gIH1cbn1cbiJdfQ==