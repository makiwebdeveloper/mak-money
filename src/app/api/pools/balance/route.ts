import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем пул "Свободные"
    const { data: freePool, error: poolError } = await supabase
      .from("money_pools")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("name", "Свободные")
      .single();

    if (poolError || !freePool) {
      return NextResponse.json(
        { error: "Free pool not found" },
        { status: 404 },
      );
    }

    // Вызываем функцию для расчета баланса пула
    const { data: balanceData, error: balanceError } = await supabase.rpc(
      "get_pool_balance",
      {
        p_pool_id: freePool.id,
      },
    );

    if (balanceError) {
      console.error("Error fetching pool balance:", balanceError);
      return NextResponse.json(
        { error: "Failed to fetch pool balance" },
        { status: 500 },
      );
    }

    console.log("Free pool balance:", {
      poolId: freePool.id,
      balanceData,
      type: typeof balanceData,
    });

    return NextResponse.json({
      freeBalance: Number(balanceData) || 0,
      poolId: freePool.id,
      poolName: freePool.name,
    });
  } catch (error) {
    console.error("Error in pools/balance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
