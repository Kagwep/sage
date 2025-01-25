import DexSwapFlow from "../components/swap";

export const SwapSection = () => (
  <div className="p-4">
    <div className="bg-white rounded-lg p-4 shadow relative overflow-hidden">
      {/* Coming Soon Overlay */}
      {/* <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold text-green-700">Coming Soon</span>
        <p className="text-sm text-gray-600 mt-2">Swapping will be available shortly</p>
      </div> */}

      {/* Base Swap Interface (Blurred) */}
      {/* <h2 className="text-lg font-semibold mb-4">Swap Tokens</h2> */}
      {/* <div className="space-y-4">
        <div className="p-3 border rounded">
          <label className="text-sm text-gray-600">From</label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              className="flex-1 bg-transparent p-2 outline-none" 
              placeholder="0.0" 
              disabled
            />
            <button className="bg-gray-100 px-3 py-1 rounded">LSK</button>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="bg-white shadow-md rounded-full p-2">
            <svg 
              className="w-6 h-6 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 14l-7 7m0 0l-7-7m7 7V3" 
              />
            </svg>
          </div>
        </div>

        <div className="p-3 border rounded">
          <label className="text-sm text-gray-600">To</label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              className="flex-1 bg-transparent p-2 outline-none" 
              placeholder="0.0" 
              disabled
            />
            <button className="bg-gray-100 px-3 py-1 rounded">Select</button>
          </div>
        </div>

        <button 
          className="w-full bg-gray-300 text-white py-3 rounded-lg cursor-not-allowed"
          disabled
        >
          Swap
        </button>
      </div> */}
    </div>
    <DexSwapFlow />
  </div>
);