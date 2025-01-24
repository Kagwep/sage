import { useMutation } from "@tanstack/react-query";
import { useAcross } from "../utils/across";
import { buildQueryKey, getExplorerLink } from "../utils";
import { AcrossClient, ExecutionProgress } from "@across-protocol/app-sdk";
import { useChainId, useChains, useConfig, useSwitchChain } from "wagmi";
import { useState } from "react";
import { TransactionReceipt } from "viem";
import { getWalletClient } from "wagmi/actions";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export type useExecuteQuoteParams =
  | Omit<Parameters<AcrossClient["executeQuote"]>[0], "walletClient">
  | undefined;

  export function useExecuteQuote() {
    const sdk = useAcross();
    const config = useConfig();
    const chains = useChains();
    const { switchChainAsync } = useSwitchChain();
    const chainId = useChainId();
  
    const [progress, setProgress] = useState<ExecutionProgress>({
      status: "idle",
      step: "approve",
    });
    const [depositReceipt, setDepositReceipt] = useState<TransactionReceipt>();
    const [fillReceipt, setFillReceipt] = useState<TransactionReceipt>();
  
    function resetProgress() {
      setProgress({
        status: "idle",
        step: "approve",
      });
    }
  
    const { mutate: executeQuote, ...rest } = useMutation({
      mutationKey: ["executeQuote"],
      mutationFn: async (params: useExecuteQuoteParams) => {
        resetProgress();
  
        if (!params) return;
  
        if (chainId !== params.deposit.originChainId) {
          await switchChainAsync({ chainId: params.deposit.originChainId });
        }
  
        const walletClient = await getWalletClient(config);
        if (!walletClient) return;
  
        return sdk.executeQuote({
          ...params,
          walletClient,
          infiniteApproval: true,
          onProgress: (progress) => {
            toast.custom(
              <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-3 border border-gray-100">
              {progress.status === "simulationPending" && 
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-900">
                  Step: {progress.step}
                </span>
                <span className="text-xs text-gray-500">
                  Status: {progress.status}
                </span>
              </div>
            </div>,
              {
                id: 'bridge-progress',
                duration: 3000
              }
            );
            if (progress.status === "txSuccess" && progress.step === "deposit") {
              setDepositReceipt(progress.txReceipt);
            }
            if (progress.status === "txSuccess" && progress.step === "fill") {
              setFillReceipt(progress.txReceipt);
            }
            setProgress(progress);
          },
        });
      },
      onError: (error) => {
        console.log("ERROR", error);
      },
    });
  
    const getExplorerLinks = (params: useExecuteQuoteParams) => {
      const originChain = chains.find(
        (chain) => chain.id === params?.deposit.originChainId,
      );
      const destinationChain = chains.find(
        (chain) => chain.id === params?.deposit.destinationChainId,
      );
  
      const depositTxLink =
        depositReceipt &&
        originChain &&
        getExplorerLink({
          chain: originChain,
          type: "transaction",
          txHash: depositReceipt.transactionHash,
        });
  
      const fillTxLink =
        fillReceipt &&
        destinationChain &&
        getExplorerLink({
          chain: destinationChain,
          type: "transaction",
          txHash: fillReceipt.transactionHash,
        });
  
      return { depositTxLink, fillTxLink };
    };
  
    return {
      progress,
      executeQuote,
      depositReceipt,
      fillReceipt,
      getExplorerLinks,
      ...rest,
    };
  }