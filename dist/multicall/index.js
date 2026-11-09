import { multicallEth, prepareCall, decodeCallResult, } from './ethers.js';
import { multicallViem } from './viem.js';
import { MULTICALL3_ABI, MULTICALL3_CANONICAL, multicall3Address } from './abi.js';
export function isViemClient(x) {
    return (typeof x === 'object' &&
        x !== null &&
        'readContract' in x &&
        'getTransactionReceipt' in x);
}
/** Unified multicall entry point: works with an ethers provider or a viem client. */
export async function multicall(opts) {
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
export { multicallEth, multicallViem, multicall3Address, MULTICALL3_ABI, MULTICALL3_CANONICAL, prepareCall, decodeCallResult, };
//# sourceMappingURL=index.js.map