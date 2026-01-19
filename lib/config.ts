export const CONTRACTS = {
  SAKU_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xDF175c5401b140Aaa296e15B00fD34CbdAfc384D",
  IDRX_ADDRESS: process.env.NEXT_PUBLIC_IDRX_ADDRESS || "0x146A02D762D3D4f3C05bEddeB11C1209C0B9cF1F",
  REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xDF175c5401b140Aaa296e15B00fD34CbdAfc384D",
} as const;

export const NETWORK_CONFIG = {
  chainId: 84532,
  name: "Base Sepolia",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org",
  blockExplorer: "https://sepolia.basescan.org",
} as const;

export const IDRX_DECIMALS = 6;