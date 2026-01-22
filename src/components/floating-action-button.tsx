"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import QuickTransactionModal from "./quick-transaction-modal";

export default function FloatingActionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pathname = usePathname();

  // Don't show FAB on auth pages
  if (pathname.startsWith("/auth") || pathname === "/onboarding") {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-6 right-3 sm:bottom-8 sm:right-8 z-40 flex h-12 sm:h-16 w-12 sm:w-16 items-center justify-center rounded-full bg-linear-to-br from-accent to-accent/80 text-white shadow-lg sm:shadow-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 dark:focus:ring-offset-primary hover:scale-110 backdrop-blur-md ${isModalOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-label="Add transaction"
      >
        <svg
          className="h-5 sm:h-8 w-5 sm:w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
