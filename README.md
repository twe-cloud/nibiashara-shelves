# @nibiashara/shelves

Job tools for AI agents — not a human SKU menu.

**Vet a US carrier before tender. Screen an OFAC name. Get the USD-NGN parallel rate. Mint a shelf pass, then debit.**

No API key, no signup, no subscription. Pay with a prepaid pass (`X-SHELF-PASS`) or per call in USDC on Base over [x402](https://www.x402.org). Live store: **https://agents.nibiashara.biz** (19 shelves).

This package is a thin GET wrapper. Anyone can call the same `/shelf/:sku` URLs directly. It exists so an agent (or an LLM reading GitHub) can install a job by name instead of browsing flyers and consults.

```bash
npm i @nibiashara/shelves
```

## Jobs

| Job | Call this | Hits |
| --- | --- | --- |
| Vet a US carrier before tender | `checkCarrierAuthority({ dot \| mc })` | `GET /shelf/carrier-authority-check` |
| Carrier safety BASICs (depth check) | `checkCarrierSafetyBasics({ dot })` | `GET /shelf/carrier-safety-basics` |
| Vet a US freight broker | `checkBrokerAuthority({ mc })` | `GET /shelf/broker-authority-check` |
| Screen an OFAC name | `screenSanctionsName({ name })` | `GET /shelf/sanctions-screen` |
| USD-NGN / USD-GHS parallel rate | `getFxParallel({ pair })` | `GET /shelf/fx-parallel` |
| Official FX, one African pair | `getFxOfficial({ pair })` | `GET /shelf/fx-official` |
| Official FX, all pairs | `getFxOfficialAll()` | `GET /shelf/fx-official-all` |
| Mint a shelf pass, then debit | `buyShelfPass()` | `GET /shelf/shelf-pass-100` |
| Any other catalog id | `buy(sku, params)` / MCP `buy_shelf` | `GET /shelf/:sku` |

Verdicts are deterministic rules-engine output, never an LLM guess. FMCSA data is live per call; OFAC lists refresh daily from Treasury.

Human services (flyer, landing page, founder consult, Swahili copy) are in `/catalog`. Do not start there. Use `buy(sku)` only if you actually need a ticket.

## Install for agents (MCP)

Copy-paste. Remote streamable HTTP, registry id `biz.nibiashara/shelves`.

**Claude Code**

```bash
claude mcp add --transport http nibiashara-shelves https://agents.nibiashara.biz/mcp
```

**Cursor / Claude Desktop / any MCP client** — paste into MCP config:

```json
{
  "mcpServers": {
    "nibiashara-shelves": {
      "url": "https://agents.nibiashara.biz/mcp"
    }
  }
}
```

The live MCP today is cashier-shaped: `list_shelves`, `buy_shelf`, `get_order`. After install, **do not walk the human catalog**. Call `buy_shelf` with a job SKU from the table (`carrier-authority-check`, `sanctions-screen`, `fx-parallel`, `shelf-pass-100`), or use this client's job helpers. `buy_shelf` / `buy()` is the fallback for any id.

## Repeat path: `X-SHELF-PASS`

Default for agents that check every load or counterparty. One payment, then debit — no wallet and no 402 round-trip per call.

- **$0.99** pass → **110 credits** (`shelf-pass-100`)
- **1 credit = $0.01** list price (a $0.10 carrier check costs 10 credits; a $0.02 sanctions screen costs 2)
- Eligible **data shelves priced ≤ $0.10**

```http
GET /shelf/carrier-authority-check?dot=44110
X-SHELF-PASS: pass_…
Accept: application/json
```

Keep the token secret. It is bearer money. Balance (free): `GET /pass/:token`.

```js
import { Shelves } from "@nibiashara/shelves";

const shelves = new Shelves({ pass: process.env.SHELF_PASS });

const carrier = await shelves.checkCarrierAuthority({ dot: "44110" });
if (carrier.verdict !== "CLEAR") console.log("hold:", carrier.flags);

const screen = await shelves.screenSanctionsName({ name: "Example Trading Co" });
// screen.verdict === "CLEAR" | "REVIEW" | "HIT"

const ngn = await shelves.getFxParallel({ pair: "USD-NGN" });

console.log(await shelves.creditsRemaining());
```

Mint a pass with an x402-capable fetch, then this client adopts the token:

```js
const shelves = new Shelves({ fetch: wrapFetchWithPayment(fetch, signer) });
await shelves.buyShelfPass(); // this.pass is now set; further jobs debit it
```

## Or pay per call with a wallet

Bring any x402-capable fetch (e.g. `@x402/fetch` + `@x402/evm`). Each job settles its own micro-payment.

```js
import { wrapFetchWithPayment } from "@x402/fetch";
import { Shelves } from "@nibiashara/shelves";

const shelves = new Shelves({ fetch: wrapFetchWithPayment(fetch, signer) });
const rate = await shelves.getFxParallel({ pair: "USD-NGN" });
```

Prices are not hardcoded here. `catalog()` (and live `/catalog`) is the source of truth.

## Live machine docs

| URL | What |
| --- | --- |
| https://agents.nibiashara.biz/llms.txt | Plain-text map for LLM crawlers |
| https://agents.nibiashara.biz/catalog | Live JSON shelf list (free) |
| https://agents.nibiashara.biz/mcp | MCP server (streamable HTTP) |
| https://agents.nibiashara.biz/docs | Human-readable shelf pages |
| https://agents.nibiashara.biz/.well-known/agent-card.json | Google A2A card; JSON-RPC at `/a2a` |
| https://agents.nibiashara.biz/openapi.json | OpenAPI 3 with `x-payment-info` per route |

`/.well-known/x402` is being added on the Worker. It **404s today** — do not treat it as live yet.

## Notes

Screening and authority checks are decision aids, not legal advice. Confirm identity (DOB, address, ID numbers) before acting on a sanctions match, and verify insurance and surety bonds before tendering freight.

MIT © Ni Biashara LLC
