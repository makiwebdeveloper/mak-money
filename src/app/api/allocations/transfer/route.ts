import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/allocations/transfer - Update allocation for a pool
// Free pool balance is calculated automatically as: Total Balance - Sum of Allocations
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
    const { account_id, pool_id, encrypted_data } = body;

    // Validate required fields
    if (!account_id || !pool_id || !encrypted_data) {
      return NextResponse.json(
        { error: "Missing required fields: account_id, pool_id, encrypted_data" },
        { status: 400 },
      );
    }

    // Get account (no balance check - data is encrypted on client)
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if pool belongs to user
    const { data: pool, error: poolError } = await supabase
      .from("money_pools")
      .select("id, type")
      .eq("id", pool_id)
      .eq("user_id", user.id)
      .single();

    if (poolError || !pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    // Cannot allocate to free pool directly
    if (pool.type === "free") {
      return NextResponse.json(
        { error: "Cannot allocate to free pool directly" },
        { status: 400 },
      );
    }

    // Note: Amount validation must be done on client-side since data is encrypted
    // Server cannot validate amounts or balances

    // Update or create allocation with encrypted data
    const { error: upsertError } = await supabase.from("allocations").upsert(
      {
        user_id: user.id,
        account_id,
        pool_id,
        encrypted_data,
      },
      {
        onConflict: "user_id,account_id,pool_id",
      },
    );

    if (upsertError) {
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error transferring allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
