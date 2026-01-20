import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/accounts/[id] - Get specific account
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: account, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching account:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Error in account GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/accounts/[id] - Update account
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, type, currency, balance } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: "Account name cannot be empty" },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }

    if (type !== undefined) updateData.type = type;
    if (currency !== undefined) updateData.currency = currency;
    if (balance !== undefined) updateData.balance = balance;

    const { data: account, error } = await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating account:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Error in account PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/accounts/[id] - Archive or permanently delete account
// Query param: ?permanent=true for permanent deletion
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    // First, verify account exists and belongs to user
    const { data: existingAccount, error: fetchError } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      console.error("Error checking account:", fetchError);
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (permanent) {
      // First, delete all transactions related to this account
      const { error: deleteTransError } = await supabase
        .from("transactions")
        .delete()
        .or(`account_id.eq.${id},from_account_id.eq.${id},to_account_id.eq.${id}`)
        .eq("user_id", user.id);

      if (deleteTransError) {
        console.error("Error deleting transactions:", deleteTransError);
        return NextResponse.json({ error: deleteTransError.message }, { status: 500 });
      }

      // Then delete allocations related to this account's pools
      const { data: pools } = await supabase
        .from("money_pools")
        .select("id")
        .eq("user_id", user.id);

      if (pools && pools.length > 0) {
        const poolIds = pools.map((p) => p.id);
        const { error: deleteAllocError } = await supabase
          .from("allocations")
          .delete()
          .in("pool_id", poolIds);

        if (deleteAllocError) {
          console.error("Error deleting allocations:", deleteAllocError);
          return NextResponse.json({ error: deleteAllocError.message }, { status: 500 });
        }
      }

      // Finally, delete the account
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error permanently deleting account:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: "Account permanently deleted" });
    } else {
      // Soft delete (archive)
      const { data: account, error } = await supabase
        .from("accounts")
        .update({ is_active: false })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error archiving account:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!account) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ message: "Account archived successfully" });
    }
  } catch (error) {
    console.error("Error in account DELETE:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
