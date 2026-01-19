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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Welcome, {profile?.name || user.email}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Your main currency: {profile?.default_currency || "Not set"}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your finance tracker is ready. Next steps coming soon...
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/pools"
              className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">💰 Пулы денег</h3>
              <p className="mt-1 text-sm text-gray-600">
                Управление денежными пулами
              </p>
            </Link>

            <Link
              href="/accounts"
              className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">🏦 Счета</h3>
              <p className="mt-1 text-sm text-gray-600">
                Управление банковскими счетами
              </p>
            </Link>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-50">
              <h3 className="font-semibold text-gray-500">📊 Транзакции</h3>
              <p className="mt-1 text-sm text-gray-500">Скоро...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
