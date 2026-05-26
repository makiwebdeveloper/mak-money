"use client";

import Link from "next/link";
import { CURRENCIES, CurrencyCode } from "@/lib/constants/currencies";
import { formatNumber } from "@/lib/utils";
import { useFreeBalance } from "@/lib/hooks/usePools";
import { useTotalBalance, useAccounts } from "@/lib/hooks/useAccounts";
import { useTransactions } from "@/lib/hooks/useTransactions";
import { DecryptedTransaction } from "@/lib/types/database";
import { EncryptionKeyRequired } from "@/components/encryption-key-required";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";

type SpendingPeriod = "day" | "week" | "month";
type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  key: string;
};
type ChartItem = {
  label: string;
  amount: number;
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const spendingPeriodLabels: Record<SpendingPeriod, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getWeekStart(date: Date) {
  const start = startOfLocalDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function getSpendingRange(date: Date, period: SpendingPeriod) {
  if (period === "day") {
    const start = startOfLocalDay(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (period === "week") {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function shiftSpendingDate(date: Date, period: SpendingPeriod, amount: number) {
  const { start } = getSpendingRange(date, period);
  const next = new Date(start);

  if (period === "month") {
    next.setMonth(next.getMonth() + amount);
  } else {
    next.setDate(next.getDate() + (period === "week" ? 7 : 1) * amount);
  }

  return next;
}

function getFirstFullWeekDateInMonth(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysUntilMonday = (8 - firstDay.getDay()) % 7;
  firstDay.setDate(firstDay.getDate() + daysUntilMonday);
  return firstDay;
}

function getDateForPeriodChange(
  date: Date,
  currentPeriod: SpendingPeriod,
  nextPeriod: SpendingPeriod,
) {
  if (currentPeriod === "month" && nextPeriod === "week") {
    return getFirstFullWeekDateInMonth(date);
  }

  return getSpendingRange(date, nextPeriod).start;
}

function formatInputDate(date: Date, period: SpendingPeriod) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  if (period === "month") {
    return `${year}-${month}`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateKey(date: Date) {
  return formatInputDate(date, "day");
}

function parseInputDate(value: string, period: SpendingPeriod) {
  const parts = value.split("-").map(Number);
  const [year, month, day = 1] = parts;

  if (!year || !month) {
    return new Date();
  }

  return new Date(year, month - 1, period === "month" ? 1 : day);
}

function formatPeriodRange(start: Date, end: Date, period: SpendingPeriod) {
  if (period === "month") {
    return start.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
  }

  if (period === "day") {
    return start.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const lastDay = new Date(end.getTime() - 1);
  return `${start.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  })} - ${lastDay.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function getCurrencySymbol(code: string) {
  return CURRENCIES.find((currency) => currency.code === code)?.symbol || code;
}

function formatCompactAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function getCalendar(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = getWeekStart(monthStart);
  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    days.push({
      date: day,
      isCurrentMonth: day.getMonth() === monthStart.getMonth(),
      key: getDateKey(day),
    });
  }

  const gridEnd = new Date(days[days.length - 1].date);
  gridEnd.setDate(gridEnd.getDate() + 1);

  return {
    days,
    end: gridEnd,
    start: gridStart,
    title: monthStart.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    }),
  };
}

function getDailyCurrencyTotals(
  transactions: DecryptedTransaction[],
  start: Date,
  end: Date,
  fallbackCurrency: CurrencyCode,
) {
  const totals = new Map<string, Map<string, number>>();

  transactions.forEach((transaction) => {
    if (transaction.type !== "expense") return;

    const transactionDate = new Date(transaction.transaction_date);
    if (transactionDate < start || transactionDate >= end) return;

    const dayKey = getDateKey(transactionDate);
    const currency = transaction.currency || fallbackCurrency;
    const dayTotals = totals.get(dayKey) ?? new Map<string, number>();

    dayTotals.set(currency, (dayTotals.get(currency) ?? 0) + (transaction.amount ?? 0));
    totals.set(dayKey, dayTotals);
  });

  return totals;
}

function getCurrencyAmount(
  totals: Map<string, Map<string, number>>,
  dayKey: string,
  currency: string,
) {
  return totals.get(dayKey)?.get(currency) ?? 0;
}

function getChartItems(
  transactions: DecryptedTransaction[],
  start: Date,
  end: Date,
  period: SpendingPeriod,
  currency: string,
  fallbackCurrency: CurrencyCode,
): ChartItem[] {
  if (period === "day") {
    const categories = new Map<string, number>();

    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") return;

      const transactionDate = new Date(transaction.transaction_date);
      const transactionCurrency = transaction.currency || fallbackCurrency;
      if (
        transactionDate < start ||
        transactionDate >= end ||
        transactionCurrency !== currency
      ) {
        return;
      }

      const category = transaction.category || "No category";
      categories.set(category, (categories.get(category) ?? 0) + (transaction.amount ?? 0));
    });

    return Array.from(categories.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  const dailyTotals = getDailyCurrencyTotals(
    transactions,
    start,
    end,
    fallbackCurrency,
  );
  const items: ChartItem[] = [];

  for (let day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
    items.push({
      amount: getCurrencyAmount(dailyTotals, getDateKey(day), currency),
      label:
        period === "week"
          ? day.toLocaleDateString("en-US", { weekday: "short" })
          : String(day.getDate()),
    });
  }

  return items;
}

function getSpendingStats(
  transactions: DecryptedTransaction[],
  start: Date,
  end: Date,
  fallbackCurrency: CurrencyCode,
) {
  const totalsByCurrency = new Map<string, number>();
  const categories = new Map<string, number>();
  let count = 0;

  transactions.forEach((transaction) => {
    if (transaction.type !== "expense") return;

    const transactionDate = new Date(transaction.transaction_date);
    if (transactionDate < start || transactionDate >= end) return;

    const amount = transaction.amount ?? 0;
    const currency = transaction.currency || fallbackCurrency;
    const category = transaction.category || "No category";

    count += 1;
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + amount);
    categories.set(category, (categories.get(category) ?? 0) + amount);
  });

  const totals = Array.from(totalsByCurrency.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => {
      if (a.currency === fallbackCurrency) return -1;
      if (b.currency === fallbackCurrency) return 1;
      return b.amount - a.amount;
    });

  const [topCategory] = Array.from(categories.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  return {
    count,
    totals:
      totals.length > 0 ? totals : [{ currency: fallbackCurrency, amount: 0 }],
    topCategory: topCategory?.[0] ?? null,
  };
}

interface HomeViewProps {
  currency: CurrencyCode;
  totalBalance: number;
  freeBalance: number;
  accountsCount: number;
  recentTransactions: any[];
}

export function HomeView({
  currency: initialCurrency,
  totalBalance: initialTotalBalance,
  freeBalance: initialFreeBalance,
  accountsCount: initialAccountsCount,
  recentTransactions,
}: HomeViewProps) {
  // Use react-query hooks for live updates with encrypted data
  const { data: freeBalanceData, isLoading: freeLoading } = useFreeBalance();
  const { data: balanceData, isLoading: balanceLoading } = useTotalBalance();
  const { data: transactionsData } = useTransactions();
  const { data: accountsData, isKeyAvailable } = useAccounts();

  // State for balance visibility
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [spendingPeriod, setSpendingPeriod] =
    useState<SpendingPeriod>("day");
  const [spendingDate, setSpendingDate] = useState(() =>
    startOfLocalDay(new Date()),
  );

  // Use data from hooks or fallback to initial values
  const totalBalance = balanceData?.totalBalance ?? initialTotalBalance;
  const freeBalance = freeBalanceData ?? initialFreeBalance;
  const accountsCount = balanceData?.accountsCount ?? initialAccountsCount;
  const currency = (balanceData?.currency as CurrencyCode) ?? initialCurrency;

  const isDecrypting = balanceLoading || freeLoading;

  // Use decrypted transactions or fallback to empty array
  const transactions = useMemo(() => transactionsData ?? [], [transactionsData]);
  const displayTransactions = transactions.slice(0, 5);

  const spendingRange = useMemo(
    () => getSpendingRange(spendingDate, spendingPeriod),
    [spendingDate, spendingPeriod],
  );

  const spendingStats = useMemo(
    () =>
      getSpendingStats(
        transactions,
        spendingRange.start,
        spendingRange.end,
        currency,
      ),
    [transactions, spendingRange.start, spendingRange.end, currency],
  );

  const spendingDays = Math.max(
    1,
    Math.round(
      (spendingRange.end.getTime() - spendingRange.start.getTime()) /
        MS_IN_DAY,
    ),
  );

  const primarySpendingTotal = spendingStats.totals[0]?.amount ?? 0;
  const primarySpendingCurrency = spendingStats.totals[0]?.currency ?? currency;
  const spendingPeriodInputType = spendingPeriod === "month" ? "month" : "date";
  const resetPeriodLabel =
    spendingPeriod === "day"
      ? "Today"
      : spendingPeriod === "week"
        ? "This week"
        : "This month";
  const calendar = useMemo(() => getCalendar(spendingDate), [spendingDate]);
  const calendarTotals = useMemo(
    () =>
      getDailyCurrencyTotals(
        transactions,
        calendar.start,
        calendar.end,
        currency,
      ),
    [transactions, calendar.start, calendar.end, currency],
  );
  const maxCalendarAmount = Math.max(
    1,
    ...calendar.days.map((day) =>
      getCurrencyAmount(calendarTotals, day.key, primarySpendingCurrency),
    ),
  );
  const chartItems = useMemo(
    () =>
      getChartItems(
        transactions,
        spendingRange.start,
        spendingRange.end,
        spendingPeriod,
        primarySpendingCurrency,
        currency,
      ),
    [
      transactions,
      spendingRange.start,
      spendingRange.end,
      spendingPeriod,
      primarySpendingCurrency,
      currency,
    ],
  );
  const chartMaxAmount = Math.max(1, ...chartItems.map((item) => item.amount));
  const hasChartData = chartItems.some((item) => item.amount > 0);

  const isLoading = balanceLoading || freeLoading || isDecrypting;

  if (isKeyAvailable === false) {
    return <EncryptionKeyRequired />;
  }

  // Helper function to get account name
  const getAccountName = (accountId: string | null) => {
    if (!accountId || !accountsData) return "Unknown";
    const account = accountsData.find((acc) => acc.id === accountId);
    return account?.name || "Unknown";
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-background to-background/95 px-3 sm:px-4 py-6">
      {/* Currency indicator */}
      <div className="mb-4 sm:mb-6 flex items-center justify-end">
        <div className="glass-sm px-3 py-1.5 rounded-full">
          <span className="text-xs font-semibold text-muted-foreground">
            Currency:{" "}
          </span>
          <span className="text-xs font-bold text-accent">{currency}</span>
        </div>
      </div>

      {/* Main Balance Cards */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Total Balance */}
        <div className="card-glass group relative overflow-hidden p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-transparent opacity-50 group-hover:opacity-75 smooth-transition"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Total Balance
              </div>
              {isLoading && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <div className="h-1 w-1 rounded-full bg-blue-600 animate-pulse"></div>
                  <span>Decrypting...</span>
                </div>
              )}
              <div className="flex-1 h-px bg-gradient-to-r from-muted-foreground/30 to-transparent"></div>
              <button
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="p-2.5 rounded-full hover:bg-white/10 smooth-transition active:scale-95"
                aria-label={isBalanceVisible ? "Hide balance" : "Show balance"}
              >
                {!isBalanceVisible ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
            <div className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
              {isLoading
                ? "••••••"
                : isBalanceVisible
                  ? formatNumber(totalBalance)
                  : "••••••"}
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-accent mb-4">
              {currency}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>
                {accountsCount} {accountsCount === 1 ? "account" : "accounts"}
              </span>
            </div>
          </div>
        </div>

        {/* Free Funds */}
        <div className="card-glass group relative overflow-hidden p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-400/10 to-transparent opacity-50 group-hover:opacity-75 smooth-transition"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Free Funds
              </div>
              {isLoading && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <div className="h-1 w-1 rounded-full bg-green-600 animate-pulse"></div>
                  <span>Decrypting...</span>
                </div>
              )}
              <div className="flex-1 h-px bg-gradient-to-r from-muted-foreground/30 to-transparent"></div>
            </div>
            <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300 bg-clip-text text-transparent mb-2">
              {isLoading ? "••••••" : formatNumber(freeBalance)}
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-accent mb-4">
              {currency}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Available for expenses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-3">
        <div className="card-glass group relative overflow-hidden p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
          <div className="relative">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
              Allocated
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-accent mb-2">
              {formatNumber(totalBalance - freeBalance)}
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(
                ((totalBalance - freeBalance) / (totalBalance || 1)) * 100,
              )}
              % in pools
            </div>
          </div>
        </div>

        <div className="card-glass group relative overflow-hidden p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
          <div className="relative">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
              Free %
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {Math.round((freeBalance / (totalBalance || 1)) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Unallocated funds
            </div>
          </div>
        </div>

        <div className="card-glass group relative overflow-hidden p-4 col-span-2 lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
          <div className="relative">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
              Active Accounts
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {accountsCount}
            </div>
            <div className="text-xs text-muted-foreground">
              Managing your money
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {displayTransactions && displayTransactions.length > 0 && (
        <div className="card-glass mb-6 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Recent Transactions
            </h2>
          </div>
          <div className="space-y-2">
            {displayTransactions.map((tx) => (
              <div
                key={tx.id}
                className="glass-sm flex items-center justify-between rounded-xl p-2.5 transition-all hover:bg-white/50 dark:hover:bg-white/15"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-bold text-base backdrop-blur-sm ${
                      tx.type === "income"
                        ? "bg-green-500/30 text-green-600 dark:text-green-400"
                        : tx.type === "expense"
                          ? "bg-red-500/30 text-red-600 dark:text-red-400"
                          : "bg-blue-500/30 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {tx.type === "income"
                      ? "↓"
                      : tx.type === "expense"
                        ? "↑"
                        : "↔"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground text-xs truncate">
                      {tx.category || "No category"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {getAccountName(tx.account_id || tx.from_account_id)} •{" "}
                      {new Date(tx.transaction_date).toLocaleDateString(
                        "ru-RU",
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-sm font-bold flex-shrink-0 ml-2 ${
                    tx.type === "income"
                      ? "text-green-600 dark:text-green-400"
                      : tx.type === "expense"
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {tx.type === "income"
                    ? "+"
                    : tx.type === "expense"
                      ? "-"
                      : ""}
                  {formatNumber(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending by period */}
      <div className="card-glass mb-6 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Spent</h2>
            <p className="text-xs text-muted-foreground">
              {formatPeriodRange(
                spendingRange.start,
                spendingRange.end,
                spendingPeriod,
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/30 p-1 dark:bg-white/8">
            {(["day", "week", "month"] as SpendingPeriod[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => {
                  const nextDate = getDateForPeriodChange(
                    spendingDate,
                    spendingPeriod,
                    period,
                  );
                  setSpendingPeriod(period);
                  setSpendingDate(nextDate);
                }}
                className={`smooth-transition rounded-lg px-3 py-1.5 text-xs font-bold ${
                  spendingPeriod === period
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted-foreground hover:bg-white/40 hover:text-foreground dark:hover:bg-white/10"
                }`}
              >
                {spendingPeriodLabels[period]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSpendingDate((date) =>
                  shiftSpendingDate(date, spendingPeriod, -1),
                )
              }
              className="glass-sm smooth-transition flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/50 active:scale-95 dark:hover:bg-white/15"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setSpendingDate((date) =>
                  shiftSpendingDate(date, spendingPeriod, 1),
                )
              }
              className="glass-sm smooth-transition flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/50 active:scale-95 dark:hover:bg-white/15"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <input
            type={spendingPeriodInputType}
            value={formatInputDate(spendingDate, spendingPeriod)}
            onChange={(event) =>
              setSpendingDate(parseInputDate(event.target.value, spendingPeriod))
            }
            className="glass-sm mobile-input min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            aria-label="Select spending period"
          />

          <button
            type="button"
            onClick={() => setSpendingDate(startOfLocalDay(new Date()))}
            className="smooth-transition rounded-lg bg-white/40 px-3 py-2 text-sm font-bold text-foreground hover:bg-white/60 active:scale-95 dark:bg-white/8 dark:hover:bg-white/15"
          >
            {resetPeriodLabel}
          </button>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-sm rounded-xl p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Calendar
                </div>
                <div className="text-sm font-bold capitalize text-foreground">
                  {calendar.title}
                </div>
              </div>
              <div className="rounded-full bg-accent/10 px-2 py-1 text-xs font-bold text-accent">
                {primarySpendingCurrency}
              </div>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {weekDayLabels.map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-[10px] font-bold uppercase text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendar.days.map((day) => {
                const amount = getCurrencyAmount(
                  calendarTotals,
                  day.key,
                  primarySpendingCurrency,
                );
                const intensity = amount / maxCalendarAmount;
                const isInSelectedPeriod =
                  day.date >= spendingRange.start && day.date < spendingRange.end;
                const dayOpacity = day.isCurrentMonth ? "opacity-100" : "opacity-45";

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => {
                      setSpendingPeriod("day");
                      setSpendingDate(day.date);
                    }}
                    className={`smooth-transition min-h-[54px] rounded-lg border p-1.5 text-left hover:scale-[1.02] hover:border-accent/60 ${
                      isInSelectedPeriod
                        ? "border-accent bg-accent/15"
                        : "border-white/30 bg-white/25 dark:border-white/8 dark:bg-white/5"
                    } ${dayOpacity}`}
                    style={{
                      boxShadow:
                        amount > 0
                          ? `inset 0 -${Math.max(8, intensity * 34)}px 0 rgba(74, 109, 126, ${0.16 + intensity * 0.24})`
                          : undefined,
                    }}
                    aria-label={`${day.date.toLocaleDateString("ru-RU")}: ${formatNumber(amount)} ${primarySpendingCurrency}`}
                  >
                    <div className="text-xs font-bold text-foreground">
                      {day.date.getDate()}
                    </div>
                    {amount > 0 && (
                      <div className="mt-1 truncate text-[10px] font-bold text-accent">
                        {getCurrencySymbol(primarySpendingCurrency)}
                        {formatCompactAmount(amount)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-sm rounded-xl p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {spendingPeriod === "day" ? "Categories" : "Trend"}
                </div>
                <div className="text-sm font-bold text-foreground">
                  {spendingPeriod === "day"
                    ? "Where it went"
                    : "Daily spending"}
                </div>
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                {getCurrencySymbol(primarySpendingCurrency)}
                {formatCompactAmount(chartMaxAmount)}
              </div>
            </div>

            {!hasChartData ? (
              <div className="flex h-44 items-center justify-center rounded-lg bg-white/20 text-center text-sm font-semibold text-muted-foreground dark:bg-white/5">
                No expenses in this period
              </div>
            ) : spendingPeriod === "day" ? (
              <div className="space-y-3">
                {chartItems.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-bold text-foreground">
                        {item.label}
                      </span>
                      <span className="font-semibold text-accent">
                        {getCurrencySymbol(primarySpendingCurrency)}{" "}
                        {formatNumber(item.amount)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/30 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.max(6, (item.amount / chartMaxAmount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-44 items-end gap-1">
                {chartItems.map((item, index) => {
                  const shouldShowLabel =
                    spendingPeriod === "week" || index % 5 === 0 || index === 0;

                  return (
                    <div
                      key={`${item.label}-${index}`}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      <div className="flex h-32 w-full items-end">
                        <div
                          className={`w-full rounded-t-md ${
                            item.amount > 0
                              ? "bg-accent"
                              : "bg-white/30 dark:bg-white/10"
                          }`}
                          style={{
                            height:
                              item.amount > 0
                                ? `${Math.max(8, (item.amount / chartMaxAmount) * 100)}%`
                                : "4px",
                          }}
                          title={`${item.label}: ${formatNumber(item.amount)} ${primarySpendingCurrency}`}
                        />
                      </div>
                      <div className="h-4 truncate text-[10px] font-semibold text-muted-foreground">
                        {shouldShowLabel ? item.label : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-accent/10 p-4">
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">
            Total expenses
          </div>
          <div className="space-y-1">
            {spendingStats.totals.map((total) => (
              <div
                key={total.currency}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-3xl font-bold text-accent">
                  {getCurrencySymbol(total.currency)} {formatNumber(total.amount)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {total.currency}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="glass-sm rounded-xl p-3">
            <div className="text-xs font-semibold text-muted-foreground">
              Operations
            </div>
            <div className="mt-1 text-lg font-bold text-foreground">
              {spendingStats.count}
            </div>
          </div>
          <div className="glass-sm rounded-xl p-3">
            <div className="text-xs font-semibold text-muted-foreground">
              Daily avg.
            </div>
            <div className="mt-1 text-lg font-bold text-foreground">
              {getCurrencySymbol(primarySpendingCurrency)}{" "}
              {formatNumber(primarySpendingTotal / spendingDays)}
            </div>
          </div>
          <div className="glass-sm col-span-2 rounded-xl p-3 sm:col-span-1">
            <div className="text-xs font-semibold text-muted-foreground">
              Top category
            </div>
            <div className="mt-1 truncate text-lg font-bold text-foreground">
              {spendingStats.topCategory || "No expenses"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
