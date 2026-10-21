import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { main, parseArgs, MCP_URL } from "./cli.js";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

function fixture() {
  const paths = [];
  const fetch = async (u) => {
    const url = new URL(u); paths.push(url.pathname + url.search);
    if (url.pathname === "/hello") return new Response(JSON.stringify({ pair: "USD-KES", status: "cached", cached_rate: { rate: 129.7, asOf: "2026-10-20", source: "frankfurter.dev", fetchedAt: "2026-10-21T01:00:00Z" } }));
    if (url.pathname === "/catalog") return new Response(JSON.stringify({ shelves: [{ id: "fx-official", price_usd: 0.01, title: "Official FX" }, { id: "sanctions-screen", price_usd: 0.02, title: "OFAC" }] }));
    if (url.pathname.startsWith("/fx/sample/") || url.pathname.startsWith("/compliance/sample/")) return new Response(JSON.stringify({ preview: true, path: url.pathname }));
    return new Response("{}", { status: 404 });
  };
  const lines = [], errs = [];
  return { paths, lines, errs, io: { fetch, origin: "https://fixture.invalid", out: (s) => lines.push(s), err: (s) => errs.push(s) } };
}

test("package exposes exactly one bin so npx resolves it", () => {
  assert.deepEqual(Object.keys(pkg.bin), ["shelves"]);
  for (const f of ["bin/shelves.js", "cli.js", "index.js"]) assert.ok(pkg.files.includes(f), f);
  assert.match(readFileSync(new URL("./bin/shelves.js", import.meta.url), "utf8"), /^#!\/usr\/bin\/env node\n/);
});

test("default run prints the free sample, the live catalog and the MCP config, exit 0", async () => {
  const f = fixture();
  assert.equal(await main([], f.io), 0);
  const text = f.lines.join("\n");
  assert.match(text, /Free sample \(no payment\): USD-KES = 129\.7 \(as of 2026-10-20/);
  assert.match(text, /Catalog: 2 shelves/);
  assert.match(text, /fx-official\s+\$0\.01/);
  assert.ok(text.includes(JSON.stringify({ mcpServers: { "nibiashara-shelves": { type: "http", url: MCP_URL } } })));
  assert.ok(text.includes(`claude mcp add --transport http nibiashara-shelves ${MCP_URL}`));
  assert.deepEqual(f.paths, ["/hello", "/catalog"]);
});

test("--try routes to free sample endpoints only", async () => {
  for (const [arg, path] of [[["--try", "fx"], "/fx/sample/fx-official"], [["--try", "fx", "--pair", "USD-NGN"], "/fx/sample/fx-official?pair=USD-NGN"], [["--try=ofac"], "/compliance/sample/sanctions-screen"], [["--try", "fmcsa"], "/compliance/sample/carrier-authority-check"]]) {
    const f = fixture();
    assert.equal(await main(arg, f.io), 0);
    assert.deepEqual(f.paths, [path]);
    assert.equal(JSON.parse(f.lines.join("\n")).preview, true);
  }
});

test("--mcp and --help need no network; bad options exit 2", async () => {
  for (const a of [["--mcp"], ["--help"]]) { const f = fixture(); assert.equal(await main(a, f.io), 0); assert.deepEqual(f.paths, []); }
  const f = fixture();
  assert.equal(await main(["--try", "nope"], f.io), 2);
  assert.equal(parseArgs(["--wat"]).bad, "--wat");
});

test("network failure still prints the MCP config and exits 1", async () => {
  const lines = [], errs = [];
  const code = await main([], { fetch: async () => { throw new Error("offline"); }, out: (s) => lines.push(s), err: (s) => errs.push(s) });
  assert.equal(code, 1);
  assert.match(errs.join(""), /offline/);
  assert.ok(lines.join("\n").includes(MCP_URL));
});
