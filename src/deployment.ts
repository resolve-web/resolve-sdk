import { StrKey } from "@stellar/stellar-sdk";

export type ResolveDeployment = {
  network: string;
  networkPassphrase: string;
  rpcUrl: string;
  contractId: string;
  settlementTokenId: string;
  deployedAt: string;
  wasmSha256?: string;
};

export function parseDeployment(value: unknown): ResolveDeployment {
  if (!value || typeof value !== "object") throw new Error("deployment manifest must be an object");
  const item = value as Record<string, unknown>;
  for (const key of ["network", "networkPassphrase", "rpcUrl", "contractId", "settlementTokenId", "deployedAt"]) {
    if (typeof item[key] !== "string" || item[key] === "") throw new Error(`deployment manifest is missing ${key}`);
  }
  if (!StrKey.isValidContract(item.contractId as string)) throw new Error("deployment contractId is invalid");
  if (!StrKey.isValidContract(item.settlementTokenId as string)) throw new Error("deployment settlementTokenId is invalid");
  try { new URL(item.rpcUrl as string); } catch { throw new Error("deployment rpcUrl is invalid"); }
  if (Number.isNaN(Date.parse(item.deployedAt as string))) throw new Error("deployment deployedAt is invalid");
  return item as ResolveDeployment;
}
