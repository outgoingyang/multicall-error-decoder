import { JsonRpcApiProvider, Network, type JsonRpcApiProviderOptions, type JsonRpcError, type JsonRpcPayload, type JsonRpcResult, type Networkish } from 'ethers';
export declare enum FallbackProviderError {
    NO_PROVIDER = "At least one provider must be provided",
    CANNOT_DETECT_NETWORKS = "Could not detect providers networks",
    INCONSISTENT_NETWORKS = "All providers must be connected to the same network",
    DESTROYED = "Provider has been destroyed",
    ALL_PROVIDERS_UNAVAILABLE = "All providers are unavailable",
    HALTED = "Chain has halted",
    INVALID_FALLBACK_OPTIONS = "Invalid fallback options",
    BLOCK_NUMBER_STORAGE_CONFIG_ERROR = "Both getStoredBlockNumber and setStoredBlockNumber must be provided or neither",
    FAILED_TO_GET_BLOCKNUMBER = "Failed to get block number"
}
export declare const DEFAULT_RETRIES = 0;
export declare const DEFAULT_TIMEOUT = 3000;
export declare const RETRY_DELAY = 100;
export declare const ALWAYS_SUPPORTED_METHODS: readonly string[];
export interface ProviderConfig {
    provider: JsonRpcApiProvider;
    retries?: number;
    timeout?: number;
    retryDelay?: number;
    id?: string;
    isMevProtected?: boolean;
    /** The JSON-RPC methods this provider is allowed to serve, matched exactly. */
    supportedMethods?: string[];
    /** The JSON-RPC methods this provider must not serve (takes precedence over supportedMethods). */
    unsupportedMethods?: string[];
    /** Gets the stored block number when conducting a liveliness check (shared cache). */
    getStoredBlockNumber?: () => Promise<number | null>;
    /** Sets the stored block number when conducting a liveliness check. */
    setStoredBlockNumber?: (blockNumber: number) => Promise<void>;
}
export interface LoggingOptions {
    debug?: (message: string, metadata?: any) => void;
    info?: (message: string, metadata?: any) => void;
    notice?: (message: string, metadata?: any) => void;
    warn?: (message: string, metadata?: any) => void;
    error?: (message: string, metadata?: any) => void;
}
export type FallbackProviderOptions = {
    /** Maximum block lag allowed for the provider to be considered valid, measured against the median block number. */
    allowableBlockLag?: number;
    /**
     * If the median block number is not updated for this amount of time, the chain is considered halted and calls will
     * throw. Denominated in seconds. 0 disables halt detection. Default: 300 (5 minutes).
     */
    haltDetectionTime?: number;
    /** Interval for the liveliness check of the chain and providers, in ms. 0 disables. Default: 0. */
    livelinessPollingInterval?: number;
    /** Hook to get the time at which a block was first discovered (UNIX epoch seconds), or null if unknown. */
    getBlockDiscoveryTime?: (blockNumber: number) => Promise<number | null>;
    /** Hook to set the time at which a block was first discovered; null clears it. */
    setBlockDiscoveryTime?: (blockNumber: number, currentTime: number | null) => Promise<void>;
    /** If true, signed transactions are broadcast to all active providers. Default: false. */
    broadcastToAll?: boolean;
    broadcastToAllConfig?: {
        /** Delay in ms between broadcasting to each provider. Default: 0. */
        delay?: number;
        /** Max random jitter (ms) added to the delay. Default: 0. */
        delayJitter?: number;
    };
    /** If true, signed transactions are only broadcast to MEV-protected providers. Default: false. */
    broadcastOnlyToMevProtected?: boolean;
    /**
     * If true, the provider throws on the first blockchain error it encounters
     * (CALL_EXCEPTION, INSUFFICIENT_FUNDS, NONCE_EXPIRED, ...). Default: true.
     */
    throwOnFirstBlockchainError?: boolean;
};
export declare const DEFAULT_FALLBACK_OPTIONS: Required<Pick<FallbackProviderOptions, 'allowableBlockLag' | 'haltDetectionTime' | 'livelinessPollingInterval' | 'broadcastToAll' | 'broadcastOnlyToMevProtected' | 'throwOnFirstBlockchainError'>>;
export declare function isBlockchainError(e: any): boolean;
export declare function isAlreadyKnownError(e: any): boolean;
export declare const providerSupportsMethod: (config: ProviderConfig, method: string) => boolean;
export declare const filterProvidersByMethod: (providers: ProviderConfig[], method: string) => ProviderConfig[];
export declare const filterValidProviders: (providers: ProviderConfig[]) => Promise<{
    network: Network;
    providers: ProviderConfig[];
}>;
export declare function getBlockNumberWithTimeout(provider: JsonRpcApiProvider, timeout?: number): Promise<number>;
export declare function getBlockNumber(providerConfig: ProviderConfig): Promise<number>;
export declare const getBlockNumbersAndMedian: (providers: ProviderConfig[], logging?: LoggingOptions) => Promise<{
    blockNumbers: ({
        blockNumber: number;
        fromCache: boolean;
    } | null)[];
    median: number;
}>;
/**
 * Full-featured RPC fallback provider for ethers v6, ported from
 * `ethers-v6-fallback-provider`.
 *
 * Features: per-provider retries/timeouts, provider failover, liveliness
 * polling with median block-number lag filtering, chain halt detection,
 * JSON-RPC method capability filtering, transaction broadcast to all /
 * MEV-protected-only providers, and blockchain-vs-transport error
 * classification (blockchain errors are never retried on another RPC).
 */
export declare class FallbackProvider extends JsonRpcApiProvider {
    #private;
    constructor(providers: ProviderConfig[], network?: Networkish, options?: JsonRpcApiProviderOptions, loggingOptions?: LoggingOptions, fallbackOptions?: FallbackProviderOptions);
    activeProvidersCount(): number;
    activeProviderIds(): string[];
    isHalted(): boolean;
    /** Runs the liveliness check on demand (also runs automatically when polling is enabled). */
    refreshLiveliness(): Promise<void>;
    private _validateFallbackOptions;
    private sendWithProvider;
    send(method: string, params: {
        [name: string]: any;
    }): Promise<any>;
    _send(payload: JsonRpcPayload | Array<JsonRpcPayload>): Promise<Array<JsonRpcResult | JsonRpcError>>;
    _detectNetwork(): Promise<Network>;
    /**
     * Gets the time at which a block was first discovered.
     */
    private _getBlockDiscoveryTime;
    /**
     * Sets the time at which a block was first discovered.
     */
    private _setBlockDiscoveryTime;
    private _livelinessCheck;
    _start(): void;
    destroy(): void;
}
