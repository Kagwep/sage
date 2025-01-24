import { AppKitNetwork, defineChain } from '@reown/appkit/networks';


// Properly type the Lisk network
export const liskNetwork = defineChain({
    id: 1135,
    caipNetworkId: 'eip155:1135',
    chainNamespace: 'eip155',
    name: 'Lisk',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: ['https://rpc.api.lisk.com'],
        webSocket: ['wss://ws.api.lisk.com'],
      },
      public: {
        http: ['https://rpc.api.lisk.com'],
        webSocket: ['wss://ws.api.lisk.com'],
      }
    },
    blockExplorers: {
      default: { 
        name: 'Lisk Explorer', 
        url: 'https://blockscout.lisk.com'
      },
    }
  }) as AppKitNetwork;

  export const supportedNetworks = MAINNET_SUPPORTED_CHAINS.map(chain => ({
    ...chain,
    // Add any additional properties needed for AppKitNetwork if necessary
  })) as unknown as [AppKitNetwork, ...AppKitNetwork[]];

 

export const PARAMETER_EXTRACTION='https://api.brianknows.org/api/v0/agent/parameters-extraction'

import tokensAllJson from "./assets/tokens.json";
import { MAINNET_SUPPORTED_CHAINS } from './utils/chains';

export const tokensAll = tokensAllJson;


export const ERC20_ABI = [
    // Read Functions
    {
      "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [{"internalType": "string", "name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [{"internalType": "string", "name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
      "name": "allowance",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
  
    // Write Functions
    {
      "inputs": [
        {"internalType": "address", "name": "to", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"}
      ],
      "name": "transfer",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "spender", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"}
      ],
      "name": "approve",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "from", "type": "address"},
        {"internalType": "address", "name": "to", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"}
      ],
      "name": "transferFrom",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
  
    // Events
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "spender", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}
      ],
      "name": "Approval",
      "type": "event"
    }
  ] as const;