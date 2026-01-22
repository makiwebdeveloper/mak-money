import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PoolsClient from "./pools-client";
import { PoolsSkeleton } from "@/components/pools-skeleton";
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

  // Just fetch basic pools data - balances will be calculated by API endpoint
  const { data: pools } = await supabase
    .from("money_pools")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Empty initial data - react-query will fetch from API with balances
  // Empty initial data - react-query will fetch from API with balances
  const poolBalances: Array<{ pool_id: string; total_amount: number }> = [];

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
