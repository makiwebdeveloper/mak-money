import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AccountsClient from "./accounts-client";

export default async function AccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Загружаем все счета (активные и архивные) на сервере (SSR)
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return <AccountsClient initialAccounts={accounts || []} />;
}
