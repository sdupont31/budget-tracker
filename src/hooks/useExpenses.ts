import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { db } from '../db/database';
import type { Expense } from '../types';

type NewExpenseData = Omit<Expense, 'id' | 'createdAt'>;
type UpdateExpenseData = Partial<Omit<Expense, 'id' | 'createdAt'>>;

export function useExpenses(month?: string) {
  const expenses = useLiveQuery<Expense[]>(() => {
    if (month) {
      return db.expenses
        .filter((e) => e.date.startsWith(month))
        .sortBy('date');
    }
    return db.expenses.orderBy('date').toArray();
  }, [month]) ?? [];

  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  async function addExpense(data: NewExpenseData): Promise<string> {
    const expense: Expense = {
      ...data,
      id: uuidv4(),
      createdAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
    };
    await db.expenses.add(expense);
    return expense.id!;
  }

  async function deleteExpense(id: string): Promise<void> {
    await db.expenses.delete(id);
  }

  async function updateExpense(id: string, data: UpdateExpenseData): Promise<void> {
    await db.expenses.update(id, data);
  }

  return { expenses, categories, addExpense, deleteExpense, updateExpense };
}
