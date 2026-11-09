import { Interface, type TransactionResponse } from 'ethers';
import type { AbiLike } from './types.js';
/**
 * Normalize an ABI-like value into ethers-compatible fragments.
 *
 * A bare human-readable string must be passed to `new Interface` as an array
 * (a bare string is interpreted as JSON); JSON-encoded ABI strings are parsed.
 */
export declare function normalizeAbi(abi: string | readonly (string | Record<string, unknown>)[]): any[];
/** Convert a JSON ABI / human-readable ABI / fragments into an ethers Interface. */
export declare function toInterface(abi: AbiLike): Interface;
/** Merge several ABIs (or Interfaces) into a single Interface (for custom error decoding). */
export declare function mergeAbis(abis: readonly AbiLike[]): Interface;
/**
 * Extract raw revert data (`0x...`) from an arbitrary thrown error.
 * Handles:
 *  - ethers CALL_EXCEPTION errors (`error.data`, `error.info.data`, `error.error.data`)
 *  - viem `ContractFunctionRevertedError` (`rawData`, `data`)
 *  - nested `cause` chains
 */
export declare function extractRevertData(error: unknown): string | undefined;
export declare function getErrorMessage(error: unknown): string;
/** Reject with a timeout error if the promise does not settle within `ms`. */
export declare function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>;
/** Resolve after `delay` ms (optionally with a value). */
export declare function wait<T = undefined>(delay: number, returnValue?: T): Promise<T | undefined>;
/** First settled-resolved value among `promises`, checked synchronously (never rethrows). */
export declare function checkAnyResolved(promises: Promise<any>[]): Promise<any | null>;
/** Rejection reasons of already-settled promises; null while any may still resolve. */
export declare function checkAllRejected(promises: Promise<any>[]): Promise<any[] | null>;
/** Build an ethers `call` request from a mined/sent transaction (for revert replay). */
export declare function callRequestFromTx(tx: TransactionResponse): {
    from: string;
    to: string | null;
    data: string;
    value: bigint;
    gasLimit: bigint;
    gasPrice: bigint;
    maxFeePerGas: bigint | undefined;
    maxPriorityFeePerGas: bigint | undefined;
    accessList: import("ethers").AccessList | undefined;
    type: number;
};
export declare function isPlainHex(value: unknown): value is string;
/** Build a viem `call` request from a viem transaction object (for revert replay). */
export declare function callRequestFromViem(tx: {
    to?: `0x${string}` | null;
    data?: `0x${string}` | null;
    value?: bigint | null;
    gas?: bigint | null;
    gasPrice?: bigint | null;
    maxFeePerGas?: bigint | null;
    maxPriorityFeePerGas?: bigint | null;
}): {
    to: `0x${string}` | undefined;
    data: `0x${string}` | undefined;
    value: bigint | undefined;
    gas: bigint | undefined;
};
