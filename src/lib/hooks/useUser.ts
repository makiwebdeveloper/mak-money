import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CurrencyCode } from "@/lib/constants/currencies";
import { convertCurrency } from "@/lib/constants/exchange-rates";
import { useState, useEffect } from "react";

// Query keys
export const userKeys = {
  all: ["user"] as const,
  currency: () => [...userKeys.all, "currency"] as const,
  activePool: () => [...userKeys.all, "active-pool"] as const,
};

// Get user's default currency
export function useUserCurrency() {
  return useQuery({
    queryKey: userKeys.currency(),
    queryFn: async (): Promise<CurrencyCode> => {
      const response = await fetch("/api/user/currency");
      if (!response.ok) {
        throw new Error("Failed to fetch user currency");
      }
      const data = await response.json();
      return data.currency || "USD";
    },
  });
}

// Hook for converting a single amount to user's default currency
export function useCurrencyConverter(
  amount: number,
  fromCurrency: CurrencyCode
) {
  const { data: defaultCurrency } = useUserCurrency();
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const convert = async () => {
      if (!defaultCurrency || !amount) {
        setConvertedAmount(null);
        return;
      }

      if (fromCurrency === defaultCurrency) {
        setConvertedAmount(amount);
        return;
      }

      setIsConverting(true);
      try {
        const converted = await convertCurrency(amount, fromCurrency, defaultCurrency);
        setConvertedAmount(Number(converted.toFixed(2)));
      } catch (error) {
        console.error('Failed to convert currency:', error);
        setConvertedAmount(null);
      } finally {
        setIsConverting(false);
      }
    };

    convert();
  }, [amount, fromCurrency, defaultCurrency]);

  return {
    convertedAmount,
    defaultCurrency,
    isConverting,
    needsConversion: fromCurrency !== defaultCurrency,
  };
}

export function useActivePoolId() {
  return useQuery({
    queryKey: userKeys.activePool(),
    queryFn: async (): Promise<string | null> => {
      const response = await fetch("/api/user/active-pool");
      if (!response.ok) {
        throw new Error("Failed to fetch active pool");
      }
      const data = await response.json();
      return data.active_pool_id || null;
    },
  });
}

export function useSetActivePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activePoolId: string | null) => {
      const response = await fetch("/api/user/active-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_pool_id: activePoolId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update active pool");
      }

      return response.json();
    },
    onMutate: async (activePoolId) => {
      await queryClient.cancelQueries({ queryKey: userKeys.activePool() });
      const previousActivePoolId = queryClient.getQueryData<string | null>(
        userKeys.activePool(),
      );

      queryClient.setQueryData(userKeys.activePool(), activePoolId);

      return { previousActivePoolId };
    },
    onError: (_error, _activePoolId, context) => {
      queryClient.setQueryData(
        userKeys.activePool(),
        context?.previousActivePoolId ?? null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.activePool() });
    },
  });
}
