import type { Interface } from 'ethers';
/** Anything that ethers `new Interface(...)` accepts: JSON ABI array, human-readable ABI (string or array), or an Interface. */
export type AbiLike = Interface | string | readonly (string | Record<string, unknown>)[];
/** A single call item accepted by multicall helpers. */
export interface CallInput {
    /** Contract address. */
    target: string;
    /** Raw calldata. If omitted, `abi` + `method` (+ `args`) are required. */
    data?: string;
    /** Contract ABI used to encode/decode. */
    abi?: AbiLike;
    /** Function name to call. */
    method?: string;
    /** Function arguments. */
    args?: readonly unknown[];
    /** Per-call override: whether failures are allowed (defaults to batch-level `allowFailure`). */
    allowFailure?: boolean;
}
