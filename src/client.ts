/**
 * ResolveClient — typed wrappers around the Resolve Soroban contract.
 *
 * Uses `@stellar/stellar-sdk/contract` AssembledTransaction for simulate/sign/send.
 * Reads always go to RPC (no mocked balances or market state).
 */

import {
  Address,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  type ClientOptions,
} from "@stellar/stellar-sdk/contract";
import { Server } from "@stellar/stellar-sdk/rpc";

import {
  parseResolveError,
  ResolveError,
  ResolveErrorCode,
  resolveErrorTypes,
} from "./errors.js";
import { assertContractId } from "./networks.js";
import {
  MarketStatus,
  Outcome,
  Side,
  type ClaimParams,
  type CreateMarketParams,
  type InvalidateMarketParams,
  type Market,
  type Position,
  type ResolveClientOptions,
  type ResolveMarketParams,
  type StakeParams,
  type TxMethodOptions,
} from "./types.js";

type AnyAssembledTx<T = unknown> = AssembledTransaction<T>;

function toBigInt(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new RangeError(`expected integer, got ${value}`);
    }
    return BigInt(value);
  }
  return BigInt(value);
}

function addressScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}

function u64ScVal(value: bigint | number): xdr.ScVal {
  return nativeToScVal(toBigInt(value), { type: "u64" });
}

function i128ScVal(value: bigint | number | string): xdr.ScVal {
  return nativeToScVal(toBigInt(value), { type: "i128" });
}

function stringScVal(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

/** Encode a unit `#[contracttype]` enum variant as ScVec([Symbol(name)]). */
function enumScVal(variant: string): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant)]);
}

function sideScVal(side: Side): xdr.ScVal {
  switch (side) {
    case Side.Yes:
      return enumScVal("Yes");
    case Side.No:
      return enumScVal("No");
    default:
      throw new ResolveError(ResolveErrorCode.INVALID_SIDE);
  }
}

function outcomeScVal(outcome: Outcome): xdr.ScVal {
  switch (outcome) {
    case Outcome.Yes:
      return enumScVal("Yes");
    case Outcome.No:
      return enumScVal("No");
    case Outcome.Invalid:
      return enumScVal("Invalid");
    default:
      throw new RangeError(`invalid Outcome: ${outcome}`);
  }
}

function sideName(side: Side): string {
  return side === Side.Yes ? "Yes" : "No";
}

function outcomeName(outcome: Outcome): string {
  if (outcome === Outcome.Yes) return "Yes";
  if (outcome === Outcome.No) return "No";
  return "Invalid";
}

function parseEnumVariant(raw: unknown): string | number | null {
  if (typeof raw === "string" || typeof raw === "number") return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === "string" || typeof first === "number") return first;
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.tag === "string") return obj.tag;
    if (typeof obj.name === "string") return obj.name;
  }
  return null;
}

function mapSide(raw: unknown): Side {
  const v = parseEnumVariant(raw);
  if (v === 0 || v === "Yes" || v === "yes") return Side.Yes;
  if (v === 1 || v === "No" || v === "no") return Side.No;
  throw new RangeError(`unable to map Side from ${JSON.stringify(raw)}`);
}

function mapOutcome(raw: unknown): Outcome | null {
  if (raw === null || raw === undefined) return null;
  // Legacy Option encoding or MarketOutcome tag object
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (obj.tag === "None" || obj.tag === "Unset") return null;
    if (obj.tag === "Some" && Array.isArray(obj.values)) {
      return mapOutcome(obj.values[0] ?? null);
    }
    if (obj.tag === "Yes") return Outcome.Yes;
    if (obj.tag === "No") return Outcome.No;
    if (obj.tag === "Invalid") return Outcome.Invalid;
  }
  const v = parseEnumVariant(raw);
  if (v === "Unset" || v === "unset") return null;
  if (v === "Yes" || v === "yes") return Outcome.Yes;
  if (v === "No" || v === "no") return Outcome.No;
  if (v === "Invalid" || v === "invalid") return Outcome.Invalid;
  // MarketOutcome index order: Unset, Yes, No, Invalid
  if (v === 0) return null;
  if (v === 1) return Outcome.Yes;
  if (v === 2) return Outcome.No;
  if (v === 3) return Outcome.Invalid;
  throw new RangeError(`unable to map Outcome from ${JSON.stringify(raw)}`);
}

function mapMarketStatus(raw: unknown): MarketStatus {
  const v = parseEnumVariant(raw);
  if (v === 0 || v === "Open" || v === "open") return MarketStatus.Open;
  if (v === 1 || v === "Resolved" || v === "resolved") {
    return MarketStatus.Resolved;
  }
  if (v === 2 || v === "Invalid" || v === "invalid") {
    return MarketStatus.Invalid;
  }
  throw new RangeError(
    `unable to map MarketStatus from ${JSON.stringify(raw)}`,
  );
}

/** finalized_at is u64 on-chain; 0 means not finalized. */
function mapFinalizedAt(raw: unknown): bigint | null {
  if (raw === null || raw === undefined) return null;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (obj.tag === "None") return null;
    if (obj.tag === "Some" && Array.isArray(obj.values)) {
      return mapFinalizedAt(obj.values[0] ?? null);
    }
  }
  const n = toBigInt(raw as bigint | number | string);
  return n === 0n ? null : n;
}

function field(
  obj: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

/** Map a native ScVal decode of `Market` into the SDK `Market` type. */
export function mapMarket(raw: unknown): Market {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("get_market returned unexpected value");
  }
  const o = raw as Record<string, unknown>;
  return {
    id: toBigInt(field(o, "id") as bigint | number | string),
    creator: String(field(o, "creator")),
    resolver: String(field(o, "resolver")),
    question: String(field(o, "question")),
    description: String(field(o, "description")),
    token: String(field(o, "token")),
    createdAt: toBigInt(
      field(o, "created_at", "createdAt") as bigint | number | string,
    ),
    closeAt: toBigInt(
      field(o, "close_at", "closeAt") as bigint | number | string,
    ),
    resolutionTimeout: toBigInt(
      field(o, "resolution_timeout", "resolutionTimeout") as
        | bigint
        | number
        | string,
    ),
    yesPool: toBigInt(
      field(o, "yes_pool", "yesPool") as bigint | number | string,
    ),
    noPool: toBigInt(
      field(o, "no_pool", "noPool") as bigint | number | string,
    ),
    status: mapMarketStatus(field(o, "status")),
    outcome: mapOutcome(field(o, "outcome")),
    finalizedAt: mapFinalizedAt(field(o, "finalized_at", "finalizedAt")),
  };
}

/** Map a native ScVal decode of `Position` into the SDK `Position` type. */
export function mapPosition(raw: unknown): Position {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("get_position returned unexpected value");
  }
  const o = raw as Record<string, unknown>;
  return {
    yesAmount: toBigInt(
      field(o, "yes_amount", "yesAmount") as bigint | number | string,
    ),
    noAmount: toBigInt(
      field(o, "no_amount", "noAmount") as bigint | number | string,
    ),
    claimed: Boolean(field(o, "claimed")),
  };
}

function validateConfig(config: ResolveClientOptions): void {
  if (!config.rpcUrl) {
    throw new Error("ResolveClient: rpcUrl is required");
  }
  if (!config.networkPassphrase) {
    throw new Error("ResolveClient: networkPassphrase is required");
  }
  try {
    assertContractId(config.contractId);
  } catch (error) {
    throw new Error(`ResolveClient: ${(error as Error).message}`);
  }
}

function rethrowContractError(err: unknown): never {
  const parsed = parseResolveError(err);
  if (parsed) throw parsed;
  throw err;
}

/**
 * High-level client for the Resolve prediction-market contract.
 *
 * Write methods return `AssembledTransaction` so callers can `signAndSend()`,
 * inspect simulation, or export XDR. Read methods simulate via RPC and return
 * mapped TypeScript values.
 */
export class ResolveClient {
  readonly config: Readonly<ResolveClientOptions>;
  readonly server: Server;

  constructor(config: ResolveClientOptions, rpc?: Server) {
    validateConfig(config);
    this.config = Object.freeze({ ...config });
    this.server =
      rpc ??
      new Server(config.rpcUrl, {
        allowHttp: config.rpcUrl.startsWith("http://"),
      });
  }

  /** Create a client from a network preset + required contractId override. */
  static fromNetwork(
    network: ResolveClientOptions,
    rpc?: Server,
  ): ResolveClient {
    return new ResolveClient(network, rpc);
  }

  private clientOptions(methodOpts?: TxMethodOptions): ClientOptions {
    const publicKey =
      methodOpts?.publicKey ?? this.config.publicKey ?? undefined;
    return {
      contractId: this.config.contractId,
      networkPassphrase: this.config.networkPassphrase,
      rpcUrl: this.config.rpcUrl,
      server: this.server,
      publicKey,
      signTransaction:
        methodOpts?.signTransaction ?? this.config.signTransaction,
      signAuthEntry: methodOpts?.signAuthEntry ?? this.config.signAuthEntry,
      errorTypes: resolveErrorTypes(),
    };
  }

  private async buildTx<T>(
    method: string,
    args: xdr.ScVal[],
    parseResultXdr: (val: xdr.ScVal) => T,
    methodOpts?: TxMethodOptions,
  ): Promise<AnyAssembledTx<T>> {
    try {
      return await AssembledTransaction.build({
        method,
        args,
        ...this.clientOptions(methodOpts),
        fee: methodOpts?.fee ?? this.config.fee,
        timeoutInSeconds:
          methodOpts?.timeoutInSeconds ?? this.config.timeoutInSeconds,
        simulate: methodOpts?.simulate ?? true,
        parseResultXdr,
      });
    } catch (err) {
      rethrowContractError(err);
    }
  }

  private async simulateRead<T>(
    method: string,
    args: xdr.ScVal[],
    parse: (val: xdr.ScVal) => T,
    methodOpts?: TxMethodOptions,
  ): Promise<T> {
    const tx = await this.buildTx(method, args, parse, {
      ...methodOpts,
      simulate: true,
    });
    try {
      return tx.result;
    } catch (err) {
      rethrowContractError(err);
    }
  }

  // --- Writes ---

  /**
   * Build `create_market`. Returns AssembledTransaction whose result is the new market id.
   */
  async createMarket(
    params: CreateMarketParams,
    opts?: TxMethodOptions,
  ): Promise<AnyAssembledTx<bigint>> {
    return this.buildTx(
      "create_market",
      [
        addressScVal(params.creator),
        addressScVal(params.resolver),
        stringScVal(params.question),
        stringScVal(params.description),
        addressScVal(params.token),
        u64ScVal(params.closeAt),
        u64ScVal(params.resolutionTimeout),
      ],
      (val) => toBigInt(scValToNative(val) as bigint | number | string),
      { publicKey: params.creator, ...opts },
    );
  }

  /** Build `stake`. */
  async stake(
    params: StakeParams,
    opts?: TxMethodOptions,
  ): Promise<AnyAssembledTx<null>> {
    return this.buildTx(
      "stake",
      [
        addressScVal(params.user),
        u64ScVal(params.marketId),
        sideScVal(params.side),
        i128ScVal(params.amount),
      ],
      () => null,
      { publicKey: params.user, ...opts },
    );
  }

  /** Stake on Yes. */
  async stakeYes(
    params: Omit<StakeParams, "side">,
    opts?: TxMethodOptions,
  ): Promise<AnyAssembledTx<null>> {
    return this.stake({ ...params, side: Side.Yes }, opts);
  }

  /** Stake on No. */
  async stakeNo(
    params: Omit<StakeParams, "side">,
    opts?: TxMethodOptions,
  ): Promise<AnyAssembledTx<null>> {
    return this.stake({ ...params, side: Side.No }, opts);
  }

  /** Build `resolve`. */
  async resolveMarket(
    params: ResolveMarketParams,
    opts?: TxMethodOptions,
  ): Promise<AnyAssembledTx<null>> {
    return this.buildTx(
      "resolve",
      [u64ScVal(params.marketId), outcomeScVal(params.outcome)],
      () => null,
      opts,
    );
  }

  /** Build `invalidate`. */
  async invalidateMarket(
    params: InvalidateMarketParams,
    opts?: TxMethodOptions,
  ): Promise<AnyAssembledTx<null>> {
    return this.buildTx(
      "invalidate",
      [addressScVal(params.caller), u64ScVal(params.marketId)],
      () => null,
      { publicKey: params.caller, ...opts },
    );
  }

  /** Build `claim`. Result is the paid i128 amount. */
  async claim(
    params: ClaimParams,
    opts?: TxMethodOptions,
  ): Promise<AnyAssembledTx<bigint>> {
    return this.buildTx(
      "claim",
      [addressScVal(params.user), u64ScVal(params.marketId)],
      (val) => toBigInt(scValToNative(val) as bigint | number | string),
      { publicKey: params.user, ...opts },
    );
  }

  // --- Reads (RPC simulation) ---

  async getMarket(
    marketId: bigint | number,
    opts?: TxMethodOptions,
  ): Promise<Market> {
    return this.simulateRead(
      "get_market",
      [u64ScVal(marketId)],
      (val) => mapMarket(scValToNative(val)),
      opts,
    );
  }

  async getPosition(
    marketId: bigint | number,
    user: string,
    opts?: TxMethodOptions,
  ): Promise<Position> {
    return this.simulateRead(
      "get_position",
      [u64ScVal(marketId), addressScVal(user)],
      (val) => mapPosition(scValToNative(val)),
      opts,
    );
  }

  async getClaimable(
    marketId: bigint | number,
    user: string,
    opts?: TxMethodOptions,
  ): Promise<bigint> {
    return this.simulateRead(
      "get_claimable",
      [u64ScVal(marketId), addressScVal(user)],
      (val) => toBigInt(scValToNative(val) as bigint | number | string),
      opts,
    );
  }

  async getNextMarketId(opts?: TxMethodOptions): Promise<bigint> {
    return this.simulateRead(
      "next_market_id",
      [],
      (val) => toBigInt(scValToNative(val) as bigint | number | string),
      opts,
    );
  }
}

/** Encode helpers exported for advanced / testing use. */
export const scValHelpers = {
  addressScVal,
  u64ScVal,
  i128ScVal,
  stringScVal,
  enumScVal,
  sideScVal,
  outcomeScVal,
  sideName,
  outcomeName,
  mapSide,
  mapOutcome,
  mapMarketStatus,
};
