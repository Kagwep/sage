import { useState } from 'react';
import { ChatSection } from './pages/ChatSection';
import { SwapSection } from './pages/SwapSection';
import { EarnSection } from './pages/EarnSection';
import WalletSection from './pages/WalletSection';
import Home from './pages/Home';
import { useAccount } from 'wagmi';
import { Layout } from './components/Layout';
import { WalletProvider } from './contexts/WalletProvider';
import RampSection from './pages/RampSection';
import BridgeComponent from './pages/Bridge';

// Type for available sections
type Section = 'chat' | 'swap' | 'ramp' | 'earn' | 'wallet' | 'bridge';

// Create a protected wrapper component
const ProtectedApp = () => {
  const [activeSection, setActiveSection] = useState<Section>('chat');
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return <Home />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'chat':
        return <ChatSection />;
      case 'bridge':
          return <BridgeComponent />;
      case 'swap':
        return <SwapSection />;
      case 'ramp':
        return <RampSection />;
      case 'earn':
        return <EarnSection />;
      case 'wallet':
        return <WalletSection />;
      default:
        return <ChatSection />;
    }
  };

  return (
    <Layout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSection()}
    </Layout>
  );
};

// Main App component
function App() {
  return (
    <WalletProvider>
      <ProtectedApp />
    </WalletProvider>
  );
}

export default App;