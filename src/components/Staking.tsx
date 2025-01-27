import { useState, useEffect } from 'react';
import { useAccount, useBalance, useWriteContract, useReadContract, useSimulateContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { LISK_TOKEN, LISKSTAKINGABI, LISKTOKENABI, STAKINGREWARDS } from '../constants';


const StakingInterface = () => {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState("30");
  const [unlockDate, setUnlockDate] = useState('');
  const [votingPower, setVotingPower] = useState('0');
  const [estimatedAPR] = useState('9.01'); // This should be fetched from contract
  const [isApproving, setIsApproving] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [approvalTxHash, setApprovalTxHash] = useState<string>();
  const [stakingTxHash, setStakingTxHash] = useState<string>();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [acknowledgements, setAcknowledgements] = useState({
    lockingDuration: false,
    twoStepProcess: false
  });

  const [txStatus, setTxStatus] = useState({
    approve: { status: '', message: '' },
    stake: { status: '', message: '' }
  });


  // Get LSK balance
  const { data: balanceData } = useBalance({
    address,
    token: LISK_TOKEN,
  });

  // Check allowance
  const { data: allowance, refetch: refetchAllowance} = useReadContract({
    address: LISK_TOKEN,
    abi: LISKTOKENABI,
    functionName: 'allowance',
    args: [address, STAKINGREWARDS],
  });

   // Watch for approval transaction
   const { isLoading: isApprovalLoading, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalTxHash as `0x${string}`,
  });

  // Watch for staking transaction
  const { isLoading: isStakingLoading, isSuccess: isStakingSuccess } = useWaitForTransactionReceipt({
    hash: stakingTxHash as `0x${string}`,
  });

  // Modify the contract write hooks
  const { writeContractAsync: approve } = useWriteContract();
  const { writeContractAsync: createStake } = useWriteContract();

  const { data: balance } = useBalance({
    address: address,
    token: LISK_TOKEN  // if it's a token, or remove for native currency
});


    // Always call the hooks, but control their execution with enabled flag
    const { data: approveData } = useSimulateContract({
        address: LISK_TOKEN,
        abi: LISKTOKENABI,
        functionName: 'approve',
        args: [STAKINGREWARDS, parseEther(amount || '0')],
        query: {
        enabled: Boolean(amount)
        }
    });
    
    const { data: stakeData,error: simulationError } = useSimulateContract({
        address: STAKINGREWARDS,
        abi: LISKSTAKINGABI,
        functionName: 'createPosition',
        args: [parseEther(amount || '0'), BigInt(Number(duration || 0))],
        value: 0n, // Explicitly set value to 0
        query: {
        enabled: Boolean(amount && duration)
        }
    });

    console.log(stakeData)
    console.log(simulationError)

  useEffect(() => {
    if (amount && duration) {
      // Calculate unlock date
      const date = new Date();
      date.setDate(date.getDate() + Number(duration));
      setUnlockDate(date.toLocaleDateString());
      
      // Calculate voting power (based on contract logic)
      const power = (Number(amount) * (Number(duration) + 150)) / 1000;
      setVotingPower(power.toFixed(1));
    }
  }, [amount, duration]);

    // Refetch allowance when approval transaction succeeds
    useEffect(() => {
        if (isApprovalSuccess) {
          refetchAllowance();
        }
      }, [isApprovalSuccess, refetchAllowance]);
    
      // Reset form when staking succeeds
      useEffect(() => {
        if (isStakingSuccess) {
          setAmount('');
          setApprovalTxHash(undefined);
          setStakingTxHash(undefined);
          refetchAllowance();
        }
      }, [isStakingSuccess, refetchAllowance]);

  const handlePercentageClick = (percentage: number) => {
    if (balanceData?.formatted) {
      const value = (Number(balanceData.formatted) * percentage).toString();
      setAmount(value);
    }
  };
  const handleApprove = async () => {
    if (!amount || !approveData?.request) return;
    setTxStatus(prev => ({
      ...prev,
      approve: { status: 'pending', message: 'Approval pending...' }
    }));
    
    try {
      const hash = await approve(approveData.request);
      setApprovalTxHash(hash);
      setTxStatus(prev => ({
        ...prev,
        approve: { status: 'processing', message: 'Approval processing...' }
      }));
      return hash;
    } catch (error) {
      setTxStatus(prev => ({
        ...prev,
        approve: { status: 'error', message: 'Approval failed' }
      }));
      console.error('Error approving:', error);
    }
  };

  const handleStake = async () => {
    if (!amount || !duration || !stakeData?.request) return;
    if (!acknowledgements.lockingDuration || !acknowledgements.twoStepProcess) {
      setShowConfirmModal(true);
      return;
    }
    
    try {
      setTxStatus(prev => ({
        ...prev,
        stake: { status: 'pending', message: 'Staking pending...' }
      }));
      
      const hash = await createStake(stakeData.request);
      setStakingTxHash(hash);
      setTxStatus(prev => ({
        ...prev,
        stake: { status: 'processing', message: 'Staking processing...' }
      }));
      return hash;
    } catch (error) {
      setTxStatus(prev => ({
        ...prev,
        stake: { status: 'error', message: 'Staking failed' }
      }));
      console.error('Error staking:', error);
    }
  };

    // Update status when transactions complete
    useEffect(() => {
        if (isApprovalSuccess) {
          setTxStatus(prev => ({
            ...prev,
            approve: { status: 'success', message: 'Approval successful!' }
          }));
        }
      }, [isApprovalSuccess]);
    
      useEffect(() => {
        if (isStakingSuccess) {
          setTxStatus(prev => ({
            ...prev,
            stake: { status: 'success', message: 'Staking successful!' }
          }));
          setShowConfirmModal(false);
        }
      }, [isStakingSuccess]);

      // Add this useEffect to reset everything after successful staking
useEffect(() => {
    if (isStakingSuccess) {
      // Reset form inputs
      setAmount('');
      setDuration('30'); // Reset to default duration
      
      // Reset transaction hashes
      setApprovalTxHash(undefined);
      setStakingTxHash(undefined);
      
      // Reset transaction statuses
      setTxStatus({
        approve: { status: '', message: '' },
        stake: { status: '', message: '' }
      });
      
      // Reset modal and acknowledgements
      setShowConfirmModal(false);
      setAcknowledgements({
        lockingDuration: false,
        twoStepProcess: false
      });
  
      // Reset calculated values
      setUnlockDate('');
      setVotingPower('0');
      
      // Refetch allowance
      refetchAllowance();
    }
  }, [isStakingSuccess, refetchAllowance]);
  
  // Also add a reset after approval success
  useEffect(() => {
    if (isApprovalSuccess) {
      // Reset approval status after a delay
      const timer = setTimeout(() => {
        setTxStatus(prev => ({
          ...prev,
          approve: { status: '', message: '' }
        }));
      }, 5000); // Clear approval message after 5 seconds
  
      refetchAllowance();
      
      return () => clearTimeout(timer);
    }
  }, [isApprovalSuccess, refetchAllowance]);

  const isApproved = amount ? allowance as bigint >= parseEther(amount) : false;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-xl font-bold">Stake LSK</div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Amount</label>
            <span className="text-sm text-gray-500">
              Balance: {balanceData?.formatted ?? '0'} LSK
            </span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-4 gap-2">
            {[0.25, 0.5, 0.75, 1].map((percent, index) => (
              <button
                key={index}
                onClick={() => handlePercentageClick(percent)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {percent * 100}%
              </button>
            ))}
          </div>
        </div>

        {/* Duration Selection */}
            <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">Locking Duration ⓘ</label>
                <span className="text-white">Days</span>
            </div>

            <input
                type="text" // Changed to text type to allow free editing
                value={duration}
                onChange={(e) => {
                const value = e.target.value;
                // Allow empty string for deletion
                if (value === '') {
                    setDuration(value);
                }
                // Only update if it's a valid number
                else if (!isNaN(Number(value))) {
                    setDuration(value);
                }
                }}
                className="w-full px-3 py-2 border border-gray-700 rounded-md 
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {Number(duration) < 14 && duration !== '' && (
                <p className="text-red-500 text-sm">Minimum locking duration is 2 weeks</p>
            )}

            <div className="grid grid-cols-5 gap-2">
                {[
                { label: '2 weeks', days: 14 },
                { label: '1 month', days: 30 },
                { label: '6 months', days: 180 },
                { label: '1 year', days: 365 },
                { label: '2 years', days: 730 },
                ].map((option) => (
                <button
                    key={option.days}
                    onClick={() => setDuration(option.days.toString())}
                    className={`px-2 py-2 rounded-md text-sm ${
                    Number(duration) === option.days
                        ? 'bg-blue-500 '
                        : 'border border-gray-700 hover:bg-green-100'
                    }`}
                >
                    {option.label}
                </button>
                ))}
            </div>
            </div>

        {/* Stats */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm">LSK to be locked</span>
            <span className="font-medium">{amount || '0'} LSK</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Unlock date</span>
            <span className="font-medium">{unlockDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Voting power</span>
            <span className="font-medium">+ ⚡ {votingPower}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Estimated APR</span>
            <span className="font-medium text-green-500">{estimatedAPR}%</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
        {txStatus.approve.status && (
          <div className={`px-4 py-3 rounded-md flex items-center ${
            txStatus.approve.status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            txStatus.approve.status === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {txStatus.approve.status === 'pending' && (
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>{txStatus.approve.message}</span>
          </div>
        )}
        
        {txStatus.stake.status && (
          <div className={`px-4 py-3 rounded-md flex items-center ${
            txStatus.stake.status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            txStatus.stake.status === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {txStatus.stake.status === 'pending' && (
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>{txStatus.stake.message}</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Approve {amount} LSK</h3>
              <p className="text-sm text-gray-600 mt-2">
                We are creating your staking position, please approve the transaction in your Ethereum wallet.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgements.lockingDuration}
                  onChange={(e) => setAcknowledgements(prev => ({
                    ...prev,
                    lockingDuration: e.target.checked
                  }))}
                  className="mt-1 rounded"
                />
                <span className="text-sm">
                  I acknowledge that staking will lock my tokens for the selected duration.
                </span>
              </label>
              
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgements.twoStepProcess}
                  onChange={(e) => setAcknowledgements(prev => ({
                    ...prev,
                    twoStepProcess: e.target.checked
                  }))}
                  className="mt-1 rounded"
                />
                <span className="text-sm">
                  I understand that staking requires a two-step process: approving in the Ethereum wallet and then initiating the stake.
                </span>
              </label>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleStake}
                disabled={!acknowledgements.lockingDuration || !acknowledgements.twoStepProcess}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  !acknowledgements.lockingDuration || !acknowledgements.twoStepProcess
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-4">
        <button
          onClick={handleApprove}
          disabled={!amount || isApprovalLoading || isApproved}
          className={`w-full py-2 px-4 rounded-md flex items-center justify-center ${
            !amount || isApprovalLoading || isApproved
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isApprovalLoading && (
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isApprovalLoading ? 'Approving...' : isApproved ? 'Approved' : 'Approve'}
        </button>
        
        <button
          onClick={handleStake}
          disabled={!amount || isStakingLoading || !isApproved}
          className={`w-full py-2 px-4 rounded-md flex items-center justify-center ${
            !amount || isStakingLoading || !isApproved
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isStakingLoading && (
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isStakingLoading ? 'Staking...' : 'Stake'}
        </button>
      </div>
      </div>

    </div>
  );
};

export default StakingInterface;