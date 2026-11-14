import { describe, expect, it } from "vitest";

import {
  getInvalidateCountdown,
  MarketStatus,
  Outcome,
  secondsUntilInvalidate,
  type Market,
} from "../src/index.js";

const baseMarket: Market = {
  id: 1n,
  creator: "G" + "A".repeat(55),
  resolver: "G" + "B".repeat(55),
  question: "Will Soroban ledger 6_000_000 close on schedule?",
  description: "Verified via Stellar Horizon ledger timestamp.",
  token: "C" + "C".repeat(55),
  createdAt: 1_800_000_000n,
  closeAt: 1_800_003_600n,
  resolutionTimeout: 7_200n,
  yesPool: 100_000_000n,
  noPool: 50_000_000n,
  status: MarketStatus.Open,
  outcome: null,
  finalizedAt: null,
};

describe("getInvalidateCountdown & secondsUntilInvalidate", () => {
  it("computes remaining time before market close", () => {
    const now = 1_800_001_000n;
    const result = getInvalidateCountdown(baseMarket, now);

    expect(result).toEqual({
      invalidateAt: 1_800_010_800n,
      secondsUntilClose: 2_600n,
      remainingSeconds: 9_800n,
      canInvalidate: false,
      phase: "open",
    });
    expect(secondsUntilInvalidate(baseMarket, now)).toBe(9_800n);
  });

  it("transitions to awaiting_resolution exactly at closeAt and counts down to timeout", () => {
    const atClose = getInvalidateCountdown(baseMarket, baseMarket.closeAt);
    expect(atClose).toEqual({
      invalidateAt: 1_800_010_800n,
      secondsUntilClose: 0n,
      remainingSeconds: 7_200n,
      canInvalidate: false,
      phase: "awaiting_resolution",
    });

    const oneSecondBefore = getInvalidateCountdown(baseMarket, 1_800_010_799n);
    expect(oneSecondBefore.remainingSeconds).toBe(1n);
    expect(oneSecondBefore.canInvalidate).toBe(false);
    expect(oneSecondBefore.phase).toBe("awaiting_resolution");
    expect(secondsUntilInvalidate(baseMarket, 1_800_010_799n)).toBe(1n);
  });

  it("unlocks invalidation at exact deadline and clamps remainingSeconds to 0n after timeout", () => {
    const exactDeadline = getInvalidateCountdown(baseMarket, 1_800_010_800n);
    expect(exactDeadline).toEqual({
      invalidateAt: 1_800_010_800n,
      secondsUntilClose: 0n,
      remainingSeconds: 0n,
      canInvalidate: true,
      phase: "invalidatable",
    });
    expect(secondsUntilInvalidate(baseMarket, 1_800_010_800n)).toBe(0n);

    const longAfter = getInvalidateCountdown(baseMarket, 1_800_099_999n);
    expect(longAfter.remainingSeconds).toBe(0n);
    expect(longAfter.secondsUntilClose).toBe(0n);
    expect(longAfter.canInvalidate).toBe(true);
    expect(longAfter.phase).toBe("invalidatable");
    expect(secondsUntilInvalidate(baseMarket, 1_800_099_999n)).toBe(0n);
  });

  it("reports finalized markets as non-invalidatable even after timeout", () => {
    const resolved: Market = {
      ...baseMarket,
      status: MarketStatus.Resolved,
      outcome: Outcome.Yes,
      finalizedAt: 1_800_005_000n,
    };
    const invalidated: Market = {
      ...baseMarket,
      status: MarketStatus.Invalid,
      outcome: Outcome.Invalid,
      finalizedAt: 1_800_011_000n,
    };

    expect(getInvalidateCountdown(resolved, 1_800_050_000n)).toEqual({
      invalidateAt: 1_800_010_800n,
      secondsUntilClose: 0n,
      remainingSeconds: 0n,
      canInvalidate: false,
      phase: "finalized",
    });
    expect(secondsUntilInvalidate(resolved, 1_800_050_000n)).toBeNull();
    expect(secondsUntilInvalidate(invalidated, 1_800_050_000n)).toBeNull();
  });

  it("accepts safe number inputs and minimal market field objects", () => {
    const result = getInvalidateCountdown(
      { closeAt: 1_000, resolutionTimeout: 3_600 },
      2_000,
    );
    expect(result).toEqual({
      invalidateAt: 4_600n,
      secondsUntilClose: 0n,
      remainingSeconds: 2_600n,
      canInvalidate: false,
      phase: "awaiting_resolution",
    });
  });

  it("rejects negative or unsafe floating-point timestamps", () => {
    expect(() =>
      getInvalidateCountdown({ closeAt: -1n, resolutionTimeout: 3_600n }, 100n),
    ).toThrow(RangeError);
    expect(() =>
      getInvalidateCountdown({ closeAt: 100n, resolutionTimeout: -5n }, 100n),
    ).toThrow(RangeError);
    expect(() => getInvalidateCountdown(baseMarket, -1)).toThrow(RangeError);
    expect(() => getInvalidateCountdown(baseMarket, 1.5)).toThrow(RangeError);
    expect(() => getInvalidateCountdown(baseMarket, Number.NaN)).toThrow(
      RangeError,
    );
  });
});
