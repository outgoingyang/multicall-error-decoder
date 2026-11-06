import type { ErrorFragment, Result } from 'ethers';
import type { DecodedError } from './types.js';
import { ErrorType } from './enums.js';

type ErrorResultFormatterParam = {
  data?: string | null;
  reason?: string | null;
  args?: Result | null;
  fragment?: ErrorFragment | null;
  selector?: string | null;
  name?: string | null;
  signature?: string | null;
};

const formatReason = (
  reason: string | undefined | null,
  defaultReason: string | null
): string | null => (reason && reason.trim() !== '' ? reason : defaultReason);

const baseErrorResult = (
  params: ErrorResultFormatterParam & { type: ErrorType }
): DecodedError => {
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

export const emptyErrorResult: (p: ErrorResultFormatterParam) => DecodedError = ({ data, reason }) =>
  baseErrorResult({
    type: ErrorType.EmptyError,
    data,
    reason,
  });

export const userRejectErrorResult: (p: ErrorResultFormatterParam) => DecodedError = ({
  data = null,
  reason,
}) =>
  baseErrorResult({
    type: ErrorType.UserRejectError,
    reason: formatReason(reason, 'User has rejected the transaction'),
    data,
  });

export const revertErrorResult: (p: ErrorResultFormatterParam) => DecodedError = (params) =>
  baseErrorResult({ type: ErrorType.RevertError, ...params });

export const unknownErrorResult: (p: ErrorResultFormatterParam) => DecodedError = ({
  data,
  reason,
  name,
}) =>
  baseErrorResult({
    type: ErrorType.UnknownError,
    reason: formatReason(reason, 'Unknown error'),
    data,
    name,
  });

export const panicErrorResult: (p: ErrorResultFormatterParam) => DecodedError = (params) =>
  baseErrorResult({ type: ErrorType.PanicError, ...params });

export const customErrorResult: (p: ErrorResultFormatterParam) => DecodedError = ({
  data,
  reason,
  fragment,
  args,
}) => {
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

export const rpcErrorResult: (p: ErrorResultFormatterParam) => DecodedError = ({ reason, name }) =>
  baseErrorResult({
    type: ErrorType.RpcError,
    reason: formatReason(reason, 'Error from JSON RPC provider'),
    data: null,
    name: name?.toString() ?? null,
  });
