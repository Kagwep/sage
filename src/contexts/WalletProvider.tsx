import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppKitNetwork } from '@reown/appkit/networks'
import { supportedNetworks } from '../constants'

// Create Query Client
const queryClient = new QueryClient()

// Get your project ID from cloud.reown.com
const projectId = import.meta.env.VITE_PROJECT_ID

// App metadata
const metadata = {
  name: 'Sage',
  description: 'Your App Description',
  url: 'Chat, swap, and manage assets with ease',
  icons: ['https://yourapp.com/icon.png']
}

// Configure networks using MAINNET_SUPPORTED_CHAINS
const networks = supportedNetworks.map(chain => ({
  ...chain,
})) as [AppKitNetwork, ...AppKitNetwork[]];

// Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

// Create AppKit configuration
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true
  }
})

// Create Provider Component
export function WalletProvider({ children } : {children: any}) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}