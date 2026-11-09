import { createPublicClient, fallback, http, webSocket } from 'viem';
/**
 * Probe JSON-RPC endpoints: reachability, chain id, block number and latency.
 * Results are sorted best-first (matching chain id, then lowest latency);
 * failed probes go last. Useful to order the transports handed to
 * `createViemFallbackTransport`.
 */
export async function probeRpcEndpoints(urls, opts = {}) {
    const timeout = opts.timeout ?? 5_000;
    const results = await Promise.all(urls.map(async (url) => {
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
        }
        catch (e) {
            return { url, ok: false, error: e?.message ?? String(e) };
        }
    }));
    return results.sort((a, b) => {
        if (a.ok !== b.ok)
            return a.ok ? -1 : 1;
        const aMatch = a.error === undefined;
        const bMatch = b.error === undefined;
        if (aMatch !== bMatch)
            return aMatch ? -1 : 1;
        return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity);
    });
}
/**
 * Build a viem `fallback` transport over a list of RPC URLs, with per-URL
 * timeout/retry configuration. This is the viem counterpart of
 * `FallbackProvider` / `SimpleFallbackProvider` for ethers.
 */
export function createViemFallbackTransport(opts) {
    const { urls, webSocketUrls = [], timeout = 10_000, retryCount = 2, rank = true, transportFactory, } = opts;
    if (urls.length === 0 && webSocketUrls.length === 0) {
        throw new Error('createViemFallbackTransport: at least one URL is required');
    }
    const make = transportFactory ?? ((url, kind) => kind === 'ws'
        ? webSocket(url, { timeout, retryCount })
        : http(url, { timeout, retryCount }));
    const transports = [
        ...webSocketUrls.map((url) => make(url, 'ws')),
        ...urls.map((url) => make(url, 'http')),
    ];
    return fallback(transports, {
        rank,
        retryCount,
    });
}
/** Convenience builder: a viem PublicClient backed by a fallback transport. */
export function createViemFallbackClient(opts) {
    const { chain, pollingInterval, ...transportOpts } = opts;
    return createPublicClient({
        chain,
        transport: createViemFallbackTransport(transportOpts),
        pollingInterval,
    });
}
//# sourceMappingURL=viem-fallback.js.map