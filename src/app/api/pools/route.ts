import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { convertCurrency } from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";

// GET /api/pools - Get all active pools for current user with balances
export async function GET() {
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

    const { data: pools, error } = await supabase
      .from("money_pools")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching pools:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get allocations for each pool with account currency
    const poolsWithBalances = await Promise.all(
      (pools || []).map(async (pool) => {
        if (pool.type === "free") {
          // For free pool, calculate differently
          // Get all accounts
          const { data: accounts } = await supabase
            .from("accounts")
            .select("balance, currency")
            .eq("user_id", user.id)
            .eq("is_active", true);

          // Get all allocations except free pool
          const { data: allocations } = await supabase
            .from("allocations")
            .select("amount, accounts(currency)")
            .eq("user_id", user.id)
            .neq("pool_id", pool.id);

          // Convert all to default currency
          let totalAccountBalance = 0;
          for (const account of accounts || []) {
            const converted = await convertCurrency(
              account.balance,
              account.currency as CurrencyCode,
              defaultCurrency,
            );
            totalAccountBalance += converted;
          }

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

          const balance = Number(
            (totalAccountBalance - totalAllocated).toFixed(2),
          );

          return {
            ...pool,
            balance,
            currency: defaultCurrency,
          };
        } else {
          // For regular pools, sum allocations
          const { data: allocations } = await supabase
            .from("allocations")
            .select("amount, accounts(currency)")
            .eq("pool_id", pool.id);

          let balance = 0;
          for (const allocation of allocations || []) {
            const accountCurrency =
              (allocation.accounts as any)?.currency || defaultCurrency;
            const converted = await convertCurrency(
              allocation.amount,
              accountCurrency as CurrencyCode,
              defaultCurrency,
            );
            balance += converted;
          }

          return {
            ...pool,
            balance: Number(balance.toFixed(2)),
            currency: defaultCurrency,
          };
        }
      }),
    );

    return NextResponse.json({
      pools: poolsWithBalances,
      defaultCurrency,
    });
  } catch (error) {
    console.error("Error in pools GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/pools - Create new pool
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, color, icon } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Pool name is required" },
        { status: 400 },
      );
    }

    // Prevent creating another 'free' pool
    if (type === "free") {
      return NextResponse.json(
        { error: "Cannot create another Free pool" },
        { status: 400 },
      );
    }

    const { data: pool, error } = await supabase
      .from("money_pools")
      .insert({
        user_id: user.id,
        name: name.trim(),
        type: type || "custom",
        color: color || "#6366f1",
        icon: icon || "wallet",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating pool:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pool }, { status: 201 });
  } catch (error) {
    console.error("Error in pools POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
