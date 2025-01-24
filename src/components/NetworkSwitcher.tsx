import { useChainId, useSwitchChain } from 'wagmi'
import { supportedNetworks } from '../constants'

export function NetworkSwitcher() {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  return (
    <div className="relative inline-block">
      <select 
        value={chainId?.toString()}
        onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
        className="appearance-none bg-white/10 border border-white/20 rounded-lg px-4 py-2 
                   text-sm text-white cursor-pointer hover:bg-white/20 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        <option value="" disabled className="text-gray-900">
          Select Network
        </option>
        {supportedNetworks.map((network) => (
          <option 
            key={network.id} 
            value={network.id.toString()}
            className="text-gray-900"
          >
            {network.name}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}