import { describe, expect, it } from "vitest";

import {
  FUTURENET,
  PLACEHOLDER_CONTRACT_ID,
  TESTNET,
  TESTNET_CONTRACT_ID,
  withContractId,
} from "../src/networks.js";
import { ResolveClient } from "../src/client.js";
import {
  claimedTopics,
  marketCreatedTopics,
  ResolveEventName,
  stakedTopics,
} from "../src/events.js";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";

const FAKE_CONTRACT =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4";

describe("networks", () => {
  it("exposes the verified testnet deployment and a futurenet placeholder", () => {
    expect(TESTNET.contractId).toBe(TESTNET_CONTRACT_ID);
    expect(FUTURENET.contractId).toBe(PLACEHOLDER_CONTRACT_ID);
    expect(TESTNET.rpcUrl).toContain("testnet");
    expect(FUTURENET.networkPassphrase).toMatch(/Future/);
  });

  it("withContractId requires a real deployment id", () => {
    expect(() => withContractId(TESTNET, PLACEHOLDER_CONTRACT_ID)).toThrow(
      /real deployed/,
    );
    const cfg = withContractId(TESTNET, FAKE_CONTRACT, {
      rpcUrl: "https://example.test",
    });
    expect(cfg.contractId).toBe(FAKE_CONTRACT);
    expect(cfg.rpcUrl).toBe("https://example.test");
    expect(() => withContractId(TESTNET, "CNOTVALID")).toThrow(
      /valid Stellar contract address/,
    );
  });

  it("ResolveClient accepts testnet and rejects placeholder contractId", () => {
    expect(() => new ResolveClient({ ...TESTNET })).not.toThrow();
    expect(() => new ResolveClient({ ...FUTURENET })).toThrow(/contractId/);
    expect(
      () =>
        new ResolveClient({
          ...TESTNET,
          contractId: FAKE_CONTRACT,
        }),
    ).not.toThrow();
  });
});

describe("event topic helpers", () => {
  it("encodes event name symbol as first topic", () => {
    const filter = marketCreatedTopics();
    expect(filter.eventName).toBe(ResolveEventName.MarketCreated);
    expect(filter.topics[0]).toBeTruthy();
    expect(filter.topics[1]).toBeNull();
    expect(filter.topics[2]).toBeNull();

    const decoded = scValToNative(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      nativeToScVal(ResolveEventName.MarketCreated, { type: "symbol" }),
    );
    expect(decoded).toBe(ResolveEventName.MarketCreated);
  });

  it("fills market id and address topic slots when provided", () => {
    const filter = stakedTopics({
      marketId: 42n,
      user: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    });
    expect(filter.topics[1]).toBeTruthy();
    expect(filter.topics[2]).toBeTruthy();

    const claimed = claimedTopics({ marketId: 1 });
    expect(claimed.topics[1]).toBeTruthy();
    expect(claimed.topics[2]).toBeNull();
  });
});
