import { describe, expect, it } from 'vitest';
import { AbiCoder, Interface } from 'ethers';
import { prepareCall, decodeCallResult } from '../src/multicall/ethers';
import { multicall3Address, MULTICALL3_CANONICAL } from '../src/multicall/abi';

const coder = AbiCoder.defaultAbiCoder();
const erc20 = ['function balanceOf(address) view returns (uint256)', 'function name() view returns (string)'];

describe('multicall helpers', () => {
  it('resolves the canonical Multicall3 address', () => {
    expect(multicall3Address(1)).toBe(MULTICALL3_CANONICAL);
  });

  it('encodes calls from abi+method+args', () => {
    const prepared = prepareCall(
      {
        target: '0x0000000000000000000000000000000000000001',
        abi: erc20,
        method: 'balanceOf',
        args: ['0x0000000000000000000000000000000000000002'],
      },
      true
    );
    expect(prepared.data.toLowerCase()).toBe(
      new Interface(erc20)
        .encodeFunctionData('balanceOf', ['0x0000000000000000000000000000000000000002'])
        .toLowerCase()
    );
    expect(prepared.allowFailure).toBe(true);
  });

  it('encodes calls from raw data', () => {
    const prepared = prepareCall(
      { target: '0x0000000000000000000000000000000000000001', data: '0xdeadbeef' },
      false
    );
    expect(prepared.data).toBe('0xdeadbeef');
    expect(prepared.allowFailure).toBe(false);
  });

  it('throws when neither data nor abi+method are provided', () => {
    expect(() =>
      prepareCall({ target: '0x0000000000000000000000000000000000000001' }, true)
    ).toThrow();
  });

  it('decodes successful results and failed reverts', () => {
    const call = prepareCall(
      {
        target: '0x0000000000000000000000000000000000000001',
        abi: erc20,
        method: 'balanceOf',
        args: ['0x0000000000000000000000000000000000000002'],
      },
      true
    );
    const ok = decodeCallResult(
      call,
      true,
      '0x' + '0000000000000000000000000000000000000000000000000000000000000042'
    );
    expect(ok.success).toBe(true);
    expect((ok.decoded as bigint[]).map(String)).toEqual(['66']);

    const reverted = decodeCallResult(
      call,
      false,
      '0x08c379a0' + coder.encode(['string'], ['Insufficient balance']).slice(2)
    );
    expect(reverted.success).toBe(false);
    expect((reverted.error as any).type).toBe('RevertError');
    expect((reverted.error as any).reason).toBe('Insufficient balance');
  });
});
