import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/transactions - Get all transactions for current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params for filtering
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type"); // income, expense, transfer
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq("type", type);
    }
    if (startDate) {
      query = query.gte("transaction_date", startDate);
    }
    if (endDate) {
      query = query.lte("transaction_date", endDate);
    }

    const { data: transactions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/transactions - Create new transaction
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      type,
      amount,
      currency,
      account_id,
      from_account_id,
      to_account_id,
      category,
      description,
      transaction_date,
    } = body;

    // Validate required fields
    if (!type || !amount || !currency) {
      return NextResponse.json(
        { error: "Missing required fields: type, amount, currency" },
        { status: 400 },
      );
    }

    // Validate based on transaction type
    if ((type === "income" || type === "expense") && !account_id) {
      return NextResponse.json(
        { error: "account_id is required for income/expense transactions" },
        { status: 400 },
      );
    }

    if (type === "transfer" && (!from_account_id || !to_account_id)) {
      return NextResponse.json(
        {
          error:
            "from_account_id and to_account_id are required for transfer transactions",
        },
        { status: 400 },
      );
    }

    if (type === "transfer" && from_account_id === to_account_id) {
      return NextResponse.json(
        { error: "Cannot transfer to the same account" },
        { status: 400 },
      );
    }

    // Create transaction
    const { data: transaction, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type,
        amount,
        currency,
        account_id: type === "transfer" ? null : account_id,
        from_account_id: type === "transfer" ? from_account_id : null,
        to_account_id: type === "transfer" ? to_account_id : null,
        category,
        description,
        transaction_date: transaction_date || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating transaction:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
