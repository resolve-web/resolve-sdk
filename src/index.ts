/**
 * @resolve-protocol/sdk
 *
 * TypeScript SDK for the Resolve prediction-market protocol on Stellar/Soroban.
 */

export { ResolveClient, mapMarket, mapPosition, scValHelpers } from "./client.js";
export {
  toContractAmount,
  fromContractAmount,
} from "./amounts.js";
export {
  ResolveError,
  ResolveErrorCode,
  RESOLVE_ERROR_NUMBERS,
  parseResolveError,
  resolveErrorCodeFromNumber,
  resolveErrorTypes,
} from "./errors.js";
export {
  TESTNET,
  FUTURENET,
  PLACEHOLDER_CONTRACT_ID,
  TESTNET_CONTRACT_ID,
  TESTNET_SETTLEMENT_TOKEN_ID,
  assertContractId,
  withContractId,
  networks,
} from "./networks.js";
export {
  ResolveEventName,
  RESOLVE_EVENT_NAMES,
  marketCreatedTopics,
  stakedTopics,
  marketResolvedTopics,
  marketInvalidatedTopics,
  claimedTopics,
  decodeEventTopic,
  parseSide,
  parseOutcome,
  parseClaimKind,
  type EventTopicFilter,
} from "./events.js";
export {
  Side,
  Outcome,
  MarketStatus,
  ClaimKind,
  CONTRACT_LIMITS,
  type ResolveNetworkConfig,
  type ResolveClientOptions,
  type Market,
  type Position,
  type CreateMarketParams,
  type StakeParams,
  type ResolveMarketParams,
  type InvalidateMarketParams,
  type ClaimParams,
  type TxMethodOptions,
  type SignTransaction,
  type SignAuthEntry,
} from "./types.js";

/** Re-export commonly used stellar-sdk contract helpers for app wiring. */
export { basicNodeSigner } from "@stellar/stellar-sdk/contract";
export { validateCreateMarket } from "./validation.js";
export { parseDeployment, type ResolveDeployment } from "./deployment.js";
