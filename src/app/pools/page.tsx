import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PoolsClient from "./pools-client";
import { PoolsSkeleton } from "@/components/pools-skeleton";
import { CurrencyCode } from "@/lib/constants/currencies";

async function PoolsContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Fetch user's currency
  const { data: userData } = await supabase
    .from("users")
    .select("default_currency")
    .eq("id", user.id)
    .single();

  if (!userData?.default_currency) {
    redirect("/onboarding");
  }

  const defaultCurrency = userData.default_currency as CurrencyCode;

  // Don't pass initial data - let client fetch and decrypt
  // This avoids hydration mismatch since server can't decrypt the data
  return <PoolsClient currency={defaultCurrency} userId={user.id} />;
}

export default function PoolsPage() {
  return (
    <Suspense fallback={<PoolsSkeleton />}>
      <PoolsContent />
    </Suspense>
  );
}
