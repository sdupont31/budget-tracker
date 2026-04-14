import Dexie, { type EntityTable } from 'dexie';
import { format, subMonths } from 'date-fns';
import type { Category, Expense, MonthlyBudget } from '../types';

class BudgetDatabase extends Dexie {
  expenses!:       EntityTable<Expense, 'id'>;
  categories!:     EntityTable<Category, 'id'>;
  monthlyBudgets!: EntityTable<MonthlyBudget, 'id'>;

  constructor() {
    super('BudgetTrackerDB');

    this.version(1).stores({
      expenses:   '&id, categoryId, date, createdAt',
      categories: '++id, name',
    });

    // v2: plain string PKs for both tables
    this.version(2).stores({
      expenses:   'id, categoryId, date, createdAt',
      categories: 'id, name',
    });

    // v3: add 'order' index — clears old auto-increment category data
    this.version(3).stores({
      expenses:   'id, categoryId, date, createdAt',
      categories: 'id, name, order',
    }).upgrade((tx) => tx.table('categories').clear());

    // v4: add monthlyBudgets table for budget snapshots
    this.version(4).stores({
      expenses:       'id, categoryId, date, createdAt',
      categories:     'id, name, order',
      monthlyBudgets: 'id, month',
    });
  }
}

export const db = new BudgetDatabase();

/* ── Default categories ──────────────────────────────────────────────────── */

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-alimentation', name: 'Courses',      color: '#FF9500', icon: '🛒', order: 1 },
  { id: 'cat-logement',     name: 'Logement',     color: '#007AFF', icon: '🏠', order: 2 },
  { id: 'cat-transport',    name: 'Transport',     color: '#34C759', icon: '🚗', order: 3 },
  { id: 'cat-sante',        name: 'Santé',         color: '#FF2D55', icon: '🏥', order: 4 },
  { id: 'cat-loisirs',      name: 'Loisirs',       color: '#AF52DE', icon: '🎭', order: 5 },
  { id: 'cat-restaurant',   name: 'Restaurant',    color: '#FF3B30', icon: '🍔', order: 6 },
  { id: 'cat-shopping',     name: 'Shopping',      color: '#5856D6', icon: '👕', order: 7 },
  { id: 'cat-abonnements',  name: 'Abonnements',   color: '#5AC8FA', icon: '📱', order: 8 },
  { id: 'cat-epargne',      name: 'Epargne',       color: '#FFD60A', icon: '🐷', order: 9 },
  { id: 'cat-autres',       name: 'Autres',        color: '#8E8E93', icon: '💰', order: 10 },
];

export async function seedDatabase(): Promise<void> {
  try {
    const all = await db.categories.toArray();

    if (all.length === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
      return;
    }

    // ── Migrations AVANT le loop "add missing" ────────────────────────────
    // (si elles tournent après, l'add tente d'insérer 'cat-alimentation'
    //  en doublon → ConstraintError → catch absorbe tout → rien ne s'exécute)

    // Renommage Alimentation → Courses
    const alimentation = await db.categories.where('id').equals('cat-alimentation').first();
    if (alimentation && alimentation.name === 'Alimentation') {
      await db.categories.update('cat-alimentation', { name: 'Courses', icon: '🛒' });
    }

    // Ajout Restaurant si absent
    const restaurant = await db.categories.where('id').equals('cat-restaurant').first();
    if (!restaurant) {
      await db.categories.add({
        id: 'cat-restaurant', name: 'Restaurant', color: '#FF9500', icon: '🍔', order: 6,
      });
    }

    // Mise à jour des orders
    const orderUpdates: Record<string, number> = {
      'cat-shopping':    7,
      'cat-abonnements': 8,
      'cat-epargne':     9,
      'cat-autres':      10,
    };
    for (const [id, order] of Object.entries(orderUpdates)) {
      await db.categories.update(id, { order });
    }

    // ── Add only missing categories (par ID) ──────────────────────────────
    const afterMigration = await db.categories.toArray();
    const existingIds = new Set(afterMigration.map((c) => c.id!));
    for (const defaultCat of DEFAULT_CATEGORIES) {
      if (!existingIds.has(defaultCat.id!)) {
        await db.categories.add(defaultCat);
      }
    }

    // ── Remove duplicates (même nom, garde la première occurrence) ─────────
    const final = await db.categories.toArray();
    const seen  = new Set<string>();
    for (const cat of final) {
      if (seen.has(cat.name)) {
        await db.categories.delete(cat.id!);
      } else {
        seen.add(cat.name);
      }
    }

    // ── Sync colors ────────────────────────────────────────────────────────
    const defaultById = new Map(DEFAULT_CATEGORIES.map((c) => [c.id!, c]));
    const current     = await db.categories.toArray();
    for (const cat of current) {
      const def = defaultById.get(cat.id!);
      if (def && cat.color !== def.color) {
        await db.categories.update(cat.id!, { color: def.color });
      }
    }
  } catch (e) {
    console.error('seedDatabase error:', e);
  }
}

/* ── Budget snapshot ─────────────────────────────────────────────────────── */

export async function snapshotMonthIfNeeded(): Promise<void> {
  try {
    const now       = new Date();
    const prevMonth = format(subMonths(now, 1), 'yyyy-MM');
    const existing  = await db.monthlyBudgets.where('month').equals(prevMonth).first();

    if (!existing) {
      const cats      = await db.categories.toArray();
      const budgetMap: Record<string, number> = {};
      cats.forEach((c) => { budgetMap[c.id!] = c.budget ?? 0; });
      const total = cats.reduce((s, c) => s + (c.budget ?? 0), 0);

      await db.monthlyBudgets.add({
        id:          `snapshot-${prevMonth}`,
        month:       prevMonth,
        budgets:     budgetMap,
        totalBudget: total,
        frozenAt:    now,
      });
    }
  } catch (e) {
    console.error('snapshotMonthIfNeeded error:', e);
  }
}

export async function seedMissingSnapshots(): Promise<void> {
  try {
    for (let i = 1; i <= 5; i++) {
      const month    = format(subMonths(new Date(), i), 'yyyy-MM');
      const existing = await db.monthlyBudgets.where('month').equals(month).first();

      if (!existing) {
        await db.monthlyBudgets.add({
          id:          `snapshot-${month}`,
          month,
          budgets:     {},
          totalBudget: 0,
          frozenAt:    new Date(),
        });
      }
    }
  } catch (e) {
    console.error('seedMissingSnapshots error:', e);
  }
}

export async function getBudgetForMonth(month: string): Promise<number> {
  try {
    const snapshot = await db.monthlyBudgets.where('month').equals(month).first();
    if (snapshot) return snapshot.totalBudget;
    // Current month: use live category budgets
    const cats = await db.categories.toArray();
    return cats.reduce((s, c) => s + (c.budget ?? 0), 0);
  } catch {
    return 0;
  }
}
