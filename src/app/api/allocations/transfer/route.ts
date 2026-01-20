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
    const { account_id, pool_id, new_amount } = body;

    // Validate required fields
    if (!account_id || !pool_id || new_amount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: account_id, pool_id, new_amount" },
        { status: 400 },
      );
    }

    if (new_amount < 0) {
      return NextResponse.json(
        { error: "Amount cannot be negative" },
        { status: 400 },
      );
    }

    // Get account balance
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

    // Get total allocated for this account (excluding the pool we're updating)
    const { data: allocations } = await supabase
      .from("allocations")
      .select("amount")
      .eq("user_id", user.id)
      .eq("account_id", account_id)
      .neq("pool_id", pool_id);

    const totalOtherAllocations =
      allocations?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    // Check if total allocations would exceed account balance
    if (totalOtherAllocations + new_amount > Number(account.balance)) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Account balance: ${account.balance}, Already allocated: ${totalOtherAllocations}, Requested: ${new_amount}`,
        },
        { status: 400 },
      );
    }

    // Update or create allocation
    if (new_amount > 0) {
      const { error: upsertError } = await supabase.from("allocations").upsert(
        {
          user_id: user.id,
          account_id,
          pool_id,
          amount: new_amount,
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
    } else {
      // If new amount is 0, delete the allocation
      await supabase
        .from("allocations")
        .delete()
        .eq("user_id", user.id)
        .eq("account_id", account_id)
        .eq("pool_id", pool_id);
    }

    return NextResponse.json({
      success: true,
      pool_amount: new_amount,
    });
  } catch (error) {
    console.error("Error transferring allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
