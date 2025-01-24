import React from 'react';
import { CheckCircle2, Circle, Loader2, ExternalLink } from 'lucide-react';
import { AcrossChain, DepositStatus, FillStatus } from '@across-protocol/app-sdk';



interface TransactionStatusProps {
  depositData:  DepositStatus | undefined;
  fillData:  FillStatus | undefined;
  loadingDeposit: boolean;
  loadingFill: boolean;
  sourceChain: AcrossChain | null;
  destinationChain: AcrossChain | undefined;
}

const TransactionStatus: React.FC<TransactionStatusProps> = ({ 
  depositData, 
  fillData, 
  loadingDeposit, 
  loadingFill,
  sourceChain,
  destinationChain
}) => {
  // Helper function to format transaction hash for display
  const formatTxHash = (hash: string | any[]) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Get current status
  const getStatus = () => {
    if (!depositData && !loadingDeposit) return 'initial';
    if (loadingDeposit && !depositData) return 'waiting-deposit';
    if (depositData && !fillData && !loadingFill) return 'deposited';
    if (loadingFill) return 'bridging';
    if (fillData) return 'completed';
    return 'initial';
  };

  const status = getStatus();

  // Define status steps
  const steps = [
    { key: 'deposit', label: 'Deposit', complete: !!depositData },
    { key: 'bridge', label: 'Bridge', complete: !!fillData },
    { key: 'receive', label: 'Receive', complete: !!fillData }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.key} className="flex flex-col items-center relative w-full">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="absolute w-full h-0.5 top-4 left-1/2 -z-10 bg-gray-200">
                <div 
                  className={`h-full transition-all duration-500 ${
                    step.complete ? 'bg-blue-500' : 'bg-gray-200'
                  }`} 
                  style={{ width: step.complete ? '100%' : '0%' }}
                />
              </div>
            )}
            
            {/* Step Icon */}
            <div className="w-8 h-8 flex items-center justify-center">
              {step.complete ? (
                <CheckCircle2 className="w-8 h-8 text-blue-500" />
              ) : status === 'waiting-deposit' && index === 0 || 
                 status === 'bridging' && index === 1 ? (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              ) : (
                <Circle className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <span className="mt-2 text-sm font-medium text-gray-600">
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Transaction Details */}
      <div className="space-y-4">
        {depositData && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Deposit Transaction</span>
              <a 
                href={`${sourceChain?.explorerUrl}/tx/${depositData.depositTxReceipt.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                title={`View transaction on ${sourceChain?.name} explorer`}
              >
                {formatTxHash(depositData.depositTxReceipt.transactionHash)}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {fillData && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Receive Transaction</span>
              <a 
                href={`${destinationChain?.explorerUrl}/tx/${fillData.fillTxReceipt.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                title={`View transaction on ${destinationChain?.name} explorer`}
              >
                {formatTxHash(fillData.fillTxReceipt.transactionHash)}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Status Messages */}
        <div className="text-sm text-center text-gray-600">
          {status === 'waiting-deposit' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirming your deposit...</span>
            </div>
          )}
          {status === 'bridging' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Bridging your assets...</span>
            </div>
          )}
          {status === 'completed' && (
            <span className="text-green-600">Bridge complete! Your assets have arrived.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionStatus;