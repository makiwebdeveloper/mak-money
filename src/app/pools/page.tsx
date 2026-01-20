import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PoolsClient from "./pools-client";

export default async function PoolsPage() {
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

  // Fetch all pools (active and archived)
  const { data: pools } = await supabase
    .from("money_pools")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Calculate pool balances from allocations
  const { data: allocations } = await supabase
    .from("allocations")
    .select("pool_id, amount")
    .eq("user_id", user.id);

  // Sum allocations by pool_id
  const poolBalances =
    allocations?.reduce(
      (acc, allocation) => {
        const existing = acc.find((b) => b.pool_id === allocation.pool_id);
        if (existing) {
          existing.total_amount += Number(allocation.amount);
        } else {
          acc.push({
            pool_id: allocation.pool_id,
            total_amount: Number(allocation.amount),
          });
        }
        return acc;
      },
      [] as Array<{ pool_id: string; total_amount: number }>,
    ) || [];

  return (
    <PoolsClient
      pools={pools || []}
      poolBalances={poolBalances}
      currency={userData.default_currency}
      userId={user.id}
    />
  );
}
