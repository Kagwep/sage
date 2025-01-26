import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  linea,
  lisk,
  scroll,
  redstone,
  zora,
  blast,
} from "wagmi/chains";

export const MAINNET_SUPPORTED_CHAINS = [
  lisk,
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  linea,
  scroll,
  redstone,
  zora,
  blast,
] as const;
