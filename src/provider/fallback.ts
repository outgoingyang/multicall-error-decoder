import {
  JsonRpcApiProvider,
  Network,
  type JsonRpcError,
  type JsonRpcPayload,
  type JsonRpcResult,
  type Networkish,
} from 'ethers';
import { withTimeout, getErrorMessage } from '../utils.js';

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
export class SimpleFallbackProvider extends JsonRpcApiProvider {
  readonly entries: FallbackProviderEntry[];

  #preferred = 0;
  #broadcastToAll: boolean;
  #defaultTimeout: number;

  constructor(options: SimpleFallbackProviderOptions) {
    const { entries, network } = options;
    if (!entries.length) {
      throw new Error('SimpleFallbackProvider: at least one provider is required');
    }
    super(network, network ? { staticNetwork: Network.from(network) } : { batchMaxCount: 1, batchStallTime: 0 });
    this.entries = entries;
    this.#broadcastToAll = options.broadcastToAll ?? false;
    this.#defaultTimeout = options.defaultTimeout ?? 10_000;
    this._start();
  }

  /** Index of the provider currently preferred (last known-good). */
  get preferredIndex(): number {
    return this.#preferred;
  }

  async _detectNetwork(): Promise<Network> {
    for (const entry of this.entries) {
      try {
        return await entry.provider.getNetwork();
      } catch {
        // try the next provider
      }
    }
    throw new Error('SimpleFallbackProvider: could not detect network on any provider');
  }

  async _send(
    payload: JsonRpcPayload | Array<JsonRpcPayload>
  ): Promise<Array<JsonRpcResult | JsonRpcError>> {
    const payloads = Array.isArray(payload) ? payload : [payload];
    return Promise.all(payloads.map((p) => this.#sendSingle(p)));
  }

  async #sendSingle(payload: JsonRpcPayload): Promise<JsonRpcResult | JsonRpcError> {
    if (this.#broadcastToAll && payload.method === 'eth_sendRawTransaction') {
      return this.#broadcast(payload);
    }

    const ordered = this.#ordered();
    let lastError: unknown;

    for (const entry of ordered) {
      const timeout = entry.timeout ?? this.#defaultTimeout;
      const retries = entry.retries ?? 0;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await withTimeout(
            entry.provider.send(payload.method, payload.params as any[]),
            timeout
          );
          this.#preferred = this.entries.indexOf(entry);
          return { jsonrpc: '2.0', id: (payload as any).id, result } as JsonRpcResult;
        } catch (e) {
          lastError = e;
          if (isBlockchainLevelError(e)) break;
        }
      }
    }

    return {
      jsonrpc: '2.0',
      id: (payload as any).id,
      error: {
        code: (lastError as any)?.code ?? -32000,
        message: `SimpleFallbackProvider: all providers failed: ${getErrorMessage(lastError)}`,
      },
    } as JsonRpcError;
  }

  async #broadcast(payload: JsonRpcPayload): Promise<JsonRpcResult | JsonRpcError> {
    const params = payload.params as any[];
    const results = await Promise.allSettled(
      this.entries.map((e) => withTimeout(e.provider.send(payload.method, params), e.timeout ?? this.#defaultTimeout))
    );
    const firstOk = results.find((r) => r.status === 'fulfilled');
    if (firstOk) {
      return { jsonrpc: '2.0', id: (payload as any).id, result: (firstOk as PromiseFulfilledResult<any>).value } as JsonRpcResult;
    }
    const firstRejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    const err = firstRejected?.reason;
    return {
      jsonrpc: '2.0',
      id: (payload as any).id,
      error: {
        code: (err as any)?.code ?? -32000,
        message: getErrorMessage(err),
      },
    } as JsonRpcError;
  }

  #ordered(): FallbackProviderEntry[] {
    const { entries } = this;
    return [...entries.slice(this.#preferred), ...entries.slice(0, this.#preferred)];
  }
}

/**
 * Errors caused by the transaction itself (not by the RPC) should stop the
 * failover loop — the next RPC will fail the same way.
 */
const BLOCKCHAIN_ERROR_PATTERNS = [
  'insufficient funds',
  'nonce',
  'replacement transaction underpriced',
  'already known',
  'execution reverted',
  'out of gas',
  'intrinsic gas',
  'invalid sender',
  'max fee per gas',
  'gas price below',
];

export function isBlockchainLevelError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return BLOCKCHAIN_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}
