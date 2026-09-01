/**
 * @nibiashara/shelves — job helpers for the Ni Biashara agent shelves.
 *
 * Jobs, not a human SKU menu: vet a US carrier before tender, screen an
 * OFAC name, get a USD-NGN parallel rate, mint a shelf pass then debit.
 * Each helper is a plain GET against https://agents.nibiashara.biz/shelf/:sku
 * — this package is a convenience layer, never a requirement. Live map:
 * https://agents.nibiashara.biz/llms.txt
 *
 * Repeat path: send X-SHELF-PASS (prepaid credits). Per-call path: supply
 * an x402-capable fetch. `buy(sku, params)` / MCP `buy_shelf` is the
 * fallback for any catalog id.
 */

const DEFAULT_ORIGIN = "https://agents.nibiashara.biz";

/** Job helper → live `/shelf/:sku`. Prices live in `catalog()`, not here. */
export const JOBS = {
  checkCarrierAuthority: "carrier-authority-check",
  checkCarrierSafetyBasics: "carrier-safety-basics",
  checkBrokerAuthority: "broker-authority-check",
  screenSanctionsName: "sanctions-screen",
  getFxOfficial: "fx-official",
  getFxOfficialAll: "fx-official-all",
  getFxParallel: "fx-parallel",
  getFxParallelHistory24h: "fx-parallel-history-24h",
  getFxParallelHistory7d: "fx-parallel-history-7d",
  getFxDailyBrief: "fx-africa-daily-brief",
  buyShelfPass: "shelf-pass-100",
  checkTxInsuranceCe: "tx-insurance-ce-check",
  checkTxRealEstateCe: "tx-realestate-ce-check",
};

/** Live MCP server tools (cashier-shaped). Job helpers map onto `buy`. */
export const MCP_TOOLS = {
  listShelves: "list_shelves",
  buyShelf: "buy_shelf",
  getOrder: "get_order",
};

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
   * @param {string} [opts.pass]    prepaid pass token (`pass_…`), sent as X-SHELF-PASS
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

  /**
   * Buy any shelf by id (`buy_shelf` fallback). `params` become query parameters.
   * Named job helpers below are the path an agent should take.
   */
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
          ? `payment required: pass ${exhausted}. Buy another at ${this.origin}/shelf/${JOBS.buyShelfPass}`
          : "payment required: supply a pass or an x402-capable fetch",
        { status: 402, sku, body },
      );
    }
    if (!res.ok) {
      throw new ShelfError(body?.detail ?? body?.error ?? `shelf ${sku} failed (HTTP ${res.status})`, { status: res.status, sku, body });
    }
    if (body && typeof body === "object" && "pass_calls_remaining" in body) {
      this.lastCreditsRemaining = body.pass_calls_remaining;
    }
    // Data shelves answer { delivery }; unwrap it, but keep tickets whole so a
    // service buyer still gets claim_url / balance details.
    return body?.delivery !== undefined && body?.sku && !body.claim_url ? body.delivery : body;
  }

  /** MCP `buy_shelf` fallback — same as `buy`. */
  buyShelf(sku, params = {}) {
    return this.buy(sku, params);
  }

  // ---- jobs: freight -----------------------------------------------------
  /** Vet a US motor carrier before tender. GET /shelf/carrier-authority-check */
  checkCarrierAuthority({ dot, mc } = {}) {
    return this.buy(JOBS.checkCarrierAuthority, { dot, mc });
  }
  /** FMCSA SMS BASIC percentiles + intervention flags. */
  checkCarrierSafetyBasics({ dot } = {}) {
    return this.buy(JOBS.checkCarrierSafetyBasics, { dot });
  }
  /** Is this broker real and allowed to arrange freight? */
  checkBrokerAuthority({ mc } = {}) {
    return this.buy(JOBS.checkBrokerAuthority, { mc });
  }

  // ---- jobs: compliance --------------------------------------------------
  /** Screen a person or company name against OFAC SDN + Consolidated. */
  screenSanctionsName({ name } = {}) {
    return this.buy(JOBS.screenSanctionsName, { name });
  }
  checkTxInsuranceCe({ licenseLine, yearsLicensed } = {}) {
    return this.buy(JOBS.checkTxInsuranceCe, { license_line: licenseLine, years_licensed: yearsLicensed });
  }
  checkTxRealEstateCe({ licenseType, firstTime } = {}) {
    return this.buy(JOBS.checkTxRealEstateCe, { license_type: licenseType, first_time: firstTime });
  }

  // ---- jobs: FX ----------------------------------------------------------
  getFxOfficial({ pair } = {}) { return this.buy(JOBS.getFxOfficial, { pair }); }
  getFxOfficialAll() { return this.buy(JOBS.getFxOfficialAll); }
  /** Street/parallel USD-NGN or USD-GHS rate. */
  getFxParallel({ pair } = {}) { return this.buy(JOBS.getFxParallel, { pair }); }
  getFxParallelHistory({ pair, window = "24h" } = {}) {
    const sku = window === "7d" ? JOBS.getFxParallelHistory7d : JOBS.getFxParallelHistory24h;
    return this.buy(sku, { pair });
  }
  getFxDailyBrief() { return this.buy(JOBS.getFxDailyBrief); }

  // ---- jobs: pass --------------------------------------------------------
  /**
   * Mint a shelf pass (GET /shelf/shelf-pass-100) and adopt the token.
   * Needs an x402-capable fetch. Repeat callers then send X-SHELF-PASS.
   */
  async buyShelfPass() {
    const out = await this.buy(JOBS.buyShelfPass);
    if (out?.pass_token) this.pass = out.pass_token;
    return out;
  }

  /** Credits left on the current pass (free call). */
  async creditsRemaining() {
    if (!this.pass) return null;
    const res = await this._fetch(`${this.origin}/pass/${this.pass}`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = await res.json();
    return body.calls_remaining ?? null;
  }

  /** The full shelf list, free and unauthenticated. Prices live here. */
  async catalog() {
    const res = await this._fetch(`${this.origin}/catalog`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new ShelfError(`catalog failed (HTTP ${res.status})`, { status: res.status });
    return res.json();
  }
}

// Aliases for the 1.0 method names. Prefer the job names above.
Shelves.prototype.carrierAuthority = Shelves.prototype.checkCarrierAuthority;
Shelves.prototype.carrierSafetyBasics = Shelves.prototype.checkCarrierSafetyBasics;
Shelves.prototype.brokerAuthority = Shelves.prototype.checkBrokerAuthority;
Shelves.prototype.sanctionsScreen = Shelves.prototype.screenSanctionsName;
Shelves.prototype.txInsuranceCe = Shelves.prototype.checkTxInsuranceCe;
Shelves.prototype.txRealEstateCe = Shelves.prototype.checkTxRealEstateCe;
Shelves.prototype.fxOfficial = Shelves.prototype.getFxOfficial;
Shelves.prototype.fxOfficialAll = Shelves.prototype.getFxOfficialAll;
Shelves.prototype.fxParallel = Shelves.prototype.getFxParallel;
Shelves.prototype.fxParallelHistory = Shelves.prototype.getFxParallelHistory;
Shelves.prototype.fxDailyBrief = Shelves.prototype.getFxDailyBrief;
Shelves.prototype.buyPass = Shelves.prototype.buyShelfPass;

export default Shelves;
