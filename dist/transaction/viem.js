import { extractRevertData, callRequestFromViem, toInterface } from '../utils.js';
import { ErrorDecoder } from '../error-decoder/index.js';
import { TransactionRevertedError, TransactionTimeoutError, } from './types.js';
/**
 * Wait for a transaction with timeout, confirmations, replacement callback,
 * decoded logs, and automatic revert decoding.
 */
export async function waitForTransactionViem(opts) {
    const { client, hash, confirmations = 1, timeout = 120_000, abis, onReplaced, throwOnRevert = true } = opts;
    const receipt = await client.waitForTransactionReceipt({
        hash: hash,
        confirmations,
        timeout,
        onReplaced: onReplaced,
    });
    if (receipt.status === 'reverted') {
        const decoded = await getRevertReasonViem(client, hash, abis ? Object.values(abis) : undefined);
        if (throwOnRevert) {
            throw new TransactionRevertedError(receipt, decoded, hash);
        }
        return { receipt, logs: [], decodedError: decoded };
    }
    return { receipt, logs: decodeViemReceiptLogs(receipt, abis) };
}
/** Send a transaction via a wallet client, then wait with full decode/timeout handling. */
export async function sendAndConfirmViem(wallet, request, opts = {}) {
    const client = opts.publicClient ?? wallet;
    const hash = (await wallet.sendTransaction(request));
    const result = await waitForTransactionViem({
        client,
        hash,
        confirmations: opts.confirmations,
        timeout: opts.timeout,
        abis: opts.abis,
        throwOnRevert: opts.throwOnRevert,
    });
    return { ...result, hash };
}
/**
 * Recover + decode the revert reason of a mined reverted transaction for viem
 * by replaying it via `publicClient.call`.
 */
export async function getRevertReasonViem(client, txHash, abis) {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt && receipt.status === 'success') {
        throw new Error('Transaction succeeded — there is no revert reason');
    }
    const tx = await client.getTransaction({ hash: txHash });
    if (!tx) {
        throw new Error(`Transaction ${txHash} not found`);
    }
    const callRequest = callRequestFromViem(tx);
    let data;
    try {
        await client.call({ ...callRequest, blockNumber: receipt?.blockNumber });
        await client.call({ ...callRequest });
    }
    catch (e) {
        data = extractRevertData(e);
    }
    return new ErrorDecoder(abis).decodeData(data);
}
/** Decode logs of a viem receipt using the provided ABI map (parsed with ethers Interface). */
export function decodeViemReceiptLogs(receipt, abis) {
    if (!abis)
        return [];
    const out = [];
    for (const log of receipt.logs) {
        const abi = abis[log.address.toLowerCase()];
        if (!abi)
            continue;
        try {
            const parsed = toInterface(abi).parseLog({
                topics: [...(log.topics ?? [])],
                data: log.data,
            });
            out.push({ log, name: parsed?.name ?? null, args: parsed?.args?.toArray() ?? [] });
        }
        catch {
            out.push({ log, name: null });
        }
    }
    return out;
}
export { TransactionTimeoutError };
//# sourceMappingURL=viem.js.map