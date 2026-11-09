import type { ErrorFragment, Result } from 'ethers';
import type { DecodedError } from './types.js';
type ErrorResultFormatterParam = {
    data?: string | null;
    reason?: string | null;
    args?: Result | null;
    fragment?: ErrorFragment | null;
    selector?: string | null;
    name?: string | null;
    signature?: string | null;
};
export declare const emptyErrorResult: (p: ErrorResultFormatterParam) => DecodedError;
export declare const userRejectErrorResult: (p: ErrorResultFormatterParam) => DecodedError;
export declare const revertErrorResult: (p: ErrorResultFormatterParam) => DecodedError;
export declare const unknownErrorResult: (p: ErrorResultFormatterParam) => DecodedError;
export declare const panicErrorResult: (p: ErrorResultFormatterParam) => DecodedError;
export declare const customErrorResult: (p: ErrorResultFormatterParam) => DecodedError;
export declare const rpcErrorResult: (p: ErrorResultFormatterParam) => DecodedError;
export {};
