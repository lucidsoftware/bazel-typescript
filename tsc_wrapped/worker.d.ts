export declare const DEBUG = false;
export declare function debug(...args: Array<{}>): void;
/**
 * Write a message to stderr, which appears in the bazel log and is visible to
 * the end user.
 */
export declare function log(...args: Array<{}>): void;
export declare function runAsWorker(args: string[]): boolean;
export declare function runWorkerLoop(runOneBuild: (args: string[], inputs?: {
    [path: string]: string;
}) => boolean): void;
