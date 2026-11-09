import { ErrorType } from './enums.js';
const formatReason = (reason, defaultReason) => (reason && reason.trim() !== '' ? reason : defaultReason);
const baseErrorResult = (params) => {
    const { type, data, reason, fragment, args, selector, name, signature } = params;
    return {
        type,
        reason: formatReason(reason, null),
        data: data ?? null,
        name: name ?? null,
        selector: selector ?? null,
        signature: signature ?? null,
        args: args ?? null,
        fragment: fragment ?? null,
    };
};
export const emptyErrorResult = ({ data, reason }) => baseErrorResult({
    type: ErrorType.EmptyError,
    data,
    reason,
});
export const userRejectErrorResult = ({ data = null, reason, }) => baseErrorResult({
    type: ErrorType.UserRejectError,
    reason: formatReason(reason, 'User has rejected the transaction'),
    data,
});
export const revertErrorResult = (params) => baseErrorResult({ type: ErrorType.RevertError, ...params });
export const unknownErrorResult = ({ data, reason, name, }) => baseErrorResult({
    type: ErrorType.UnknownError,
    reason: formatReason(reason, 'Unknown error'),
    data,
    name,
});
export const panicErrorResult = (params) => baseErrorResult({ type: ErrorType.PanicError, ...params });
export const customErrorResult = ({ data, reason, fragment, args, }) => {
    const selector = data && data.length >= 10 ? data.slice(0, 10) : null;
    return baseErrorResult({
        type: ErrorType.CustomError,
        reason: formatReason(reason, `No ABI for custom error ${selector}`),
        data,
        fragment,
        args,
        selector,
        name: fragment?.name ?? selector,
        signature: fragment?.format() ?? null,
    });
};
export const rpcErrorResult = ({ reason, name }) => baseErrorResult({
    type: ErrorType.RpcError,
    reason: formatReason(reason, 'Error from JSON RPC provider'),
    data: null,
    name: name?.toString() ?? null,
});
//# sourceMappingURL=results.js.map