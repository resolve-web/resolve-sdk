# @resolve-protocol/sdk

TypeScript SDK for the **Resolve** binary prediction-market protocol on Stellar Soroban.

- Strict TypeScript, dual **ESM + CJS** build (`tsup`)
- Uses `@stellar/stellar-sdk` `AssembledTransaction` for simulate / sign / send
- Reads always go through Soroban RPC (no mocked balances)
- `contractId` is always supplied by you — no hardcoded deployments

## Requirements

- Node.js **20+**

## Install

```bash
npm install github:resolve-web/resolve-sdk
```

The package name is reserved as `@resolve-protocol/sdk`, but a public npm release has not been published yet. Pin a commit SHA for production builds.

## Configure

The Testnet preset points to the verified public Resolve deployment. Futurenet retains a placeholder that must be overridden:

```ts
import {
  ResolveClient,
  TESTNET,
  withContractId,
  basicNodeSigner,
} from "@resolve-protocol/sdk";
import { Keypair } from "@stellar/stellar-sdk";

const config = withContractId(TESTNET, process.env.RESOLVE_CONTRACT_ID!);

const keypair = Keypair.fromSecret(process.env.SECRET_KEY!);
const { signTransaction, signAuthEntry } = basicNodeSigner(
  keypair,
  config.networkPassphrase,
);

const client = new ResolveClient({
  ...config,
  publicKey: keypair.publicKey(),
  signTransaction,
  signAuthEntry,
});
```

Or construct the config object yourself:

```ts
import type { ResolveNetworkConfig } from "@resolve-protocol/sdk";

const config: ResolveNetworkConfig = {
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  contractId: "C...", // required — your deployment
};
```

See `.env.example` for suggested environment variables.

## API

### Writes

Write helpers return an [`AssembledTransaction`](https://stellar.github.io/js-stellar-sdk/reference/contracts-client/). Call `signAndSend()` (or export XDR) yourself:

```ts
import { Outcome, Side, toContractAmount } from "@resolve-protocol/sdk";

const createTx = await client.createMarket({
  creator: keypair.publicKey(),
  resolver: keypair.publicKey(),
  question: "Will ETH be above $5k on 2026-12-31?",
  description: "Resolved from Coinbase spot at 23:59 UTC.",
  token: "C...USDC",
  closeAt: Math.floor(Date.now() / 1000) + 86_400,
  resolutionTimeout: 3600,
});
const { result: marketId } = await createTx.signAndSend();

const stakeTx = await client.stakeYes({
  user: keypair.publicKey(),
  marketId,
  amount: toContractAmount("10", 7), // human → i128
});
await stakeTx.signAndSend();

const resolveTx = await client.resolveMarket({
  marketId,
  outcome: Outcome.Yes,
});
await resolveTx.signAndSend();

// Also available: stake, stakeNo, invalidateMarket, claim
```

Skip simulation when you only need XDR:

```ts
const tx = await client.stake(
  { user, marketId, side: Side.No, amount: 10_000_000n },
  { simulate: false },
);
const xdr = tx.built?.toXDR(); // assemble further as needed
```

### Reads

Reads simulate against RPC and return mapped TypeScript values:

```ts
const market = await client.getMarket(marketId);
const position = await client.getPosition(marketId, user);
const claimable = await client.getClaimable(marketId, user);
const nextId = await client.getNextMarketId();
```

### Amounts

```ts
import { toContractAmount, fromContractAmount } from "@resolve-protocol/sdk";

const raw = toContractAmount("1.5", 7); // 15000000n
const human = fromContractAmount(raw, 7); // "1.5"
```

### Errors

Contract errors `1–18` normalize to stable codes:

```ts
import { parseResolveError, ResolveErrorCode } from "@resolve-protocol/sdk";

try {
  await (await client.claim({ user, marketId })).signAndSend();
} catch (e) {
  const err = parseResolveError(e);
  if (err?.code === ResolveErrorCode.ALREADY_CLAIMED) {
    // ...
  }
}
```

### Events (indexer)

```ts
import { marketCreatedTopics, stakedTopics } from "@resolve-protocol/sdk";

const filter = marketCreatedTopics({ creator: publicKey });
// filter.topics → base64 ScVal topics for rpc.Server.getEvents
```

## Contract surface

| Method | Notes |
|--------|--------|
| `create_market` | → `u64` market id |
| `stake` | `Side`: Yes=0, No=1 |
| `resolve` | `Outcome`: Yes / No / Invalid |
| `invalidate` | after `close_at + resolution_timeout` |
| `claim` | → `i128` paid amount |
| `get_market` / `get_position` / `get_claimable` / `next_market_id` | views |

## Scripts

```bash
npm install
npm test
npm run typecheck
npm run build
```

## License

Apache-2.0 — see [LICENSE](./LICENSE).
