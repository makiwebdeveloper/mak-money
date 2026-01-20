import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
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

  // Получаем все счета
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Вычисляем общий баланс
  const totalBalance =
    accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
  const currency = profile?.default_currency || "USD";

  // Получаем баланс свободных средств
  const { data: freePool } = await supabase
    .from("money_pools")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Свободные")
    .single();

  let freeBalance = 0;
  if (freePool) {
    const { data: balanceData } = await supabase.rpc("get_pool_balance", {
      p_pool_id: freePool.id,
    });

    freeBalance = Number(balanceData) || 0;
  }

  // Получаем последние 5 транзакций
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("*, accounts!transactions_account_id_fkey(name)")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Добро пожаловать, {profile?.name || user.email}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Основная валюта: {currency}
          </p>
        </div>

        {/* Балансы */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
            <div className="mb-2 text-sm font-medium opacity-90">
              Общий баланс
            </div>
            <div className="text-3xl font-bold">
              {totalBalance.toFixed(2)} {currency}
            </div>
            <div className="mt-2 text-sm opacity-75">
              {accounts?.length || 0} счетов
            </div>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
            <div className="mb-2 text-sm font-medium opacity-90">
              Свободные средства
            </div>
            <div className="text-3xl font-bold">
              {freeBalance.toFixed(2)} {currency}
            </div>
            <div className="mt-2 text-sm opacity-75">Доступно для расходов</div>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg">
            <div className="mb-2 text-sm font-medium opacity-90">
              Распределено
            </div>
            <div className="text-3xl font-bold">
              {(totalBalance - freeBalance).toFixed(2)} {currency}
            </div>
            <div className="mt-2 text-sm opacity-75">В пулах</div>
          </div>
        </div>

        {/* Последние транзакции */}
        {recentTransactions && recentTransactions.length > 0 && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Последние транзакции
              </h2>
              <Link
                href="/transactions"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Смотреть все →
              </Link>
            </div>
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        tx.type === "income"
                          ? "bg-green-100 text-green-600"
                          : tx.type === "expense"
                            ? "bg-red-100 text-red-600"
                            : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {tx.type === "income"
                        ? "↓"
                        : tx.type === "expense"
                          ? "↑"
                          : "↔"}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {tx.category || "Без категории"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {tx.accounts?.name} •{" "}
                        {new Date(tx.transaction_date).toLocaleDateString(
                          "ru-RU",
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      tx.type === "income"
                        ? "text-green-600"
                        : tx.type === "expense"
                          ? "text-red-600"
                          : "text-blue-600"
                    }`}
                  >
                    {tx.type === "income"
                      ? "+"
                      : tx.type === "expense"
                        ? "-"
                        : ""}
                    {tx.amount.toFixed(2)} {tx.currency}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Быстрые действия */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Быстрые действия
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/pools"
              className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">💰 Пулы денег</h3>
              <p className="mt-1 text-sm text-gray-600">
                Распределение средств по целям
              </p>
            </Link>

            <Link
              href="/accounts"
              className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">🏦 Счета</h3>
              <p className="mt-1 text-sm text-gray-600">Управление счетами</p>
            </Link>

            <Link
              href="/transactions"
              className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">📊 Транзакции</h3>
              <p className="mt-1 text-sm text-gray-600">История операций</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
