// src/pages/Home.tsx
import { LogOut, Wallet } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';

const Home = () => {
  const { address, isConnected, connector } = useAccount();
  const { disconnectAsync } = useDisconnect();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        {/* Logo and Title Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-8">
            <img 
              src="/link.png" 
              alt="Sage Logo" 
              className="w-20 h-20"
            />
          </div>
          <h1 className="text-5xl font-bold text-green-800 mb-6">
            Welcome to Sage
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Your intelligent assistant for Web3 interactions on the Lisk blockchain. 
            Chat, swap, and manage assets with ease.
          </p>
        </div>
  
        {/* Card Section */}
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg backdrop-blur-sm bg-opacity-90 p-8 border border-green-100">
            {!isConnected ? (
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold text-gray-800">
                    Get Started
                  </h2>
                  <p className="text-gray-600 text-lg max-w-md mx-auto">
                    Connect your wallet to access Sage's full suite of features and start your Web3 journey.
                  </p>
                </div>
                
                {/* Using appkit-button instead of custom connect button */}
                <div className="flex justify-center">
                  <appkit-button />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                    Wallet Connected
                  </h2>
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600">Address</span>
                      <span className="text-gray-800 font-mono bg-gray-100 px-3 py-1 rounded-lg">
                        {address}
                      </span>
                    </div>
                    
                    {connector && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-600">Wallet</span>
                          <span className="text-gray-800">{connector.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-600">Connection Type</span>
                          <span className="text-gray-800">{connector.type}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-600">Status</span>
                          <span className="text-green-600">Connected</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
  
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => disconnectAsync()}
                    className="inline-flex items-center px-6 py-3 text-red-600 
                             border-2 border-red-600 rounded-xl hover:bg-red-50
                             transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect Wallet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;