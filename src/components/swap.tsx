import { useEffect, useState } from 'react';
import { 
  useAccount, 
  useChainId,
  useSignTypedData,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useWalletClient,
  useChains,
  usePublicClient
} from 'wagmi';
import { parseUnits, formatUnits, erc20Abi, getContract, ByteArray } from 'viem';

import { ExecutionInfo, ExecutionInfoRequest, SwapQuote, Token } from '../types';
import { waitForTransactionReceipt } from 'viem/actions';
import { useSupportedAcrossChains } from '../hooks/useSupportedAcrossChains';
import { TokenInfo } from '@across-protocol/app-sdk';
import { ETHCONTRACTADDRESS, WETHABI } from '../constants';
import { CheckCircle, Loader2 } from 'lucide-react';
import TokenSelector from './TokenSelector';
import { isWrapOperation } from '../utils';


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
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);

  const publicClient = usePublicClient();
  const chain = publicClient.chain;

  const { supportedChains } = useSupportedAcrossChains({});

  // Fixed destination chain (Lisk)
  const destinationChain = supportedChains?.find(chain => chain.chainId === 1135);



  const { writeContract } = useWriteContract();
  const { writeContractAsync } = useWriteContract();
  const { signTypedData } = useSignTypedData();
  const { signTypedDataAsync } = useSignTypedData();
  const { data: walletClient } = useWalletClient()
  
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

  const tokens = destinationChain?.inputTokens ?? [];

  
  const availableToTokens = tokens.filter(t => t.symbol !== fromToken?.symbol);
  const availableFromTokens = tokens.filter(t => t.symbol !== toToken?.symbol);
  

  const getInitialTokens = (chain: typeof destinationChain) => {
    if (!chain) return null;
    
    const tokens = chain.inputTokens.reduce((acc, token) => ({
      ...acc,
      [token.symbol]: {
        address: token.address,
        decimals: token.decimals
      }
    }), {} as Record<string, { address: string, decimals: number }>);
  
    return tokens;
  };




     const { data: allowance } = useReadContract({
          address: fromToken?.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [
            address as `0x${string}`, 
            (executionInfo?.approvals?.[0]?.approvee || '') as `0x${string}`
          ],
          query: {
            enabled: Boolean(
              address && 
              fromToken && 
              fromToken.symbol !== 'ETH'
            )
          }
      });


      // Step 1: Get Quote
    const fetchQuote = async () => {
    if (!address || !inputAmount || !fromToken || !toToken) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/canoe/market/usor/swap_quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: chainId.toString(),
          account: address,
          isExactIn: true,
          inTokenAddress: fromToken.symbol === 'ETH' ? ETHCONTRACTADDRESS : fromToken.address,
          outTokenAddress: toToken.symbol === 'ETH' ? ETHCONTRACTADDRESS : toToken.address,
          inTokenAmount: inputAmount,
          slippage: 100,
          gasPrice: 0
        })
      });

      if (!response.ok) throw new Error('Failed to fetch quote');
      const quote: SwapQuote = await response.json();
      setSwapQuote(quote);
      
      await fetchExecutionInfo(quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quote');
    } finally {
      setLoading(false);
    }
    };

    const handleWrap = async () => {
     if (!inputAmount || !fromToken || !toToken) return;
     
     try {
       setLoading(true);
       const parsedAmount = parseUnits(inputAmount, fromToken.decimals);
       
       const hash = await writeContractAsync({
         address: toToken.address,
         abi: WETHABI,
         functionName: fromToken.symbol === 'ETH' ? 'deposit' : 'withdraw',
         args: fromToken.symbol === 'ETH' ? [] : [parsedAmount],
         value: fromToken.symbol === 'ETH' ? parsedAmount : 0n,
         chain: chain,
         account: address
       });
    
       setSwapTxHash(hash);
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Wrap/Unwrap failed');
     } finally {
       setLoading(false);
     }
    };
    // Step 2: Get Execution Info
    const fetchExecutionInfo = async (quote: SwapQuote, signature?: string) => {
    try {
      const body = signature ? {
        coupon: quote.coupon,
        signingRequest: {
          typedData: [{
            payload: quote.signingRequest.typedData[0].payload,
            signature
          }],
          permit2Address: quote.signingRequest.permit2Address
        }
      } : {
        coupon: quote.coupon,
        signingRequest: quote.signingRequest
      };

      const response = await fetch('https://canoe.icarus.tools/market/usor/execution_information', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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

    // Step 3: Handle Approval if needed
    const handleApproval = async () => {
    if ( !swapQuote) return;
    
    try {
      const hash = await writeContractAsync({
        address: swapQuote.inToken.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [
          swapQuote.coupon.raw.quote.permit2.domain.verifyingContract as `0x${string}`,
          BigInt(swapQuote.coupon.raw.quote.permit2.message.details.amount)
        ],
        chain: chain,
        account: address
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

      console.log(swapQuote)
    if (!swapQuote?.signingRequest.typedData[0].payload) {
      setError('No signing data');
      return;
    }

    try {
      const typedData = swapQuote.signingRequest.typedData[0].payload;
      
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
        message: typedData.message as unknown as Record<string, unknown>,
        account: address
      });

      setSignature(sig);
      // Get updated execution info with signature
      await fetchExecutionInfo(swapQuote, sig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign');
    }
    };



    // Step 5: Execute Swap
    const executeSwap = async () => {
      if (!executionInfo?.trade || (!signature && fromToken?.symbol !== 'ETH') || !walletClient) {
        setError('Missing trade data, signature or wallet');
        return;
       }

    try {
      const hash = await walletClient.sendTransaction({
        to: executionInfo.trade.to as `0x${string}`,
        data: executionInfo.trade.data as `0x${string}`,
        value: executionInfo.trade.value ? BigInt(executionInfo.trade.value) : 0n,
        kzg:undefined,
        account: address,
        chain: chain
      });
      setSwapTxHash(hash);
      setSwapQuote(null);
      setExecutionInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
    }
    };

    useEffect(() => {
      if (fromToken?.symbol === 'ETH') {
        setApprovalStatus('approved');
        setApprovalTxHash('0x0');
      } else {
        setApprovalStatus('needed');
      }
    }, [fromToken]);
    
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden p-6">
      <div className="space-y-4">
        {/* Input Amount */}

        <form className="space-y-4">
              <TokenSelector
              label="From Token"
              selectedToken={fromToken}
              availableTokens={tokens}
              onTokenSelect={(token) => {
                setFromToken(token);
                if (toToken?.symbol === token.symbol) {
                  setToToken(null);
                }
              }}
              otherSelectedToken={toToken}
            />

            <TokenSelector
              label="To Token"
              selectedToken={toToken}
              availableTokens={tokens}
              onTokenSelect={setToToken}
              otherSelectedToken={fromToken}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </form>
        {/* Get Quote Button */}
        <button
          onClick={isWrapOperation(fromToken,toToken) ? handleWrap : fetchQuote}
          disabled={loading || !inputAmount}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : isWrapOperation(fromToken, toToken) ? 'Wrap' : 'Get Quote'}
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

        {/* Only show approval status for regular swaps, not for wrapping operations */}
        {approvalTxHash && fromToken?.symbol !== 'ETH' && !isWrapOperation(fromToken,toToken) && (
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm break-all">Approval Hash: {approvalTxHash}</p>
            <p>{isApprovalConfirmed ? 'Approval complete' : 'Confirming approval...'}</p>
          </div>
        )}

        {/* Sign Button */}
 
        {/* Signing and Execution Buttons */}
        {(isApprovalConfirmed || fromToken?.symbol === 'ETH') && (
        <>
          {!signature && fromToken?.symbol !== 'ETH' && (
            <button
              onClick={handleSign}
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-md"
            >
              Sign Permit
            </button>
          )}
          {(signature || fromToken?.symbol === 'ETH') && executionInfo && (
            <button
              onClick={executeSwap}
              disabled={isSwapConfirming}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md disabled:bg-gray-400 hover:bg-indigo-700 transition-colors"
            >
              {isSwapConfirming ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirming swap...</span>
                </div>
              ) : (
                'Execute Swap'
              )}
            </button>
          )}
        </>
        )}

          {/* Swap Status */}
          {swapTxHash && (
              <div className="p-4 bg-gray-50 rounded-md">
                <div className="text-sm">
                  view on explorer:{' '}
                  <a 
                    href={`https://blockscout.lisk.com/tx/${swapTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {`${swapTxHash.slice(0, 6)}...${swapTxHash.slice(-4)}`}
                  </a>
                </div>
                {isSwapError ? (
                  <p className="text-red-600">Error: {swapError?.message}</p>
                ) : (
                  isSwapConfirmed ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Swap completed!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming swap...</span>
                    </div>
                  )
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