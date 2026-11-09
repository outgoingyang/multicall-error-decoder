import type { PublicClient } from 'viem';
import type { Provider } from 'ethers';
import { waitForTransaction as waitForTransactionEth, sendAndConfirm, getRevertReason, decodeReceiptLogs } from './ethers.js';
import { waitForTransactionViem, sendAndConfirmViem, decodeViemReceiptLogs } from './viem.js';
import { TransactionRevertedError, TransactionTimeoutError, type DecodedLog, type ReplacedInfo, type WaitForTransactionOptions, type WaitForTransactionResult } from './types.js';
export interface UnifiedWaitOptions {
    /** ethers v6 provider. */
    provider?: Provider;
    /** viem public client. Takes precedence if both are given. */
    client?: PublicClient;
    hash: string;
    confirmations?: number;
    timeout?: number;
    abis?: Record<string, any>;
    onReplaced?: (info: any) => void;
    throwOnRevert?: boolean;
}
/** Unified waitForTransaction: works with an ethers provider or a viem client. */
export declare function waitForTransaction(opts: UnifiedWaitOptions): Promise<WaitForTransactionResult>;
export { waitForTransactionEth, waitForTransactionViem, sendAndConfirm, sendAndConfirmViem, getRevertReason, decodeReceiptLogs, decodeViemReceiptLogs, TransactionRevertedError, TransactionTimeoutError, };
export type { WaitForTransactionOptions, WaitForTransactionResult, DecodedLog, ReplacedInfo };
