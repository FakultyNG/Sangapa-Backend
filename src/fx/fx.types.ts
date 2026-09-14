export type ReepayFxQuote = Record<string, unknown>;
export type ReepayWalletFundingConfirmation = Record<string, unknown>;

export type WalletFundingCurrency = 'eur' | 'usdc';

export type FxRatePair = 'xaf-eur' | 'xaf-usdc';

export type FxRatesResponse = {
  baseCurrency: 'XAF';
  amount: string;
  rates: {
    xafEur: ReepayFxQuote | null;
    xafUsdc: ReepayFxQuote | null;
  };
  sourceOfTruth: 'REEPAY';
  partial?: boolean;
  rateErrors?: Partial<Record<'xafEur' | 'xafUsdc', FxRateError>>;
};

export type FxRateError = {
  code: string;
  message: string;
};
