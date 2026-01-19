import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// DELETE /api/pools/[id]/permanent - Permanently delete pool
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

    // Check if pool exists and is not 'free' type
    const { data: pool } = await supabase
      .from("money_pools")
      .select("type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    if (pool.type === "free") {
      return NextResponse.json(
        { error: "Cannot permanently delete the Free pool" },
        { status: 400 },
      );
    }

    // Permanently delete pool
    const { error } = await supabase
      .from("money_pools")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error permanently deleting pool:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in pools permanent delete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
