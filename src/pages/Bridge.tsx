import React, { useState, useEffect, useCallback } from 'react';
import { 
  useAccount, 
  useConnect, 
  useWriteContract,
  useBalance,
  useChainId,
  useConfig,
  useChains,
} from 'wagmi';
import { Loader2, WalletIcon } from 'lucide-react';
import { MAINNET_SUPPORTED_CHAINS } from '../utils/chains';
import { useSupportedAcrossChains } from '../hooks/useSupportedAcrossChains';
import { ChainsQueryResponse, TokenInfo ,AcrossChain, createAcrossClient,GetQuoteParams} from "@across-protocol/app-sdk";
import { Address, createWalletClient, custom, Hash, parseEther } from "viem";
import { v4 as uuidv4 } from 'uuid';
import { useEthers } from "@usedapp/core";
import { toAccount } from "viem/accounts";
import {
  AcrossClient,
  DepositStatus,
  FillStatus,
  Quote,
} from "@across-protocol/app-sdk";
import { useAcross } from '../utils/across';
import { getWalletClient } from 'wagmi/actions';
import TransactionStatus from '../components/TransactionStatus';
import { formatAmount } from '../utils';
// Define types for our chain configuration
interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
}

// Interface for fee structure
interface FeeData {
  pct: string;
  total: string;
}

// Interface for deposit limits
interface DepositLimits {
  minDeposit: string;
  maxDeposit: string;
  maxDepositInstant: string;
  maxDepositShortDelay: string;
  recommendedDepositInstant: string;
}





interface AcrossApiError {
  type: 'AcrossApiError';
  code: string;
  status: number;
  message: string;
}

// Chain selector component
interface ChainSelectorProps {
  chains: AcrossChain[];
  selectedChain: AcrossChain | null;
  onSelect: (chain: AcrossChain) => void;
  label: string;
}

const ChainSelector: React.FC<ChainSelectorProps> = ({ 
  chains, 
  selectedChain, 
  onSelect,
  label 
}) => {
  return (
<div className="w-full">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    {label}
  </label>
  <div className="relative">
    <select
      value={selectedChain?.chainId || ''}
      onChange={(e) => {
        const chain = chains?.find(c => c.chainId === Number(e.target.value));
        if (chain) onSelect(chain);
      }}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Select a chain</option>
      {chains?.length > 0 ? (
        chains.map((chain) => (
          <option key={chain.chainId} value={chain.chainId}>
            {chain.name}
          </option>
        ))
      ) : (
        <option value="" disabled>No chains available</option>
      )}
    </select>
  </div>
</div>
  );
};

// Token selector component with available tokens based on selected chain
interface TokenSelectorProps {
  tokens: Token[];
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  label: string;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ 
  tokens, 
  selectedToken, 
  onSelect,
  label 
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <select
          value={selectedToken?.symbol|| ''}
          onChange={(e) => {
            const token = tokens.find(t => t.symbol === e.target.value as string);
            if (token) onSelect(token);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a token</option>
          {tokens.map((token) => (
            <option key={uuidv4()} value={token.symbol}>
              {token.symbol}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

// Amount input component
interface AmountInputProps {
  amount: string;
  onChange: (value: string) => void;
  selectedToken: Token | null;
  balance: {
    formatted: string;
    symbol: string;
  } | undefined;
}


const AmountInput: React.FC<AmountInputProps> = ({ amount, onChange, selectedToken, balance }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Amount
      </label>
      <input
        type="text"
        value={amount}
        onChange={(e) => onChange(e.target.value)}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder={`Enter amount in ${selectedToken?.symbol || 'tokens'}`}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {balance && (
        <p className="text-sm text-gray-500 mt-1">
          Balance: {balance.formatted} {balance.symbol}
        </p>
      )}
    </div>
  );
};

// Quote display component
interface QuoteDisplayProps {
  quoteData: Quote | AcrossApiError | null;
  selectedToken: Token | null;
  onBridge: () => void;
  isBridging: boolean ;
  amount: string;
  depositData:  DepositStatus | undefined;
  fillData:  FillStatus | undefined;
}

const QuoteDisplay: React.FC<QuoteDisplayProps> = ({ 
  quoteData, 
  selectedToken, 
  onBridge, 
  isBridging,
  amount,
  depositData,
  fillData,
}) => {
 // Return early if no quote data
 if (!quoteData) return null;

 // Helper function to check if response is an error
 const isAcrossError = (data: any): data is AcrossApiError => {
   return data.type === 'AcrossApiError';
 };

 // Format numbers for display
 const formatTokenAmount = (amount: string | number | bigint, decimals: number = 18): string => {
  const divisor = BigInt(10 ** decimals);
  
  if (typeof amount === 'bigint') {
    return (Number(amount) / Number(divisor)).toFixed(6);
  }
  
  if (typeof amount === 'string') {
    return (Number(amount) / 10 ** decimals).toFixed(6);
  }
  
  return (amount / 10 ** decimals).toFixed(6);
};
 // Handle error cases with user-friendly messages
 if (isAcrossError(quoteData)) {
   const errorMessages = {
     'AMOUNT_TOO_LOW': 'The amount is too low relative to the bridge fees. Please increase the amount.',
     'INSUFFICIENT_LIQUIDITY': 'There is not enough liquidity available. Please try a smaller amount.',
     'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
     'INVALID_TOKEN': 'This token is not supported for bridging.'
   };

   return (
     <div className="bg-red-50 border border-red-200 rounded-lg p-4">
       <p className="text-sm text-red-700">
         {errorMessages[quoteData.code as keyof typeof errorMessages] || quoteData.message}
       </p>
     </div>
   );
 }

 // Get token decimals (default to 18 if not specified)
 const decimals = selectedToken?.decimals || 18;



   // Helper function to convert decimal string to BigInt with proper decimals
   const parseInputAmount = (amount: string, decimals: number): bigint => {
     // Remove any trailing zeros after decimal point
     const cleanAmount = amount.replace(/\.?0+$/, '');
     
     if (!cleanAmount.includes('.')) {
       // If there's no decimal point, just multiply by 10^decimals
       return BigInt(cleanAmount) * BigInt(10 ** decimals);
     }
 
     // Split into whole and decimal parts
     const [whole, decimal] = cleanAmount.split('.');
     
     // Calculate the scaling factor needed
     const scale = decimals - decimal.length;
     
     if (scale >= 0) {
       // If we need to add zeros
       return BigInt(whole + decimal) * BigInt(10 ** scale);
     } else {
       // If we need to remove digits (shouldn't happen with proper validation)
       return BigInt(whole + decimal.slice(0, decimals));
     }
   };
 
   // Calculate the final amount user will receive
   const inputAmountBN = parseInputAmount(amount, decimals);

 const totalFeesBN = BigInt(quoteData.fees.totalRelayFee.total);
 const receiveAmountBN = inputAmountBN - totalFeesBN;
 
 return (
   <div className="space-y-4">
     {/* Main Quote Card */}
     <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
       {/* Amount You'll Receive */}
       <div className="space-y-1">
         <span className="text-sm font-medium text-gray-500">You will receive</span>
         <div className="flex items-baseline gap-2">
           <span className="text-xl font-semibold text-gray-900">
             {formatTokenAmount(receiveAmountBN.toString(), decimals)} {selectedToken?.symbol}
           </span>
         </div>
         <span className="text-sm text-gray-500">
           in ~{quoteData.estimatedFillTimeSec} seconds
         </span>
       </div>

       {/* Fee Breakdown */}
       <div className="space-y-2 pt-3 border-t border-gray-200">
         <div className="flex justify-between text-sm">
           <span className="text-gray-500">Bridge fee</span>
           <span className="text-gray-900">
             {formatTokenAmount(quoteData.fees.relayerCapitalFee.total, decimals)} {selectedToken?.symbol}
           </span>
         </div>

         <div className="flex justify-between text-sm">
           <span className="text-gray-500">Destination gas fee</span>
           <span className="text-gray-900">
             {formatTokenAmount(quoteData.fees.relayerGasFee.total, decimals)} {selectedToken?.symbol}
           </span>
         </div>

         {/* Total Fees */}
         <div className="flex justify-between pt-2 border-t border-gray-100">
           <span className="text-sm font-medium text-gray-900">Total fees</span>
           <span className="text-sm font-medium text-gray-900">
             {formatTokenAmount(quoteData.fees.totalRelayFee.total, decimals)} {selectedToken?.symbol}
           </span>
         </div>
       </div>

       {/* Min/Max Info */}
       {quoteData.limits && (
         <div className="text-xs text-gray-500 pt-2">
           Min: {formatTokenAmount(quoteData.limits.minDeposit, decimals)} {selectedToken?.symbol} • 
           Max: {formatTokenAmount(quoteData.limits.maxDeposit, decimals)} {selectedToken?.symbol}
         </div>
       )}
     </div>

     {/* Bridge Button */}
     <button
      onClick={onBridge}
      disabled={Boolean(isBridging || quoteData?.isAmountTooLow || depositData || fillData)}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <div className="flex items-center justify-center">
        {fillData ? (
          <span>Bridge Complete</span>
        ) : depositData ? (
          <>
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
            <span>Processing Bridge</span>
          </>
        ) : isBridging ? (
          <>
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
            <span>Confirming...</span>
          </>
        ) : quoteData?.isAmountTooLow ? (
          <span>Amount Too Low</span>
        ) : (
          <span>Bridge</span>
        )}
      </div>
   </button>
   </div>
 );
};


// Main BridgeComponent
const BridgeComponent: React.FC = () => {
  // State for form data collection
  const [sourceChain, setSourceChain] = useState<AcrossChain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [quoteData, setQuoteData] = useState<Quote | null>(null);
  const sdk = useAcross();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const chainId = useChainId();
    const config = useConfig();
   
    const chains = useChains();
    const [txHash, setTxHash] = useState<Hash>();
    const [destinationBlock, setDestinationBlock] = useState<bigint>();
    const [depositData, setDepositData] = useState<DepositStatus>();
    const [fillData, setFillData] = useState<FillStatus>();

    const [loadingDeposit, setLoadingDeposit] = useState(false);
    const [loadingFill, setLoadingFill] = useState(false);
// Get supported chains from your config
  const { supportedChains } = useSupportedAcrossChains({});

  // Fixed destination chain (Lisk)
  const destinationChain = supportedChains?.find(chain => chain.chainId === 1135);

  // Balance hook for selected token
  const { data: balance } = useBalance({
    address: address,
    token: selectedToken?.address as `0x${string}`,
    chainId: chainId
  });

  // Format amount with proper decimals


  // Fetch quote when form data changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!amount || !selectedToken || !sourceChain || !destinationChain) return;
      
      setLoading(true);
      setError('');

  
      
      try {

        console.log(selectedToken,sourceChain)

        const routes = await sdk.getAvailableRoutes({
          originChainId: sourceChain.chainId,
          destinationChainId: destinationChain.chainId,
        })!;
  
        const route = routes.find((r) => r.inputTokenSymbol === selectedToken.symbol)!;

                  // 1. get quote
          const bridgeQuoteRes = await sdk.getQuote({
            route,
            inputAmount: formatAmount(amount, selectedToken.decimals),
            recipient: address,
          });

        // const formattedAmount = formatAmount(amount, selectedToken.decimals);
        // const response = await fetch(
        //   `https://app.across.to/api/suggested-fees?` +
        //   `token=${selectedToken.address}&` +
        //   `originChainId=${sourceChain.chainId}&` +
        //   `destinationChainId=${destinationChain.chainId}&` +
        //   `amount=${formattedAmount}`
        // );
        
        // const data = await response.json();
        console.log(bridgeQuoteRes)
        setQuoteData(bridgeQuoteRes as unknown as Quote);
      } catch (err) {
        setError('Failed to fetch quote: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [amount, selectedToken, sourceChain, destinationChain]);

  // Contract write hook for bridging
  const { writeContract: executeBridge, isPending: isBridging } = useWriteContract();

  const handleBridge = async () => {
    if (!quoteData || !selectedToken || !amount || !address || !sourceChain || !destinationChain ) return;

  const chain = MAINNET_SUPPORTED_CHAINS.find(
    chain => chain.id === chainId
  );

    const walletClient = await getWalletClient(config);

    console.log(quoteData)

    const { request } = await sdk.simulateDepositTx({
      walletClient,
      deposit: quoteData.deposit,
    });
  

    const destinationBlock = await sdk
    .getPublicClient(quoteData.deposit.destinationChainId)
    .getBlockNumber();

    const transactionHash = await walletClient.writeContract(request);
  
    setTxHash(transactionHash);

    setDestinationBlock(destinationBlock);

    // try {
    //   executeBridge({
    //     address: sourceChain.spokePool as `0x${string}`,
    //     abi: [{
    //       inputs: [
    //         { name: 'depositor', type: 'address' },
    //         { name: 'recipient', type: 'address' },
    //         { name: 'inputToken', type: 'address' },
    //         { name: 'outputToken', type: 'address' },
    //         { name: 'inputAmount', type: 'uint256' },
    //         { name: 'outputAmount', type: 'uint256' },
    //         { name: 'destinationChainId', type: 'uint256' },
    //         { name: 'exclusiveRelayer', type: 'address' },
    //         { name: 'quoteTimestamp', type: 'uint32' },
    //         { name: 'fillDeadline', type: 'uint32' },
    //         { name: 'exclusivityDeadline', type: 'uint32' },
    //         { name: 'message', type: 'bytes' }
    //       ],
    //       name: 'depositV3',
    //       outputs: [],
    //       stateMutability: 'payable',
    //       type: 'function',
    //     }],
    //     functionName: 'depositV3',
    //     args: [
    //       address,
    //       (recipientAddress || address) as `0x${string}`,
    //       selectedToken.address as `0x${string}`,
    //       selectedToken.address as `0x${string}`, // Using same token for input/output
    //       BigInt(formatAmount(amount, selectedToken.decimals)),
    //       BigInt(formatAmount(amount, selectedToken.decimals)) - BigInt(quoteData.totalRelayFee.total),
    //       BigInt(destinationChain.chainId),
    //       quoteData.exclusiveRelayer as `0x${string}`,
    //       Number(quoteData.timestamp),
    //       Math.floor(Date.now() / 1000) + 18000,
    //       quoteData.exclusivityDeadline,
    //       '0x' as `0x${string}`
    //     ]
    //   });
    // } catch (err) {
    //   setError('Bridge failed: ' + (err as Error).message);
    // }

  };

  const waitForDeposit = async (txHash: Hash, quote: Quote) => {
    setLoadingDeposit(true);
    //  wait for tx to be mined
    const data = await sdk.waitForDepositTx({
      transactionHash: txHash,
      originChainId: quote.deposit.originChainId,
    });
    setLoadingDeposit(false);
    setDepositData(data);
  };

  useEffect(() => {
    if (txHash && quoteData) {
      waitForDeposit(txHash, quoteData);
    }
  }, [txHash, quoteData]);

  const waitForFill = async (
    deposit: DepositStatus,
    quote: Quote,
    destinationBlock: bigint,
  ) => {
    setLoadingFill(true);
    //  wait for tx to be filled
    const data = await sdk.waitForFillTx({
      depositId: deposit.depositId,
      deposit: quote.deposit,
      fromBlock: destinationBlock,
    });
    setLoadingFill(false);
    setFillData(data);
  };

  useEffect(() => {
    if (depositData && quoteData && destinationBlock) {
      waitForFill(depositData, quoteData, destinationBlock);
    }
  }, [depositData, quoteData, destinationBlock]);

  // Add an auto-dismiss effect
useEffect(() => {
  if (error) {
    const timer = setTimeout(() => {
      setError("");
    }, 5000); // Dismiss after 5 seconds

    return () => clearTimeout(timer);
  }
}, [error]);

// Also clear error when transaction states change
useEffect(() => {
  if (depositData || fillData) {
    setError("");
  }
}, [depositData, fillData]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Bridge to {destinationChain?.name || 'Lisk'}
        </h2>
      </div>

      <div className="space-y-6">
      <>
            <ChainSelector
              chains={supportedChains!}
              selectedChain={sourceChain}
              onSelect={setSourceChain}
              label="Source Chain"
            />

            <TokenSelector
              tokens={sourceChain?.inputTokens || []}
              selectedToken={selectedToken}
              onSelect={setSelectedToken}
              label="Select Token"
            />

            <AmountInput
              amount={amount}
              onChange={setAmount}
              selectedToken={selectedToken}
              balance={balance}
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient string (Optional)
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter recipient address"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {loading && (
              <div className="flex items-center justify-center text-gray-600">
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                <span>Fetching quote...</span>
              </div>
            )}

            <QuoteDisplay
              quoteData={quoteData}
              selectedToken={selectedToken}
              onBridge={handleBridge}
              isBridging={isBridging}
              amount={amount}
              depositData={depositData}
              fillData={fillData}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <TransactionStatus
              depositData={depositData}
              fillData={fillData}
              loadingDeposit={loadingDeposit}
              loadingFill={loadingFill}
              sourceChain={sourceChain}  // or whatever chain the user selected as source
              destinationChain={destinationChain}  // or whatever chain the user selected as destination
            />

            {/* {!depositData && loadingDeposit && <h3>Waiting for deposit...</h3>}
                  {depositData && (
                    <details className="break-words max-w-full">
                      <summary>Deposit Data</summary>
                      <pre>
                        {JSON.stringify(
                          depositData,
                          (_, v) => (typeof v === "bigint" ? v.toString() : v),
                          2,
                        )}
                      </pre>
                    </details>
                  )}
                  {!fillData && loadingFill && <h3>Waiting for fill...</h3>}
                  {fillData && (
                    <details>
                      <summary>Fill Data</summary>
                      <pre>
                        {JSON.stringify(
                          fillData,
                          (_, v) => (typeof v === "bigint" ? v.toString() : v),
                          2,
                        )}
                      </pre>
                    </details>
                  )} */}
          </>
      </div>
    </div>
  );
};

export default BridgeComponent;