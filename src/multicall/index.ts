import type { Provider } from 'ethers';
import type { PublicClient as ViemPublicClient } from 'viem';
import {
  multicallEth,
  prepareCall,
  decodeCallResult,
  type MulticallOptions,
  type MulticallResponse,
  type MulticallResultItem,
} from './ethers.js';
import { multicallViem, type MulticallViemOptions } from './viem.js';
import { MULTICALL3_ABI, MULTICALL3_CANONICAL, multicall3Address } from './abi.js';

export interface MulticallUnifiedOptions {
  /** ethers v6 provider. */
  provider?: Provider;
  /** viem public client. Takes precedence if both are given. */
  client?: ViemPublicClient;
  calls: ReadonlyArray<import('../types.js').CallInput>;
  allowFailure?: boolean;
  blockTag?: import('ethers').BlockTag;
  blockNumber?: bigint;
  address?: string;
}

export function isViemClient(x: unknown): x is ViemPublicClient {
  return (
    typeof x === 'object' &&
    x !== null &&
    'readContract' in x &&
    'getTransactionReceipt' in x
  );
}

/** Unified multicall entry point: works with an ethers provider or a viem client. */
export async function multicall(
  opts: MulticallUnifiedOptions
): Promise<MulticallResponse> {
  if (opts.client) {
    return multicallViem({
      client: opts.client,
      calls: opts.calls,
      allowFailure: opts.allowFailure,
      blockNumber: opts.blockNumber,
      address: opts.address,
    });
  }
  if (opts.provider) {
    return multicallEth({
      provider: opts.provider,
      calls: opts.calls,
      allowFailure: opts.allowFailure,
      blockTag: opts.blockTag,
      address: opts.address,
    });
  }
  throw new Error('multicall: provide either `provider` (ethers) or `client` (viem)');
}

export {
  multicallEth,
  multicallViem,
  multicall3Address,
  MULTICALL3_ABI,
  MULTICALL3_CANONICAL,
  prepareCall,
  decodeCallResult,
};
export type { MulticallOptions, MulticallResponse, MulticallResultItem, MulticallViemOptions };
