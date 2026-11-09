import { extractRevertData, getErrorMessage, callRequestFromViem } from '../utils.js';
import { ErrorDecoder, decodeRevertData } from './decoder.js';
import { unknownErrorResult } from './results.js';
/**
 * Decode a viem-thrown error (e.g. from `simulateContract`, `readContract`,
 * `call`, `waitForTransactionReceipt`).
 *
 * Unwraps `cause` chains (`CallExecutionError` -> `ContractFunctionRevertedError`),
 * extracts revert data and decodes it with the provided ABIs. Errors without
 * revert data are classified by message (user rejection / plain revert / RPC).
 */
export function decodeViemError(error, opts = {}) {
    const revertData = extractRevertData(error);
    const synth = new Error(getErrorMessage(error));
    const code = error?.code;
    if (code != null) {
        synth.code = code;
    }
    return new ErrorDecoder(opts.abis).decodeData(revertData, synth);
}
/**
 * Recover the revert reason of a mined reverted transaction for viem clients
 * by replaying it via `publicClient.call`.
 */
export async function getRevertReasonViem(client, txHash, abis) {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt && receipt.status === 'success') {
        throw new Error('Transaction succeeded — there is no revert reason');
    }
    const tx = await client.getTransaction({ hash: txHash });
    if (!tx) {
        return unknownErrorResult({ reason: 'Transaction not found' });
    }
    const callRequest = callRequestFromViem(tx);
    let data;
    let callError;
    try {
        await client.call({ ...callRequest, blockNumber: receipt?.blockNumber });
        await client.call({ ...callRequest });
    }
    catch (e) {
        data = extractRevertData(e);
        callError = e;
    }
    return decodeRevertData(data, abis, callError);
}
//# sourceMappingURL=viem.js.map