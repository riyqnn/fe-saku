export const CONTRACTS = {
  SAKU_ADDRESS: process.env.NEXT_PUBLIC_SAKU_REGISTRY_ADDRESS || "0xeB94353ccdD59f49126205903B7Fb7A91CBD3226",
  IDRX_ADDRESS: process.env.NEXT_PUBLIC_IDRX_ADDRESS || "0x4aA676740f4b28925Dc9b11cD4642b2AEa57c424",
  REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_SAKU_REGISTRY_ADDRESS || "0xeB94353ccdD59f49126205903B7Fb7A91CBD3226",
  USDC_STAKING: process.env.NEXT_PUBLIC_USDC_STAKING || "0x9024A2E57C62125e6fdC9C0e3D79A4c5526afE44",
} as const;

export const NETWORK_CONFIG = {
  chainId: 421614,
  name: "Arbitrum Sepolia",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
  blockExplorer: "https://sepolia.arbiscan.io",
} as const;

export const IDRX_DECIMALS = 6;