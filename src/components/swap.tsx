import { useState } from 'react';
import { 
  useAccount, 
  useChainId,
  useSignTypedData,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useWalletClient
} from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';

import { ExecutionInfo, ExecutionInfoRequest, SwapQuote } from '../types';
import { waitForTransactionReceipt } from 'viem/actions';

const INITIAL_TOKENS = {
  ETH: {
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18
  },
  USDT: {
    address: '0x05D032ac25d322df992303dCa074EE7392C117b9',
    decimals: 6
  }
} as const;

 function DexSwapFlow() {
  const { address } = useAccount();
  const chainId = useChainId();
  
  const [inputAmount, setInputAmount] = useState('');
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);
  const [executionInfo, setExecutionInfo] = useState<ExecutionInfo | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'needed' | 'pending' | 'approved'>('needed');
  const [approvalTxHash, setApprovalTxHash] = useState<string | null>(null);
   const [swapTxHash, setSwapTxHash] = useState<string | null>(null);

  const { writeContract } = useWriteContract();
  const { writeContractAsync } = useWriteContract();
  const { signTypedData } = useSignTypedData();
  const { signTypedDataAsync } = useSignTypedData();
  
  // const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
  //   hash: txHash as `0x${string}`,
  // });

      // Monitor approval status
    const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
      hash: approvalTxHash as `0x${string}`,
    });

    // Monitor swap status
    const { 
      isLoading: isSwapConfirming, 
      isSuccess: isSwapConfirmed,
      isError: isSwapError,
      error: swapError 
    } = useWaitForTransactionReceipt({
      hash: swapTxHash as `0x${string}`,
    });
    

  // Check token allowance
  const { data: allowance } = useReadContract({
    address: INITIAL_TOKENS.ETH.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, executionInfo?.approvals[0]?.approvee as `0x${string}`],
    query: {
      enabled: !!executionInfo?.approvals[0]?.approvee && !!address
    }
  });

  // Step 1: Get Quote
  const fetchQuote = async () => {
    if (!address || !inputAmount) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://canoe.icarus.tools/market/usor/swap_quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: chainId.toString(),
          account: address,
          isExactIn: true,
          inTokenAddress: INITIAL_TOKENS.ETH.address,
          outTokenAddress: INITIAL_TOKENS.USDT.address,
          inTokenAmount: inputAmount,
          slippage: 100,
          gasPrice: 0
        })
      });

      if (!response.ok) throw new Error('Failed to fetch quote');
      console.log(response)
      const quote: SwapQuote = await response.json();
      console.log(quote)
      setSwapQuote(quote);
      
      await fetchExecutionInfo(quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quote');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Get Execution Info
  const fetchExecutionInfo = async (quote: SwapQuote) => {
    try {
      const response = await fetch('https://canoe.icarus.tools/market/usor/execution_information', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon: quote.coupon,
          signingRequest: quote.signingRequest
        })
      });

      if (!response.ok) throw new Error('Failed to fetch execution info');
      const execInfo: ExecutionInfo = await response.json();
      setExecutionInfo(execInfo);
      
      // Check if approval is needed
      if (allowance && execInfo.approvals[0]) {
        setApprovalStatus(
          BigInt(allowance) >= BigInt(execInfo.approvals[0].amount) 
            ? 'approved' 
            : 'needed'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch execution info');
    }
  };

  const handleApproval = async () => {
    if (!executionInfo?.approvals[0] || !swapQuote) return;
    
    try {
      const hash = await writeContractAsync({
        address: swapQuote.inToken.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [
          swapQuote.coupon.raw.quote.permit2.domain.verifyingContract as `0x${string}`,
          BigInt(swapQuote.coupon.raw.quote.permit2.message.details.amount)
        ]
      });
      
      setApprovalStatus('pending');
      setApprovalTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
      setApprovalStatus('needed');
    }
  };

  // Step 4: Sign Permit
  const handleSign = async () => {
    if (!swapQuote?.signingRequest.typedData[0].payload) {
      setError('No signing data');
      return;
    }

    console.log(swapQuote)
   
    try {
      const typedData = swapQuote.signingRequest.typedData[0].payload;
      
      // Transform PermitTypes to match expected format
      const formattedTypes = Object.entries(typedData.types).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value.map((item: { name: any; type: any; }) => ({
          name: item.name,
          type: item.type
        }))
      }), {}) as Record<string, Array<{ name: string, type: string }>>;
   
      const sig = await signTypedDataAsync({
        domain: {
          ...typedData.domain,
          verifyingContract: typedData.domain.verifyingContract as `0x${string}`,
          chainId: Number(typedData.domain.chainId)
        },
        types: formattedTypes,
        primaryType: typedData.primaryType,
        message: typedData.message as unknown as Record<string, unknown>
      });
      console.log("Signature:", sig);
      setSignature(sig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign');
    }
   };

  // Add to hooks
  const { data: walletClient } = useWalletClient()
  
  // Update executeSwap
  const executeSwap = async () => {
    if (!executionInfo?.trade || !signature || !walletClient) {
      setError('Missing trade data, signature or wallet');
      return;
    }

    console.log(executionInfo)
  
    try {
      const hash = await walletClient.sendTransaction({
        to: executionInfo.trade.to as `0x${string}`,
        data: executionInfo.trade.data as `0x${string}`,
        value: executionInfo.trade.value ? BigInt(executionInfo.trade.value) : 0n
      });
      setSwapTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden p-6">
      <div className="space-y-4">
        {/* Input Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700">ETH Amount</label>
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        {/* Get Quote Button */}
        <button
          onClick={fetchQuote}
          disabled={loading || !inputAmount}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Get Quote'}
        </button>

        <div className="p-4 bg-gray-50 rounded-md space-y-2">
          {swapQuote && (
            <>
              <div className="space-y-1">
                <h3 className="font-medium">Amounts</h3>
                <p>Input: {swapQuote.inAmount} {swapQuote.inToken.symbol} (${swapQuote.tokenInUsdValue.toFixed(3)})</p>
                <p>Output: {swapQuote.outAmount} {swapQuote.outToken.symbol} (${swapQuote.tokenOutUsdValue.toFixed(3)})</p>
                
                <h3 className="font-medium mt-3">Price Details</h3>
                <p>Rate: 1 {swapQuote.inToken.symbol} = {(Number(swapQuote.outAmount) / Number(swapQuote.inAmount)).toFixed(2)} {swapQuote.outToken.symbol}</p>
                <p>Price Impact: {(Number(swapQuote.coupon.raw.quote.priceImpact)).toFixed(2)}%</p>
                
                <h3 className="font-medium mt-3">Fees</h3>
                <p>Gas: {swapQuote.fees.gas} (~${swapQuote.gasInUsdValue.toFixed(4)})</p>
                <p>Network Fee: {swapQuote.coupon.raw.quote.gasPrice} Gwei</p>
                
                <h3 className="font-medium mt-3">Total Value</h3>
                <p>Input Value: ${swapQuote.inUsdValue.toFixed(3)}</p>
                <p>Output Value: ${swapQuote.outUsdValue.toFixed(3)}</p>
              </div>
            </>
          )}
          </div>

        {/* Approval Button */}
        {executionInfo && approvalStatus === 'needed' && (
        <button
          onClick={handleApproval}
          className="w-full py-2 px-4 bg-green-600 text-white rounded-md"
        >
          Approve WETH
        </button>
        )}

        {/* Approval Status */}
        {approvalTxHash && (
        <div className="p-4 bg-gray-50 rounded-md">
          <p className="text-sm break-all">Approval Hash: {approvalTxHash}</p>
          <p>{isApprovalConfirmed ? 'Approval complete' : 'Confirming approval...'}</p>
        </div>
        )}

        {/* Sign Button */}
        {isApprovalConfirmed && !signature && (
        <button
          onClick={handleSign}
          className="w-full py-2 px-4 bg-purple-600 text-white rounded-md"
        >
          Sign Permit
        </button>
        )}

        {/* Execute Swap */}
        {signature && (
        <button
          onClick={executeSwap}
          disabled={isSwapConfirming}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md disabled:bg-gray-400"
        >
          {isSwapConfirming ? 'Confirming swap...' : 'Execute Swap'}
        </button>
        )}

        {/* Swap Status */}
        {swapTxHash && (
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm break-all">Swap Hash: {swapTxHash}</p>
              {isSwapError ? (
                <p className="text-red-600">Error: {swapError?.message}</p>
              ) : (
                <p>{isSwapConfirmed ? 'Swap completed!' : 'Confirming swap...'}</p>
              )}
            </div>
          )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default DexSwapFlow;