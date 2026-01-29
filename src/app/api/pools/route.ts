import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Generate a random pleasant color for pools
function generateRandomColor(): string {
  const colors = [
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#6366f1", // Indigo
    "#a855f7", // Purple
    "#14b8a6", // Teal
    "#f97316", // Orange
    "#84cc16", // Lime
    "#22c55e", // Green
    "#0ea5e9", // Sky
    "#d946ef", // Fuchsia
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// GET /api/pools - Get all pools (encrypted data only, no balance calculation)
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
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching pools:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pools: pools || [] });
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
    const { encrypted_data, type, color, icon } = body;

    if (!encrypted_data) {
      return NextResponse.json(
        { error: "Encrypted data is required" },
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
        encrypted_data,
        type: type || "custom",
        color: color || generateRandomColor(),
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
