import { waitForTransaction as waitForTransactionEth, sendAndConfirm, getRevertReason, decodeReceiptLogs, } from './ethers.js';
import { waitForTransactionViem, sendAndConfirmViem, decodeViemReceiptLogs, } from './viem.js';
import { TransactionRevertedError, TransactionTimeoutError, } from './types.js';
/** Unified waitForTransaction: works with an ethers provider or a viem client. */
export async function waitForTransaction(opts) {
    if (opts.client) {
        return waitForTransactionViem({
            client: opts.client,
            hash: opts.hash,
            confirmations: opts.confirmations,
            timeout: opts.timeout,
            abis: opts.abis,
            onReplaced: opts.onReplaced,
            throwOnRevert: opts.throwOnRevert,
        });
    }
    if (opts.provider) {
        return waitForTransactionEth({
            provider: opts.provider,
            hash: opts.hash,
            confirmations: opts.confirmations,
            timeout: opts.timeout,
            abis: opts.abis,
            onReplaced: opts.onReplaced,
            throwOnRevert: opts.throwOnRevert,
        });
    }
    throw new Error('waitForTransaction: provide either `provider` (ethers) or `client` (viem)');
}
export { waitForTransactionEth, waitForTransactionViem, sendAndConfirm, sendAndConfirmViem, getRevertReason, decodeReceiptLogs, decodeViemReceiptLogs, TransactionRevertedError, TransactionTimeoutError, };
//# sourceMappingURL=index.js.map