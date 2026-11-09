import type { Provider } from 'ethers';
import type { PublicClient as ViemPublicClient } from 'viem';
import { multicallEth, prepareCall, decodeCallResult, type MulticallOptions, type MulticallResponse, type MulticallResultItem } from './ethers.js';
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
export declare function isViemClient(x: unknown): x is ViemPublicClient;
/** Unified multicall entry point: works with an ethers provider or a viem client. */
export declare function multicall(opts: MulticallUnifiedOptions): Promise<MulticallResponse>;
export { multicallEth, multicallViem, multicall3Address, MULTICALL3_ABI, MULTICALL3_CANONICAL, prepareCall, decodeCallResult, };
export type { MulticallOptions, MulticallResponse, MulticallResultItem, MulticallViemOptions };
