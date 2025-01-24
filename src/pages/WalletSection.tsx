// src/pages/WalletSection.tsx
import { useAccount, useDisconnect, useChainId } from 'wagmi';

const WalletSection = () => {
  const { address, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnectAsync } = useDisconnect();

  const handleDisconnect = async () => {
    try {
      await disconnectAsync();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="text-lg font-semibold mb-4">Wallet Details</h2>
        {isConnected && address ? (
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded">
              <label className="text-sm text-gray-600">Address</label>
              <p className="font-mono text-sm break-all">{address}</p>
            </div>
            {connector && (
              <>
                <div className="bg-gray-50 p-3 rounded">
                  <label className="text-sm text-gray-600">Wallet Name</label>
                  <p>{connector.name}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <label className="text-sm text-gray-600">Chain ID</label>
                  <p>{chainId}</p>
                </div>
              </>
            )}
            <button
              onClick={handleDisconnect}
              className="w-full bg-red-500 text-white py-2 rounded-lg mt-4 hover:bg-red-600 transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-600">Wallet not connected</p>
        )}
      </div>
    </div>
  );
};

export default WalletSection;