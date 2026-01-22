import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getTotalBalanceInCurrency } from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";

// GET /api/accounts/balance - Get total balance in user's default currency
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

    // Get all active accounts
    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("balance, currency")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert all balances to user's default currency using real exchange rates
    const totalBalance = await getTotalBalanceInCurrency(
      accounts || [],
      defaultCurrency,
    );

    return NextResponse.json({
      totalBalance,
      currency: defaultCurrency,
      accountsCount: accounts?.length || 0,
    });
  } catch (error) {
    console.error("Error in balance GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
