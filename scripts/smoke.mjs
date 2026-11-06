import { JsonRpcProvider } from 'ethers';
import { multicall } from '../dist/index.js';
import { SimpleFallbackProvider } from '../dist/index.js';

const rpc = 'https://ethereum-rpc.publicnode.com';

const provider = new JsonRpcProvider(rpc, 1, { staticNetwork: true });
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

try {
  const res = await multicall({
    provider,
    calls: [
      { target: WETH, abi: ['function name() view returns (string)'], method: 'name' },
      { target: USDC, abi: ['function symbol() view returns (string)'], method: 'symbol' },
      { target: USDC, abi: ['function totalSupply() view returns (uint256)'], method: 'totalSupply' },
    ],
  });
  console.log('multicall blockNumber:', res.blockNumber.toString());
  for (const r of res.results) {
    console.log('  success:', r.success, 'decoded:', Array.isArray(r.decoded) ? r.decoded.map(String) : r.decoded, 'error:', r.error?.reason ?? null);
  }
} catch (e) {
  console.log('multicall test failed:', e.message);
}

try {
  const fb = new SimpleFallbackProvider({
    entries: [
      { provider: new JsonRpcProvider(rpc, undefined, { staticNetwork: true }), timeout: 8000 },
      { provider: new JsonRpcProvider('https://eth.llamarpc.com', undefined, { staticNetwork: true }), timeout: 8000 },
    ],
  });
  const net = await fb.getNetwork();
  const bn = await fb.getBlockNumber();
  console.log('fallback network:', net.chainId.toString(), 'blockNumber:', bn, 'preferred:', fb.preferredIndex);
} catch (e) {
  console.log('fallback test failed:', e.message);
}

process.exit(0);
