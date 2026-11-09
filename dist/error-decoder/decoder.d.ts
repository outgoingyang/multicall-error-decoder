import { TransactionReceipt, TransactionResponse } from 'ethers';
import type { AbiLike } from '../types.js';
import type { DecodedError, ErrorHandler } from './types.js';
/**
 * Decodes contract errors:
 *  - `Error(string)` revert reasons
 *  - Solidity `Panic(uint256)` codes
 *  - custom errors via the ABIs you provide
 *  - user rejection and JSON-RPC transport errors
 */
export declare class ErrorDecoder {
    private readonly errorHandlers;
    private readonly errorInterface;
    constructor(errorInterfaces?: ReadonlyArray<AbiLike>, opts?: {
        additionalErrorHandlers?: ErrorHandler[];
    });
    /**
     * Decode a thrown error. Understands:
     *  - ethers `CALL_EXCEPTION` (sync `.call` revert)
     *  - errors carrying a `receipt` (mined reverted transaction), which are replayed via `eth_call`
     *    to recover the revert data
     *  - any error object with `data` / nested `error.data` / `cause` chain (viem-compatible)
     */
    decode(error: unknown): Promise<DecodedError>;
    /**
     * Decode raw revert data directly (e.g. from a failed `eth_call` or from a
     * multicall per-item return data).
     */
    decodeData(data: string | undefined, error?: Error): DecodedError;
    /**
     * Recover the revert reason of a mined reverted transaction by replaying it
     * via `eth_call` at the latest block. Returns a decoded error.
     */
    getRevertReason(provider: {
        getTransaction: (hash: string) => Promise<TransactionResponse | null>;
        call: (tx: any) => Promise<any>;
    }, txHash: string): Promise<DecodedError>;
    /** Replay a reverted receipt to get the original error (or null if unrecoverable). */
    getTransactionError(receipt: TransactionReceipt): Promise<Error | null>;
    private getContractOrTransactionError;
}
/** Convenience: decode raw revert data without constructing an ErrorDecoder. */
export declare function decodeRevertData(data: string | undefined, abis?: ReadonlyArray<AbiLike>, error?: Error): DecodedError;
