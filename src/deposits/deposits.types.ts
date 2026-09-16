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
  reference: string | null;
  amount: string | null;
  currency: string | null;
  status: string | null;
  checkoutUrl: string | null;
  checkoutToken: string | null;
  expiresAt: string | null;
  expiresInSec: number | null;
  creditedAmount: MoneyAmount | null;
  fees: DepositFees;
  totalFee: MoneyAmount | null;
  totalDebit: MoneyAmount | null;
};
