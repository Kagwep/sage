import { useState } from 'react';
import { 
  useAccount, 
  useChainId,
  useSignTypedData,
  useWriteContract,    // Add this import
  useWaitForTransactionReceipt  // Add this for transaction tracking
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { ExecutionInfo, ExecutionInfoRequest, SwapQuote } from '../types';


// Only hardcoding the initial token addresses as they're our starting point
const INITIAL_TOKENS = {
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18
  },
  USDT: {
    address: '0x05D032ac25d322df992303dCa074EE7392C117b9',
    decimals: 6
  }
} as const;

export default function DexSwapFlow() {
  const { address } = useAccount();
  const chainId = useChainId();
  
  // Component state
  const [inputAmount, setInputAmount] = useState('');
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);
  const [executionInfo, setExecutionInfo] = useState<ExecutionInfo | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    // Add these new states for transaction tracking
    const [txHash, setTxHash] = useState<string | null>(null);
    const [swapStatus, setSwapStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  
    // Add Wagmi hooks for contract interaction
    const { writeContract } = useWriteContract();
    
    // Add transaction tracking
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      enabled: !!txHash,
    });
  
      // Add new function for executing the swap
  const executeSwap = async () => {
    if (!swapQuote?.candidateTrade || !signature) {
      setError('Missing trade data or signature');
      return;
    }

    setSwapStatus('pending');
    
    try {
      // Execute the swap using the candidateTrade data
      const hash = await writeContract({
        address: swapQuote.candidateTrade.to as `0x${string}`,
        data: swapQuote.candidateTrade.data as `0x${string}`,
        value: BigInt(swapQuote.candidateTrade.value || '0')
      });

      setTxHash(hash);
      console.log('Swap transaction submitted:', hash);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute swap');
      setSwapStatus('error');
    }
  };

  // Wagmi hooks
  const { signTypedData } = useSignTypedData();

  // Step 1: Get Quote
  const fetchQuote = async () => {
    if (!address || !inputAmount) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://canoe.icarus.tools/market/usor/swap_quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chain: chainId.toString(),
          account: address,
          isExactIn: true,
          inTokenAddress: INITIAL_TOKENS.WETH.address,
          outTokenAddress: INITIAL_TOKENS.USDT.address,
          inTokenAmount: parseUnits(inputAmount, INITIAL_TOKENS.WETH.decimals).toString(),
          slippage: 100,
          gasPrice: 0
        })
      });

      if (!response.ok) throw new Error('Failed to fetch swap quote');
      
      const quote: SwapQuote = await response.json();
      setSwapQuote(quote);
      console.log('Quote received:', quote);
      
      // Automatically fetch execution info after getting quote
      await fetchExecutionInfo(quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch swap quote');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Get Execution Info
  const fetchExecutionInfo = async (quote: SwapQuote) => {
    setLoading(true);
    
    try {
      // Construct the execution info request from the quote
      const executionInfoRequest: ExecutionInfoRequest = {
        coupon: quote.coupon,
        signingRequest: quote.signingRequest
      };

      const response = await fetch('https://canoe.icarus.tools/market/usor/execution_information', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(executionInfoRequest)
      });

      if (!response.ok) throw new Error('Failed to fetch execution information');
      
      const execInfo: ExecutionInfo = await response.json();
      setExecutionInfo(execInfo);
      console.log('Execution info received:', execInfo);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch execution information');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Sign the permit
  const handleSign = async () => {
    if (!swapQuote?.signingRequest.typedData[0].payload) {
      setError('No signing data available');
      return;
    }

    try {
      const typedData = swapQuote.signingRequest.typedData[0].payload;
      
      const sig = await signTypedData({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });
      
      setSignature(sig);
      console.log('Permit signed:', sig);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign permit');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 space-y-4">
        {/* Step 1: Amount Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            WETH Amount
          </label>
          <input
            type="number"
            placeholder="Enter amount"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Step 2: Get Quote Button */}
        <button
          onClick={fetchQuote}
          disabled={loading || !inputAmount}
          className={`w-full py-2 px-4 rounded-md font-medium text-white 
            ${loading || !inputAmount 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? 'Processing...' : 'Get Quote & Execution Info'}
        </button>

        {/* Display Quote Info */}
        {swapQuote && (
          <div className="space-y-2 p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium">Quote Summary:</p>
            <p className="text-sm">
              Input: {formatUnits(swapQuote.inAmount, INITIAL_TOKENS.WETH.decimals)} WETH
            </p>
            <p className="text-sm">
              Output: {formatUnits(swapQuote.outAmount, INITIAL_TOKENS.USDT.decimals)} USDT
            </p>
          </div>
        )}

        {/* Step 3: Sign Button */}
        {executionInfo && (
          <button
            onClick={handleSign}
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md font-medium text-white
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          >
            Sign Permit
          </button>
        )}

 {/* Update the signature display to include the swap button */}
 {signature && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">Signature:</p>
              <p className="text-xs font-mono break-all mt-1">{signature}</p>
            </div>

            {/* Add the swap execution button */}
            <button
              onClick={executeSwap}
              disabled={swapStatus === 'pending' || isConfirming}
              className={`w-full py-2 px-4 rounded-md font-medium text-white
                ${swapStatus === 'pending' || isConfirming
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {swapStatus === 'pending' || isConfirming 
                ? 'Executing Swap...' 
                : 'Execute Swap'}
            </button>
          </div>
        )}

        {/* Add transaction status display */}
        {txHash && (
          <div className="p-4 bg-gray-50 rounded-md space-y-2">
            <p className="text-sm font-medium">Transaction Status:</p>
            <p className="text-xs font-mono break-all">
              Hash: {txHash}
            </p>
            <p className="text-sm">
              {isConfirming 
                ? 'Confirming transaction...' 
                : isConfirmed 
                  ? 'Swap completed successfully!' 
                  : 'Waiting for confirmation...'}
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}