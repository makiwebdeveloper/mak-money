import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// PATCH /api/pools/[id] - Update pool
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
    const { name, color, icon } = body;

    // Build update object only with provided fields
    const updates: Record<string, string> = {};
    if (name !== undefined && name.trim()) {
      updates.name = name.trim();
    }
    if (color !== undefined) {
      updates.color = color;
    }
    if (icon !== undefined) {
      updates.icon = icon;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data: pool, error } = await supabase
      .from("money_pools")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating pool:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    return NextResponse.json({ pool });
  } catch (error) {
    console.error("Error in pools PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/pools/[id] - Permanently delete pool
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

    // Check if pool is 'free' type before attempting delete
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
        { error: "Cannot delete the Free pool" },
        { status: 400 },
      );
    }

    // First, delete all allocations related to this pool
    const { error: deleteAllocError } = await supabase
      .from("allocations")
      .delete()
      .eq("pool_id", id);

    if (deleteAllocError) {
      console.error("Error deleting allocations:", deleteAllocError);
      return NextResponse.json(
        { error: deleteAllocError.message },
        { status: 500 },
      );
    }

    // Then, permanently delete the pool
    const { error } = await supabase
      .from("money_pools")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error permanently deleting pool:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Pool permanently deleted" });
  } catch (error) {
    console.error("Error in pools DELETE:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
