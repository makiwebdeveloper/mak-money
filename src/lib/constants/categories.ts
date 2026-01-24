export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Bills & Utilities",
  "Education",
  "Travel",
  "Personal Care",
  "Gifts",
  "Sports & Fitness",
  "Subscriptions",
  "Transportation",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Gift",
  "Refund",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type TransactionCategory = ExpenseCategory | IncomeCategory;
