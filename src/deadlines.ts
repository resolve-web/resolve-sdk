import { MarketStatus } from "./types.js";

export type InvalidateCountdownMarket = {
  /** Unix timestamp (seconds) after which staking closes. */
  closeAt: bigint | number;
  /** Grace window (seconds) after `closeAt` reserved for the resolver before `invalidate` unlocks. */
  resolutionTimeout: bigint | number;
  /** Optional on-chain status; resolved or already-invalidated markets cannot be invalidated. */
  status?: MarketStatus;
};

export type InvalidatePhase =
  | "open"
  | "awaiting_resolution"
  | "invalidatable"
  | "finalized";

export type InvalidateCountdown = {
  /** Unix timestamp (seconds) at which permissionless `invalidate` becomes eligible (`closeAt + resolutionTimeout`). */
  invalidateAt: bigint;
  /** Remaining seconds until staking closes (`0n` once closed or finalized). */
  secondsUntilClose: bigint;
  /** Remaining seconds until `invalidate` is allowed (`0n` once eligible or finalized). */
  remainingSeconds: bigint;
  /** True when the market is not finalized and `nowSeconds >= closeAt + resolutionTimeout`. */
  canInvalidate: boolean;
  /** Current lifecycle phase with respect to `closeAt`, `invalidateAt`, and `status`. */
  phase: InvalidatePhase;
};

function toNonNegativeTimestamp(value: bigint | number, name: string): bigint {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative safe integer`);
    }
    return BigInt(value);
  }
  if (value < 0n) {
    throw new RangeError(`${name} must be non-negative`);
  }
  return value;
}

/**
 * Pure helper computing countdown details until permissionless `invalidate` is allowed
 * (`nowSeconds >= market.closeAt + market.resolutionTimeout`).
 */
export function getInvalidateCountdown(
  market: InvalidateCountdownMarket,
  nowSeconds: bigint | number = BigInt(Math.floor(Date.now() / 1000)),
): InvalidateCountdown {
  const closeAt = toNonNegativeTimestamp(market.closeAt, "closeAt");
  const resolutionTimeout = toNonNegativeTimestamp(
    market.resolutionTimeout,
    "resolutionTimeout",
  );
  const now = toNonNegativeTimestamp(nowSeconds, "nowSeconds");
  const invalidateAt = closeAt + resolutionTimeout;

  if (
    market.status !== undefined &&
    market.status !== MarketStatus.Open
  ) {
    return {
      invalidateAt,
      secondsUntilClose: 0n,
      remainingSeconds: 0n,
      canInvalidate: false,
      phase: "finalized",
    };
  }

  const secondsUntilClose = now < closeAt ? closeAt - now : 0n;

  if (now >= invalidateAt) {
    return {
      invalidateAt,
      secondsUntilClose: 0n,
      remainingSeconds: 0n,
      canInvalidate: true,
      phase: "invalidatable",
    };
  }

  return {
    invalidateAt,
    secondsUntilClose,
    remainingSeconds: invalidateAt - now,
    canInvalidate: false,
    phase: now < closeAt ? "open" : "awaiting_resolution",
  };
}

/**
 * Returns remaining seconds until `invalidate` is allowed (`0n` once eligible),
 * or `null` if the market is already resolved or invalidated.
 */
export function secondsUntilInvalidate(
  market: InvalidateCountdownMarket,
  nowSeconds: bigint | number = BigInt(Math.floor(Date.now() / 1000)),
): bigint | null {
  const countdown = getInvalidateCountdown(market, nowSeconds);
  if (countdown.phase === "finalized") return null;
  return countdown.remainingSeconds;
}
