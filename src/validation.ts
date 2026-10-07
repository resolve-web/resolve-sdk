import { StrKey } from "@stellar/stellar-sdk";

import { CONTRACT_LIMITS, type CreateMarketParams } from "./types.js";

function asBigInt(value: bigint | number): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error("timestamp values must be safe integers");
  }
  return BigInt(value);
}

export function validateCreateMarket(
  params: CreateMarketParams,
  nowSeconds = BigInt(Math.floor(Date.now() / 1000)),
): void {
  if (!StrKey.isValidEd25519PublicKey(params.creator)) throw new Error("creator must be a valid Stellar account");
  if (!StrKey.isValidEd25519PublicKey(params.resolver)) throw new Error("resolver must be a valid Stellar account");
  if (!StrKey.isValidContract(params.token)) throw new Error("token must be a valid Stellar contract address");

  const questionBytes = new TextEncoder().encode(params.question).length;
  const descriptionBytes = new TextEncoder().encode(params.description).length;
  if (questionBytes === 0 || questionBytes > CONTRACT_LIMITS.MAX_QUESTION_LEN) throw new Error("question length is outside contract limits");
  if (descriptionBytes > CONTRACT_LIMITS.MAX_DESCRIPTION_LEN) throw new Error("description length is outside contract limits");

  const duration = asBigInt(params.closeAt) - nowSeconds;
  if (duration < CONTRACT_LIMITS.MIN_MARKET_DURATION_SECS || duration > CONTRACT_LIMITS.MAX_MARKET_DURATION_SECS) throw new Error("market duration is outside contract limits");
  const timeout = asBigInt(params.resolutionTimeout);
  if (timeout < CONTRACT_LIMITS.MIN_RESOLUTION_TIMEOUT_SECS || timeout > CONTRACT_LIMITS.MAX_RESOLUTION_TIMEOUT_SECS) throw new Error("resolution timeout is outside contract limits");
}
