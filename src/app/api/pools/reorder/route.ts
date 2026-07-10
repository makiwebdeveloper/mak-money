import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isMissingSortOrderColumn(error: { message?: string } | null): boolean {
  const message = error?.message ?? "";

  return (
    message.includes("money_pools.sort_order") ||
    (message.includes("sort_order") && message.includes("money_pools"))
  );
}

// PATCH /api/pools/reorder - Persist custom pool order
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { poolIds } = await request.json();

    if (
      !Array.isArray(poolIds) ||
      poolIds.some((poolId) => typeof poolId !== "string")
    ) {
      return NextResponse.json(
        { error: "poolIds must be an array of pool ids" },
        { status: 400 },
      );
    }

    const updates = poolIds.map((poolId, index) =>
      supabase
        .from("money_pools")
        .update({ sort_order: index })
        .eq("id", poolId)
        .eq("user_id", user.id)
        .neq("type", "free"),
    );

    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;

    if (error) {
      if (isMissingSortOrderColumn(error)) {
        return NextResponse.json(
          {
            error:
              "Pool ordering requires database migration 016_add_pool_sort_order.sql",
          },
          { status: 409 },
        );
      }

      console.error("Error reordering pools:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in pools reorder PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
