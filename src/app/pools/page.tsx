import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PoolsClient from "./pools-client";
import { PoolsSkeleton } from "@/components/pools-skeleton";
import { convertCurrency } from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";

async function PoolsContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Fetch user's currency
  const { data: userData } = await supabase
    .from("users")
    .select("default_currency")
    .eq("id", user.id)
    .single();

  if (!userData?.default_currency) {
    redirect("/onboarding");
  }

  const defaultCurrency = userData.default_currency as CurrencyCode;

  // Fetch all pools (active and archived)
  const { data: pools } = await supabase
    .from("money_pools")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Calculate pool balances from allocations with currency conversion
  const { data: allocations } = await supabase
    .from("allocations")
    .select("pool_id, amount, accounts(currency)")
    .eq("user_id", user.id);

  // Sum allocations by pool_id, converting to default currency
  const poolBalances: Array<{ pool_id: string; total_amount: number }> = [];

  for (const allocation of allocations || []) {
    const accountCurrency =
      (allocation.accounts as any)?.currency || defaultCurrency;
    const convertedAmount = await convertCurrency(
      allocation.amount,
      accountCurrency as CurrencyCode,
      defaultCurrency,
    );

    const existing = poolBalances.find((b) => b.pool_id === allocation.pool_id);
    if (existing) {
      existing.total_amount += convertedAmount;
    } else {
      poolBalances.push({
        pool_id: allocation.pool_id,
        total_amount: convertedAmount,
      });
    }
  }

  // For free pool, calculate balance properly with currency conversion
  const freePool = pools?.find((p) => p.type === "free");
  if (freePool) {
    // Get all accounts
    const { data: accounts } = await supabase
      .from("accounts")
      .select("balance, currency")
      .eq("user_id", user.id)
      .eq("is_active", true);

    // Convert all account balances to default currency
    let totalAccountBalance = 0;
    for (const account of accounts || []) {
      const converted = await convertCurrency(
        account.balance,
        account.currency as CurrencyCode,
        defaultCurrency,
      );
      totalAccountBalance += converted;
    }

    // Get total allocated (excluding free pool) in default currency
    let totalAllocated = 0;
    for (const allocation of allocations || []) {
      if (allocation.pool_id !== freePool.id) {
        const accountCurrency =
          (allocation.accounts as any)?.currency || defaultCurrency;
        const converted = await convertCurrency(
          allocation.amount,
          accountCurrency as CurrencyCode,
          defaultCurrency,
        );
        totalAllocated += converted;
      }
    }

    const freeBalance = Number(
      (totalAccountBalance - totalAllocated).toFixed(2),
    );

    // Update or add free pool balance
    const existingFreeBalance = poolBalances.find(
      (b) => b.pool_id === freePool.id,
    );
    if (existingFreeBalance) {
      existingFreeBalance.total_amount = freeBalance;
    } else {
      poolBalances.push({
        pool_id: freePool.id,
        total_amount: freeBalance,
      });
    }
  }

  return (
    <PoolsClient
      pools={pools || []}
      poolBalances={poolBalances}
      currency={defaultCurrency}
      userId={user.id}
    />
  );
}

export default function PoolsPage() {
  return (
    <Suspense fallback={<PoolsSkeleton />}>
      <PoolsContent />
    </Suspense>
  );
}
