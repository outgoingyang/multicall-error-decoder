export class TransactionRevertedError extends Error {
    receipt;
    decoded;
    hash;
    constructor(receipt, decoded, hash) {
        super(`Transaction reverted: ${decoded.reason ?? 'unknown reason'}`);
        this.name = 'TransactionRevertedError';
        this.receipt = receipt;
        this.decoded = decoded;
        this.hash = hash;
    }
}
export class TransactionTimeoutError extends Error {
    hash;
    constructor(hash, timeoutMs) {
        super(`Timed out waiting for transaction ${hash} after ${timeoutMs}ms`);
        this.name = 'TransactionTimeoutError';
        this.hash = hash;
    }
}
//# sourceMappingURL=types.js.map