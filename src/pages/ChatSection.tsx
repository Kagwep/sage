"use client"


import React, { useState, KeyboardEvent, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import axios from "axios";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useWalletClient,useChainId, useChains, useConfig, useSwitchChain ,} from 'wagmi';
import { ERC20_ABI, PARAMETER_EXTRACTION, tokensAll } from '../constants';
import TransactionModal, { findTokenBySymbol } from './TransactionModal';
import { v4 as uuidv4 } from 'uuid';
import { routeConfig, STAKE_CONTRACT, stakeToken } from "../utils/stake";
import { createAcrossClient, DepositStatus, FillStatus } from "@across-protocol/app-sdk";
import toast from 'react-hot-toast';
import { formatEther, Hash, parseUnits } from 'viem';
import { useSupportedAcrossChains } from '../hooks/useSupportedAcrossChains';
import { formatAmount, handleBridgeProgress, validateTransaction } from '../utils';
import { MAINNET_SUPPORTED_CHAINS } from '../utils/chains';
import { mainnet } from "viem/chains";
import { getWalletClient } from "wagmi/actions";
import { useExecuteQuote } from '../hooks/useExecuteQuote';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useAcross } from '../utils/across';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  txHash?: string;
  address?: string;
  mode: 'chat' | 'transaction';
  error?: string;
}

const shortenString = (str: string, chars: number = 4) => {
  if (!str) return '';
  return `${str.substring(0, chars)}...${str.substring(str.length - chars)}`;
};



export const ChatSection = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
      text: "👋 Hi! I'm your Lisk assistant. I can help you send ,swap , check balances, and learn about Lisk's ecosystem. What would you like to know?",
      timestamp: new Date(),
      mode: 'chat'
    }
  ]);
  
  const [input, setInput] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const  publicClient = usePublicClient();
  const { supportedChains } = useSupportedAcrossChains({});
  const wallet = useWalletClient();
  const config = useConfig();
  const chains = useChains();
  const sdk = useAcross();
      const [txHash, setTxHash] = useState<Hash>();
      const [destinationBlock, setDestinationBlock] = useState<bigint>();
      const [depositData, setDepositData] = useState<DepositStatus>();
      const [fillData, setFillData] = useState<FillStatus>();
  
      const [loadingDeposit, setLoadingDeposit] = useState(false);
      const [loadingFill, setLoadingFill] = useState(false);

  const { writeContractAsync } = useWriteContract();

  //const { executeQuote, progress } = useExecuteQuote();

  const { address } = useAccount();
  const handleTransactionResponse = (apiResponse: any) => {
    setResponse(apiResponse);
    setIsModalOpen(true);
  };

  console.log(MAINNET_SUPPORTED_CHAINS)

  const processUserInput = async (text: string) => {

    try {

    const requestBody = {
      prompt: text,
      address: address, 
    };


    const response = await axios.post(
      PARAMETER_EXTRACTION,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "x-brian-api-key": import.meta.env.VITE_BRIAN, 
        },
      }
    );;
 
    const newMessage1 = {
      id: (messages.length + 2).toString(),
      text: "Processing instructions...",
      sender: 'agent',
      timestamp: new Date(),
      mode: 'transaction'
    };


    console.log(response.data)
  
    handleTransactionResponse(response.data)

    return newMessage1;

   } catch (error: any) {
      console.error("Error occurred during transaction:", error.response?.data || error.message);

    // Optional: Add error message to chat
    const errorMessage = {
      id: (messages.length + 2).toString(),
      text: 'Sorry, there was an error processing your message. Please try again.',
      sender: 'agent' as const,
      timestamp: new Date(),
      mode: 'chat' as const
    };
    
     return errorMessage;

    }

  };

  const handleSubmit = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date(),
      mode: 'chat'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Process and add response
    const response = await processUserInput(text);
    setMessages(prev => [...prev, response as any]);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(input);
    }
  };

  async function executeTransaction(
    response: any,
    account: string,
) {
    try {
        // Connect to provider 
       
        
        // Identify transaction type from response
        const txType =  response.result.completion[0].action;
        const completion = response.result.completion[0];

        // Create transaction parameters based on type
        let txParams: any;
        
        switch(txType) {
            case 'balance':

            const { token1: token_check } = completion;
        
            if (!token_check) {
              toast.error("Please provide token to check");
              return false;
            }
    
            const toCheckBalance = findTokenBySymbol(token_check, tokensAll);
            if (!toCheckBalance) {
              toast.error("Invalid token");
              return false;
            }
    
            const toastId = toast.loading("Checking balance...");
            
            const balance = await publicClient?.readContract({
              abi: ERC20_ABI,
              address: toCheckBalance.address as any,
              functionName: 'balanceOf',
              args: [account] as any,
            });

            toast.dismiss(toastId);
            
            console.log("the balance is ...", balance)

            return {
              success: true,
              balance: Number(formatEther(balance || 0n)),
            };

            case 'transfer':
              
                break;

            case 'approve':
                
                break;

            case 'deploy':
                
                break;

            case 'swap':
                
                break;

            case 'bridge':
              
              const { isValid, error, data } = validateTransaction(completion, supportedChains);
              if (isValid && data) {
                // Proceed with bridge operation using data
                console.log(data)
                console.log(`Bridging ${data.amount} ${data.token.symbol} from ${data.sourceChain.name} to Lisk`);

                const routes = await sdk.getAvailableRoutes({
                  originChainId: data.sourceChain.chainId,
                  destinationChainId: data.destinationChain.chainId,
                })!;
          
                const route = routes.find((r) => r.inputTokenSymbol === data.token.symbol.symbol)!;
        
                        // 1. get quote
                const bridgeQuoteRes = await sdk.getQuote({
                  route,
                  inputAmount: formatAmount(data.amount, data.destinationChain.decimals),
                  recipient: address,
                });

                if(!bridgeQuoteRes) return;

                const walletClient = await getWalletClient(config);
            
                console.log(bridgeQuoteRes)
            
                const { request } = await sdk.simulateDepositTx({
                  walletClient,
                  deposit: bridgeQuoteRes.deposit,
                });
              
            
                const destinationBlock = await sdk
                .getPublicClient(bridgeQuoteRes.deposit.destinationChainId)
                .getBlockNumber();
            
                const transactionHash = await walletClient.writeContract(request);
              
                setTxHash(transactionHash);
            
                setDestinationBlock(destinationBlock);

                // const sourceChainConfig = MAINNET_SUPPORTED_CHAINS.find(
                //   chain => chain.id === data.sourceChain.chainId
                // );
                
                // const destChainConfig = MAINNET_SUPPORTED_CHAINS.find(
                //   chain => chain.id === data.destinationChain.chainId
                // );
              

                // const client = createAcrossClient({
                //   integratorId: "0xdead", // 2-byte hex string
                //   chains: [mainnet, destChainConfig as any, sourceChainConfig],
                // });

                // console.log(client)

                // const inputAmount = parseUnits(
                //   data.amount.toString(), 
                //   data.token.decimals
                // );

                // const quote = await client.getQuote({
                //   route,
                //   inputAmount
                // });

 
                // executeQuote(quote);


                // if (progress){
                //   const res = handleBridgeProgress(progress);
                //   if (res) {
                //     toast.custom(
                //       <div className="flex items-center gap-2">
                //         {res.status === 'ERROR' && <XCircle className="text-red-500 w-4 h-4" />}
                //         {res.status === 'SUCCESS' && <CheckCircle className="text-green-500 w-4 h-4" />}
                //         {res.status === 'PENDING' && <Loader2 className="w-4 h-4 animate-spin" />}
                //         <span>{res.label}</span>
                //       </div>,
                //       {
                //         duration: res.status === 'SUCCESS' ? 3000 : Infinity,
                //         id: 'bridge-progress'
                //       }
                //     );
                //   }
                // }



                return {
                  success: true,
                };

              } else {
                // Handle error
                console.error(error);
              }


                break;

            default:
                throw new Error(`Unsupported transaction type: ${txType}`);
        }



    } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
    }
}

  const handleConfirmPromptInput = async () => {
    if (!response) return;
    
    setIsProcessing(true);
    try {
      const result: any  = await executeTransaction(
        response,
        address as string,
      );

      const newMessage: Message = {
        id: uuidv4(),
        text: result.success ? 'success' : 'error',
        sender: 'agent',
        timestamp: new Date(),
        txHash: result,
        mode: 'transaction'
      };

      if (result.success) {
        newMessage.text = 'Transaction submitted successfully';
        newMessage.txHash = result.transactionHash;

        console.log(result)
        
        if (result.tokenAddress) {
          newMessage.address = result.tokenAddress;
          newMessage.text += `. Token deployed at ${result.tokenAddress}`;
        }

        if (result.balance >= 0){
          console.log( `Your balance is ${result.balance}`)
          newMessage.text = `Your balance is ${result.balance}`;
        }

      } else {
        newMessage.text = result.error || 'Transaction failed. Please try again.';
        newMessage.error = result.error;
      }
    
      setMessages(prevMessages => [...prevMessages, newMessage as any]);

      setIsModalOpen(false);
    }catch (error) {
      const errorMessage: Message = {
        id: uuidv4(),
        text: error instanceof Error ? error.message : 'An unexpected error occurred',
        sender: 'agent',
        timestamp: new Date(),
        mode: 'transaction',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }  finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (depositData?.depositTxReceipt) {
      const { status, transactionHash } = depositData.depositTxReceipt;
      const shortTxHash = `${transactionHash.slice(0, 6)}...${transactionHash.slice(-4)}`;

      if (status === 'success') {
        // Successful deposit
        toast.success(
          `Starting bridge: deposit confirmed (tx: ${shortTxHash})`, 
          {
            duration: 5000,
            icon: '🔄',
            style: { background: '#363636', color: '#fff' },
            iconTheme: { primary: '#4ade80', secondary: '#363636' },
          }
        );
      } else if (status === 'reverted') {
        // Failed deposit
        toast.error(
          `Deposit failed: Transaction reverted (tx: ${shortTxHash})`, 
          {
            duration: 8000,
            icon: '⚠️',
            style: { background: '#363636', color: '#fff' },
          }
        );
      }
    }
  }, [depositData]);

  // Handle bridge fill states
  useEffect(() => {
    if (fillData?.fillTxReceipt) {
      const { status, transactionHash } = fillData.fillTxReceipt;
      const shortTxHash = `${transactionHash.slice(0, 6)}...${transactionHash.slice(-4)}`;

      if (status === 'success') {
        // Calculate time taken if available


        toast.success(
          `Bridge complete! (tx: ${shortTxHash})`, 
          {
            duration: 8000,
            icon: '✅',
            style: { background: '#363636', color: '#fff' },
            iconTheme: { primary: '#4ade80', secondary: '#363636' },
          }
        );
      } else if (status === 'reverted') {
        // Failed bridge completion
        toast.error(
          `Bridge failed: Could not complete the transfer (tx: ${shortTxHash})`, 
          {
            duration: 8000,
            icon: '❌',
            style: { background: '#363636', color: '#fff' },
          }
        );
      }
    }
  }, [fillData, depositData]);

  return (
    <>
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 overflow-auto space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`p-3 rounded-lg max-w-[80%] ${
              msg.sender === 'user' 
                ? 'ml-auto bg-blue-600 text-white' 
                : 'bg-gray-100'
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="text-sm">{msg.text}</div>
              {msg.txHash && (
                <div className="text-xs opacity-75">
                  Tx: {shortenString(msg.txHash, 6)}
                </div>
              )}
              {msg.address && (
                <div className="text-xs opacity-75">
                  Address: {shortenString(msg.address, 6)}
                </div>
              )}
              <div className="text-xs opacity-50">
                {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
              </div>
              {msg.error && (
                <div className="text-red-500 text-xs mt-1">{msg.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about Lisk..."
            className="flex-1 p-2 border rounded"
          />
          <button 
            onClick={() => handleSubmit(input)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

    </div>

    {response && (
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmPromptInput}
          response={response}
          isProcessing={isProcessing}
          tokens = {tokensAll}
        />
      )}
      
    </>
  );
};

export default ChatSection;