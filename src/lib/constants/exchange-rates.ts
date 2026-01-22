// Re-export functions from the exchange rate service
// This file is kept for backward compatibility but now uses real API rates
export {
  convertCurrency,
  getTotalBalanceInCurrency,
  getExchangeRates,
  convertMultipleAmounts,
} from "../services/exchange-rate-service";
