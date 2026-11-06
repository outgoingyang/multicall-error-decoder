import { describe, expect, it } from 'vitest';
import { AbiCoder } from 'ethers';
import { decodeRevertData, ErrorDecoder } from '../src/error-decoder';
import { ErrorType } from '../src/error-decoder/enums';

const coder = AbiCoder.defaultAbiCoder();

function encodeErrorString(reason: string): string {
  return '0x08c379a0' + coder.encode(['string'], [reason]).slice(2);
}

describe('ErrorDecoder', () => {
  it('decodes Error(string) revert reasons', () => {
    const decoded = decodeRevertData(encodeErrorString('insufficient balance'));
    expect(decoded.type).toBe(ErrorType.RevertError);
    expect(decoded.reason).toBe('insufficient balance');
    expect(decoded.data).toBe(encodeErrorString('insufficient balance'));
  });

  it('decodes Panic(uint256) codes', () => {
    const data = '0x4e487b71' + coder.encode(['uint256'], [0x12]).slice(2);
    const decoded = decodeRevertData(data);
    expect(decoded.type).toBe(ErrorType.PanicError);
    expect(decoded.reason).toContain('Division or modulo division by zero');
  });

  it('decodes custom errors with a provided ABI', () => {
    // keccak256("MyError(uint256,uint256)") = 0xd1e5a3c4
    const data = '0xd1e5a3c4' + coder.encode(['uint256', 'uint256'], [1, 66]).slice(2);
    const decoded = decodeRevertData(data, ['error MyError(uint256 a, uint256 b)']);
    expect(decoded.type).toBe(ErrorType.CustomError);
    expect(decoded.name).toBe('MyError');
    expect(decoded.signature).toBe('MyError(uint256,uint256)');
    expect(decoded.args?.toArray().map(String)).toEqual(['1', '66']);
  });

  it('reports unknown custom errors without ABI', () => {
    const data = '0xdeadbeef' + coder.encode(['uint256'], [7]).slice(2);
    const decoded = decodeRevertData(data);
    expect(decoded.type).toBe(ErrorType.CustomError);
    expect(decoded.selector).toBe('0xdeadbeef');
    expect(decoded.reason).toContain('No ABI for custom error');
  });

  it('classifies empty revert data', () => {
    const decoded = decodeRevertData('0x');
    expect(decoded.type).toBe(ErrorType.EmptyError);
  });

  it('classifies revert messages without data', () => {
    const decoder = new ErrorDecoder();
    const decoded = decoder.decodeData(undefined, new Error('execution reverted'));
    expect(decoded.type).toBe(ErrorType.EmptyError);
    expect(decoded.reason).toBe('execution reverted (no revert data)');
  });

  it('classifies user rejections', () => {
    const decoder = new ErrorDecoder();
    const decoded = decoder.decodeData(undefined, new Error('User rejected the transaction'));
    expect(decoded.type).toBe(ErrorType.UserRejectError);
  });

  it('classifies rpc errors by code', () => {
    const decoder = new ErrorDecoder();
    const err = new Error('network timeout') as any;
    err.code = 'NETWORK_ERROR';
    const decoded = decoder.decodeData(undefined, err);
    expect(decoded.type).toBe(ErrorType.RpcError);
    expect(decoded.name).toBe('NETWORK_ERROR');
  });
});
