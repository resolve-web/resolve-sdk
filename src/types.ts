/**
 * Core types mirroring the Resolve Soroban contract.
 */

import type {
  SignAuthEntry,
  SignTransaction,
} from "@stellar/stellar-sdk/contract";

export type { SignAuthEntry, SignTransaction };

/** Network + deployment configuration. `contractId` must be set by the caller. */
export type ResolveNetworkConfig = {
  networkPassphrase: string;
  rpcUrl: string;
  /** Deployed Resolve contract ID (C...). Must be provided — presets use a placeholder. */
  contractId: string;
  horizonUrl?: string;
};

/** Optional signing / account context for write transactions. */
export type ResolveClientOptions = ResolveNetworkConfig & {
  /** Source account public key used when assembling transactions. */
  publicKey?: string;
  /** Transaction signer (e.g. from `basicNodeSigner` or a wallet). */
  signTransaction?: SignTransaction;
  /** Auth-entry signer for Soroban authorization. */
  signAuthEntry?: SignAuthEntry;
  /** Override default base fee (stroops as string). */
  fee?: string;
  /** Transaction timeout in seconds. */
  timeoutInSeconds?: number;
};

/** Stake side. Matches contract `Side` (u32). */
export enum Side {
  Yes = 0,
  No = 1,
}

/** Resolution outcome. Matches contract `Outcome` (u32). */
export enum Outcome {
  Yes = 0,
  No = 1,
  Invalid = 2,
}

/** Market lifecycle status. Matches contract `MarketStatus` (u32). */
export enum MarketStatus {
  Open = 0,
  Resolved = 1,
  Invalid = 2,
}

/** Claim settlement kind. Matches contract `ClaimKind` (u32). */
export enum ClaimKind {
  Payout = 0,
  Refund = 1,
}

/** On-chain market state returned by `get_market`. */
export type Market = {
  id: bigint;
  creator: string;
  resolver: string;
  question: string;
  description: string;
  token: string;
  createdAt: bigint;
  closeAt: bigint;
  resolutionTimeout: bigint;
  yesPool: bigint;
  noPool: bigint;
  status: MarketStatus;
  outcome: Outcome | null;
  finalizedAt: bigint | null;
};

/** User position for a market returned by `get_position`. */
export type Position = {
  yesAmount: bigint;
  noAmount: bigint;
  claimed: boolean;
};

export type CreateMarketParams = {
  creator: string;
  resolver: string;
  question: string;
  description: string;
  token: string;
  /** Unix timestamp (seconds) after which staking is closed. */
  closeAt: bigint | number;
  /** Seconds after `closeAt` before permissionless invalidation. */
  resolutionTimeout: bigint | number;
};

export type StakeParams = {
  user: string;
  marketId: bigint | number;
  side: Side;
  /** Contract-scale i128 amount (use `toContractAmount` for human units). */
  amount: bigint | number | string;
};

export type ResolveMarketParams = {
  marketId: bigint | number;
  outcome: Outcome;
};

export type InvalidateMarketParams = {
  caller: string;
  marketId: bigint | number;
};

export type ClaimParams = {
  user: string;
  marketId: bigint | number;
};

/** Options passed through to AssembledTransaction construction. */
export type TxMethodOptions = {
  fee?: string;
  timeoutInSeconds?: number;
  /** When false, skip simulation (useful for offline XDR assembly). Default true. */
  simulate?: boolean;
  publicKey?: string;
  signTransaction?: SignTransaction;
  signAuthEntry?: SignAuthEntry;
};

/** Contract constraints mirrored for client-side validation helpers. */
export const CONTRACT_LIMITS = {
  MAX_QUESTION_LEN: 256,
  MAX_DESCRIPTION_LEN: 1024,
  MIN_MARKET_DURATION_SECS: 60n,
  MAX_MARKET_DURATION_SECS: 120n * 24n * 60n * 60n,
  MIN_RESOLUTION_TIMEOUT_SECS: 3600n,
  MAX_RESOLUTION_TIMEOUT_SECS: 30n * 24n * 60n * 60n,
} as const;
