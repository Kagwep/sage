export interface WalletSession {
    topic: string;
    sessionConfig: {
      dappInfo: {
        origin: string;
        url: string;
        name: string;
        icon: string;
      };
      openUniversalUrl: boolean;
      tmaReturnUrl: string;
      redirect: string;
    };
    namespaces: {
      eip155: {
        chains: string[];
        accounts: string[];
        methods: string[];
        extra: {
          [key: string]: {
            publicKey: string;
          };
        };
        payload: any;
      };
    };
    wallet: {
      appName: string;
      appVersion: string;
      platform: string;
      maxProtocolVersion: number;
      features: {
        ton: string[];
      };
      walletName: string;
    };
  }
  