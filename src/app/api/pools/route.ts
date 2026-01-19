import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/pools - Get all active pools for current user
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: pools, error } = await supabase
      .from("money_pools")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching pools:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pools });
  } catch (error) {
    console.error("Error in pools GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/pools - Create new pool
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, color, icon } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Pool name is required" },
        { status: 400 },
      );
    }

    // Prevent creating another 'free' pool
    if (type === "free") {
      return NextResponse.json(
        { error: "Cannot create another Free pool" },
        { status: 400 },
      );
    }

    const { data: pool, error } = await supabase
      .from("money_pools")
      .insert({
        user_id: user.id,
        name: name.trim(),
        type: type || "custom",
        color: color || "#6366f1",
        icon: icon || "wallet",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating pool:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pool }, { status: 201 });
  } catch (error) {
    console.error("Error in pools POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
