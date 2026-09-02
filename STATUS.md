# nibiashara-shelves — STATUS

- **Canonical path:** `/Users/motwe/AI Money/client`
- **Repo:** https://github.com/twe-cloud/nibiashara-shelves (public, MIT)
- **Lane:** BUSINESS (Ni Biashara LLC) — distribution arm of the AI Money lane
- **Serves:** https://agents.nibiashara.biz (see `/Users/motwe/AI Money/STATUS.md`)

## Current state (2026-09-01) — agent-first client, NOT yet on npm

Demand problem, not discovery: ~4k 402 probes/day are uptime monitors; real
agent buyers are ~$0. Agents find tools via MCP install + README/llms-style
docs, not x402 directories. This package is the GitHub/npm surface an agent
should install **without a human SKU menu**.

**Shipped:**
- `index.js` — `Shelves` class, zero dependencies. Job helpers
  (`checkCarrierAuthority`, `screenSanctionsName`, `getFxParallel`,
  `buyShelfPass`, …) map onto live `/shelf/:sku`. `buy()` / `buyShelf()` is
  the `buy_shelf` fallback. 1.0 method names remain as aliases. Two payment
  modes: prepaid `pass` (`X-SHELF-PASS`) or an x402-capable `fetch`. 402s
  raise a typed `ShelfError`. `JOBS` exports the helper→SKU map; prices still
  come from `catalog()`.
- `README.md` — leads with jobs + copy-paste MCP install; documents
  `X-SHELF-PASS` as the default repeat path ($0.99 = 110 credits, 1 credit =
  $0.01 list, eligible data shelves ≤ $0.10); points at live `/llms.txt`,
  `/catalog`, `/mcp`, `/docs`, `/.well-known/agent-card.json`. Notes that
  `/.well-known/x402` is being added on the Worker and 404s today.
- `test.js` — live smoke test against production. Free surfaces (catalog,
  JOBS↔catalog, aliases, 402) always run; paid jobs run when `SHELF_PASS` is
  set.

**Verified against production 2026-08-30 (paid path):** catalog returns 19
shelves; unpaid call 402s; sanctions HIT/CLEAR; credits decrement. Live MCP
tools remain cashier-shaped (`list_shelves` / `buy_shelf` / `get_order`) —
job names live in this client, not the Worker.

## Blockers

- **npm publish is founder-gated.** No npm auth on this machine, and the
  `@nibiashara` scope needs an npm account/org. This is the single remaining
  step for the package half of the distribution lane. Tracked in the AI Money
  discovery queue as `npm-publish-shelves-client`.

## Next

1. Craig creates the npm account/org → `npm publish --access public`.
2. Once published, add the install line to the service's `/docs` pages and to
   the awesome-mcp-servers entry (PR punkpeye/awesome-mcp-servers#13225).
3. Keep method coverage in step with `endpoint/src/shop/catalog.ts` — new
   data shelves get a job helper; `buy()` reaches everything immediately.
4. Worker follow-ups (not this repo): job-named MCP tools; `/.well-known/x402`.
