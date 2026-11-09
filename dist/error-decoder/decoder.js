import { callRequestFromTx, extractRevertData, mergeAbis } from '../utils.js';
import { defaultErrorHandlers } from './handlers.js';
import { unknownErrorResult } from './results.js';
/**
 * Decodes contract errors:
 *  - `Error(string)` revert reasons
 *  - Solidity `Panic(uint256)` codes
 *  - custom errors via the ABIs you provide
 *  - user rejection and JSON-RPC transport errors
 */
export class ErrorDecoder {
    errorHandlers;
    errorInterface;
    constructor(errorInterfaces, opts = {}) {
        this.errorInterface =
            errorInterfaces && errorInterfaces.length > 0 ? mergeAbis(errorInterfaces) : undefined;
        this.errorHandlers = [...defaultErrorHandlers, ...(opts.additionalErrorHandlers ?? [])];
    }
    /**
     * Decode a thrown error. Understands:
     *  - ethers `CALL_EXCEPTION` (sync `.call` revert)
     *  - errors carrying a `receipt` (mined reverted transaction), which are replayed via `eth_call`
     *    to recover the revert data
     *  - any error object with `data` / nested `error.data` / `cause` chain (viem-compatible)
     */
    async decode(error) {
        if (!(error instanceof Error)) {
            return unknownErrorResult({ reason: error?.message ?? 'Invalid error' });
        }
        const targetError = await this.getContractOrTransactionError(error);
        const data = extractRevertData(targetError);
        return this.decodeData(data, targetError);
    }
    /**
     * Decode raw revert data directly (e.g. from a failed `eth_call` or from a
     * multicall per-item return data).
     */
    decodeData(data, error) {
        for (const handler of this.errorHandlers) {
            if (handler.predicate(data, error ?? new Error())) {
                return handler.handle(data, { errorInterface: this.errorInterface, error: error ?? new Error() });
            }
        }
        return unknownErrorResult({ data, reason: error?.message ?? 'Unexpected error' });
    }
    /**
     * Recover the revert reason of a mined reverted transaction by replaying it
     * via `eth_call` at the latest block. Returns a decoded error.
     */
    async getRevertReason(provider, txHash) {
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt && receipt.status === 1) {
            throw new Error('Transaction succeeded — there is no revert reason');
        }
        const tx = await provider.getTransaction(txHash);
        if (!tx) {
            return unknownErrorResult({ reason: 'Transaction not found' });
        }
        let data;
        try {
            await provider.call(callRequestFromTx(tx));
            // Call succeeded — the chain state has moved on; cannot reproduce revert.
            data = undefined;
        }
        catch (e) {
            data = extractRevertData(e);
        }
        return this.decodeData(data);
    }
    /** Replay a reverted receipt to get the original error (or null if unrecoverable). */
    async getTransactionError(receipt) {
        if (receipt.status !== 0)
            return null;
        const provider = receipt.provider;
        const tx = await provider.getTransaction(receipt.hash);
        if (!tx)
            return null;
        try {
            await provider.call(callRequestFromTx(tx));
            return null; // call succeeded — would not have reverted now
        }
        catch (e) {
            return e;
        }
    }
    async getContractOrTransactionError(error) {
        const receipt = error.receipt;
        if (!receipt || receipt.status !== 0)
            return error;
        const replayed = await this.getTransactionError(receipt);
        return replayed ?? error;
    }
}
/** Convenience: decode raw revert data without constructing an ErrorDecoder. */
export function decodeRevertData(data, abis, error) {
    return new ErrorDecoder(abis).decodeData(data, error);
}
//# sourceMappingURL=decoder.js.map