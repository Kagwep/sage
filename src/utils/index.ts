import { ChainsQueryResponse, TokenInfo } from "@across-protocol/app-sdk";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Address, Chain, Hash, Hex } from "viem";
import { SUPPORTED_CHAINS } from "./across";
import toast from "react-hot-toast";
import { Status } from "../components/LoadingIndicator.tsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}

export  const formatAmount = (amount: string, decimals: number): string => {
  if (!amount || !decimals) return '0';
  return (BigInt(Math.floor(parseFloat(amount) * (10 ** decimals))).toString());
};

export function truncateHexString(string: Hex) {
  return `${string.slice(0, 6)}...${string.slice(-5)}`;
}

export function reduceAcrossChains(
  acrossChains: ChainsQueryResponse | undefined,
  configuredChains: Chain[],
) {
  if (!acrossChains) return;
  // Create a Set of IDs for efficient lookup
  const configuredChainIds = new Set(configuredChains.map((chain) => chain.id));

  // Only use across chain data this app is configured for
  return acrossChains.filter((chain) => configuredChainIds.has(chain.chainId));
}

export function buildQueryKey<T extends object | undefined>(
  queryName: string,
  params: T,
) {
  if (!params) return [queryName];
  return [queryName, ...Object.entries(params).map((entry) => entry.join("="))];
}

export type NoNullValuesOfObject<T extends object> = {
  [Property in keyof T]-?: NonNullable<T[Property]>;
};

type ExplorerLinkParams = {
  chain: Chain;
} & (
  | {
      type: "address";
      address: Address;
    }
  | {
      type: "transaction";
      txHash: Hash;
    }
  | {
      type: "event";
      txHash: Hash;
      eventIndex: number;
    }
);

export function getExplorerLink(params: ExplorerLinkParams) {
  const url = params.chain.blockExplorers?.default.url;
  if (!url) {
    return;
  }

  if (params.type === "address") {
    return `${url}/address/${params.address}`;
  }

  if (params.type === "transaction") {
    return `${url}/tx/${params.txHash}`;
  }

  if (params.type === "event") {
    return `${url}/tx/${params.txHash}#eventlog#${params.eventIndex}`;
  }
}

export function isNativeToken(
  token: TokenInfo | undefined,
  chainId: number | undefined,
) {
  if (!token || !chainId) return;
  const chainNativeCurrency = SUPPORTED_CHAINS.find(
    (chain: any) => chain.id === chainId,
  )?.nativeCurrency;
  if (!chainNativeCurrency) {
    throw new Error("Chain not supported");
  }
  return Boolean(
    chainNativeCurrency.symbol === token.symbol &&
      chainNativeCurrency.decimals === token.decimals,
  );
}


export const validateTransaction = (completion: any, supportedChains: any) => {
    try {
      // Destructure the first completion item
      const {
        token1,
        chain: sourceChain,
        amount,
        dest_chain: destChain = "1135", // Default to Lisk chain ID
        address
      } = completion;
  
      // Normalize inputs
      const normalizedToken = token1?.toLowerCase();
      const normalizedChain = sourceChain?.toLowerCase();
      
      // Find source chain configuration
      const sourceChainConfig = supportedChains.find(
        (chain: any) => chain.name.toLowerCase() === normalizedChain
      );
  
      // Validate source chain
      if (!sourceChainConfig) {
        return {
          isValid: false,
          error: `Chain ${sourceChain} is not supported`,
          data: null
        };
      }
  
      // Find token in source chain
      const tokenConfig = sourceChainConfig.inputTokens.find(
        (token: any) => token.symbol.toLowerCase() === normalizedToken
      );
  
      // Validate token exists in source chain
      if (!tokenConfig) {
        return {
          isValid: false,
          error: `Token ${token1} is not supported on ${sourceChain}`,
          data: null
        };
      }
  
      // Find Lisk chain configuration
      const liskChainConfig = supportedChains.find(
        (chain: any) => chain.chainId === 1135
      );
  
      const destTokenConfig = liskChainConfig?.outputTokens.find(
        (token: any) => token.symbol.toLowerCase() === normalizedToken
      );

      // Validate token exists in Lisk chain
      const isTokenSupportedOnLisk = liskChainConfig?.inputTokens.some(
        (token: any) => token.symbol.toLowerCase() === normalizedToken
      );
  
      if (!isTokenSupportedOnLisk) {
        return {
          isValid: false,
          error: `Token ${token1} is not supported on Lisk chain`,
          data: null
        };
      }
  
      // Validate amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return {
          isValid: false,
          error: 'Invalid amount',
          data: null
        };
      }
  
      // Return validated and processed data
      return {
        isValid: true,
        error: null,
        data: {
          sourceChain: sourceChainConfig,
          destinationChain: liskChainConfig,
          token: tokenConfig,
          outputToken: destTokenConfig,
          amount: amount,
          recipientAddress: address || '',
          parsedAmount: amount * (10 ** tokenConfig.decimals)
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation error: ${(error as any).message}`,
        data: null
      };
    }
  };
  

  export function handleBridgeProgress(progress: any) {
    if (progress.status === "idle") return;
  
    const status = (() => {
      if (
        progress.status === "txError" ||
        progress.status === "simulationError" ||
        progress.status === "error"
      ) {
        return Status.ERROR;
      }
      if (progress.status === "txSuccess" && progress.step === "fill") {
        return Status.SUCCESS;
      }
      return Status.PENDING;
    })();
  
    const label = (() => {
      if (
        progress.status === "txError" ||
        progress.status === "simulationError" ||
        progress.status === "error"
      ) {
        return progress.error?.name || "An error occurred";
      }
      if (progress.step === "approve") {
        return "Approving ERC20 spend...";
      }
      if (progress.step === "deposit") {
        return "Depositing on origin chain...";
      }
      if (progress.step === "fill" && progress.status === "txSuccess") {
        return "Bridge complete!";
      }
      if (progress.step === "fill" && progress.status === "txPending") {
        return "Filling on destination chain...";
      }
      return "Processing...";
    })();
  
    return ({
        label: label,
        status: status
    })
  }
  