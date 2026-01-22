import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { convertCurrency } from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";

// GET /api/accounts - Get all active accounts for current user
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

    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add converted balance to each account
    const accountsWithConversion = await Promise.all(
      (accounts || []).map(async (account) => {
        const convertedBalance = await convertCurrency(
          account.balance,
          account.currency as CurrencyCode,
          defaultCurrency,
        );

        return {
          ...account,
          convertedBalance,
          defaultCurrency,
        };
      }),
    );

    return NextResponse.json({
      accounts: accountsWithConversion,
      defaultCurrency,
    });
  } catch (error) {
    console.error("Error in accounts GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/accounts - Create new account
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
    const { name, type, currency, balance } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 },
      );
    }

    if (!currency) {
      return NextResponse.json(
        { error: "Currency is required" },
        { status: 400 },
      );
    }

    const { data: account, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: name.trim(),
        type: type || "other",
        currency,
        balance: balance || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating account:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Note: No need to create allocation in free pool
    // Free balance is calculated automatically as: Total Balance - Sum of Allocations

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("Error in accounts POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
