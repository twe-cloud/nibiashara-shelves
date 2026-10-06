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

## Use a pass (simplest — no wallet needed)

Read the live `/catalog` entry for `shelf-pass-100` and `/catalog-policy` before buying.
The service defines the current price, credit count and eligible shelves; this
client does not freeze a quoted price. A credit is a cent of eligible shelf value,
so different shelves spend different numbers of credits.

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

```js
import { wrapFetchWithPayment } from "@x402/fetch";
import { Shelves } from "@nibiashara/shelves";

const shelves = new Shelves({ fetch: wrapFetchWithPayment(fetch, signer) });
const rate = await shelves.fxParallel({ pair: "USD-NGN" });
```

## Shelves

| Method | Shelf |
| --- | --- |
| `carrierAuthority({dot\|mc})` | FMCSA authority, safety rating, operating status |
| `carrierSafetyBasics({dot})` | FMCSA SMS BASIC percentiles + intervention flags |
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

## Also available as

- **MCP server** — `https://agents.nibiashara.biz/mcp` (registry id `biz.nibiashara/shelves`)
- **Google A2A agent** — card at `/.well-known/agent-card.json`, JSON-RPC at `/a2a`
- **OpenAPI** — `/openapi.json`, with `x-payment-info` on every route

## Notes

Screening and authority checks are decision aids, not legal advice. Confirm
identity (DOB, address, ID numbers) before acting on a sanctions match, and
verify insurance and surety bonds before tendering freight.

MIT © Ni Biashara LLC

## Protocol, free discovery and aggregate evidence

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
