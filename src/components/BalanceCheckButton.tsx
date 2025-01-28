import { useState } from 'react';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';

const LSK_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const LSK_ADDRESS = '0xac485391EB2d7D88253a7F1eF18C37f4242D1A24';

export function LSKBalanceAndTransfer() {
  const [isLoading, setIsLoading] = useState(false);
  const [lskBalance, setLskBalance] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const { address } = useAccount();
    const publicClient = usePublicClient();
    const chain = publicClient.chain;

  const { data: balance, refetch } = useReadContract({
    address: LSK_ADDRESS,
    abi: LSK_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { writeContractAsync } = useWriteContract();

  const checkBalance = async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const result = await refetch();
      if (result.data) {
        const balanceInLSK = Number(result.data) / 1e18;
        setLskBalance(`${balanceInLSK.toFixed(4)} LSK`);
      }
    } catch (error) {
      console.error('Balance check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!address || !recipientAddress || !amount) return;

    try {
      setIsLoading(true);
      const amountInWei = BigInt(parseFloat(amount) * 1e18);
      
      await writeContractAsync({
        address: LSK_ADDRESS,
        abi: LSK_ABI,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, amountInWei],
        chain: chain,
        account: address
      });

      setAmount('');
      setRecipientAddress('');
      await checkBalance();
      
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
    return <p className="text-gray-600">Please connect your wallet first</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 rounded-lg bg-gray-100">
        <p className="text-sm text-gray-600">Your LSK Balance:</p>
        <p className="font-mono text-gray-800">
          {lskBalance || 'Click to check balance'}
        </p>
        <button 
          onClick={checkBalance}
          disabled={isLoading}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Checking...' : 'Check Balance'}
        </button>
      </div>

      <div className="p-4 rounded-lg bg-gray-100">
        <h3 className="text-lg font-semibold mb-4">Transfer LSK</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Recipient Address</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="0x..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount (LSK)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="0.0"
              step="0.0001"
              min="0"
            />
          </div>
          <button
            onClick={handleTransfer}
            disabled={isLoading || !recipientAddress || !amount}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Processing...' : 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}