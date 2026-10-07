import { describe, expect, it } from "vitest";

import { mapMarket, mapPosition, scValHelpers } from "../src/client.js";
import {
  ClaimKind,
  CONTRACT_LIMITS,
  MarketStatus,
  Outcome,
  Side,
} from "../src/types.js";
import {
  parseClaimKind,
  parseOutcome,
  parseSide,
} from "../src/events.js";

describe("enum type mapping", () => {
  it("mirrors the contract lifetime limits", () => {
    expect(CONTRACT_LIMITS.MAX_MARKET_DURATION_SECS).toBe(10_368_000n);
    expect(CONTRACT_LIMITS.MAX_RESOLUTION_TIMEOUT_SECS).toBe(2_592_000n);
  });

  it("maps Side / Outcome / MarketStatus from names and numbers", () => {
    expect(scValHelpers.mapSide("Yes")).toBe(Side.Yes);
    expect(scValHelpers.mapSide(["No"])).toBe(Side.No);
    expect(scValHelpers.mapSide({ tag: "Yes" })).toBe(Side.Yes);

    expect(scValHelpers.mapOutcome("Invalid")).toBe(Outcome.Invalid);
    expect(scValHelpers.mapOutcome({ tag: "Some", values: ["No"] })).toBe(
      Outcome.No,
    );
    expect(scValHelpers.mapOutcome({ tag: "None" })).toBeNull();
    expect(scValHelpers.mapOutcome(null)).toBeNull();

    expect(scValHelpers.mapMarketStatus("Open")).toBe(MarketStatus.Open);
    expect(scValHelpers.mapMarketStatus(1)).toBe(MarketStatus.Resolved);
    expect(scValHelpers.mapMarketStatus({ tag: "Invalid" })).toBe(
      MarketStatus.Invalid,
    );
  });

  it("parses event helper enums", () => {
    expect(parseSide(0)).toBe(Side.Yes);
    expect(parseSide("No")).toBe(Side.No);
    expect(parseOutcome(2)).toBe(Outcome.Invalid);
    expect(parseClaimKind("Refund")).toBe(ClaimKind.Refund);
    expect(() => parseSide(9)).toThrow(/invalid Side/);
  });

  it("encodes unit enums as ScVec([Symbol])", () => {
    const yes = scValHelpers.sideScVal(Side.Yes);
    expect(yes.switch().name).toBe("scvVec");
    const vec = yes.vec();
    expect(vec?.[0]?.sym().toString()).toBe("Yes");

    const invalid = scValHelpers.outcomeScVal(Outcome.Invalid);
    expect(invalid.vec()?.[0]?.sym().toString()).toBe("Invalid");
  });
});

describe("mapMarket / mapPosition", () => {
  it("maps snake_case contract market payloads", () => {
    const market = mapMarket({
      id: 3n,
      creator: "GCREATOR",
      resolver: "GRESOLVER",
      question: "Will it rain?",
      description: "NYC tomorrow",
      token: "CTOKEN",
      created_at: 1_700_000_000n,
      close_at: 1_700_086_400n,
      resolution_timeout: 3600n,
      yes_pool: 100n,
      no_pool: 50n,
      status: "Open",
      outcome: null,
      finalized_at: null,
    });

    expect(market).toEqual({
      id: 3n,
      creator: "GCREATOR",
      resolver: "GRESOLVER",
      question: "Will it rain?",
      description: "NYC tomorrow",
      token: "CTOKEN",
      createdAt: 1_700_000_000n,
      closeAt: 1_700_086_400n,
      resolutionTimeout: 3600n,
      yesPool: 100n,
      noPool: 50n,
      status: MarketStatus.Open,
      outcome: null,
      finalizedAt: null,
    });
  });

  it("maps camelCase and Option wrappers", () => {
    const market = mapMarket({
      id: 1,
      creator: "G1",
      resolver: "G2",
      question: "Q",
      description: "",
      token: "CT",
      createdAt: 10,
      closeAt: 20,
      resolutionTimeout: 3600,
      yesPool: 0,
      noPool: 0,
      status: { tag: "Resolved" },
      outcome: { tag: "Some", values: [{ tag: "Yes" }] },
      finalizedAt: { tag: "Some", values: [99] },
    });

    expect(market.status).toBe(MarketStatus.Resolved);
    expect(market.outcome).toBe(Outcome.Yes);
    expect(market.finalizedAt).toBe(99n);
  });

  it("maps positions", () => {
    expect(
      mapPosition({
        yes_amount: 10n,
        no_amount: 0n,
        claimed: false,
      }),
    ).toEqual({
      yesAmount: 10n,
      noAmount: 0n,
      claimed: false,
    });
  });
});
