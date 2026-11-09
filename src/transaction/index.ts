import type { PublicClient } from 'viem';
import type { Provider } from 'ethers';
import {
  waitForTransaction as waitForTransactionEth,
  sendAndConfirm,
  getRevertReason,
  decodeReceiptLogs,
} from './ethers.js';
import {
  waitForTransactionViem,
  sendAndConfirmViem,
  decodeViemReceiptLogs,
} from './viem.js';
import {
  TransactionRevertedError,
  TransactionTimeoutError,
  type DecodedLog,
  type ReplacedInfo,
  type WaitForTransactionOptions,
  type WaitForTransactionResult,
} from './types.js';

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
export async function waitForTransaction(opts: UnifiedWaitOptions): Promise<WaitForTransactionResult> {
  if (opts.client) {
    return waitForTransactionViem({
      client: opts.client,
      hash: opts.hash,
      confirmations: opts.confirmations,
      timeout: opts.timeout,
      abis: opts.abis,
      onReplaced: opts.onReplaced,
      throwOnRevert: opts.throwOnRevert,
    });
  }
  if (opts.provider) {
    return waitForTransactionEth({
      provider: opts.provider,
      hash: opts.hash,
      confirmations: opts.confirmations,
      timeout: opts.timeout,
      abis: opts.abis,
      onReplaced: opts.onReplaced,
      throwOnRevert: opts.throwOnRevert,
    });
  }
  throw new Error('waitForTransaction: provide either `provider` (ethers) or `client` (viem)');
}

export {
  waitForTransactionEth,
  waitForTransactionViem,
  sendAndConfirm,
  sendAndConfirmViem,
  getRevertReason,
  decodeReceiptLogs,
  decodeViemReceiptLogs,
  TransactionRevertedError,
  TransactionTimeoutError,
};
export type { WaitForTransactionOptions, WaitForTransactionResult, DecodedLog, ReplacedInfo };
