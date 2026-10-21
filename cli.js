/**
 * `npx @nibiashara/shelves` — a free first look, no key, no wallet.
 *
 *   npx @nibiashara/shelves              free FX sample + catalog + MCP config
 *   npx @nibiashara/shelves --try fx     live official FX preview (USD-KES, or --pair USD-NGN)
 *   npx @nibiashara/shelves --try ofac   OFAC sanctions screen preview (fixed sample input)
 *   npx @nibiashara/shelves --try fmcsa  FMCSA carrier authority preview (fixed sample input)
 *   npx @nibiashara/shelves --mcp        print only the MCP client config
 *
 * Every call here is a free GET. Nothing is paid and nothing is stored.
 */
import { Shelves, ShelfError } from "./index.js";

export const MCP_URL = "https://agents.nibiashara.biz/mcp";
export const MCP_CONFIG = { mcpServers: { "nibiashara-shelves": { type: "http", url: MCP_URL } } };

const TRY = {
  fx: (s, a) => s.fxSample("fx-official", { pair: a.pair }),
  ofac: (s) => s.complianceSample("sanctions-screen"),
  fmcsa: (s) => s.complianceSample("carrier-authority-check"),
};

const HELP = `@nibiashara/shelves: pay-per-call data for AI agents (FX, OFAC, FMCSA)

Usage:
  npx @nibiashara/shelves               free sample, catalog and MCP config
  npx @nibiashara/shelves --try fx      live official FX preview [--pair USD-NGN]
  npx @nibiashara/shelves --try ofac    OFAC sanctions screen preview
  npx @nibiashara/shelves --try fmcsa   FMCSA carrier authority preview
  npx @nibiashara/shelves --mcp         MCP client config only
  npx @nibiashara/shelves --help

Everything here is free. Docs: https://agents.nibiashara.biz/docs`;

export function parseArgs(argv) {
  const a = { try: null, pair: undefined, mcp: false, help: false, bad: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--help" || k === "-h") a.help = true;
    else if (k === "--mcp") a.mcp = true;
    else if (k === "--try") a.try = argv[++i] ?? "";
    else if (k.startsWith("--try=")) a.try = k.slice(6);
    else if (k === "--pair") a.pair = argv[++i];
    else if (k.startsWith("--pair=")) a.pair = k.slice(7);
    else a.bad = k;
  }
  if (a.try !== null && !(a.try in TRY)) a.bad = `--try ${a.try}`;
  return a;
}

function mcpBlock() {
  return [
    "MCP (Claude Desktop, Cursor and other clients):",
    JSON.stringify(MCP_CONFIG),
    "Claude Code:",
    `claude mcp add --transport http nibiashara-shelves ${MCP_URL}`,
  ].join("\n");
}

/** Returns the process exit code. `io` is injectable for tests. */
export async function main(argv, io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(s + "\n"));
  const err = io.err ?? ((s) => process.stderr.write(s + "\n"));
  const a = parseArgs(argv);
  if (a.help) { out(HELP); return 0; }
  if (a.bad) { err(`unknown option: ${a.bad}\n\n${HELP}`); return 2; }
  if (a.mcp) { out(mcpBlock()); return 0; }

  const s = new Shelves({ fetch: io.fetch, origin: io.origin });
  try {
    if (a.try) {
      out(JSON.stringify(await TRY[a.try](s, a), null, 2));
      return 0;
    }
    const hello = await s.hello();
    const r = hello.cached_rate;
    out(`Free sample (no payment): ${hello.pair ?? "USD-KES"} = ${r?.rate ?? "unavailable"}` +
      (r ? ` (as of ${r.asOf}, source ${r.source}, cached ${r.fetchedAt})` : ` (${hello.status ?? "cache unavailable"})`));
    const cat = await s.catalog();
    const shelves = Array.isArray(cat?.shelves) ? cat.shelves : Array.isArray(cat?.catalog) ? cat.catalog : [];
    out(`\nCatalog: ${shelves.length} shelves (live prices)`);
    for (const x of shelves) out(`  ${String(x.id).padEnd(28)} $${Number(x.price_usd).toFixed(2)}  ${x.title ?? ""}`);
    out(`\nTry more, free: --try fx | --try ofac | --try fmcsa`);
    out(`Install: npm i @nibiashara/shelves   Docs: https://agents.nibiashara.biz/docs\n`);
    out(mcpBlock());
    return 0;
  } catch (e) {
    err(`shelves: ${e instanceof ShelfError ? e.message : String(e?.message ?? e)}`);
    out(`\n${mcpBlock()}`);
    return 1;
  }
}
