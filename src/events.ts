/**
 * Event topic helpers for indexing Resolve contract events.
 *
 * Contract events (from `#[contractevent]`):
 * - MarketCreated — topics: market_id, creator
 * - Staked — topics: market_id, user
 * - MarketResolved — topics: market_id, resolver
 * - MarketInvalidated — topics: market_id, caller
 * - Claimed — topics: market_id, user
 */

import { Address, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";

import { ClaimKind, Outcome, Side } from "./types.js";

/** Canonical event names matching the Rust `#[contractevent]` structs. */
export const ResolveEventName = {
  MarketCreated: "MarketCreated",
  Staked: "Staked",
  MarketResolved: "MarketResolved",
  MarketInvalidated: "MarketInvalidated",
  Claimed: "Claimed",
} as const;

export type ResolveEventName =
  (typeof ResolveEventName)[keyof typeof ResolveEventName];

/** All Resolve event names (useful for catch-all indexer subscriptions). */
export const RESOLVE_EVENT_NAMES: readonly ResolveEventName[] = [
  ResolveEventName.MarketCreated,
  ResolveEventName.Staked,
  ResolveEventName.MarketResolved,
  ResolveEventName.MarketInvalidated,
  ResolveEventName.Claimed,
];

export type EventTopicFilter = {
  /** Base64-encoded ScVal topics for `getEvents` filters (`null` = wildcard). */
  topics: Array<string | null>;
  eventName: ResolveEventName;
};

function topicSymbol(name: string): string {
  return nativeToScVal(name, { type: "symbol" }).toXDR("base64");
}

function topicU64(value: bigint | number): string {
  return nativeToScVal(BigInt(value), { type: "u64" }).toXDR("base64");
}

function topicAddress(address: string): string {
  return nativeToScVal(address, { type: "address" }).toXDR("base64");
}

/**
 * Build RPC topic filters for MarketCreated.
 * Topics: [event_name, market_id?, creator?]
 */
export function marketCreatedTopics(opts?: {
  marketId?: bigint | number;
  creator?: string;
}): EventTopicFilter {
  return {
    eventName: ResolveEventName.MarketCreated,
    topics: [
      topicSymbol(ResolveEventName.MarketCreated),
      opts?.marketId !== undefined ? topicU64(opts.marketId) : null,
      opts?.creator ? topicAddress(opts.creator) : null,
    ],
  };
}

/**
 * Build RPC topic filters for Staked.
 * Topics: [event_name, market_id?, user?]
 */
export function stakedTopics(opts?: {
  marketId?: bigint | number;
  user?: string;
}): EventTopicFilter {
  return {
    eventName: ResolveEventName.Staked,
    topics: [
      topicSymbol(ResolveEventName.Staked),
      opts?.marketId !== undefined ? topicU64(opts.marketId) : null,
      opts?.user ? topicAddress(opts.user) : null,
    ],
  };
}

/**
 * Build RPC topic filters for MarketResolved.
 * Topics: [event_name, market_id?, resolver?]
 */
export function marketResolvedTopics(opts?: {
  marketId?: bigint | number;
  resolver?: string;
}): EventTopicFilter {
  return {
    eventName: ResolveEventName.MarketResolved,
    topics: [
      topicSymbol(ResolveEventName.MarketResolved),
      opts?.marketId !== undefined ? topicU64(opts.marketId) : null,
      opts?.resolver ? topicAddress(opts.resolver) : null,
    ],
  };
}

/**
 * Build RPC topic filters for MarketInvalidated.
 * Topics: [event_name, market_id?, caller?]
 */
export function marketInvalidatedTopics(opts?: {
  marketId?: bigint | number;
  caller?: string;
}): EventTopicFilter {
  return {
    eventName: ResolveEventName.MarketInvalidated,
    topics: [
      topicSymbol(ResolveEventName.MarketInvalidated),
      opts?.marketId !== undefined ? topicU64(opts.marketId) : null,
      opts?.caller ? topicAddress(opts.caller) : null,
    ],
  };
}

/**
 * Build RPC topic filters for Claimed.
 * Topics: [event_name, market_id?, user?]
 */
export function claimedTopics(opts?: {
  marketId?: bigint | number;
  user?: string;
}): EventTopicFilter {
  return {
    eventName: ResolveEventName.Claimed,
    topics: [
      topicSymbol(ResolveEventName.Claimed),
      opts?.marketId !== undefined ? topicU64(opts.marketId) : null,
      opts?.user ? topicAddress(opts.user) : null,
    ],
  };
}

/** Decode a single base64 ScVal topic into a native JS value when possible. */
export function decodeEventTopic(topicXdrBase64: string): unknown {
  const scVal = xdr.ScVal.fromXDR(topicXdrBase64, "base64");
  try {
    return scValToNative(scVal);
  } catch {
    switch (scVal.type) {
      case "scvSymbol":
        return scVal.value;
      case "scvAddress":
        return Address.fromScVal(scVal).toString();
      case "scvU64":
        return scVal.value;
      case "scvU32":
        return scVal.value;
      default:
        return scVal;
    }
  }
}

/** Map raw u32 / name side to enum (throws on invalid). */
export function parseSide(value: number | string): Side {
  if (value === Side.Yes || value === "Yes" || value === "yes") return Side.Yes;
  if (value === Side.No || value === "No" || value === "no") return Side.No;
  throw new RangeError(`invalid Side: ${value}`);
}

/** Map raw u32 / name outcome to enum (throws on invalid). */
export function parseOutcome(value: number | string): Outcome {
  if (value === Outcome.Yes || value === "Yes" || value === "yes") {
    return Outcome.Yes;
  }
  if (value === Outcome.No || value === "No" || value === "no") {
    return Outcome.No;
  }
  if (value === Outcome.Invalid || value === "Invalid" || value === "invalid") {
    return Outcome.Invalid;
  }
  throw new RangeError(`invalid Outcome: ${value}`);
}

/** Map raw u32 / name claim kind to enum (throws on invalid). */
export function parseClaimKind(value: number | string): ClaimKind {
  if (value === ClaimKind.Payout || value === "Payout" || value === "payout") {
    return ClaimKind.Payout;
  }
  if (value === ClaimKind.Refund || value === "Refund" || value === "refund") {
    return ClaimKind.Refund;
  }
  throw new RangeError(`invalid ClaimKind: ${value}`);
}
