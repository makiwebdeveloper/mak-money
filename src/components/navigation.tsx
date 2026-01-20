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
    <nav className="glass-lg fixed top-0 left-0 right-0 z-50 border-b border-white/20 dark:border-white/10 backdrop-blur-xl md:relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-accent to-gray-900 dark:from-white dark:via-accent dark:to-white bg-clip-text text-transparent transition-all hover:scale-105"
            >
              Mak Money
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`smooth-transition rounded-lg px-4 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md"
                      : "text-foreground hover:bg-white/30 dark:hover:bg-white/10 hover:shadow-md"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="smooth-transition rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-white/30 dark:hover:bg-white/10 hover:shadow-md ml-2"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden grid grid-cols-4 gap-1 pb-2 pt-2 border-t border-white/10">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`smooth-transition rounded-lg px-2 py-2 text-xs font-semibold text-center ${
                  isActive
                    ? "bg-gradient-to-r from-accent to-accent/80 text-white shadow-md"
                    : "text-foreground hover:bg-white/20 dark:hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
