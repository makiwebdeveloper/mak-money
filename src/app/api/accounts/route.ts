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
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Server does NOT decrypt data - just passes encrypted_data to client
    // Client will decrypt using useAccountEncryption hook
    return NextResponse.json({
      accounts: accounts || [],
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
    const { encrypted_data, type, currency, exclude_from_free } = body;

    // Validate encrypted_data
    if (!encrypted_data) {
      return NextResponse.json(
        { error: "Encrypted data is required" },
        { status: 400 },
      );
    }

    if (
      !encrypted_data.ciphertext ||
      !encrypted_data.iv ||
      !encrypted_data.version
    ) {
      return NextResponse.json(
        { error: "Invalid encrypted data format" },
        { status: 400 },
      );
    }

    if (!currency) {
      return NextResponse.json(
        { error: "Currency is required" },
        { status: 400 },
      );
    }

    // Insert with encrypted_data (server never sees actual name/balance)
    const { data: account, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        encrypted_data,
        type: type || "other",
        currency,
        exclude_from_free: exclude_from_free || false,
        // name and balance are null - data is in encrypted_data
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
