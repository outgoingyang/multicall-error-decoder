import { isError, } from 'ethers';
import { callRequestFromTx, extractRevertData, toInterface } from '../utils.js';
import { ErrorDecoder } from '../error-decoder/index.js';
import { TransactionRevertedError, TransactionTimeoutError, } from './types.js';
/**
 * Wait for a transaction with timeout, confirmation count, replacement
 * notification, decoded logs, and automatic revert decoding.
 */
export async function waitForTransaction(opts) {
    const { provider, hash, confirmations = 1, timeout = 120_000, abis, onReplaced, throwOnRevert = true, } = opts;
    let receipt;
    try {
        receipt = await provider.waitForTransaction(hash, confirmations, timeout);
    }
    catch (e) {
        if (isError(e, 'TRANSACTION_REPLACED')) {
            onReplaced?.({
                reason: e.reason,
                replacement: e.replacement ?? null,
                receipt: e.receipt ?? null,
            });
        }
        throw e;
    }
    if (!receipt) {
        throw new TransactionTimeoutError(hash, timeout);
    }
    if (receipt.status === 0) {
        const decoded = await getRevertReason(provider, hash, abis ? Object.values(abis) : undefined);
        if (throwOnRevert) {
            throw new TransactionRevertedError(receipt, decoded, hash);
        }
        return { receipt, logs: [], decodedError: decoded };
    }
    return { receipt, logs: decodeReceiptLogs(receipt, abis) };
}
/** Send a transaction via a signer, then wait with full decode/timeout handling. */
export async function sendAndConfirm(signer, tx, opts = {}) {
    const response = await signer.sendTransaction(tx);
    const provider = response.provider ?? signer.provider;
    if (!provider)
        throw new Error('Signer has no provider to wait on');
    const result = await waitForTransaction({
        provider,
        hash: response.hash,
        confirmations: opts.confirmations,
        timeout: opts.timeout,
        abis: opts.abis,
        throwOnRevert: opts.throwOnRevert,
    });
    return { ...result, response };
}
/**
 * Recover + decode the revert reason of a (possibly mined) reverted transaction
 * by replaying it via `eth_call`.
 */
export async function getRevertReason(provider, txHash, abis) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt && receipt.status === 1) {
        throw new Error('Transaction succeeded — there is no revert reason');
    }
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
        throw new Error(`Transaction ${txHash} not found`);
    }
    let data;
    let callError;
    try {
        await provider.call(callRequestFromTx(tx));
        // Call succeeded — state has moved on; cannot reproduce the revert.
    }
    catch (e) {
        data = extractRevertData(e);
        callError = e;
    }
    return new ErrorDecoder(abis).decodeData(data, callError);
}
/** Decode logs of a receipt using the provided ABI map. */
export function decodeReceiptLogs(receipt, abis) {
    if (!abis)
        return [];
    const out = [];
    for (const log of receipt.logs) {
        const abi = abis[log.address.toLowerCase()];
        if (!abi)
            continue;
        try {
            const parsed = toInterface(abi).parseLog({ topics: [...log.topics], data: log.data });
            out.push({ log, name: parsed?.name ?? null, args: parsed?.args?.toArray() ?? [] });
        }
        catch {
            out.push({ log, name: null });
        }
    }
    return out;
}
//# sourceMappingURL=ethers.js.map