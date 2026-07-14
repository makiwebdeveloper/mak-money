import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("users")
      .select("active_pool_id")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching active pool:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.active_pool_id) {
      return NextResponse.json({ active_pool_id: null });
    }

    const { data: pool, error: poolError } = await supabase
      .from("money_pools")
      .select("id")
      .eq("id", data.active_pool_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (poolError) {
      console.error("Error validating active pool:", poolError);
      return NextResponse.json({ error: poolError.message }, { status: 500 });
    }

    return NextResponse.json({ active_pool_id: pool?.id || null });
  } catch (error) {
    console.error("Error in active pool fetch:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { active_pool_id } = await request.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (active_pool_id) {
      const { data: pool, error: poolError } = await supabase
        .from("money_pools")
        .select("id")
        .eq("id", active_pool_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (poolError || !pool) {
        return NextResponse.json({ error: "Pool not found" }, { status: 404 });
      }
    }

    const { error } = await supabase
      .from("users")
      .update({ active_pool_id: active_pool_id || null })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating active pool:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in active pool update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
