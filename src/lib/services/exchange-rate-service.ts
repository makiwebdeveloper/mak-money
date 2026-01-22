import { CurrencyCode } from "../constants/currencies";

interface ExchangeRateCache {
  rates: Record<CurrencyCode, number>;
  timestamp: number;
  baseCurrency: string;
}

// Cache for 12 hours (in milliseconds)
const CACHE_DURATION = 12 * 60 * 60 * 1000;

// In-memory cache (for serverless, this will be per-instance)
let rateCache: ExchangeRateCache | null = null;

/**
 * Fetches latest exchange rates from exchangerate-api.com
 * Free tier: 1,500 requests/month
 * Uses USD as base currency for simplicity
 */
async function fetchExchangeRates(): Promise<Record<
  CurrencyCode,
  number
> | null> {
  try {
    // Using exchangerate-api.com free tier (no API key required for basic usage)
    // Base currency is USD
    const response = await fetch(
      "https://open.exchangerate-api.com/v6/latest/USD",
      {
        next: { revalidate: 43200 }, // 12 hours cache in Next.js
      },
    );

    if (!response.ok) {
      console.error(
        `Exchange rate API error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();

    // Extract rates for our supported currencies
    const rates: Record<CurrencyCode, number> = {
      USD: 1.0,
      EUR: data.rates.EUR || 0.92,
      SEK: data.rates.SEK || 10.5,
      UAH: data.rates.UAH || 36.5,
    };

    return rates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return null;
  }
}

/**
 * Gets current exchange rates with caching
 * Falls back to static rates if API is unavailable
 */
export async function getExchangeRates(): Promise<
  Record<CurrencyCode, number>
> {
  const now = Date.now();

  // Check if cache is valid
  if (rateCache && now - rateCache.timestamp < CACHE_DURATION) {
    return rateCache.rates;
  }

  // Fetch new rates
  const rates = await fetchExchangeRates();

  if (rates) {
    // Update cache
    rateCache = {
      rates,
      timestamp: now,
      baseCurrency: "USD",
    };
    return rates;
  }

  // Fallback to static rates if API fails
  const fallbackRates: Record<CurrencyCode, number> = {
    USD: 1.0,
    EUR: 0.92,
    SEK: 10.5,
    UAH: 36.5,
  };

  // Cache fallback rates for shorter period (1 hour) to retry sooner
  if (!rateCache || now - rateCache.timestamp >= 60 * 60 * 1000) {
    rateCache = {
      rates: fallbackRates,
      timestamp: now,
      baseCurrency: "USD",
    };
  }

  return rateCache?.rates || fallbackRates;
}

/**
 * Converts amount from one currency to another using real exchange rates
 */
export async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): Promise<number> {
  if (from === to) return amount;

  const rates = await getExchangeRates();

  // Convert through USD as base currency
  const amountInUSD = amount / rates[from];
  const amountInTargetCurrency = amountInUSD * rates[to];

  return Number(amountInTargetCurrency.toFixed(2));
}

/**
 * Converts an array of accounts to a target currency and returns total
 */
export async function getTotalBalanceInCurrency(
  accounts: Array<{ balance: number; currency: string }>,
  targetCurrency: CurrencyCode,
): Promise<number> {
  let total = 0;

  for (const account of accounts) {
    const converted = await convertCurrency(
      account.balance,
      account.currency as CurrencyCode,
      targetCurrency,
    );
    total += converted;
  }

  return Number(total.toFixed(2));
}

/**
 * Converts multiple amounts from different currencies to a target currency
 * Returns array of converted amounts
 */
export async function convertMultipleAmounts(
  amounts: Array<{ amount: number; currency: CurrencyCode }>,
  targetCurrency: CurrencyCode,
): Promise<number[]> {
  const rates = await getExchangeRates();

  return amounts.map(({ amount, currency }) => {
    if (currency === targetCurrency) return amount;

    const amountInUSD = amount / rates[currency];
    const converted = amountInUSD * rates[targetCurrency];
    return Number(converted.toFixed(2));
  });
}
