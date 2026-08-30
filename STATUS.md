# nibiashara-shelves — STATUS

- **Canonical path:** `/Users/motwe/AI Money/client`
- **Repo:** https://github.com/twe-cloud/nibiashara-shelves (public, MIT)
- **Lane:** BUSINESS (Ni Biashara LLC) — distribution arm of the AI Money lane
- **Serves:** https://agents.nibiashara.biz (see `/Users/motwe/AI Money/STATUS.md`)

## Current state (2026-08-30) — written, tested, NOT yet on npm

Created this session because the AI Money funnel showed the problem is demand,
not discovery: ~4,000 402-probes a day, essentially all of them uptime and
trust monitors rather than buyers. Listing harder in the x402 directories adds
monitors; reaching developers who *install tools* is the durable path, and that
audience lives on npm and GitHub.

**Shipped:**
- `index.js` — `Shelves` class, zero dependencies. Two payment modes behind one
  call surface: a prepaid `pass` (sent as `X-SHELF-PASS`) or an x402-capable
  `fetch`. Named methods for the freight, compliance and FX shelves, plus
  `buy(sku, params)` for anything in `/catalog`. 402s raise a typed `ShelfError`
  carrying status, sku and body.
- `test.js` — live smoke test against production. **8/8 passing** with a pass
  token (free surfaces, 402 path, carrier authority, safety BASICs, broker
  authority, sanctions HIT and CLEAR, FX, credit balance).
- `README.md`, `LICENSE` (MIT), repo topics set for discovery.

**Verified against production 2026-08-30:** catalog returns 19 shelves; an
unpaid call 402s; `sanctionsScreen("Banco Nacional de Cuba")` → HIT and
`sanctionsScreen("Kanairo Drop Logistics LLC")` → CLEAR; credits decrement and
read back.

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
   shelves are reachable via `buy()` immediately, a named method is optional
   sugar.
