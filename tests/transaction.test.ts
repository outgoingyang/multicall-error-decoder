import { describe, expect, it } from 'vitest';
import { AbiCoder, Interface, type Provider, type TransactionReceipt, type TransactionResponse } from 'ethers';
import { getRevertReason, waitForTransaction, decodeReceiptLogs } from '../src/transaction/ethers';
import { TransactionRevertedError, TransactionTimeoutError } from '../src/transaction/types';

const coder = AbiCoder.defaultAbiCoder();
const HASH = '0x' + 'ab'.repeat(32);
const LOG_ADDRESS = '0x' + '33'.repeat(20);

const transferIface = Interface.from([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

const transferLog = {
  address: LOG_ADDRESS,
  topics: [
    transferIface.getEvent('Transfer')!.topicHash,
    '0x' + '00'.repeat(12) + '11'.repeat(20),
    '0x' + '00'.repeat(12) + '22'.repeat(20),
  ],
  data: '0x' + coder.encode(['uint256'], [1000]).slice(2),
};

function successReceipt(): TransactionReceipt {
  return { hash: HASH, status: 1, blockNumber: 16n, logs: [transferLog] } as unknown as TransactionReceipt;
}

function revertedReceipt(): TransactionReceipt {
  return { hash: HASH, status: 0, blockNumber: 16n, logs: [] } as unknown as TransactionReceipt;
}

type StubOptions = {
  waitForTransaction?: (hash: string, confirms?: number, timeout?: number) => Promise<TransactionReceipt | null>;
  getTransactionReceipt?: (hash: string) => Promise<TransactionReceipt | null>;
  getTransaction?: (hash: string) => Promise<TransactionResponse | null>;
  call?: (tx: any) => Promise<any>;
};

/** Stub provider covering exactly the surface the transaction helpers touch. */
function stubProvider(opts: StubOptions): Provider {
  return {
    waitForTransaction: opts.waitForTransaction ?? (async () => successReceipt()),
    getTransactionReceipt: opts.getTransactionReceipt ?? (async () => successReceipt()),
    getTransaction: opts.getTransaction ?? (async () => ({ data: '0x', from: '0x0', to: '0x1', value: 0n } as any)),
    call: opts.call ?? (async () => '0x'),
  } as unknown as Provider;
}

describe('waitForTransaction (ethers)', () => {
  it('resolves with receipt and decoded logs on success', async () => {
    const { receipt, logs } = await waitForTransaction({
      provider: stubProvider({}),
      hash: HASH,
      abis: { [LOG_ADDRESS]: ['event Transfer(address indexed from, address indexed to, uint256 value)'] },
    });

    expect((receipt as any).status).toBe(1);
    expect(logs).toHaveLength(1);
    expect(logs[0].name).toBe('Transfer');
    expect(logs[0].args?.map(String)).toEqual(['0x' + '11'.repeat(20), '0x' + '22'.repeat(20), '1000']);
  });

  it('keeps unmatched logs undecoded', async () => {
    const { logs } = await waitForTransaction({
      provider: stubProvider({}),
      hash: HASH,
      abis: { ['0x' + '44'.repeat(20)]: ['event Other()'] },
    });
    expect(logs).toEqual([]);
  });

  it('throws TransactionRevertedError with decoded reason on revert', async () => {
    const revertData = '0x08c379a0' + coder.encode(['string'], ['Insufficient balance']).slice(2);

    let caught: unknown;
    try {
      await waitForTransaction({
        provider: stubProvider({
          waitForTransaction: async () => revertedReceipt(),
          getTransactionReceipt: async () => revertedReceipt(),
          getTransaction: async () => ({ data: '0x', from: '0x0', to: '0x1', value: 0n } as any),
          call: async () => {
            const e = new Error('execution reverted') as any;
            e.data = revertData;
            throw e;
          },
        }),
        hash: HASH,
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(TransactionRevertedError);
    const err = caught as TransactionRevertedError;
    expect(err.decoded.type).toBe('RevertError');
    expect(err.decoded.reason).toBe('Insufficient balance');
    expect(err.hash).toBe(HASH);
    expect((err.receipt as any).status).toBe(0);
  });

  it('returns decodedError instead of throwing when throwOnRevert=false', async () => {
    const { decodedError, receipt } = await waitForTransaction({
      provider: stubProvider({
        waitForTransaction: async () => revertedReceipt(),
        getTransactionReceipt: async () => revertedReceipt(),
        call: async () => {
          const e = new Error('execution reverted') as any;
          e.data = '0x'; // plain require() — empty revert data
          throw e;
        },
      }),
      hash: HASH,
      throwOnRevert: false,
    });

    expect((receipt as any).status).toBe(0);
    expect(decodedError?.type).toBe('EmptyError');
    expect(decodedError?.reason).toBe('execution reverted (no revert data)');
  });

  it('throws TransactionTimeoutError when the receipt never arrives', async () => {
    await expect(
      waitForTransaction({
        provider: stubProvider({ waitForTransaction: async () => null }),
        hash: HASH,
        timeout: 1234,
      })
    ).rejects.toBeInstanceOf(TransactionTimeoutError);
  });

  it('propagates replacement notifications from the underlying provider', async () => {
    const replacementError = Object.assign(new Error('transaction has been replaced'), {
      code: 'TRANSACTION_REPLACED',
      reason: 'repriced',
    });
    const replaced: unknown[] = [];
    await expect(
      waitForTransaction({
        provider: stubProvider({
          waitForTransaction: async () => {
            throw replacementError;
          },
        }),
        hash: HASH,
        onReplaced: (info) => replaced.push(info),
      })
    ).rejects.toThrow('replaced');
    expect(replaced).toHaveLength(1);
    expect((replaced[0] as any).reason).toBe('repriced');
  });
});

describe('getRevertReason (ethers)', () => {
  it('recovers a custom error by replaying the tx', async () => {
    const revertData = '0xd1e5a3c4' + coder.encode(['uint256', 'uint256'], [1, 66]).slice(2);

    const decoded = await getRevertReason(
      stubProvider({
        getTransactionReceipt: async () => revertedReceipt(),
        call: async () => {
          const e = new Error('execution reverted') as any;
          e.data = revertData;
          throw e;
        },
      }),
      HASH,
      ['error MyError(uint256 a, uint256 b)']
    );

    expect(decoded.name).toBe('MyError');
    expect(decoded.args?.toArray().map(String)).toEqual(['1', '66']);
  });

  it('throws for successful transactions', async () => {
    await expect(
      getRevertReason(stubProvider({ getTransactionReceipt: async () => successReceipt() }), HASH)
    ).rejects.toThrow('no revert reason');
  });

  it('throws when the transaction is not found', async () => {
    await expect(
      getRevertReason(stubProvider({ getTransactionReceipt: async () => null, getTransaction: async () => null }), HASH)
    ).rejects.toThrow('not found');
  });
});

describe('decodeReceiptLogs', () => {
  it('returns [] without an ABI map', () => {
    expect(decodeReceiptLogs(successReceipt())).toEqual([]);
  });

  it('decodes matching logs and tolerates mismatches', () => {
    const logs = decodeReceiptLogs(successReceipt(), {
      [LOG_ADDRESS]: 'event Transfer(address indexed from, address indexed to, uint256 value)',
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].name).toBe('Transfer');
  });
});
