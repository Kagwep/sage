import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from 'react-hot-toast';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
// Import this at the top of your main app file
import '@rainbow-me/rainbowkit/styles.css';
import { EnvUnsupported } from './EnvUnsupported.tsx';
import { init } from './init.ts';

import '@telegram-apps/telegram-ui/dist/styles.css';
import './index.css';

// Mock the environment in case, we are outside Telegram.
import './mockEnv.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-right" reverseOrder={false} />
  </StrictMode>,
)