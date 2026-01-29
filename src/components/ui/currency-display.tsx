'use client';

import { CurrencyCode, CURRENCIES } from "@/lib/constants/currencies";
import { useCurrencyConverter } from "@/lib/hooks/useUser";
import { formatNumber } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number;
  currency: CurrencyCode;
  className?: string;
  showConverted?: boolean;
}

export function CurrencyDisplay({ 
  amount, 
  currency, 
  className = "", 
  showConverted = true 
}: CurrencyDisplayProps) {
  const { convertedAmount, defaultCurrency, needsConversion, isConverting } = 
    useCurrencyConverter(amount, currency);

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const originalFormatted = `${getCurrencySymbol(currency)} ${formatNumber(amount)}`;

  if (!showConverted || !needsConversion) {
    return <span className={className}>{originalFormatted}</span>;
  }

  return (
    <span className={className}>
      {originalFormatted}
      {needsConversion && (
        <span className="text-muted-foreground text-sm ml-2 font-normal">
          {isConverting ? (
            "(converting...)"
          ) : convertedAmount !== null ? (
            `(≈ ${getCurrencySymbol(defaultCurrency!)} ${formatNumber(convertedAmount)})`
          ) : (
            "(conversion failed)"
          )}
        </span>
      )}
    </span>
  );
}