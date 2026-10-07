import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";

import { validateCreateMarket } from "../src/validation.js";

const now = 1_800_000_000n;
const account = Keypair.random().publicKey();
const token = StrKey.encodeContract(Buffer.alloc(32, 7));
const valid = { creator: account, resolver: account, token, question: "Will it ship?", description: "Objective release criterion", closeAt: now + 3600n, resolutionTimeout: 3600n };

describe("validateCreateMarket", () => {
  it("accepts contract-valid parameters", () => expect(() => validateCreateMarket(valid, now)).not.toThrow());
  it("rejects malformed addresses", () => expect(() => validateCreateMarket({ ...valid, token: "CINVALID" }, now)).toThrow(/token/));
  it("counts UTF-8 bytes like the contract", () => expect(() => validateCreateMarket({ ...valid, question: "é".repeat(129) }, now)).toThrow(/question/));
  it("rejects excessive market duration", () => expect(() => validateCreateMarket({ ...valid, closeAt: now + 121n * 86400n }, now)).toThrow(/duration/));
});
