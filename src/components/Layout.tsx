import React, { useEffect, useState } from 'react';
import { Menu, Wallet, Blocks,ArrowDownUp, PiggyBank, MessageSquare, ArrowLeftRight } from 'lucide-react';
import { Section } from '../types';
import { useAccount } from 'wagmi';
import { NetworkSwitcher } from './NetworkSwitcher';
import toast from 'react-hot-toast';

export interface LayoutProps {
    children: React.ReactNode;
    activeSection: string;
    onSectionChange: (section: Section) => void;
  }
  
  // Update the Layout component to accept and use these props
  export const Layout: React.FC<LayoutProps> = ({ 
    children, 
    activeSection, 
    onSectionChange 
  }) => {

    const { address, isConnected } = useAccount();

    return (
      <div className="flex flex-col h-screen bg-[#f5f5f5]">
        {/* Header */}
        <header className="bg-green-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/link.png" 
              alt="Link Logo" 
              className="w-6 h-6"
            />
            <h1 className="text-lg font-medium">Sage</h1>
          </div>
          {isConnected && (
              <div className="flex items-center gap-4">
                <NetworkSwitcher />
                <div className="text-sm opacity-80">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </div>
            )}
        </header>
  
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
  
        {/* Navigation - Only show when connected */}
        {isConnected && (
          <nav className="bg-white border-t border-gray-200">
            <div className="flex justify-around">
              <NavButton
                icon={<MessageSquare size={20} />}
                label="Chat"
                isActive={activeSection === 'chat'}
                onClick={() => onSectionChange('chat')}
              />
              <NavButton
                icon={<ArrowLeftRight size={20} />}
                label="Swap"
                isActive={activeSection === 'swap'}
                onClick={() => onSectionChange('swap')}
              />
              <NavButton
                icon={<Blocks size={20} />}
                label="bridge"
                isActive={activeSection === 'bridge'}
                onClick={() => onSectionChange('bridge')}
              />
              <NavButton
                icon={<ArrowDownUp size={20} />}
                label="Ramp"
                isActive={activeSection === 'ramp'}
                onClick={() => onSectionChange('ramp')}
              />
              <NavButton
                icon={<PiggyBank size={20} />}
                label="Earn"
                isActive={activeSection === 'earn'}
                onClick={() => onSectionChange('earn')}
              />
              <NavButton
                icon={<Wallet size={20} />}
                label="Wallet"
                isActive={activeSection === 'wallet'}
                onClick={() => onSectionChange('wallet')}
              />
            </div>
          </nav>
        )}
      </div>
    );
  };
  
const NavButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center py-2 px-4 ${
      isActive ? 'text-[#2E8B57]' : 'text-gray-600'
    }`}
  >
    {icon}
    <span className="text-xs mt-1">{label}</span>
  </button>
);
