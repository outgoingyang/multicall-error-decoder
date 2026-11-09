export declare const ERROR_STRING_PREFIX = "0x08c379a0";
export declare const PANIC_CODE_PREFIX = "0x4e487b71";
/** Standard panic (assert) codes from Solidity. */
export declare const panicCodes: Record<number, string>;
export declare function panicErrorCodeToReason(code: bigint): string | null;
