import type { PublicClient, WalletClient, TransactionReceipt as ViemReceipt } from 'viem';
import type { AbiLike } from '../types.js';
import type { DecodedError } from '../error-decoder/types.js';
import { TransactionTimeoutError, type DecodedLog, type WaitForTransactionOptions, type WaitForTransactionResult } from './types.js';
/**
 * Wait for a transaction with timeout, confirmations, replacement callback,
 * decoded logs, and automatic revert decoding.
 */
export declare function waitForTransactionViem(opts: WaitForTransactionOptions & {
    client: PublicClient;
}): Promise<WaitForTransactionResult>;
/** Send a transaction via a wallet client, then wait with full decode/timeout handling. */
export declare function sendAndConfirmViem(wallet: WalletClient, request: any, opts?: {
    publicClient?: PublicClient;
    confirmations?: number;
    timeout?: number;
    abis?: Record<string, AbiLike>;
    throwOnRevert?: boolean;
}): Promise<WaitForTransactionResult & {
    hash: string;
}>;
/**
 * Recover + decode the revert reason of a mined reverted transaction for viem
 * by replaying it via `publicClient.call`.
 */
export declare function getRevertReasonViem(client: PublicClient, txHash: string, abis?: ReadonlyArray<AbiLike>): Promise<DecodedError>;
/** Decode logs of a viem receipt using the provided ABI map (parsed with ethers Interface). */
export declare function decodeViemReceiptLogs(receipt: ViemReceipt, abis?: Record<string, AbiLike>): DecodedLog[];
export { TransactionTimeoutError };
