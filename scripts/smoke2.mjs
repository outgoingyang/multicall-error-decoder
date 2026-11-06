import { createPublicClient, http, parseAbi, decodeFunctionResult } from 'viem';
import { mainnet } from 'viem/chains';
import { multicall, decodeViemError, SimpleFallbackProvider } from '../dist/index.js';
import { JsonRpcProvider, isError } from 'ethers';

const rpc = 'https://ethereum-rpc.publicnode.com';
const client = createPublicClient({ transport: http(rpc) });
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// 1) viem multicall
const res = await multicall({
  client,
  calls: [
    { target: WETH, abi: parseAbi(['function name() view returns (string)']), method: 'name' },
    { target: USDC, abi: parseAbi(['function symbol() view returns (string)']), method: 'symbol' },
  ],
});
console.log('viem multicall block:', res.blockNumber.toString());
for (const r of res.results) console.log('  ', r.success, Array.isArray(r.decoded) ? r.decoded.map(String) : r.decoded);

// 2) revert item inside a batch (allowFailure)
const res2 = await multicall({
  client,
  calls: [
    { target: WETH, abi: parseAbi(['function name() view returns (string)']), method: 'name' },
    {
      target: WETH,
      abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
      method: 'transfer',
      args: ['0x0000000000000000000000000000000000000001', 10n ** 24n], // from zero address -> revert
    },
  ],
});
const failed = res2.results[1];
console.log('batch revert item:', failed.success, JSON.stringify({
  type: failed.error?.type,
  reason: failed.error?.reason,
  name: failed.error?.name,
}));

// 3) viem readContract error -> decodeViemError
try {
  await client.readContract({
    address: WETH,
    abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
    functionName: 'transfer',
    args: ['0x0000000000000000000000000000000000000001', 10n ** 24n],
  });
} catch (e) {
  const decoded = decodeViemError(e, { abis: [parseAbi(['error TransferFailed()'])] });
  console.log('viem error decode:', decoded.type, '| reason:', decoded.reason);
}

// 4) ethers provider.eth_call failure -> ErrorDecoder.decode
const provider = new JsonRpcProvider(rpc, 1, { staticNetwork: true });
const { ErrorDecoder } = await import('../dist/index.js');
const decoder = new ErrorDecoder([['function transfer(address,uint256) returns (bool)']]);
try {
  await provider.call({
    to: WETH,
    data: (await import('ethers')).Interface.from(['function transfer(address,uint256) returns (bool)']).encodeFunctionData('transfer', ['0x0000000000000000000000000000000000000001', 10n ** 24n]),
  });
} catch (e) {
  const decoded = await decoder.decode(e);
  console.log('ethers decode:', decoded.type, '| reason:', decoded.reason, '| signature:', decoded.signature);
}

process.exit(0);
