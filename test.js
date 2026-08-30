/**
 * Live smoke test. Needs a pass token:
 *   SHELF_PASS=pass_… node test.js
 * Without one it still checks the free surfaces and the 402 path.
 */
import assert from "node:assert/strict";
import { Shelves, ShelfError } from "./index.js";

const pass = process.env.SHELF_PASS ?? null;
let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL ${name}: ${err.message}`);
  }
}

console.log("free surfaces");
const anon = new Shelves();
await check("catalog lists every shelf", async () => {
  const cat = await anon.catalog();
  assert.ok(cat.shelves.length >= 19, `expected ≥19 shelves, got ${cat.shelves.length}`);
});
await check("an unpaid call raises a 402 ShelfError", async () => {
  await assert.rejects(() => anon.fxOfficialAll(), (err) => err instanceof ShelfError && err.status === 402);
});

if (!pass) {
  console.log("\n(no SHELF_PASS set — skipping paid shelves)");
  process.exit(failures ? 1 : 0);
}

console.log("\npaid shelves (via pass)");
const s = new Shelves({ pass });
await check("carrierAuthority returns a verdict", async () => {
  const r = await s.carrierAuthority({ dot: "44110" });
  assert.ok(["CLEAR", "REVIEW", "DO_NOT_TENDER"].includes(r.verdict), `verdict was ${r.verdict}`);
  assert.ok(r.carrier.legal_name);
});
await check("carrierSafetyBasics returns BASIC rows", async () => {
  const r = await s.carrierSafetyBasics({ dot: "44110" });
  assert.ok(Array.isArray(r.basics) && r.basics.length > 0);
});
await check("brokerAuthority resolves an MC number", async () => {
  const r = await s.brokerAuthority({ mc: "515000" });
  assert.ok(r.verdict);
});
await check("sanctionsScreen flags a listed entity", async () => {
  const r = await s.sanctionsScreen({ name: "Banco Nacional de Cuba" });
  assert.equal(r.verdict, "HIT");
  assert.ok(r.matches.length > 0);
});
await check("sanctionsScreen clears an unlisted name", async () => {
  const r = await s.sanctionsScreen({ name: "Kanairo Drop Logistics LLC" });
  assert.equal(r.verdict, "CLEAR");
});
await check("fxOfficialAll returns every pair", async () => {
  const r = await s.fxOfficialAll();
  assert.ok(r.rates.length >= 8, `got ${r.rates?.length} rates`);
});
await check("credits decrement and are readable", async () => {
  const left = await s.creditsRemaining();
  assert.ok(typeof left === "number" && left >= 0, `credits were ${left}`);
  console.log(`       (${left} credits left on this pass)`);
});

console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
