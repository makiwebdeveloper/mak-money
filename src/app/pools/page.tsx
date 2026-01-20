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

  // For free pool, calculate balance using RPC function
  const freePool = pools?.find((p) => p.type === "free");
  if (freePool) {
    const { data: freeBalance } = await supabase.rpc("get_pool_balance", {
      p_pool_id: freePool.id,
    });

    // Update or add free pool balance
    const existingFreeBalance = poolBalances.find(
      (b) => b.pool_id === freePool.id,
    );
    if (existingFreeBalance) {
      existingFreeBalance.total_amount = Number(freeBalance) || 0;
    } else {
      poolBalances.push({
        pool_id: freePool.id,
        total_amount: Number(freeBalance) || 0,
      });
    }
  }

  return (
    <PoolsClient
      pools={pools || []}
      poolBalances={poolBalances}
      currency={userData.default_currency}
      userId={user.id}
    />
  );
}
