import { type Provider, type Signer, type TransactionReceipt, type TransactionRequest, type TransactionResponse } from 'ethers';
import type { AbiLike } from '../types.js';
import type { DecodedError } from '../error-decoder/types.js';
import { type DecodedLog, type WaitForTransactionOptions, type WaitForTransactionResult } from './types.js';
/**
 * Wait for a transaction with timeout, confirmation count, replacement
 * notification, decoded logs, and automatic revert decoding.
 */
export declare function waitForTransaction(opts: WaitForTransactionOptions & {
    provider: Provider;
}): Promise<WaitForTransactionResult>;
/** Send a transaction via a signer, then wait with full decode/timeout handling. */
export declare function sendAndConfirm(signer: Signer, tx: TransactionRequest, opts?: {
    confirmations?: number;
    timeout?: number;
    abis?: Record<string, AbiLike>;
    throwOnRevert?: boolean;
}): Promise<WaitForTransactionResult & {
    response: TransactionResponse;
}>;
/**
 * Recover + decode the revert reason of a (possibly mined) reverted transaction
 * by replaying it via `eth_call`.
 */
export declare function getRevertReason(provider: Provider, txHash: string, abis?: ReadonlyArray<AbiLike>): Promise<DecodedError>;
/** Decode logs of a receipt using the provided ABI map. */
export declare function decodeReceiptLogs(receipt: TransactionReceipt, abis?: Record<string, AbiLike>): DecodedLog[];
