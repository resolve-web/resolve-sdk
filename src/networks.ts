import { Networks, StrKey } from "@stellar/stellar-sdk";

import type { ResolveNetworkConfig } from "./types.js";

/**
 * Placeholder contract ID used in network presets.
 * Callers MUST override `contractId` with a real deployment before submitting txs.
 */
export const PLACEHOLDER_CONTRACT_ID =
  "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

/** Verified Resolve deployment on Stellar Testnet. */
export const TESTNET_CONTRACT_ID =
  "CD3YJNAYKVKT72DYPVS644OPNVNW6673TUIQWGXXA4VQD7536ARWB6MZ";

/** Native XLM Stellar Asset Contract on Testnet, used by the reference deployment. */
export const TESTNET_SETTLEMENT_TOKEN_ID =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export function assertContractId(contractId: string): void {
  if (!contractId || contractId === PLACEHOLDER_CONTRACT_ID) {
    throw new Error(
      "contractId must be a real deployed Resolve contract ID (override the preset placeholder)",
    );
  }
  if (!StrKey.isValidContract(contractId)) {
    throw new Error(`contractId is not a valid Stellar contract address: ${contractId}`);
  }
}

/** Stellar Testnet preset for the verified public deployment. */
export const TESTNET: ResolveNetworkConfig = {
  networkPassphrase: Networks.TESTNET,
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  contractId: TESTNET_CONTRACT_ID,
};

/** Stellar Futurenet preset. Override `contractId` before use. */
export const FUTURENET: ResolveNetworkConfig = {
  networkPassphrase: Networks.FUTURENET,
  rpcUrl: "https://rpc-futurenet.stellar.org",
  horizonUrl: "https://horizon-futurenet.stellar.org",
  contractId: PLACEHOLDER_CONTRACT_ID,
};

/**
 * Merge a network preset with required overrides (at minimum a real `contractId`).
 */
export function withContractId(
  base: ResolveNetworkConfig,
  contractId: string,
  overrides: Partial<Omit<ResolveNetworkConfig, "contractId">> = {},
): ResolveNetworkConfig {
  assertContractId(contractId);
  const config: ResolveNetworkConfig = {
    ...base,
    ...overrides,
    contractId,
  };
  return config;
}

export const networks = {
  testnet: TESTNET,
  futurenet: FUTURENET,
  withContractId,
  PLACEHOLDER_CONTRACT_ID,
  TESTNET_CONTRACT_ID,
  TESTNET_SETTLEMENT_TOKEN_ID,
  assertContractId,
} as const;
