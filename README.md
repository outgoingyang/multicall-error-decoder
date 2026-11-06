# multicall-error-decoder

Practical helpers for working with Ethereum transactions in **ethers v6** and **viem**: multicall batching with per-call error decoding, a sane `waitForTransaction`, a revert reason / custom error decoder, and RPC fallback providers with liveliness checks.

If you have ever lost an afternoon to `CALL_EXCEPTION` with no data, a batch call where one item failed and you couldn't tell which, or an RPC that died mid-deployment, this package is for you.

## Who is it for

**dApp developers (frontend and backend).** You keep running into `CALL_EXCEPTION`, `execution reverted` and custom errors that arrive as raw hex. Instead of showing users "transaction failed", you can show the decoded reason: `decodeViemError` for viem/wagmi stacks, `ErrorDecoder` for ethers, both handling wallet rejections and empty revert data.

**Backend, indexer and bot developers.** You make a lot of `eth_call`s, so you want multicall, and you want to know why a transaction failed, not just that it failed. The package gives you batch reads with per-call revert decoding, a `waitForTransaction` with a real timeout and replacement handling, plus `getRevertReason(txHash)` for transactions that are already mined.

**Smart contract developers.** In hardhat tests and deploy scripts you decode reverts constantly. Wire your artifact ABIs into `new ErrorDecoder(abis)` once and every failed call in your tests comes back with the custom error name, signature and arguments instead of an opaque hex string.

**MEV, searcher and arbitrage bots.** Speed and reliability matter. Revert data is decoded locally from raw bytes with no extra RPC round trip, batch reads keep your quote assembly in one `eth_call`, and `FallbackProvider` handles RPC failover, stale-provider eviction, chain-halt detection and `eth_sendRawTransaction` broadcast to all providers (or MEV-protected only).

## What it does

### 1. Multicall: batch read calls for ethers and viem

Batches many contract calls into a single `eth_call` through [Multicall3](https://github.com/mds1/multicall3). One unified API covers an ethers `Provider` and a viem `PublicClient`.

- With `allowFailure: true` a failing item does not sink the whole batch; you get per-call success flags.
- Each failed item carries a decoded revert reason, so multicall errors tell you which call failed and why.
- Calls accept raw calldata or `abi` + `method` + `args`, and results are decoded per call.
- The Multicall3 address is resolved to its canonical deterministic deployment on any chain (override supported).

```ts
import { multicall } from 'multicall-error-decoder';

const res = await multicall({
  provider,                     // ethers v6 Provider
  // client: publicClient,      // ...or viem PublicClient
  allowFailure: true,
  calls: [
    { target: tokenA, abi: erc20Abi, method: 'balanceOf', args: [account] },
    { target: tokenB, abi: erc20Abi, method: 'balanceOf', args: [account] },
    { target: pair, data: '0x...' },
  ],
});

for (const item of res.results) {
  if (item.success) console.log(item.decoded);
  else console.log(item.error?.type, item.error?.reason);
}
```

### 2. waitForTransaction: wait for a transaction without footguns

A wrapper over `provider.waitForTransaction` (ethers) and `client.waitForTransactionReceipt` (viem) that behaves the way production code needs:

- A timeout, so nothing hangs forever.
- Replacement handling through `onReplaced` (`replaced`, `repriced`, `cancelled`).
- The full receipt plus decoded logs when you pass an address to ABI map.
- Automatic revert decoding. If the receipt comes back with `status: 0`, the transaction is replayed with `eth_call`, the revert data is extracted and decoded, and you get a `TransactionRevertedError` carrying the custom error name or string reason.

```ts
import { waitForTransaction } from 'multicall-error-decoder';

try {
  const { receipt, logs } = await waitForTransaction({
    provider,            // or client: publicClient for viem
    hash: txHash,
    confirmations: 1,
    timeout: 60_000,
    abis: { [tokenA.toLowerCase()]: erc20Abi },
    onReplaced: (info) => console.log('tx was', info.reason),
  });
  console.log(logs); // [{ name: 'Transfer', args: [...] }]
} catch (e) {
  if (e.name === 'TransactionRevertedError') {
    console.log(e.decoded.type, e.decoded.reason, e.decoded.args);
  }
}
```

There are also ethers-only and viem-only variants (`waitForTransactionEth`, `waitForTransactionViem`), one-shot send helpers (`sendAndConfirm`, `sendAndConfirmViem`) and standalone log decoders (`decodeReceiptLogs`, `decodeViemReceiptLogs`) for receipts you already have.

### 3. Error decoder: revert reasons and custom errors

The decoder core is ported from [`ethers-decode-error`](https://github.com/dethcrypto/ethers-decode-error) and extended with a viem wrapper. It decodes:

- `Error(string)` revert reasons from raw `0x08c379a0...` data.
- Solidity `Panic(uint256)` codes (`0x4e487b71...`) with human-readable descriptions: overflow, division by zero, out-of-bounds access and friends.
- Custom errors, matched by selector against any ABIs you provide.
- ethers `CALL_EXCEPTION` errors, including the annoying case where the exception happened on a mined transaction; the transaction is replayed to recover the revert data.
- viem error chains (`CallExecutionError` wrapping `ContractFunctionRevertedError`, with `rawData`, `data` and nested `cause`).
- Wallet user rejections and JSON-RPC transport errors.
- Empty revert data (`0x`), which is what old `require()` calls without a message produce. It is reported as `EmptyError` instead of masquerading as an RPC failure.

```ts
import { ErrorDecoder, decodeViemError } from 'multicall-error-decoder';

const decoder = new ErrorDecoder([myAbi, erc20Abi]);

// ethers: any thrown error works here
const decoded = await decoder.decode(error);
decoded.type;    // 'CustomError' | 'RevertError' | 'PanicError' | 'EmptyError' | ...
decoded.reason;  // 'InsufficientBalance'
decoded.args;    // [expected, actual]

// viem: readContract / simulateContract / call errors
const decoded2 = decodeViemError(viemError, { abis: [myAbi] });

// Recover the revert reason of a mined reverted transaction
const reason = await decoder.getRevertReason(provider, txHash);
const reason2 = await getRevertReasonViem(publicClient, txHash);
```

A decoded error looks like this:

| Field | Meaning |
|---|---|
| `type` | `RevertError`, `CustomError`, `PanicError`, `EmptyError`, `UserRejectError`, `RpcError`, `UnknownError` |
| `reason` | Human-readable message |
| `data` | Raw revert data (`0x...`) when available |
| `name`, `signature`, `selector` | Custom error identity: `MyError`, `MyError(uint256,address)`, `0xd1e5a3c4` |
| `args` | Parsed error arguments as an ethers `Result` |

### 4. Fallback provider: RPC redundancy that knows the difference

Two tiers are included.

**`FallbackProvider`** for ethers, a full port of [`ethers-v6-fallback-provider`](https://github.com/wighawag/ethers-v6-fallback-provider):

- Sequential failover with per-provider retries, retry delays and timeouts.
- Liveliness polling: all providers report their block number, the median is computed, and anyone lagging more than `allowableBlockLag` behind it is dropped until it catches up.
- Chain halt detection: if the median stops advancing for `haltDetectionTime` seconds, calls fail fast with `Chain has halted` instead of serving stale data.
- Blockchain versus transport error classification. `INSUFFICIENT_FUNDS`, `CALL_EXCEPTION`, `NONCE_EXPIRED` and friends are thrown immediately because another RPC would fail the same way; network errors trigger failover instead.
- `eth_sendRawTransaction` broadcast to all providers (`broadcastToAll`, with delay and jitter) or to MEV-protected providers only (`broadcastOnlyToMevProtected`).
- Per-provider method capability filters (`supportedMethods` / `unsupportedMethods`) and an optional shared block number cache.

```ts
import { FallbackProvider } from 'multicall-error-decoder';

const provider = new FallbackProvider(
  [
    { provider: new JsonRpcProvider('https://rpc1.example', chainId), timeout: 5_000, retries: 1, id: 'primary' },
    { provider: new JsonRpcProvider('https://rpc2.example', chainId), timeout: 5_000, id: 'secondary' },
  ],
  chainId,
  undefined,
  undefined,
  { allowableBlockLag: 2, livelinessPollingInterval: 30_000, haltDetectionTime: 300, broadcastToAll: true }
);
```

**`SimpleFallbackProvider`** for ethers is the lightweight alternative: it sticks to the last known-good provider, applies a per-call timeout, and short-circuits on blockchain errors.

**For viem**, `createViemFallbackTransport` and `createViemFallbackClient` wrap viem's built-in `fallback()` transport with per-URL timeouts and retries, and `probeRpcEndpoints` ranks endpoints by reachability, chain id and latency before you build the client:

```ts
import { probeRpcEndpoints, createViemFallbackClient } from 'multicall-error-decoder';
import { mainnet } from 'viem/chains';

const probes = await probeRpcEndpoints(['https://rpc-a', 'https://rpc-b'], { expectedChainId: 1 });
const client = createViemFallbackClient({
  urls: probes.filter((p) => p.ok && !p.error).map((p) => p.url),
  chain: mainnet,
  timeout: 8_000,
});
```

## Installation

```bash
npm install multicall-error-decoder ethers viem
```

`ethers` (v6) is a required peer dependency because the decoder and multicall use its ABI engine. `viem` is required too: the package targets both stacks by design.

## API overview

| Module | Exports |
|---|---|
| `multicall-error-decoder/error-decoder` | `ErrorDecoder`, `decodeRevertData`, `decodeViemError`, `getRevertReasonViem`, handlers and result factories |
| `multicall-error-decoder/multicall` | `multicall`, `multicallEth`, `multicallViem`, Multicall3 ABI and address helpers |
| `multicall-error-decoder/transaction` | `waitForTransaction`, `waitForTransactionEth`, `waitForTransactionViem`, `sendAndConfirm`, `sendAndConfirmViem`, `getRevertReason`, `getRevertReasonViem`, `decodeReceiptLogs`, `decodeViemReceiptLogs`, `TransactionRevertedError`, `TransactionTimeoutError` |
| `multicall-error-decoder/provider` | `FallbackProvider`, `SimpleFallbackProvider`, `createViemFallbackTransport`, `createViemFallbackClient`, `probeRpcEndpoints` and helpers |

## FAQ

**Why does my `eth_call` throw `CALL_EXCEPTION` without a reason?**
Contracts built with older Solidity `require()` revert with empty data (`0x`). The decoder classifies this as `EmptyError` instead of pretending it is an RPC error, and it replays reverted receipts to recover reasons wherever the chain can still produce them.

**How do I decode a custom Solidity error from a transaction receipt?**
Pass your ABIs to `new ErrorDecoder(abis)` and call `decoder.decode(error)`. For already-mined reverted transactions the transaction is replayed via `eth_call` and the revert data is decoded against your ABI automatically.

**How do I batch calls without the whole batch failing?**
Use `multicall(..., { allowFailure: true })`. Failed items come back as `success: false` with a decoded error object instead of throwing.

**How do I survive RPC outages?**
Point `FallbackProvider` (ethers) or `createViemFallbackClient` (viem) at several endpoints. Failover, lag-based eviction and halt detection are handled for you.

## Testing

```bash
npm test          # 37 unit tests: decoder vectors, median/halt logic, tx flows, broadcast
npm run smoke     # live integration tests against public Ethereum RPCs
```

## Acknowledgments

Built on ideas and code from [ethers-decode-error](https://github.com/dethcrypto/ethers-decode-error), [ethers-v6-fallback-provider](https://github.com/wighawag/ethers-v6-fallback-provider), [ext-provider-multicall](https://github.com/ricmoo/ext-provider-multicall) and [Multicall3](https://github.com/mds1/multicall).

## License

MIT
