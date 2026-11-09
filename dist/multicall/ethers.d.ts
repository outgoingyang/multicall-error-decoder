import { Interface, type BlockTag, type Provider } from 'ethers';
import type { AbiLike, CallInput } from '../types.js';
export interface PreparedCall {
    target: string;
    data: string;
    iface?: Interface;
    method?: string;
    abi?: AbiLike;
    allowFailure?: boolean;
}
/** Encode + prepare one call for multicall execution. Shared by ethers/viem backends. */
export declare function prepareCall(call: CallInput, batchAllowFailure: boolean): PreparedCall;
/** Decode a per-call return/revert data item. */
export declare function decodeCallResult(call: PreparedCall, success: boolean, returnData: string): {
    success: boolean;
    returnData: string;
    decoded: undefined;
    error?: undefined;
} | {
    success: boolean;
    returnData: string;
    decoded: any[];
    error?: undefined;
} | {
    success: boolean;
    returnData: string;
    error: import("../error-decoder/types.js").DecodedError;
    decoded?: undefined;
};
export interface MulticallOptions {
    provider: Provider;
    calls: ReadonlyArray<CallInput>;
    /** If true (default), individual call failures are returned instead of rejecting the whole batch. */
    allowFailure?: boolean;
    blockTag?: BlockTag;
    /** Custom Multicall3 deployment address (defaults to canonical `0xcA11...CA11`). */
    address?: string;
}
export interface MulticallResultItem {
    success: boolean;
    returnData: string | null;
    decoded?: unknown;
    error?: unknown;
}
export interface MulticallResponse {
    blockNumber: bigint;
    results: MulticallResultItem[];
}
/** Multicall for ethers v6 providers via the Multicall3 `aggregate3` entry point. */
export declare function multicallEth(opts: MulticallOptions): Promise<MulticallResponse>;
