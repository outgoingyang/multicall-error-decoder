import { Interface, type TransactionResponse, type JsonFragment } from 'ethers';
import type { AbiLike } from './types.js';

/**
 * Normalize an ABI-like value into ethers-compatible fragments.
 *
 * A bare human-readable string must be passed to `new Interface` as an array
 * (a bare string is interpreted as JSON); JSON-encoded ABI strings are parsed.
 */
export function normalizeAbi(abi: string | readonly (string | Record<string, unknown>)[]): any[] {
  if (typeof abi === 'string') {
    const trimmed = abi.trim();
    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    return abi.includes('\n') ? abi.split('\n') : [abi];
  }
  return [...abi];
}

/** Convert a JSON ABI / human-readable ABI / fragments into an ethers Interface. */
export function toInterface(abi: AbiLike): Interface {
  if (abi instanceof Interface) return abi;
  return new Interface(normalizeAbi(abi as any));
}

/** Merge several ABIs (or Interfaces) into a single Interface (for custom error decoding). */
export function mergeAbis(abis: readonly AbiLike[]): Interface {
  const fragments: any[] = [];
  for (const abi of abis) {
    if (abi instanceof Interface) {
      fragments.push(...abi.fragments);
    } else {
      fragments.push(...normalizeAbi(abi as any));
    }
  }
  return new Interface(fragments);
}

/**
 * Extract raw revert data (`0x...`) from an arbitrary thrown error.
 * Handles:
 *  - ethers CALL_EXCEPTION errors (`error.data`, `error.info.data`, `error.error.data`)
 *  - viem `ContractFunctionRevertedError` (`rawData`, `data`)
 *  - nested `cause` chains
 */
export function extractRevertData(error: unknown): string | undefined {
  if (!error) return undefined;
  let cur: any = error;
  let depth = 0;
  while (cur && depth < 10) {
    const candidates = [
      cur.data,
      cur.error?.data,
      cur.info?.error?.data,
      cur.info?.data,
      cur.rawData,
      cur.cause?.rawData,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.startsWith('0x') && c !== '0x') return c;
      if (
        c &&
        typeof c === 'object' &&
        typeof (c as any).data === 'string' &&
        (c as any).data.startsWith('0x') &&
        (c as any).data !== '0x'
      ) {
        return (c as any).data;
      }
    }
    cur = cur.cause ?? cur.error ?? undefined;
    depth++;
  }
  return undefined;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Reject with a timeout error if the promise does not settle within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** Resolve after `delay` ms (optionally with a value). */
export function wait<T = undefined>(delay: number, returnValue?: T): Promise<T | undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(returnValue), delay));
}

/** First settled-resolved value among `promises`, checked synchronously (never rethrows). */
export function checkAnyResolved(promises: Promise<any>[]): Promise<any | null> {
  return Promise.race([
    ...promises.map((p) =>
      p.then(
        (value) => ({ resolved: true, value }),
        () => ({ resolved: false })
      )
    ),
    new Promise((resolve) => setTimeout(() => resolve({ resolved: false }), 0)),
  ]).then((result: any) => (result.resolved ? result.value : null));
}

/** Rejection reasons of already-settled promises; null while any may still resolve. */
export function checkAllRejected(promises: Promise<any>[]): Promise<any[] | null> {
  return Promise.all(
    promises.map((p) =>
      Promise.race([
        p.then(
          () => null,
          (reason) => reason
        ),
        new Promise((resolve) => setTimeout(() => resolve(null), 0)),
      ])
    )
  ).then((results) => {
    const rejected = results.filter((value) => value !== null);
    return rejected.length > 0 ? rejected : null;
  });
}

/** Build an ethers `call` request from a mined/sent transaction (for revert replay). */
export function callRequestFromTx(tx: TransactionResponse) {
  return {
    from: tx.from,
    to: tx.to,
    data: tx.data,
    value: tx.value,
    gasLimit: tx.gasLimit,
    gasPrice: tx.gasPrice ?? undefined,
    maxFeePerGas: tx.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? undefined,
    accessList: tx.accessList ?? undefined,
    type: tx.type ?? undefined,
  };
}

export function isPlainHex(value: unknown): value is string {
  return typeof value === 'string' && /^0x[0-9a-fA-F]*$/.test(value);
}

/** Build a viem `call` request from a viem transaction object (for revert replay). */
export function callRequestFromViem(tx: {
  to?: `0x${string}` | null;
  data?: `0x${string}` | null;
  value?: bigint | null;
  gas?: bigint | null;
  gasPrice?: bigint | null;
  maxFeePerGas?: bigint | null;
  maxPriorityFeePerGas?: bigint | null;
}) {
  return {
    to: tx.to ?? undefined,
    data: tx.data ?? undefined,
    value: tx.value ?? undefined,
    gas: tx.gas ?? undefined,
  };
}
