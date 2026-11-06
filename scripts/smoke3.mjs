import { JsonRpcProvider } from 'ethers';
import { mainnet } from 'viem/chains';
import {
  FallbackProvider,
  createViemFallbackClient,
  probeRpcEndpoints,
  waitForTransactionEth,
  getRevertReason,
  multicall,
  decodeViemError,
} from '../dist/index.js';
import { parseAbi } from 'viem';

const GOOD1 = 'https://ethereum-rpc.publicnode.com';
const GOOD2 = 'https://eth.drpc.org';
const DEAD = 'https://dead-rpc.invalid.example';
const WETH = '0xc02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'.toLowerCase();
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase();
const TOKENS = new Set([WETH, USDC]);

// ---------- 1) Full FallbackProvider: failover from dead provider ----------
console.log('--- FallbackProvider (full port) ---');
{
  const fp = new FallbackProvider(
    [
      { provider: new JsonRpcProvider(DEAD, 1), timeout: 3000, id: 'dead' },
      { provider: new JsonRpcProvider(GOOD1, 1), timeout: 8000, id: 'good' },
      { provider: new JsonRpcProvider(GOOD2, 1), timeout: 8000, id: 'good2' },
    ],
    1,
    { batchMaxCount: 1 },
    { warn: () => {}, error: () => {} },
    { allowableBlockLag: 5 }
  );
  const bn = await fp.getBlockNumber();
  console.log('blockNumber via failover:', bn);
  await fp.refreshLiveliness();
  console.log('active providers after liveliness:', fp.activeProvidersCount(), fp.activeProviderIds());
  console.log('halted:', fp.isHalted());
  console.log('chainId:', await fp.send('eth_chainId', []));
}

// ---------- 2) probeRpcEndpoints + viem fallback client ----------
console.log('--- viem fallback transport ---');
{
  const probes = await probeRpcEndpoints([DEAD, GOOD1, GOOD2], { timeout: 4000 });
  for (const p of probes) {
    console.log(`  ${p.url} ok=${p.ok} chain=${p.chainId} block=${p.blockNumber} latency=${p.latencyMs}ms ${p.error ?? ''}`);
  }
  const ordered = probes.filter((p) => p.ok && !p.error).map((p) => p.url);
  const client = createViemFallbackClient({ urls: ordered, chain: mainnet, timeout: 8000 });
  console.log('viem fallback client block:', await client.getBlockNumber());

  try {
    await client.readContract({
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      abi: parseAbi(['function transfer(address,uint256) returns (bool)']),
      functionName: 'transfer',
      args: ['0x0000000000000000000000000000000000000001', 10n ** 24n],
    });
  } catch (e) {
    const d = decodeViemError(e);
    console.log('viem fallback read error decoded:', d.type, '|', d.reason);
  }
}

// ---------- 3) hunt reverted + log-rich txs in recent blocks ----------
console.log('--- live tx recovery ---');
const provider = new JsonRpcProvider(GOOD1, 1);
{
  const latest = await provider.getBlockNumber();
  let revertedHash = null;
  let logTxReceipt = null;

  for (let b = latest - 1; b > latest - 8 && (!revertedHash || !logTxReceipt); b--) {
    const block = await provider.getBlock(b);
    const hashes = (block?.transactions ?? []).filter((h) => typeof h === 'string').slice(0, 20);
    const receipts = await Promise.all(hashes.map((h) => provider.getTransactionReceipt(h).catch(() => null)));

    if (!revertedHash) {
      const reverted = receipts.find((r) => r && r.status === 0);
      if (reverted) revertedHash = reverted.hash;
    }
    if (!logTxReceipt) {
      const withLogs = receipts.find(
        (r) => r && r.status === 1 && r.logs.some((l) => TOKENS.has(l.address.toLowerCase()))
      );
      if (withLogs) logTxReceipt = withLogs;
    }
  }

  if (revertedHash) {
    console.log('found reverted tx:', revertedHash.slice(0, 20) + '...');
    const res = await waitForTransactionEth({ provider, hash: revertedHash, throwOnRevert: false });
    console.log('decoded revert:', res.decodedError?.type, '|', res.decodedError?.reason, '| name:', res.decodedError?.name);
    const reason = await getRevertReason(provider, revertedHash);
    console.log('getRevertReason:', reason.type, '|', reason.reason, '| signature:', reason.signature);
  } else {
    console.log('no reverted tx found in scanned blocks');
  }

  if (logTxReceipt) {
    console.log('log-rich tx:', logTxReceipt.hash.slice(0, 20) + '...', 'logs:', logTxReceipt.logs.length);
    const res = await waitForTransactionEth({
      provider,
      hash: logTxReceipt.hash,
      abis: {
        [WETH]: ['event Transfer(address indexed from, address indexed to, uint256 value)'],
        [USDC]: ['event Transfer(address indexed from, address indexed to, uint256 value)'],
      },
    });
    const decoded = res.logs.filter((l) => l.name);
    console.log('decoded logs:', decoded.length, '/', res.logs.length);
    if (decoded[0]) console.log('  sample:', decoded[0].name, decoded[0].args?.map(String).slice(0, 3));
  } else {
    console.log('no token-transfer tx found in scanned blocks');
  }
}

// ---------- 4) multicall through the full FallbackProvider ----------
console.log('--- multicall through FallbackProvider ---');
{
  const fp = new FallbackProvider(
    [
      { provider: new JsonRpcProvider(GOOD1, 1), timeout: 8000, id: 'p1' },
      { provider: new JsonRpcProvider(GOOD2, 1), timeout: 8000, id: 'p2' },
    ],
    1,
    { batchMaxCount: 1 }
  );
  const res = await multicall({
    provider: fp,
    calls: [
      { target: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', abi: ['function symbol() view returns (string)'], method: 'symbol' },
      { target: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', abi: ['function name() view returns (string)'], method: 'name' },
    ],
  });
  console.log('block:', res.blockNumber.toString(), 'results:', res.results.map((r) => (r.success ? r.decoded[0] : r.error?.reason)));
}

process.exit(0);
