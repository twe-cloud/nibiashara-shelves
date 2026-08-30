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

One `$0.99` pass carries 100 credits, good on every shelf priced ≤ $0.10.

```js
import { Shelves } from "@nibiashara/shelves";

const shelves = new Shelves({ pass: process.env.SHELF_PASS });

// Should we tender this load?
const carrier = await shelves.carrierAuthority({ dot: "44110" });
if (carrier.verdict !== "CLEAR") console.log("hold:", carrier.flags);

// Is this counterparty sanctioned?
const screen = await shelves.sanctionsScreen({ name: "Example Trading Co" });
// screen.verdict === "CLEAR" | "REVIEW" | "HIT"

console.log(await shelves.creditsRemaining()); // 98
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

| Method | Shelf | Price |
| --- | --- | --- |
| `carrierAuthority({dot\|mc})` | FMCSA authority, safety rating, operating status | $0.10 |
| `carrierSafetyBasics({dot})` | FMCSA SMS BASIC percentiles + intervention flags | $0.10 |
| `brokerAuthority({mc})` | FMCSA broker authority status | $0.10 |
| `sanctionsScreen({name})` | OFAC SDN + Consolidated screen, ~40k names | $0.02 |
| `fxOfficial({pair})` | Central-bank reference rate | $0.01 |
| `fxOfficialAll()` | All eight African pairs | $0.02 |
| `fxParallel({pair})` | Street rate + spread (USD-NGN, USD-GHS) | $0.05 |
| `fxDailyBrief()` | Every official + parallel quote in one call | $0.50 |
| `buy(sku, params)` | Any shelf by id — see `/catalog` | varies |

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
