"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/accounts", label: "Accounts" },
  { href: "/pools", label: "Pools" },
  { href: "/transactions", label: "Transactions" },
];

export function Navigation() {
  const pathname = usePathname();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Don't show navigation on auth pages
  if (pathname.startsWith("/auth") || pathname === "/onboarding") {
    return null;
  }

  return (
    <nav className="glass-lg fixed top-0 left-0 right-0 z-50 border-b border-white/20 dark:border-white/10 backdrop-blur-xl md:relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-accent to-gray-900 dark:from-white dark:via-accent dark:to-white bg-clip-text text-transparent transition-all hover:scale-105"
            >
              Mak Money
            </Link>
          </div>
          <div className="flex items-center gap-2">
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
            </div>
            {/* Profile Button */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="smooth-transition rounded-full w-10 h-10 flex items-center justify-center bg-gradient-to-r from-accent to-accent/80 text-white shadow-md hover:shadow-lg"
                title="Profile"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-xl border border-white/20 dark:border-white/10 z-50">
                  <form action="/auth/signout" method="post" className="w-full">
                    <button
                      type="submit"
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-white/30 dark:hover:bg-white/10 smooth-transition rounded-lg m-1"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              )}
            </div>
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
