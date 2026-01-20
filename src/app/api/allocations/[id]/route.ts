import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/allocations/[id] - Get single allocation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: allocation, error } = await supabase
      .from("allocations")
      .select("*, accounts(name, currency), money_pools(name, color, icon)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !allocation) {
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ allocation });
  } catch (error) {
    console.error("Error fetching allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/allocations/[id] - Update allocation amount
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    if (amount === undefined || amount < 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const { data: allocation, error } = await supabase
      .from("allocations")
      .update({ amount })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.message.includes("exceed account balance")) {
        return NextResponse.json(
          { error: "Total allocations cannot exceed account balance" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!allocation) {
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ allocation });
  } catch (error) {
    console.error("Error updating allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/allocations/[id] - Delete allocation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("allocations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
