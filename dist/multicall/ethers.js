import { AbiCoder, Interface } from 'ethers';
import { toInterface } from '../utils.js';
import { decodeRevertData } from '../error-decoder/index.js';
import { multicall3Address } from './abi.js';
const AGGREGATE3 = new Interface([
    'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
]);
/** Encode + prepare one call for multicall execution. Shared by ethers/viem backends. */
export function prepareCall(call, batchAllowFailure) {
    if (call.data == null && !(call.abi != null && call.method != null)) {
        throw new Error(`Call to ${call.target}: provide either "data" or "abi"+"method"`);
    }
    let data = call.data;
    let iface;
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
export function decodeCallResult(call, success, returnData) {
    if (success) {
        if (!call.iface || !call.method) {
            return { success: true, returnData, decoded: undefined };
        }
        try {
            const decoded = call.iface.decodeFunctionResult(call.method, returnData).toArray();
            return { success: true, returnData, decoded };
        }
        catch {
            // e.g. call to an EOA: success with empty (0x) data
            return { success: true, returnData, decoded: undefined };
        }
    }
    const error = decodeRevertData(returnData, call.abi ? [call.abi] : undefined);
    return { success: false, returnData, error };
}
/** Multicall for ethers v6 providers via the Multicall3 `aggregate3` entry point. */
export async function multicallEth(opts) {
    const { provider, calls, allowFailure = true, blockTag, address } = opts;
    if (calls.length === 0) {
        return { blockNumber: BigInt(await provider.getBlockNumber()), results: [] };
    }
    const prepared = calls.map((c) => prepareCall(c, allowFailure));
    const data = AGGREGATE3.encodeFunctionData('aggregate3', [
        prepared.map((c) => ({
            target: c.target,
            allowFailure: c.allowFailure,
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
    const items = decoded[0].toArray();
    const results = prepared.map((call, i) => {
        const [success, returnData] = items[i];
        return { ...decodeCallResult(call, success, returnData) };
    });
    const blockNumber = typeof blockTag === 'number' || typeof blockTag === 'bigint'
        ? BigInt(blockTag)
        : BigInt(await provider.getBlockNumber());
    return { blockNumber, results };
}
//# sourceMappingURL=ethers.js.map