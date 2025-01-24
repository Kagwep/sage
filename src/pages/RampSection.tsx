import { useState } from 'react';
import { useAccount } from 'wagmi';

const RampSection = () => {
  const { address } = useAccount();
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [showBuyIframe, setShowBuyIframe] = useState(false);
  const [showSellIframe, setShowSellIframe] = useState(false);

  const constructBuyUrl = (amount: string) => {
    const baseUrl = 'https://pay.fonbnk.com/phone';
    const params = new URLSearchParams({
      network: 'LISK',
      currency: 'usdt',
      address: address || '',
      provider: 'bank_transfer',
      amount: amount,
      country: 'KE'
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const constructSellUrl = (amount: string) => {
    const baseUrl = 'https://pay.fonbnk.com/offramp';
    const params = new URLSearchParams({
      network: 'LISK',
      asset: 'usdt',
      amount: amount,
      offrampCurrency: 'local',
      offrampType: 'mobile_money', // or 'bank', 'airtime', 'paybill'
      country: 'KE',
      currencyIso: 'KES',
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const handleBuy = () => {
    if (!buyAmount || !address) return;
    setShowBuyIframe(true);
  };

  const handleSell = () => {
    if (!sellAmount || !address) return;
    setShowSellIframe(true);
  };

  return (
    <div className="p-4">
      <div className="grid gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">On-Ramp</h3>
          <p className="text-sm text-gray-600 mb-3">Buy USDT on Lisk with fiat</p>
          
          <div className="mb-4">
            <input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-2 border rounded mb-3"
            />
            
            <button 
              onClick={handleBuy}
              disabled={!buyAmount || !address}
              className="w-full bg-green-700 text-white py-2 rounded disabled:bg-gray-400"
            >
              Buy USDT
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">Off-Ramp</h3>
          <p className="text-sm text-gray-600 mb-3">Sell USDT for local currency</p>
          <div className="mb-4">
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-2 border rounded mb-3"
            />
            
            <button 
              onClick={handleSell}
              disabled={!sellAmount || !address}
              className="w-full bg-green-700 text-white py-2 rounded disabled:bg-gray-400"
            >
              Sell USDT
            </button>
          </div>
        </div>

        {showBuyIframe && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="relative w-full max-w-3xl h-[600px] bg-white rounded-lg">
              <button 
                onClick={() => setShowBuyIframe(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
              <iframe
                src={constructBuyUrl(buyAmount)}
                className="w-full h-full rounded-lg"
                frameBorder="0"
              />
            </div>
          </div>
        )}

        {showSellIframe && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="relative w-full max-w-3xl h-[600px] bg-white rounded-lg">
              <button 
                onClick={() => setShowSellIframe(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
              <iframe
                src={constructSellUrl(sellAmount)}
                className="w-full h-full rounded-lg"
                frameBorder="0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RampSection;