"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface UnifiedSwipeableViewProps {
  homeContent: React.ReactNode;
  accountsContent: React.ReactNode;
  poolsContent: React.ReactNode;
  transactionsContent: React.ReactNode;
}

const sections = [
  { id: "home", index: 0, path: "/" },
  { id: "accounts", index: 1, path: "/accounts" },
  { id: "pools", index: 2, path: "/pools" },
  { id: "transactions", index: 3, path: "/transactions" },
];

export function UnifiedSwipeableView({
  homeContent,
  accountsContent,
  poolsContent,
  transactionsContent,
}: UnifiedSwipeableViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Determine current index based on pathname
  const section = sections.find((s) => s.path === pathname);
  const currentIndex = section?.index ?? 0;

  const [localIndex, setLocalIndex] = useState(currentIndex);

  // Scroll to current section when pathname changes
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const viewportWidth = window.innerWidth;
      container.scrollLeft = currentIndex * viewportWidth;
    }
  }, [currentIndex]);

  // Handle scroll-based navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const scrollLeft = container.scrollLeft;
        const viewportWidth = window.innerWidth;
        const newIndex = Math.round(scrollLeft / viewportWidth);

        if (
          newIndex !== localIndex &&
          newIndex >= 0 &&
          newIndex < sections.length
        ) {
          setLocalIndex(newIndex);
        }
        rafId = null;
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [localIndex]);

  // Export current index for navigation
  useEffect(() => {
    // Dispatch custom event for navigation to listen
    window.dispatchEvent(
      new CustomEvent("swipeIndexChange", { detail: { index: localIndex } }),
    );
  }, [localIndex]);

  // Listen for navigation clicks
  useEffect(() => {
    const handleNavigationClick = (e: CustomEvent) => {
      const targetIndex = e.detail.index;
      const container = containerRef.current;
      if (container && targetIndex !== undefined) {
        const viewportWidth = window.innerWidth;
        container.scrollTo({
          left: targetIndex * viewportWidth,
          behavior: "smooth",
        });
      }
    };

    window.addEventListener("navigateToSection" as any, handleNavigationClick);
    return () => {
      window.removeEventListener(
        "navigateToSection" as any,
        handleNavigationClick,
      );
    };
  }, []);

  const contents = [
    homeContent,
    accountsContent,
    poolsContent,
    transactionsContent,
  ];

  return (
    <>
      {/* Desktop version - show only current content based on route */}
      <div className="hidden md:block">
        {pathname === "/" && homeContent}
        {pathname === "/accounts" && accountsContent}
        {pathname === "/pools" && poolsContent}
        {pathname === "/transactions" && transactionsContent}
      </div>

      {/* Mobile version - swipeable */}
      <div
        ref={containerRef}
        className="md:hidden fixed inset-0 top-16 bottom-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          className="flex h-full"
          style={{ width: `${sections.length * 100}vw` }}
        >
          {contents.map((content, index) => (
            <div
              key={sections[index].id}
              className="w-screen h-full snap-center overflow-y-auto pb-24"
              style={{ scrollSnapAlign: "center" }}
            >
              {content}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
