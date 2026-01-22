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

  // Load all accounts (active and archived) on server (SSR)
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Add converted balance to each account
  const accountsWithConversion = await Promise.all(
    (accounts || []).map(async (account) => {
      const convertedBalance = await convertCurrency(
        account.balance,
        account.currency as CurrencyCode,
        defaultCurrency,
      );

      return {
        ...account,
        convertedBalance,
        defaultCurrency,
      };
    }),
  );

  return (
    <AccountsClient
      initialAccounts={accountsWithConversion}
      defaultCurrency={defaultCurrency}
    />
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsSkeleton />}>
      <AccountsContent />
    </Suspense>
  );
}
