import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/pools/[id]/restore - Restore archived pool
export async function POST(
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

    // Check if pool exists and is archived
    const { data: pool } = await supabase
      .from("money_pools")
      .select("is_active, type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    if (pool.is_active) {
      return NextResponse.json(
        { error: "Pool is already active" },
        { status: 400 },
      );
    }

    // Restore pool
    const { data: restoredPool, error } = await supabase
      .from("money_pools")
      .update({ is_active: true })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error restoring pool:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pool: restoredPool });
  } catch (error) {
    console.error("Error in pools restore:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
