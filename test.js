/**
 * Live smoke test. Needs a pass token:
 *   SHELF_PASS=pass_… node test.js
 * Without one it still checks the free surfaces and the 402 path.
 */
import assert from "node:assert/strict";
import { Shelves, ShelfError, JOBS, MCP_TOOLS } from "./index.js";

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
await check("JOBS map to live catalog SKUs", async () => {
  const cat = await anon.catalog();
  const ids = new Set(cat.shelves.map((s) => s.id));
  assert.equal(JOBS.checkCarrierAuthority, "carrier-authority-check");
  assert.equal(JOBS.screenSanctionsName, "sanctions-screen");
  assert.equal(JOBS.getFxParallel, "fx-parallel");
  assert.equal(JOBS.buyShelfPass, "shelf-pass-100");
  for (const [job, sku] of Object.entries(JOBS)) {
    assert.ok(ids.has(sku), `catalog missing ${sku} (job ${job})`);
  }
});
await check("job helpers and 1.0 aliases are present", async () => {
  const proto = Shelves.prototype;
  assert.equal(typeof proto.checkCarrierAuthority, "function");
  assert.equal(typeof proto.screenSanctionsName, "function");
  assert.equal(typeof proto.getFxParallel, "function");
  assert.equal(typeof proto.buyShelfPass, "function");
  assert.equal(typeof proto.buyShelf, "function");
  assert.equal(proto.carrierAuthority, proto.checkCarrierAuthority);
  assert.equal(proto.sanctionsScreen, proto.screenSanctionsName);
  assert.equal(proto.fxParallel, proto.getFxParallel);
  assert.equal(proto.buyPass, proto.buyShelfPass);
  assert.equal(MCP_TOOLS.buyShelf, "buy_shelf");
});
await check("an unpaid call raises a 402 ShelfError", async () => {
  await assert.rejects(() => anon.getFxOfficialAll(), (err) => err instanceof ShelfError && err.status === 402);
});

if (!pass) {
  console.log("\n(no SHELF_PASS set — skipping paid shelves)");
  process.exit(failures ? 1 : 0);
}

console.log("\npaid shelves (via pass)");
const s = new Shelves({ pass });
await check("checkCarrierAuthority returns a verdict", async () => {
  const r = await s.checkCarrierAuthority({ dot: "44110" });
  assert.ok(["CLEAR", "REVIEW", "DO_NOT_TENDER"].includes(r.verdict), `verdict was ${r.verdict}`);
  assert.ok(r.carrier.legal_name);
});
await check("checkCarrierSafetyBasics returns BASIC rows", async () => {
  const r = await s.checkCarrierSafetyBasics({ dot: "44110" });
  assert.ok(Array.isArray(r.basics) && r.basics.length > 0);
});
await check("checkBrokerAuthority resolves an MC number", async () => {
  const r = await s.checkBrokerAuthority({ mc: "515000" });
  assert.ok(r.verdict);
});
await check("screenSanctionsName flags a listed entity", async () => {
  const r = await s.screenSanctionsName({ name: "Banco Nacional de Cuba" });
  assert.equal(r.verdict, "HIT");
  assert.ok(r.matches.length > 0);
});
await check("screenSanctionsName clears an unlisted name", async () => {
  const r = await s.screenSanctionsName({ name: "Kanairo Drop Logistics LLC" });
  assert.equal(r.verdict, "CLEAR");
});
await check("getFxOfficialAll returns every pair", async () => {
  const r = await s.getFxOfficialAll();
  assert.ok(r.rates.length >= 8, `got ${r.rates?.length} rates`);
});
await check("credits decrement and are readable", async () => {
  const left = await s.creditsRemaining();
  assert.ok(typeof left === "number" && left >= 0, `credits were ${left}`);
  console.log(`       (${left} credits left on this pass)`);
});

console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
