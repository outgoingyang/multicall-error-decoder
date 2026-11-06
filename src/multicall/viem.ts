import { parseAbi, type PublicClient, type Hex } from 'viem';
import type { CallInput } from '../types.js';
import { decodeCallResult, prepareCall, type MulticallResponse, type MulticallResultItem } from './ethers.js';
import { multicall3Address } from './abi.js';

const AGGREGATE3 = parseAbi([
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
]);

export interface MulticallViemOptions {
  client: PublicClient;
  calls: ReadonlyArray<CallInput>;
  /** If true (default), individual call failures are returned instead of rejecting the whole batch. */
  allowFailure?: boolean;
  blockNumber?: bigint;
  /** Custom Multicall3 deployment address (defaults to canonical `0xcA11...CA11`). */
  address?: string;
}

/** Multicall for viem clients via the Multicall3 `aggregate3` entry point. */
export async function multicallViem(opts: MulticallViemOptions): Promise<MulticallResponse> {
  const { client, calls, allowFailure = true, blockNumber, address } = opts;
  if (calls.length === 0) {
    return { blockNumber: await client.getBlockNumber(), results: [] };
  }

  const prepared = calls.map((c) => prepareCall(c, allowFailure));
  const callsArg = prepared.map((c) => ({
    target: c.target as Hex,
    allowFailure: c.allowFailure!,
    callData: c.data as Hex,
  }));

  const items = (await client.readContract({
    address: (address ?? multicall3Address()) as Hex,
    abi: AGGREGATE3,
    functionName: 'aggregate3',
    args: [callsArg],
    blockNumber,
  })) as unknown as Array<{ success: boolean; returnData: string }>;

  const results: MulticallResultItem[] = prepared.map((call, i) => {
    const item = items[i];
    return { ...decodeCallResult(call, item.success, item.returnData) } as MulticallResultItem;
  });

  return { blockNumber: blockNumber ?? (await client.getBlockNumber()), results };
}
