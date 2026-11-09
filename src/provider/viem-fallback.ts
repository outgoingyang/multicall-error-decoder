import { createPublicClient, fallback, http, webSocket, type Chain, type PublicClient, type Transport } from 'viem';

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
export async function probeRpcEndpoints(
  urls: readonly string[],
  opts: { expectedChainId?: number; timeout?: number } = {}
): Promise<RpcProbeResult[]> {
  const timeout = opts.timeout ?? 5_000;

  const results = await Promise.all(
    urls.map(async (url): Promise<RpcProbeResult> => {
      const started = Date.now();
      try {
        const client = createPublicClient({ transport: http(url, { timeout, retryCount: 0 }) });
        const [chainId, blockNumber] = await Promise.all([client.getChainId(), client.getBlockNumber()]);
        return {
          url,
          ok: true,
          chainId,
          blockNumber,
          latencyMs: Date.now() - started,
          error: opts.expectedChainId != null && chainId !== opts.expectedChainId ? 'chain id mismatch' : undefined,
        };
      } catch (e: any) {
        return { url, ok: false, error: e?.message ?? String(e) };
      }
    })
  );

  return results.sort((a, b) => {
    if (a.ok !== b.ok) return a.ok ? -1 : 1;
    const aMatch = a.error === undefined;
    const bMatch = b.error === undefined;
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity);
  });
}

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
export function createViemFallbackTransport(opts: ViemFallbackTransportOptions): Transport {
  const {
    urls,
    webSocketUrls = [],
    timeout = 10_000,
    retryCount = 2,
    rank = true,
    transportFactory,
  } = opts;

  if (urls.length === 0 && webSocketUrls.length === 0) {
    throw new Error('createViemFallbackTransport: at least one URL is required');
  }

  const make = transportFactory ?? ((url: string, kind: 'http' | 'ws') =>
    kind === 'ws'
      ? webSocket(url as any, { timeout, retryCount })
      : http(url as any, { timeout, retryCount }));

  const transports = [
    ...webSocketUrls.map((url) => make(url, 'ws')),
    ...urls.map((url) => make(url, 'http')),
  ];

  return fallback(transports, {
    rank,
    retryCount,
  });
}

export interface ViemFallbackClientOptions extends ViemFallbackTransportOptions {
  /** Target chain (e.g. mainnet from 'viem/chains'). Required unless you pass `transport` yourself. */
  chain?: Chain;
  /** Polling interval for watch utilities, in ms. */
  pollingInterval?: number;
}

/** Convenience builder: a viem PublicClient backed by a fallback transport. */
export function createViemFallbackClient(opts: ViemFallbackClientOptions): PublicClient {
  const { chain, pollingInterval, ...transportOpts } = opts;
  return createPublicClient({
    chain,
    transport: createViemFallbackTransport(transportOpts),
    pollingInterval,
  });
}
