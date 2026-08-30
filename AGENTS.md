# nibiashara-shelves — Agent Grounding

The public MIT client for the Ni Biashara agent shelves. Read
`/Users/motwe/AGENTS.md` first; `/Users/motwe/AI Money/AGENTS.md` and
`/Users/motwe/AI Money/STATUS.md` carry the lane's rules and current state.

**This is its own git repository** (`github.com/twe-cloud/nibiashara-shelves`),
nested inside the AI Money workspace but excluded from the parent by the
parent's `.gitignore`. Commit and push it independently.

## What this is, and what it is deliberately not

A thin convenience wrapper over `https://agents.nibiashara.biz/shelf/:sku`.
Every method is a plain GET that anyone could write themselves, and the README
says so on purpose — the package exists for **distribution**, because agent
developers search npm and GitHub, not because the API needs a client.

It must never become the only way to call the service. If a change here would
make the raw HTTP path harder to use or discover, it is the wrong change.

## Hard rules

- **The service is the source of truth, not this package.** Shelf ids, prices
  and params live in `endpoint/src/shop/catalog.ts`. Never hardcode a price
  here; `catalog()` fetches the live list. Convenience methods name shelves,
  they do not describe them.
- **No dependencies.** It runs on `globalThis.fetch` and Node ≥18. An x402
  signer is the caller's to supply (`opts.fetch`), never a dependency of ours.
- **Never bundle a pass token, wallet key, or any credential.** A pass token is
  bearer money — it belongs in the caller's env, and the README says to keep it
  secret.
- **`test.js` hits production.** It needs a real `SHELF_PASS`; mint one with
  `POST /owner/pass/mint` (owner token) rather than paying. Without a pass it
  still checks the free surfaces and the 402 path, and must keep doing so.
- **npm publish is founder-gated.** There is no npm auth on this machine and
  the `@nibiashara` scope needs an account/org. Do not attempt to publish, and
  do not rename the package to dodge the scope.
- Version bumps follow the service: a new shelf is a minor bump, a changed
  method signature is a major one.

## Dev loop

```bash
SHELF_PASS=pass_… node test.js   # live smoke test against production
```

There is no build step and no transpile — the published files are exactly
`index.js` and `README.md`.
