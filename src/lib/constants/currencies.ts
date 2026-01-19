export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
] as const;

export const DEFAULT_CURRENCY = "USD";

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];
