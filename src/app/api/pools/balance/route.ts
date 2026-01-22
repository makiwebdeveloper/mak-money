import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  convertCurrency,
  getTotalBalanceInCurrency,
} from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's default currency
    const { data: userData } = await supabase
      .from("users")
      .select("default_currency")
      .eq("id", user.id)
      .single();

    const defaultCurrency = (userData?.default_currency ||
      "USD") as CurrencyCode;

    // Get the "Free" pool by type, not name
    const { data: freePool, error: poolError } = await supabase
      .from("money_pools")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("type", "free")
      .single();

    if (poolError || !freePool) {
      return NextResponse.json(
        { error: "Free pool not found" },
        { status: 404 },
      );
    }

    // Get all user's active accounts with their balances
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("balance, currency")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      return NextResponse.json(
        { error: "Failed to fetch accounts" },
        { status: 500 },
      );
    }

    // Get all allocations (excluding free pool)
    const { data: allocations, error: allocationsError } = await supabase
      .from("allocations")
      .select("amount, accounts(currency)")
      .eq("user_id", user.id)
      .neq("pool_id", freePool.id);

    if (allocationsError) {
      console.error("Error fetching allocations:", allocationsError);
      return NextResponse.json(
        { error: "Failed to fetch allocations" },
        { status: 500 },
      );
    }

    // Convert total account balance to default currency
    const totalAccountBalance = await getTotalBalanceInCurrency(
      accounts || [],
      defaultCurrency,
    );

    // Convert all allocations to default currency and sum them
    let totalAllocated = 0;
    for (const allocation of allocations || []) {
      const accountCurrency =
        (allocation.accounts as any)?.currency || defaultCurrency;
      const converted = await convertCurrency(
        allocation.amount,
        accountCurrency as CurrencyCode,
        defaultCurrency,
      );
      totalAllocated += converted;
    }

    // Free balance = Total balance - Total allocated
    const freeBalance = Number(
      (totalAccountBalance - totalAllocated).toFixed(2),
    );

    console.log("Free pool balance calculation:", {
      poolId: freePool.id,
      totalAccountBalance,
      totalAllocated,
      freeBalance,
      currency: defaultCurrency,
    });

    return NextResponse.json({
      freeBalance,
      poolId: freePool.id,
      poolName: freePool.name,
      currency: defaultCurrency,
    });
  } catch (error) {
    console.error("Error in pools/balance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
