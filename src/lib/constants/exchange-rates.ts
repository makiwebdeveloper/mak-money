import { CurrencyCode } from "./currencies";

// Статические курсы валют (MVP допущение)
// В будущем можно заменить на API с актуальными курсами
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 0.92,
  SEK: 10.5,
  UAH: 36.5,
};

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): number {
  if (from === to) return amount;

  // Конвертируем через USD как базовую валюту
  const amountInUSD = amount / EXCHANGE_RATES[from];
  const amountInTargetCurrency = amountInUSD * EXCHANGE_RATES[to];

  return Number(amountInTargetCurrency.toFixed(2));
}

export function getTotalBalanceInCurrency(
  accounts: Array<{ balance: number; currency: string }>,
  targetCurrency: CurrencyCode,
): number {
  return accounts.reduce((total, account) => {
    const converted = convertCurrency(
      account.balance,
      account.currency as CurrencyCode,
      targetCurrency,
    );
    return total + converted;
  }, 0);
}
