import { type Chain, type PublicClient, type Transport } from 'viem';
export interface RpcProbeResult {
    url: string;
    ok: boolean;
    chainId?: number;
    blockNumber?: bigint;
    latencyMs?: number;
    error?: string;
}
/**
 * Probe JSON-RPC endpoints: reachability, chain id, block number and latency.
 * Results are sorted best-first (matching chain id, then lowest latency);
 * failed probes go last. Useful to order the transports handed to
 * `createViemFallbackTransport`.
 */
export declare function probeRpcEndpoints(urls: readonly string[], opts?: {
    expectedChainId?: number;
    timeout?: number;
}): Promise<RpcProbeResult[]>;
export interface ViemFallbackTransportOptions {
    /** RPC URLs to fail over between. Order matters: first is preferred. */
    urls: readonly string[];
    /** Optional WebSocket URLs placed in front of the HTTP transports. */
    webSocketUrls?: readonly string[];
    /** Per-request timeout in ms. Default: 10_000. */
    timeout?: number;
    /** Retries per transport. Default: 2. */
    retryCount?: number;
    /** Enable viem's automatic ranking by latency. Default: true. */
    rank?: boolean;
    /** Custom webSocket/http factory override (testing). */
    transportFactory?: (url: string, kind: 'http' | 'ws') => Transport;
}
/**
 * Build a viem `fallback` transport over a list of RPC URLs, with per-URL
 * timeout/retry configuration. This is the viem counterpart of
 * `FallbackProvider` / `SimpleFallbackProvider` for ethers.
 */
export declare function createViemFallbackTransport(opts: ViemFallbackTransportOptions): Transport;
export interface ViemFallbackClientOptions extends ViemFallbackTransportOptions {
    /** Target chain (e.g. mainnet from 'viem/chains'). Required unless you pass `transport` yourself. */
    chain?: Chain;
    /** Polling interval for watch utilities, in ms. */
    pollingInterval?: number;
}
/** Convenience builder: a viem PublicClient backed by a fallback transport. */
export declare function createViemFallbackClient(opts: ViemFallbackClientOptions): PublicClient;
