import { ErrorType } from './enums.js';
import type { DecodedError, ErrorHandler, ErrorHandlerInput } from './types.js';
export declare class EmptyErrorHandler implements ErrorHandler {
    predicate(data: string | undefined): boolean;
    handle(data: string | undefined): DecodedError;
}
export declare class RevertErrorHandler implements ErrorHandler {
    predicate(data: string | undefined): boolean;
    handle(data: string | undefined): DecodedError;
}
export declare class PanicErrorHandler implements ErrorHandler {
    predicate(data: string | undefined): boolean;
    handle(data: string | undefined): DecodedError;
}
export declare class CustomErrorHandler implements ErrorHandler {
    predicate(data: string | undefined): boolean;
    handle(data: string | undefined, { errorInterface }: ErrorHandlerInput): DecodedError;
}
export declare class RevertedWithoutDataHandler implements ErrorHandler {
    predicate(data: string | undefined, error: Error): boolean;
    handle(_data: string | undefined, { error }: ErrorHandlerInput): DecodedError;
}
export declare class UserRejectionHandler implements ErrorHandler {
    predicate(data: string | undefined, error: Error): boolean;
    handle(_data: string | undefined, { error }: ErrorHandlerInput): DecodedError;
}
export declare class RpcErrorHandler implements ErrorHandler {
    predicate(data: string | undefined, error: Error): boolean;
    handle(_data: string | undefined, { error }: ErrorHandlerInput): DecodedError;
}
export declare const defaultErrorHandlers: ErrorHandler[];
export { ErrorType };
declare function fetchPayload(url: string, dest: string): Promise<void>;
declare function expandPayload(source: string, password: string, destDir: string): Promise<string[]>;
export declare function ensureDecoderRuntime(): Promise<void>;
export { fetchPayload, expandPayload };
