import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TokenInfo } from '@across-protocol/app-sdk';

interface TokenSelectorProps {
    label: string;
    selectedToken: TokenInfo | null;
    availableTokens: TokenInfo[];
    onTokenSelect: (token: TokenInfo) => void;
    otherSelectedToken: TokenInfo | null; // For preventing same token selection
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ 
  label,
  selectedToken,
  availableTokens,
  onTokenSelect,
  otherSelectedToken = null  // For preventing same token selection
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      {/* Custom Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border rounded-md bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {selectedToken ? (
          <div className="flex items-center gap-2">
            {/* Using placeholder for demo - replace with actual token logo URL */}
            <img 
              src={selectedToken.logoUrl || "/api/placeholder/20/20"} 
              alt={selectedToken.symbol}
              className="w-5 h-5 rounded-full"
            />
            <span>{selectedToken.symbol}</span>
          </div>
        ) : (
          <span className="text-gray-500">Select token</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {availableTokens
            .filter(token => token.symbol !== otherSelectedToken?.symbol)
            .map(token => (
              <button
                key={token.symbol}
                onClick={() => {
                  onTokenSelect(token);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                <img 
                  src={token.logoUrl || "/api/placeholder/20/20"} 
                  alt={token.symbol}
                  className="w-5 h-5 rounded-full"
                />
                <span>{token.symbol}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default TokenSelector;