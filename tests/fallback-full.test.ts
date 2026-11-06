import { describe, expect, it } from 'vitest';
import { makeError } from 'ethers';
import {
  FallbackProvider,
  getBlockNumbersAndMedian,
  isAlreadyKnownError,
  isBlockchainError,
  providerSupportsMethod,
  ALWAYS_SUPPORTED_METHODS,
} from '../src/provider/fallback-full';
import { MockProvider } from './helpers/mock-provider';

const bn = (n: number) => '0x' + n.toString(16);

function makeFp(
  providers: MockProvider[],
  options: any = {}
): FallbackProvider {
  return new FallbackProvider(
    providers.map((provider, i) => ({ provider, timeout: 500, id: `${i}` })),
    1,
    { batchMaxCount: 1, batchStallTime: 0 },
    undefined,
    options
  );
}

describe('getBlockNumbersAndMedian', () => {
  it('computes the median across providers', async () => {
    const a = new MockProvider({ eth_blockNumber: () => bn(100) });
    const b = new MockProvider({ eth_blockNumber: () => bn(101) });
    const c = new MockProvider({ eth_blockNumber: () => bn(102) });

    const { median } = await getBlockNumbersAndMedian([
      { provider: a, id: 'a' },
      { provider: b, id: 'b' },
      { provider: c, id: 'c' },
    ]);
    expect(median).toBe(101);
  });

  it('drops providers that lag behind the median', async () => {
    const lagging = new MockProvider({ eth_blockNumber: () => bn(90) });
    const ok1 = new MockProvider({ eth_blockNumber: () => bn(100) });
    const ok2 = new MockProvider({ eth_blockNumber: () => bn(100) });

    const fp = makeFp([lagging, ok1, ok2], { allowableBlockLag: 2 });
    await fp.refreshLiveliness();

    expect(fp.activeProvidersCount()).toBe(2);
    expect(fp.activeProviderIds()).not.toContain('0');
    expect(fp.activeProviderIds()).toContain('1');
    expect(fp.activeProviderIds()).toContain('2');
  });

  it('empties active providers when none respond', async () => {
    const dead = new MockProvider({}); // no eth_blockNumber handler -> throws
    const fp = makeFp([dead, dead], {});
    await fp.refreshLiveliness();
    expect(fp.activeProvidersCount()).toBe(0);
    await expect(fp.send('eth_blockNumber', [])).rejects.toThrow('All providers are unavailable');
  });
});

describe('halt detection', () => {
  it('halts the chain when the median block number stalls past haltDetectionTime', async () => {
    const stuck = new MockProvider({ eth_blockNumber: () => bn(100) });
    const oldTime = Math.floor(Date.now() / 1000) - 10_000;

    const fp = makeFp([stuck], {
      haltDetectionTime: 1,
      getBlockDiscoveryTime: async () => oldTime,
      setBlockDiscoveryTime: async () => {},
    });

    await fp.refreshLiveliness();
    expect(fp.isHalted()).toBe(true);
    await expect(fp.send('eth_blockNumber', [])).rejects.toThrow('Chain has halted');
  });

  it('does not halt when blocks keep advancing', async () => {
    let current = 100;
    const healthy = new MockProvider({
      eth_blockNumber: () => bn(++current),
    });

    const fp = makeFp([healthy], { haltDetectionTime: 60 });
    await fp.refreshLiveliness();
    await fp.refreshLiveliness();
    expect(fp.isHalted()).toBe(false);
    const result = await fp.send('eth_blockNumber', []);
    expect(parseInt(result, 16)).toBeGreaterThan(100);
  });
});

describe('method capability filtering', () => {
  it('routes unsupported methods to capable providers only', async () => {
    const a = new MockProvider({ eth_getBalance: () => '0x1' });
    const b = new MockProvider({ eth_getBalance: () => '0x2' });

    const fp = new FallbackProvider(
      [
        { provider: a, id: 'a', unsupportedMethods: ['eth_getBalance'] },
        { provider: b, id: 'b' },
      ],
      1,
      { batchMaxCount: 1 }
    );

    const result = await fp.send('eth_getBalance', ['0x0']);
    expect(result).toBe('0x2');
    expect(a.calls.some((c) => c.method === 'eth_getBalance')).toBe(false);
    expect(b.calls.some((c) => c.method === 'eth_getBalance')).toBe(true);
  });

  it('always supports chain/blockNumber methods', () => {
    const cfg = { provider: new MockProvider({}), unsupportedMethods: ['eth_chainId', 'eth_getLogs'] } as any;
    expect(providerSupportsMethod(cfg, 'eth_chainId')).toBe(true);
    expect(providerSupportsMethod(cfg, 'eth_blockNumber')).toBe(true);
    expect(providerSupportsMethod(cfg, 'eth_getLogs')).toBe(false);
    expect(providerSupportsMethod({ provider: new MockProvider({}) } as any, 'eth_getLogs')).toBe(true);
    expect(ALWAYS_SUPPORTED_METHODS).toContain('eth_blockNumber');
  });
});

describe('failover and error classification', () => {
  it('fails over to the next provider on transport errors', async () => {
    const a = new MockProvider({ eth_getLogs: () => { throw new Error('transport down'); } });
    const b = new MockProvider({ eth_getLogs: () => 'ok' });

    const fp = makeFp([a, b]);
    expect(await fp.send('eth_getLogs', [])).toBe('ok');
    expect(a.calls.length).toBe(1);
  });

  it('throws immediately on blockchain errors (no failover)', async () => {
    const callException = makeError('revert', 'CALL_EXCEPTION', {
      info: { method: 'eth_call', error: new Error('execution reverted') },
    });
    const a = new MockProvider({ eth_call: () => { throw callException; } });
    const b = new MockProvider({ eth_call: () => 'should-not-be-called' });

    const fp = makeFp([a, b]);
    await expect(fp.send('eth_call', [])).rejects.toThrow('revert');
    expect(b.calls.length).toBe(0);
  });

  it('treats RPC infrastructure failures as non-blockchain errors', () => {
    const infraFailure = makeError('header not found', 'CALL_EXCEPTION', {
      info: { method: 'eth_call', error: new Error('header not found') },
    });
    expect(isBlockchainError(infraFailure)).toBe(false);

    const missingRevertData = Object.assign(new Error('missing revert data'), {
      code: 'CALL_EXCEPTION',
      shortMessage: 'missing revert data',
    });
    expect(isBlockchainError(missingRevertData)).toBe(false);

    expect(isBlockchainError(makeError('insufficient funds', 'INSUFFICIENT_FUNDS', { info: {} }))).toBe(true);
    expect(isBlockchainError(makeError('nonce expired', 'NONCE_EXPIRED', { info: {} }))).toBe(true);
    expect(isBlockchainError(new Error('random transport error'))).toBe(false);
  });

  it('recognizes already-known transactions', () => {
    expect(isAlreadyKnownError(new Error('already known'))).toBe(true);
    expect(isAlreadyKnownError(new Error('nonce too low'))).toBe(false);
  });
});

describe('broadcast', () => {
  it('broadcasts raw transactions to all providers when enabled', async () => {
    const seen: MockProvider[] = [];
    const rawTx = '0x02f86c01808459682f00859682f00' + '0'.repeat(56) + '820deac98080';
    const mk = (latencyMs: number) => {
      const p = new MockProvider({
        eth_sendRawTransaction: async (params: any) => {
          await new Promise((resolve) => setTimeout(resolve, latencyMs));
          return params[0];
        },
      });
      seen.push(p);
      return p;
    };
    const a = mk(30);
    const b = mk(30);

    const fp = new FallbackProvider(
      [
        { provider: a, id: 'a', timeout: 500 },
        { provider: b, id: 'b', timeout: 500 },
      ],
      1,
      { batchMaxCount: 1 },
      undefined,
      { broadcastToAll: true }
    );

    const result = await fp.send('eth_sendRawTransaction', [rawTx]);
    expect(result).toBe(rawTx);
    // Both providers start in parallel before either resolves, so both must record the broadcast.
    expect(seen.length).toBe(2);
    expect(a.calls.some((c) => c.method === 'eth_sendRawTransaction')).toBe(true);
    expect(b.calls.some((c) => c.method === 'eth_sendRawTransaction')).toBe(true);
  });
});

describe('stored block number cache', () => {
  it('uses stored block numbers without hitting the provider', async () => {
    const stored: Record<number, number> = { 0: 100 };
    const provider = new MockProvider({ eth_blockNumber: () => bn(999) });

    const { blockNumbers } = await getBlockNumbersAndMedian([
      {
        provider,
        id: '0',
        getStoredBlockNumber: async () => stored[0] ?? null,
        setStoredBlockNumber: async (value) => { stored[0] = value; },
      },
    ]);

    expect(blockNumbers[0]).toEqual({ blockNumber: 100, fromCache: true });
  });
});
