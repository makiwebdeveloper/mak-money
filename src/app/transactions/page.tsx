import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TransactionsClient from "./transactions-client";
import { TransactionsSkeleton } from "@/components/transactions-skeleton";

async function TransactionsContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Don't pass initial data - let client fetch and decrypt
  // This avoids hydration mismatch since server can't decrypt the data
  return <TransactionsClient />;
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsSkeleton />}>
      <TransactionsContent />
    </Suspense>
  );
}
