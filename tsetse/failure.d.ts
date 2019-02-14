import * as ts from 'typescript';
/**
 * A Tsetse check Failure is almost identical to a Diagnostic from TypeScript
 * except that:
 * (1) The error code is defined by each individual Tsetse rule.
 * (2) The optional `source` property is set to `Tsetse` so the host (VS Code
 * for instance) would use that to indicate where the error comes from.
 */
export declare class Failure {
    private sourceFile;
    private start;
    private end;
    private failureText;
    private code;
    constructor(sourceFile: ts.SourceFile, start: number, end: number, failureText: string, code: number);
    toDiagnostic(): ts.Diagnostic;
}
