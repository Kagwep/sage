export type Section = 'chat' | 'swap' | 'ramp' | 'earn' | 'wallet' | 'bridge';


// Token information
interface Token {
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    tags: string[];
    logoURI: string;
  }
  
  // Permit2 related types
  interface PermitTypes {
    PermitSingle: Array<{
      name: string;
      type: string;
    }>;
    PermitDetails: Array<{
      name: string;
      type: string;
    }>;
  }
  
  interface PermitDomain {
    name: string;
    chainId: number;
    verifyingContract: string;
  }
  
  interface PermitDetails {
    token: string;
    amount: string;
    expiration: string;
    nonce: string;
  }
  
  interface PermitMessage {
    details: PermitDetails;
    spender: string;
    sigDeadline: string;
  }
  
  interface Permit2Data {
    types: PermitTypes;
    domain: PermitDomain;
    message: PermitMessage;
    primaryType: string;
  }
  
  // Trade information
  interface Trade {
    data: string;
    value: string;
    to: string;
    chainId: number;
  }
  
  // Quote response type
  interface SwapQuote {
    inAmount: string;
    outAmount: string;
    coupon: {
      chainId: number;
      account: string;
      raw: {
        executionInformation: {
          trade: Trade;
          approvals: Array<{
            approvee: string;
            amount: string;
            chainId: number;
            address: string;
          }>;
        };
        quote: {
          sellAmount: string;
          buyAmount: string;
          estimatedGas: string;
          gasPrice: string;
          priceImpact: number;
          trade: Trade;
          permit2: Permit2Data;
        };
      };
    };
    candidateTrade: Trade;
    slippage: number;
    fees: {
      gas: string;
    };
    signingRequest: {
      typedData: Array<{
        payload: {
          types: PermitTypes;
          domain: PermitDomain;
          message: PermitMessage;
          primaryType: string;
        };
      }>;
      permit2Address: string;
    };
    chainId: number;
    market: string;
    isExactIn: boolean;
    inToken: Token;
    outToken: Token;
    amountRatio: number;
    tokenInUsdValue: number;
    gasInUsdValue: number;
    inUsdValue: number;
    tokenOutUsdValue: number;
    outUsdValue: number;
    timestamp: number;
  }
  
  // Execution information request type
  interface ExecutionInfoRequest {
    coupon: {
      chainId: number;
      account: string;
      raw: {
        executionInformation: {
          trade: Trade;
          approvals: Array<{
            approvee: string;
            amount: string;
            chainId: number;
            address: string;
          }>;
        };
        quote: {
          sellAmount: string;
          buyAmount: string;
          estimatedGas: string;
          gasPrice: string;
          priceImpact: number;
        };
      };
    };
    signingRequest: {
      typedData: Array<{
        payload: {
          types: PermitTypes;
          domain: PermitDomain;
          message: PermitMessage;
          primaryType: string;
        };
      }>;
      permit2Address: string;
    };
  }
  
  // Execution information response type
  interface ExecutionInfo {
    trade: Trade;
    approvals: Array<{
      approvee: string;
      amount: string;
      chainId: number;
      address: string;
    }>;
    analysis?: {
      blockaid?: {
        error?: string;
        verified: boolean;
      };
    };
  }
  
  export type {
    Token,
    SwapQuote,
    ExecutionInfo,
    ExecutionInfoRequest,
    Trade,
    PermitTypes,
    PermitDomain,
    PermitMessage,
    Permit2Data
  };