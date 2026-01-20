"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/accounts", label: "Счета" },
  { href: "/pools", label: "Пулы" },
  { href: "/transactions", label: "Транзакции" },
];

export function Navigation() {
  const pathname = usePathname();

  // Don't show navigation on auth pages
  if (pathname.startsWith("/auth") || pathname === "/onboarding") {
    return null;
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Mak Money
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
