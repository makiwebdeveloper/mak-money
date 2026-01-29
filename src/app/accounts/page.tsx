import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AccountsClient from "./accounts-client";
import { AccountsSkeleton } from "@/components/accounts-skeleton";
import { convertCurrency } from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";

async function AccountsContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Get user's default currency
  const { data: profile } = await supabase
    .from("users")
    .select("default_currency")
    .eq("id", user.id)
    .single();

  const defaultCurrency = (profile?.default_currency || "USD") as CurrencyCode;

  // Don't pass initialAccounts - let client fetch and decrypt data
  // This avoids hydration mismatch since server can't decrypt the data
  return <AccountsClient defaultCurrency={defaultCurrency} />;
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsSkeleton />}>
      <AccountsContent />
    </Suspense>
  );
}
