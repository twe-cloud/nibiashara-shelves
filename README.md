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

The `shelf-pass-100` SKU costs **$0.99** and carries **110 credits** ($1.10 of
shelf value). Each credit covers **$0.01 of list price**, so a $0.10 carrier
check costs 10 credits, a $0.02 sanctions screen costs 2, and a $0.25 check
costs 25. Passes work on **data shelves priced ≤ $0.25**; they do not cover
higher-priced data or service intake/balances. The SKU id retains its original
name; it does not mean 100 credits or one credit per call.

Prices and eligibility come from the [live catalog](https://agents.nibiashara.biz/catalog).
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

console.log(await shelves.creditsRemaining()); // 98 if a fresh 110-credit pass paid for both calls (10 + 2)
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

## Notes

Screening and authority checks are decision aids, not legal advice. Confirm
identity (DOB, address, ID numbers) before acting on a sanctions match, and
verify insurance and surety bonds before tendering freight.

MIT © Ni Biashara LLC
