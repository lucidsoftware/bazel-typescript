import * as ts from 'typescript';
import { BazelOptions } from './tsconfig';
/**
 * Top-level entry point for tsc_wrapped.
 */
export declare function main(args: string[]): 1 | 0;
/**
 * Gather diagnostics from TypeScript's type-checker as well as other plugins we
 * install such as strict dependency checking.
 */
export declare function gatherDiagnostics(options: ts.CompilerOptions, bazelOpts: BazelOptions, program: ts.Program, disabledTsetseRules: string[]): ts.Diagnostic[];
