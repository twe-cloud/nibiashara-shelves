# @nibiashara/shelves

Pay-per-call APIs for AI agents — no API key, no signup, no subscription.

US freight checks (FMCSA carrier authority, safety BASICs, broker authority),
OFAC sanctions screening, and African FX rates (official + street/parallel).
Your agent pays per call in USDC on Base over the
[x402 protocol](https://www.x402.org), or spends credits from a prepaid pass.

Full docs: **https://agents.nibiashara.biz/docs**

```bash
npm i @nibiashara/shelves
```

## Start with a free sample

```js
import { Shelves } from "@nibiashara/shelves";

const shelves = new Shelves();
console.log(await shelves.hello()); // cached USD-KES sample, no payment
console.log(await shelves.catalogPolicy()); // current prices and protocol
```

The sample carries its source date and is not a fresh upstream quote. A cache
miss is reported as unavailable. Freight and sanctions checks are paid shelves;
the free FX sample does not perform those checks.

## Use a pass (simplest — no wallet needed)

Read the live `/catalog` entry for `shelf-pass-100` and `/catalog-policy`
before buying.
The service defines the current price, credit count and eligible shelves; this
client does not freeze a quoted price. A credit is a cent of eligible shelf value,
so different shelves spend different numbers of credits.

Card-funded packs are separate offers; check their displayed prices/credits.
Keep `SHELF_PASS` secret: it is a bearer credential with prepaid value.

```js
import { Shelves } from "@nibiashara/shelves";

const shelves = new Shelves({ pass: process.env.SHELF_PASS });

// Should we tender this load?
const carrier = await shelves.carrierAuthority({ dot: "44110" });
if (carrier.verdict !== "CLEAR") console.log("hold:", carrier.flags);

// Is this counterparty sanctioned?
const screen = await shelves.sanctionsScreen({ name: "Example Trading Co" });
// screen.verdict === "CLEAR" | "REVIEW" | "HIT"

console.log(await shelves.creditsRemaining()); // actual server balance
```

## Or pay per call with a wallet

Bring any x402-capable fetch (e.g. `@x402/fetch` + `@x402/evm`) and the client
uses it — each call settles its own micro-payment.
The payment client is separate from this dependency-free package. Install
`@x402/fetch`, `@x402/core` and `@x402/evm` in the caller's application. Follow
the [official buyer quickstart](https://docs.x402.org/getting-started/quickstart-for-buyers)
to supply an authorized wallet signer with USDC on Base and enforce a spending
limit before making paid calls.

```js
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { Shelves } from "@nibiashara/shelves";

// `signer` is supplied by your existing authorized wallet integration.
const paymentClient = new x402Client();
paymentClient.register("eip155:8453", new ExactEvmScheme(signer));
const shelves = new Shelves({ fetch: wrapFetchWithPayment(fetch, paymentClient) });
// Explicit opt-in: this call pays the current catalog price in USDC on Base.
if (process.env.SHELVES_PAID_CALL === "yes") {
  const carrier = await shelves.carrierAuthority({ dot: "44110" });
  console.log(carrier.verdict);
}
```

## Shelves

| Method | Shelf |
| --- | --- |
| `carrierAuthority({dot\|mc})` | FMCSA authority, safety rating, operating status |
| `carrierSafetyBasics({dot})` | FMCSA SMS safety data, subject to availability and access restrictions |
| `brokerAuthority({mc})` | FMCSA broker authority status |
| `sanctionsScreen({name})` | OFAC SDN + Consolidated screen, ~40k names |
| `fxOfficial({pair})` | Central-bank reference rate |
| `fxOfficialAll()` | All eight African pairs |
| `fxParallel({pair})` | Street rate + spread (USD-NGN, USD-GHS) |
| `fxDailyBrief()` | Every official + parallel quote in one call |
| `buy(sku, params)` | Any shelf by id — see `/catalog` |

Verdicts are deterministic rules-engine output, never an LLM guess. Sanctions
data is refreshed daily from the U.S. Treasury OFAC list service; FMCSA data is
fetched live per call.

## Connect a remote MCP client

Use the hosted **Streamable HTTP** MCP endpoint:
`https://agents.nibiashara.biz/mcp`. In a client that supports remote MCP,
add that URL as a remote server; no local server deployment is required.
An illustrative client configuration (field names vary by client):

```json
{
  "mcpServers": {
    "shelves": {
      "type": "http",
      "url": "https://agents.nibiashara.biz/mcp"
    }
  }
}
```

Or use [Glama's remote Shelves connector and Inspector](https://glama.ai/mcp/connectors/biz.nibiashara/shelves).
The connector is separate from this client repository's local-deployment label.
Discovery does not require a payment credential; paid tools still require the
advertised payment flow or an eligible pass. A bare browser GET is not an MCP
initialization or tool-call test. Never put a pass token in a public config.

## Also available as

- **MCP server** — `https://agents.nibiashara.biz/mcp` (registry id `biz.nibiashara/shelves`)
- **Google A2A agent** — card at `/.well-known/agent-card.json`, JSON-RPC at `/a2a`
- **OpenAPI** — `/openapi.json`, with `x-payment-info` on every route
- **PayAPI Market** — the Africa FX official one-pair shelf is listed and settlement-verified: https://payapi.market/api/ni-biashara-africa-fx-official-one-pair

## Notes

Screening and authority checks are decision aids, not legal advice. Confirm
identity (DOB, address, ID numbers) before acting on a sanctions match, and
verify insurance and surety bonds before tendering freight. FMCSA safety-data
availability and access restrictions apply; public percentiles are not guaranteed.

MIT © Ni Biashara LLC

## Protocol, free discovery and aggregate evidence

The free `/hello` cached sample, `/catalog-policy` and scoped `/stats` aggregate
are deployed. The optional `/free/fx` quota is currently unavailable; inspect the
live response before relying on free daily calls.

Native `/shelf/:sku` uses x402 v2. Older `/api/fx/*` routes retain their v1
JSON compatibility and advertise v2 headers where available. Read
`await shelves.catalogPolicy()` for the supported paths and current prices;
service intake price and full service price are different fields. No future
price increase is promised here.

`await shelves.hello()` reads a tiny cached FX sample without a payment. A cache
miss is reported honestly; it is not a new upstream quote. `freeFx()` requests
the server's optional 10/day edge-IP quota. It can be unavailable until the
server's storage, trusted edge identity and private quota binding are ready. A
claimed wallet address does not grant free calls; a truncated address never
grants repeat-wallet credits. There is no active repeat-wallet allowlist.

`await shelves.stats()` returns only the deployed ledger's scoped aggregate
evidence with a timestamp. Unavailable coverage is not zero revenue. A settled
payment, fulfilled data call, service intake, test transaction and unclassified
payer are different states. A wallet is not a verified person, customer or agent.
There is no public wallet leaderboard or public receipt screenshot.

Run dependency-free local checks with `node --test offline.test.js`. The existing
`test.js` is a separate live smoke check and is not run by this offline command.
