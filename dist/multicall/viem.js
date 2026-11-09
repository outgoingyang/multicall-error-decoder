import { parseAbi } from 'viem';
import { decodeCallResult, prepareCall } from './ethers.js';
import { multicall3Address } from './abi.js';
const AGGREGATE3 = parseAbi([
    'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
]);
/** Multicall for viem clients via the Multicall3 `aggregate3` entry point. */
export async function multicallViem(opts) {
    const { client, calls, allowFailure = true, blockNumber, address } = opts;
    if (calls.length === 0) {
        return { blockNumber: await client.getBlockNumber(), results: [] };
    }
    const prepared = calls.map((c) => prepareCall(c, allowFailure));
    const callsArg = prepared.map((c) => ({
        target: c.target,
        allowFailure: c.allowFailure,
        callData: c.data,
    }));
    const items = (await client.readContract({
        address: (address ?? multicall3Address()),
        abi: AGGREGATE3,
        functionName: 'aggregate3',
        args: [callsArg],
        blockNumber,
    }));
    const results = prepared.map((call, i) => {
        const item = items[i];
        return { ...decodeCallResult(call, item.success, item.returnData) };
    });
    return { blockNumber: blockNumber ?? (await client.getBlockNumber()), results };
}
//# sourceMappingURL=viem.js.map