import { type PublicClient } from 'viem';
import type { CallInput } from '../types.js';
import { type MulticallResponse } from './ethers.js';
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
export declare function multicallViem(opts: MulticallViemOptions): Promise<MulticallResponse>;
