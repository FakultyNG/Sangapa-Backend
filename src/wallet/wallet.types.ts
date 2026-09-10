export type ReepayWalletBalance = Record<string, unknown>;
export type ReepayWalletDetails = Record<string, unknown>;
export type ReepayFundingInstructions = Record<string, unknown>;
export type ReepayRecentTransactions = Record<string, unknown>;

export type TotalWalletSummary = {
  customerId: string;
  wallets: {
    xaf: ReepayWalletDetails;
    eur: ReepayWalletDetails;
    usdc: ReepayWalletDetails;
  };
  sourceOfTruth: 'REEPAY';
};
