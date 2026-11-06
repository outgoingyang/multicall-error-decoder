import type { ErrorDescription, ErrorFragment, Interface, Result } from 'ethers';
import { ErrorType } from './enums.js';

/** Human-friendly decoded error, produced by `ErrorDecoder.decode` / `decodeError`. */
export type DecodedError = {
  /** Classification of the error. */
  type: ErrorType;
  /** Human-readable reason (decoded string, panic description, or fallback message). */
  reason: string | null;
  /** Raw revert data (`0x...`), if present. */
  data: string | null;
  /** Error name (custom error name, RPC error code, or null). */
  name: string | null;
  /** 4-byte selector `0x........` for custom errors. */
  selector: string | null;
  /** Canonical signature, e.g. `MyError(uint256,address)`. */
  signature: string | null;
  /** Parsed error arguments, when the ABI is known. */
  args: Result | null;
  /** Matched error fragment, when the ABI is known. */
  fragment: ErrorFragment | null;
  /** Full ethers `ErrorDescription` fields when a fragment matched. */
  description?: ErrorDescription;
};

export interface ErrorHandlerInput {
  errorInterface?: Interface;
  error: Error;
}

export interface ErrorHandler {
  predicate: (data: string | undefined, error: Error) => boolean;
  handle: (data: string | undefined, input: ErrorHandlerInput) => DecodedError;
}
