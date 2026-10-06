/**
 * @nibiashara/shelves — a thin client for the Ni Biashara agent shelves.
 *
 * Two ways to pay, and the client does not care which:
 *   - a prepaid pass (`pass`), sent as the X-SHELF-PASS header; or
 *   - an x402-capable `fetch` (e.g. @x402/fetch), which settles per call.
 *
 * Everything is a plain GET against https://agents.nibiashara.biz/shelf/:sku,
 * so this package is a convenience layer, never a requirement — see
 * https://agents.nibiashara.biz/docs to call the same endpoints directly.
 */

const DEFAULT_ORIGIN = "https://agents.nibiashara.biz";

export class ShelfError extends Error {
  constructor(message, { status, sku, body } = {}) {
    super(message);
    this.name = "ShelfError";
    this.status = status;
    this.sku = sku;
    this.body = body;
  }
}

export class Shelves {
  /**
   * @param {object} [opts]
   * @param {string} [opts.pass]    prepaid pass token (`pass_…`)
   * @param {Function} [opts.fetch] an x402-capable fetch; defaults to global fetch
   * @param {string} [opts.origin]  override the service origin
   */
  constructor(opts = {}) {
    this.pass = opts.pass ?? null;
    this.origin = (opts.origin ?? DEFAULT_ORIGIN).replace(/\/$/, "");
    this._fetch = opts.fetch ?? globalThis.fetch;
    if (typeof this._fetch !== "function") {
      throw new ShelfError("no fetch available: pass opts.fetch");
    }
  }

  /** Buy any shelf by id. `params` become query parameters. */
  async buy(sku, params = {}) {
    const url = new URL(`${this.origin}/shelf/${sku}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    const headers = { accept: "application/json" };
    if (this.pass) headers["X-SHELF-PASS"] = this.pass;

    const res = await this._fetch(url.toString(), { headers });
    const body = await res.json().catch(() => null);

    if (res.status === 402) {
      const exhausted = res.headers.get?.("X-SHELF-PASS-ERROR");
      throw new ShelfError(
        exhausted
          ? `payment required: pass ${exhausted}. Buy another at ${this.origin}/shelf/shelf-pass-100`
          : "payment required: supply a pass or an x402-capable fetch",
        { status: 402, sku, body },
      );
    }
    if (!res.ok) {
      throw new ShelfError(body?.detail ?? body?.error ?? `shelf ${sku} failed (HTTP ${res.status})`, { status: res.status, sku, body });
    }
    if (body && typeof body === "object" && "pass_credits_remaining" in body) {
      this.lastCreditsRemaining = body.pass_credits_remaining;
    }
    // Data shelves answer { delivery }; unwrap it, but keep tickets whole so a
    // service buyer still gets claim_url / balance details.
    return body?.delivery !== undefined && body?.sku && !body.claim_url ? body.delivery : body;
  }

  // ---- freight -----------------------------------------------------------
  carrierAuthority({ dot, mc } = {}) { return this.buy("carrier-authority-check", { dot, mc }); }
  carrierSafetyBasics({ dot } = {}) { return this.buy("carrier-safety-basics", { dot }); }
  brokerAuthority({ mc } = {}) { return this.buy("broker-authority-check", { mc }); }

  // ---- compliance --------------------------------------------------------
  sanctionsScreen({ name } = {}) { return this.buy("sanctions-screen", { name }); }
  txInsuranceCe({ licenseLine, yearsLicensed } = {}) {
    return this.buy("tx-insurance-ce-check", { license_line: licenseLine, years_licensed: yearsLicensed });
  }
  txRealEstateCe({ licenseType, firstTime } = {}) {
    return this.buy("tx-realestate-ce-check", { license_type: licenseType, first_time: firstTime });
  }

  // ---- FX ----------------------------------------------------------------
  fxOfficial({ pair } = {}) { return this.buy("fx-official", { pair }); }
  fxOfficialAll() { return this.buy("fx-official-all"); }
  fxParallel({ pair } = {}) { return this.buy("fx-parallel", { pair }); }
  fxParallelHistory({ pair, window = "24h" } = {}) {
    return this.buy(window === "7d" ? "fx-parallel-history-7d" : "fx-parallel-history-24h", { pair });
  }
  fxDailyBrief() { return this.buy("fx-africa-daily-brief"); }

  // ---- passes ------------------------------------------------------------
  /** Buy the catalog-defined credit pass. Needs an x402-capable fetch; adopts the token. */
  async buyPass() {
    const out = await this.buy("shelf-pass-100");
    if (out?.pass_token) this.pass = out.pass_token;
    return out;
  }

  /** Credits left on the current pass (free call). */
  async creditsRemaining() {
    if (!this.pass) return null;
    const res = await this._fetch(`${this.origin}/pass/${this.pass}`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = await res.json();
    return body.credits_remaining ?? null;
  }

  /** The full shelf list, free and unauthenticated. */
  async catalog() {
    const res = await this._fetch(`${this.origin}/catalog`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new ShelfError(`catalog failed (HTTP ${res.status})`, { status: res.status });
    return res.json();
  }

  /** Cached public sample; never claims fresh upstream data or paid delivery. */
  hello() { return this._read("/hello"); }
  /** Availability and quota are server-owned; caller wallet headers grant nothing. */
  freeFx() { return this._read("/free/fx"); }
  /** Current protocol and catalog metadata; never a client hardcoded price. */
  catalogPolicy() { return this._read("/catalog-policy"); }
  /** Qualified aggregate only; no individual wallet leaderboard. */
  stats() { return this._read("/stats"); }
  async _read(path) {
    const res = await this._fetch(`${this.origin}${path}`, { headers: { accept: "application/json" } });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || typeof body !== "object") {
      throw new ShelfError(body?.detail ?? body?.error ?? `read failed (HTTP ${res.status})`, { status: res.status, body });
    }
    return body;
  }
}

export default Shelves;
