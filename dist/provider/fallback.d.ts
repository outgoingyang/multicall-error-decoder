import { JsonRpcApiProvider, Network, type JsonRpcError, type JsonRpcPayload, type JsonRpcResult, type Networkish } from 'ethers';
export interface FallbackProviderEntry {
    provider: JsonRpcApiProvider;
    /** Per-call timeout in ms. Default: 10_000. */
    timeout?: number;
    /** Retries against the same provider before moving to the next. Default: 0. */
    retries?: number;
}
export interface SimpleFallbackProviderOptions {
    entries: FallbackProviderEntry[];
    network?: Networkish;
    /**
     * When true, `eth_sendRawTransaction` is broadcast to every provider and the
     * first success wins. Default: false.
     */
    broadcastToAll?: boolean;
    /** Default per-call timeout. Default: 10_000. */
    defaultTimeout?: number;
}
/**
 * Minimal RPC fallback provider for ethers v6.
 *
 * Requests are tried against providers in order, preferring the last provider
 * that worked; each attempt is bounded by a timeout. Blockchain-level errors
 * (INSUFFICIENT_FUNDS, CALL_EXCEPTION, ...) are thrown immediately instead of
 * being retried against the next provider.
 */
export declare class SimpleFallbackProvider extends JsonRpcApiProvider {
    #private;
    readonly entries: FallbackProviderEntry[];
    constructor(options: SimpleFallbackProviderOptions);
    /** Index of the provider currently preferred (last known-good). */
    get preferredIndex(): number;
    _detectNetwork(): Promise<Network>;
    _send(payload: JsonRpcPayload | Array<JsonRpcPayload>): Promise<Array<JsonRpcResult | JsonRpcError>>;
}
export declare function isBlockchainLevelError(error: unknown): boolean;
