export type ReepayDeposit = Record<string, unknown>;

export type MoneyAmount = {
  amount: string;
  currency: string;
};

export type DepositFees = {
  provider: MoneyAmount | null;
  reepay: MoneyAmount | null;
};

export type XafDepositResponse = {
  id: string | null;
  status: string | null;
  checkoutUrl: string | null;
  checkoutToken: string | null;
  creditedAmount: MoneyAmount | null;
  fees: DepositFees;
  totalDebit: MoneyAmount | null;
};
