export const CONTRACTS = {
  SAKU_ADDRESS: process.env.NEXT_PUBLIC_SAKU_REGISTRY_ADDRESS || "0xFf3157D1BE69e88F40eb105d222344b10Caa25A1",
  IDRX_ADDRESS: process.env.NEXT_PUBLIC_IDRX_ADDRESS || "0x9c33242D93Bc4BCA866dFcB36FEeF81482383A56",
  REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_SAKU_REGISTRY_ADDRESS || "0xFf3157D1BE69e88F40eb105d222344b10Caa25A1",
} as const;

export const NETWORK_CONFIG = {
  chainId: 421614,
  name: "Arbitrum Sepolia",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
  blockExplorer: "https://sepolia.arbiscan.io",
} as const;

export const IDRX_DECIMALS = 6;