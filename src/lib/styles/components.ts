// Unified button styles for consistent UI across the app

export const buttonStyles = {
  // Primary button - main actions
  primary:
    "rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed",

  // Secondary button - less important actions
  secondary:
    "rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed",

  // Danger button - destructive actions
  danger:
    "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed",

  // Success button - positive actions (income, etc.)
  success:
    "rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed",

  // Ghost button - minimal style
  ghost:
    "rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors",

  // Small variants
  primarySmall:
    "rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors",
  secondarySmall:
    "rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors",
  dangerSmall:
    "rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors",
};

export const inputStyles = {
  base: "w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900",
  error:
    "w-full rounded-md border border-red-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500",
};

export const cardStyles = {
  base: "rounded-lg border border-gray-200 bg-white p-6 shadow-sm",
  interactive:
    "rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
};
