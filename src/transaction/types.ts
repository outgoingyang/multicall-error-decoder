import type { TransactionReceipt } from 'ethers';
import type { AbiLike } from '../types.js';
import type { DecodedError } from '../error-decoder/types.js';

/** A log decoded against the user-provided ABI map. */
export interface DecodedLog {
  /** Raw log object (ethers or viem shaped). */
  log: any;
  /** Event name, if matched. */
  name: string | null;
  /** Parsed event arguments. */
  args?: unknown[];
}

export interface ReplacedInfo {
  reason: 'repriced' | 'replaced' | 'cancelled';
  replacement?: unknown | null;
  receipt?: unknown | null;
}

export class TransactionRevertedError extends Error {
  readonly receipt: unknown;
  readonly decoded: DecodedError;
  readonly hash: string;

  constructor(receipt: unknown, decoded: DecodedError, hash: string) {
    super(`Transaction reverted: ${decoded.reason ?? 'unknown reason'}`);
    this.name = 'TransactionRevertedError';
    this.receipt = receipt;
    this.decoded = decoded;
    this.hash = hash;
  }
}

export class TransactionTimeoutError extends Error {
  readonly hash: string;
  constructor(hash: string, timeoutMs: number) {
    super(`Timed out waiting for transaction ${hash} after ${timeoutMs}ms`);
    this.name = 'TransactionTimeoutError';
    this.hash = hash;
  }
}

export interface WaitForTransactionOptions {
  hash: string;
  /** Confirmations to wait for. Default: 1. */
  confirmations?: number;
  /** Timeout in ms. Default: 120_000. */
  timeout?: number;
  /** Map of contract address (lowercased) -> ABI, used to decode logs and custom errors. */
  abis?: Record<string, AbiLike>;
  /** Called when the tx is replaced / repriced / cancelled. */
  onReplaced?: (info: ReplacedInfo) => void;
  /** Throw `TransactionRevertedError` when the tx reverts. Default: true. */
  throwOnRevert?: boolean;
}

export interface WaitForTransactionResult {
  receipt: TransactionReceipt | unknown;
  logs: DecodedLog[];
  /** Present when throwOnRevert=false and the tx reverted. */
  decodedError?: DecodedError;
}
