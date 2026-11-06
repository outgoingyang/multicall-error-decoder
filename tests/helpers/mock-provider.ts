import { JsonRpcApiProvider, Network, type JsonRpcError, type JsonRpcPayload, type JsonRpcResult } from 'ethers';

export type MockHandler = (params: any) => any | Promise<any>;

/**
 * Scripted JSON-RPC provider for unit tests: routes `send(method, params)` to
 * registered handlers. Built for exercising FallbackProvider / transaction
 * helpers without network access.
 */
export class MockProvider extends JsonRpcApiProvider {
  #handlers = new Map<string, MockHandler>();
  #calls: Array<{ method: string; params: any }> = [];
  #network: Network;

  constructor(handlers: Record<string, MockHandler> = {}, chainId = 1) {
    super(chainId, { staticNetwork: Network.from(chainId), batchMaxCount: 1, batchStallTime: 0 });
    this.#network = Network.from(chainId);
    for (const [method, handler] of Object.entries(handlers)) {
      this.#handlers.set(method, handler);
    }
  }

  get calls(): ReadonlyArray<{ method: string; params: any }> {
    return this.#calls;
  }

  setHandler(method: string, handler: MockHandler): this {
    this.#handlers.set(method, handler);
    return this;
  }

  async send(method: string, params: any): Promise<any> {
    this.#calls.push({ method, params });
    const handler = this.#handlers.get(method);
    if (!handler) {
      throw new Error(`MockProvider: no handler registered for ${method}`);
    }
    return handler(params);
  }

  async _detectNetwork(): Promise<Network> {
    return this.#network;
  }

  async _send(
    _payload: JsonRpcPayload | Array<JsonRpcPayload>
  ): Promise<Array<JsonRpcResult | JsonRpcError>> {
    throw new Error('MockProvider: _send should not be used');
  }
}
