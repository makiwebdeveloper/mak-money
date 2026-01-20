import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/allocations - Get all allocations for current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params for filtering
    const searchParams = req.nextUrl.searchParams;
    const account_id = searchParams.get("account_id");
    const pool_id = searchParams.get("pool_id");

    let query = supabase
      .from("allocations")
      .select("*, accounts(name, currency), money_pools(name, color, icon)")
      .eq("user_id", user.id);

    if (account_id) {
      query = query.eq("account_id", account_id);
    }
    if (pool_id) {
      query = query.eq("pool_id", pool_id);
    }

    const { data: allocations, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ allocations });
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/allocations - Create or update allocation
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { account_id, pool_id, amount } = body;

    // Validate required fields
    if (!account_id || !pool_id || amount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: account_id, pool_id, amount" },
        { status: 400 },
      );
    }

    if (amount < 0) {
      return NextResponse.json(
        { error: "Amount cannot be negative" },
        { status: 400 },
      );
    }

    // Check if account belongs to user
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, balance")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if pool belongs to user
    const { data: pool, error: poolError } = await supabase
      .from("money_pools")
      .select("id")
      .eq("id", pool_id)
      .eq("user_id", user.id)
      .single();

    if (poolError || !pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    // Use upsert to create or update allocation
    const { data: allocation, error } = await supabase
      .from("allocations")
      .upsert(
        {
          user_id: user.id,
          account_id,
          pool_id,
          amount,
        },
        {
          onConflict: "user_id,account_id,pool_id",
        },
      )
      .select()
      .single();

    if (error) {
      // Check if it's a validation error from trigger
      if (error.message.includes("exceed account balance")) {
        return NextResponse.json(
          { error: "Total allocations cannot exceed account balance" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ allocation }, { status: 201 });
  } catch (error) {
    console.error("Error creating allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
