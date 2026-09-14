export type ReepayWalletBalance = Record<string, unknown>;
export type ReepayWalletDetails = Record<string, unknown>;
export type ReepayFundingInstructions = Record<string, unknown>;
export type ReepayRecentTransactions = Record<string, unknown>;

export type TotalWalletSummary = {
  customerId: string;
  wallets: {
    xaf: ReepayWalletDetails | null;
    eur: ReepayWalletDetails | null;
    usdc: ReepayWalletDetails | null;
  };
  sourceOfTruth: 'REEPAY';
  partial?: boolean;
  walletErrors?: Partial<Record<'xaf' | 'eur' | 'usdc', WalletFetchError>>;
};

export type WalletFetchError = {
  code: string;
  message: string;
};
