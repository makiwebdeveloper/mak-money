import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getTotalBalanceInCurrency,
  convertCurrency,
} from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";
import { UnifiedSwipeableView } from "@/components/unified-swipeable-view";
import { HomeView } from "@/components/home-view";
import AccountsClient from "./accounts/accounts-client";
import PoolsClient from "./pools/pools-client";
import TransactionsClient from "./transactions/transactions-client";
import { AccountsSkeleton } from "@/components/accounts-skeleton";
import { PoolsSkeleton } from "@/components/pools-skeleton";
import { TransactionsSkeleton } from "@/components/transactions-skeleton";

async function AllContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const currency = (profile?.default_currency || "USD") as CurrencyCode;

  // Get all active accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  // For HomeView, we'll use encrypted data
  // Calculate total balance and free balance on client only
  // For now, pass placeholder values - HomeView should use hooks to get real data
  const totalBalance = 0; // Will be calculated on client
  const freeBalance = 0; // Will be calculated on client

  // Get last 5 transactions (still encrypted, will be decrypted on client)
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <UnifiedSwipeableView
      homeContent={
        <HomeView
          currency={currency}
          totalBalance={totalBalance}
          freeBalance={freeBalance}
          accountsCount={accounts?.length || 0}
          recentTransactions={recentTransactions || []}
        />
      }
      accountsContent={<AccountsClient defaultCurrency={currency} />}
      poolsContent={<PoolsClient currency={currency} userId={user.id} />}
      transactionsContent={<TransactionsClient />}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-32 md:pt-0 pb-24 md:pb-0">
          <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6">
            <AccountsSkeleton />
          </div>
        </div>
      }
    >
      <AllContent />
    </Suspense>
  );
}
