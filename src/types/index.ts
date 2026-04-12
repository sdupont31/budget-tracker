// Apple system colors (iOS/macOS palette)
export type CategoryColor =
  | '#FF9500' // orange
  | '#007AFF' // blue
  | '#34C759' // green
  | '#FF2D55' // pink
  | '#AF52DE' // purple
  | '#5856D6' // indigo
  | '#5AC8FA' // teal
  | '#8E8E93'; // gray

export interface Category {
  id?: string;
  name: string;
  color: CategoryColor;
  icon: string;
  budget?: number;
  order?: number;
}

export interface Expense {
  id?: string; // uuid v4, generated on insert
  amount: number;
  categoryId: string;
  description: string;
  date: string; // ISO 8601 date string (YYYY-MM-DD)
  createdAt: string; // ISO 8601 datetime string
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  total: number;
  byCategory: Record<string, number>; // categoryId → total amount
  count: number;
}

export interface MonthlyBudget {
  id: string;
  month: string;       // YYYY-MM
  budgets: Record<string, number>; // categoryId → montant
  totalBudget: number;
  frozenAt: Date;
}
