import type { PublicClient } from 'viem';
import type { AbiLike } from '../types.js';
import type { DecodedError } from './types.js';
/**
 * Decode a viem-thrown error (e.g. from `simulateContract`, `readContract`,
 * `call`, `waitForTransactionReceipt`).
 *
 * Unwraps `cause` chains (`CallExecutionError` -> `ContractFunctionRevertedError`),
 * extracts revert data and decodes it with the provided ABIs. Errors without
 * revert data are classified by message (user rejection / plain revert / RPC).
 */
export declare function decodeViemError(error: unknown, opts?: {
    abis?: ReadonlyArray<AbiLike>;
}): DecodedError;
/**
 * Recover the revert reason of a mined reverted transaction for viem clients
 * by replaying it via `publicClient.call`.
 */
export declare function getRevertReasonViem(client: PublicClient, txHash: `0x${string}`, abis?: ReadonlyArray<AbiLike>): Promise<DecodedError>;
