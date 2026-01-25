export const CONTRACTS = {
  SAKU_ADDRESS: process.env.NEXT_PUBLIC_SAKU_REGISTRY_ADDRESS || "0x225abf028BA59B8515C7938F28e472cFCb2Fc35e",
  IDRX_ADDRESS: process.env.NEXT_PUBLIC_IDRX_ADDRESS || "0x9c33242D93Bc4BCA866dFcB36FEeF81482383A56",
  REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_SAKU_REGISTRY_ADDRESS || "0x225abf028BA59B8515C7938F28e472cFCb2Fc35e",
} as const;

export const NETWORK_CONFIG = {
  chainId: 84532,
  name: "Base Sepolia",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org",
  blockExplorer: "https://sepolia.basescan.org",
} as const;

export const IDRX_DECIMALS = 6;