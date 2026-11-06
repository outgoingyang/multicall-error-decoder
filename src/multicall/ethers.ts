import { AbiCoder, Interface, type BlockTag, type Provider } from 'ethers';
import type { AbiLike, CallInput } from '../types.js';
import { toInterface } from '../utils.js';
import { decodeRevertData } from '../error-decoder/index.js';
import { multicall3Address } from './abi.js';

const AGGREGATE3 = new Interface([
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
]);

export interface PreparedCall {
  target: string;
  data: string;
  iface?: Interface;
  method?: string;
  abi?: AbiLike;
  allowFailure?: boolean;
}

/** Encode + prepare one call for multicall execution. Shared by ethers/viem backends. */
export function prepareCall(call: CallInput, batchAllowFailure: boolean): PreparedCall {
  if (call.data == null && !(call.abi != null && call.method != null)) {
    throw new Error(`Call to ${call.target}: provide either "data" or "abi"+"method"`);
  }
  let data = call.data!;
  let iface: Interface | undefined;
  if (call.abi != null && call.method != null) {
    iface = toInterface(call.abi);
    data = iface.encodeFunctionData(call.method, call.args ?? []);
  }
  return {
    target: call.target,
    data,
    iface,
    method: call.method,
    abi: call.abi,
    allowFailure: call.allowFailure ?? batchAllowFailure,
  };
}

/** Decode a per-call return/revert data item. */
export function decodeCallResult(call: PreparedCall, success: boolean, returnData: string) {
  if (success) {
    if (!call.iface || !call.method) {
      return { success: true, returnData, decoded: undefined };
    }
    try {
      const decoded = call.iface.decodeFunctionResult(call.method, returnData).toArray();
      return { success: true, returnData, decoded };
    } catch {
      // e.g. call to an EOA: success with empty (0x) data
      return { success: true, returnData, decoded: undefined };
    }
  }
  const error = decodeRevertData(returnData, call.abi ? [call.abi] : undefined);
  return { success: false, returnData, error };
}

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
export async function multicallEth(opts: MulticallOptions): Promise<MulticallResponse> {
  const { provider, calls, allowFailure = true, blockTag, address } = opts;
  if (calls.length === 0) {
    return { blockNumber: BigInt(await provider.getBlockNumber()), results: [] };
  }

  const prepared = calls.map((c) => prepareCall(c, allowFailure));
  const data = AGGREGATE3.encodeFunctionData('aggregate3', [
    prepared.map((c) => ({
      target: c.target,
      allowFailure: c.allowFailure!,
      callData: c.data,
    })),
  ]);

  const resultData = await provider.call({
    to: address ?? multicall3Address(),
    data,
    ...(blockTag != null ? { blockTag } : {}),
  });

  // aggregate3's wire format is canonical; tryBlockAndAggregate (3 outputs)
  // is not reliably decoded by generic ABI decoders.
  const decoded = AbiCoder.defaultAbiCoder().decode(['tuple(bool,bytes)[]'], resultData);
  const items = decoded[0].toArray() as Array<[boolean, string]>;

  const results = prepared.map((call, i) => {
    const [success, returnData] = items[i];
    return { ...decodeCallResult(call, success, returnData) } as MulticallResultItem;
  });

  const blockNumber =
    typeof blockTag === 'number' || typeof blockTag === 'bigint'
      ? BigInt(blockTag)
      : BigInt(await provider.getBlockNumber());

  return { blockNumber, results };
}
