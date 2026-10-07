import { StrKey } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";

import { parseDeployment } from "../src/deployment.js";

const contract = StrKey.encodeContract(Buffer.alloc(32, 4));
const manifest = { network: "testnet", networkPassphrase: "Test SDF Network ; September 2015", rpcUrl: "https://soroban-testnet.stellar.org", contractId: contract, settlementTokenId: contract, deployedAt: "2026-01-01T00:00:00.000Z" };

describe("parseDeployment", () => {
  it("returns a validated deployment", () => expect(parseDeployment(manifest)).toEqual(manifest));
  it("rejects placeholder addresses", () => expect(() => parseDeployment({ ...manifest, contractId: "CINVALID" })).toThrow(/contractId/));
  it("rejects malformed URLs", () => expect(() => parseDeployment({ ...manifest, rpcUrl: "local" })).toThrow(/rpcUrl/));
});
