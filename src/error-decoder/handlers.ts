import { AbiCoder, ErrorFragment, Interface } from 'ethers';
import { ERROR_STRING_PREFIX, PANIC_CODE_PREFIX, panicErrorCodeToReason } from './constants.js';
import { ErrorType } from './enums.js';
import type { DecodedError, ErrorHandler, ErrorHandlerInput } from './types.js';
import {
  customErrorResult,
  emptyErrorResult,
  panicErrorResult,
  revertErrorResult,
  rpcErrorResult,
  unknownErrorResult,
  userRejectErrorResult,
} from './results.js';

export class EmptyErrorHandler implements ErrorHandler {
  predicate(data: string | undefined): boolean {
    return data === '0x';
  }

  handle(data: string | undefined): DecodedError {
    return emptyErrorResult({ data, reason: 'reverted (no revert data)' });
  }
}

export class RevertErrorHandler implements ErrorHandler {
  predicate(data: string | undefined): boolean {
    return !!data && data.startsWith(ERROR_STRING_PREFIX);
  }

  handle(data: string | undefined): DecodedError {
    if (!data) return unknownErrorResult({ reason: 'Unknown error returned', data });
    const encodedReason = data.slice(ERROR_STRING_PREFIX.length);
    const abi = AbiCoder.defaultAbiCoder();
    try {
      const fragment = ErrorFragment.from('Error(string)');
      const args = abi.decode(fragment.inputs, `0x${encodedReason}`);
      const reason = args[0] as string;
      return revertErrorResult({ data, fragment, reason, args });
    } catch {
      return unknownErrorResult({ reason: 'Unknown error returned', data });
    }
  }
}

export class PanicErrorHandler implements ErrorHandler {
  predicate(data: string | undefined): boolean {
    return !!data && data.startsWith(PANIC_CODE_PREFIX);
  }

  handle(data: string | undefined): DecodedError {
    if (!data) return unknownErrorResult({ reason: 'Unknown panic error', data });
    const encodedReason = data.slice(PANIC_CODE_PREFIX.length);
    const abi = AbiCoder.defaultAbiCoder();
    try {
      const fragment = ErrorFragment.from('Panic(uint256)');
      const args = abi.decode(fragment.inputs, `0x${encodedReason}`);
      const reason = panicErrorCodeToReason(args[0] as bigint) ?? 'Unknown panic code';
      return panicErrorResult({ data, fragment, reason, args });
    } catch {
      return unknownErrorResult({ reason: 'Unknown panic error', data });
    }
  }
}

export class CustomErrorHandler implements ErrorHandler {
  predicate(data: string | undefined): boolean {
    return (
      !!data &&
      data !== '0x' &&
      !data.startsWith(ERROR_STRING_PREFIX) &&
      !data.startsWith(PANIC_CODE_PREFIX)
    );
  }

  handle(data: string | undefined, { errorInterface }: ErrorHandlerInput): DecodedError {
    if (!data) return unknownErrorResult({ reason: 'Unknown error', data });
    let fragment = null;
    let reason: string | null = null;
    let args = null;
    let signature: string | null = null;

    if (errorInterface) {
      try {
        const parsed = errorInterface.parseError(data);
        if (parsed) {
          fragment = parsed.fragment;
          reason = parsed.name;
          args = parsed.args;
          signature = parsed.fragment.format();
        }
      } catch {
        // no matching fragment in the provided ABI
      }
    }

    return customErrorResult({ data, fragment, reason, args, signature });
  }
}

export class RevertedWithoutDataHandler implements ErrorHandler {
  predicate(data: string | undefined, error: Error): boolean {
    return !data && !!error?.message && /revert/i.test(error.message);
  }

  handle(_data: string | undefined, { error }: ErrorHandlerInput): DecodedError {
    return emptyErrorResult({
      data: null,
      reason: error.message?.includes('execution reverted')
        ? 'execution reverted (no revert data)'
        : 'reverted (no revert data)',
    });
  }
}

export class UserRejectionHandler implements ErrorHandler {
  predicate(data: string | undefined, error: Error): boolean {
    return !data && !!error?.message && /reject(ed)?/i.test(error.message);
  }

  handle(_data: string | undefined, { error }: ErrorHandlerInput): DecodedError {
    return userRejectErrorResult({
      data: null,
      reason: error.message ?? 'The transaction was rejected',
    });
  }
}

export class RpcErrorHandler implements ErrorHandler {
  predicate(data: string | undefined, error: Error): boolean {
    return (
      !data &&
      !!error.message &&
      !error.message.includes('rejected transaction') &&
      (error as any).code !== undefined
    );
  }

  handle(_data: string | undefined, { error }: ErrorHandlerInput): DecodedError {
    const rpcError = error as any;
    const reason =
      rpcError.info?.error?.message ?? rpcError.shortMessage ?? rpcError.message;
    return rpcErrorResult({ name: rpcError.code, reason });
  }
}

export const defaultErrorHandlers: ErrorHandler[] = [
  new EmptyErrorHandler(),
  new RevertErrorHandler(),
  new PanicErrorHandler(),
  new CustomErrorHandler(),
  new RevertedWithoutDataHandler(),
  new UserRejectionHandler(),
  new RpcErrorHandler(),
];

export { ErrorType };
