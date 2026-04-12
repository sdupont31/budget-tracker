import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '../db/database';
import type { Category } from '../types';

const font = '-apple-system,BlinkMacSystemFont,sans-serif';
const eur  = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function Budget() {
  const currentMonth = format(new Date(), 'yyyy-MM');

  const rawCategories = useLiveQuery(() => db.categories.toArray(), []);
  const expenses      = useLiveQuery(
    () => db.expenses.filter((e) => e.date.startsWith(currentMonth)).toArray(),
    [currentMonth],
  ) ?? [];

  const categories = useMemo<Category[]>(() => {
    if (!rawCategories) return [];
    const seen = new Set<string>();
    return rawCategories.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }, [rawCategories]);

  // Local overrides while the user edits — keyed by category id (string)
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount);
    }
    return map;
  }, [expenses]);

  // Returns the input value if the user has edited it, otherwise the DB value
  function getBudgetStr(catId: string, dbBudget?: number): string {
    if (catId in budgetInputs) return budgetInputs[catId];
    return dbBudget !== undefined ? String(dbBudget) : '';
  }

  function handleBudgetChange(catId: string, value: string) {
    setBudgetInputs((prev) => ({ ...prev, [catId]: value }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(budgetInputs).map(([id, val]) => {
          const budget = val === '' ? undefined : parseFloat(val);
          return db.categories.update(id, { budget });
        }),
      );
      setBudgetInputs({});
    } finally {
      setSaving(false);
    }
  }

  const hasPendingChanges = Object.keys(budgetInputs).length > 0;

  function getBarColor(spent: number, budget: number): string {
    if (!budget || budget === 0) return '#C7C7CC';
    const pct = spent / budget;
    if (pct >= 1)    return '#FF3B30';
    if (pct >= 0.75) return '#FF9500';
    return '#34C759';
  }

  // Only block render while useLiveQuery hasn't resolved yet (undefined = still loading)
  // An empty array [] means DB is ready but empty — we still render the page
  if (rawCategories === undefined) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#8E8E93', fontFamily: font }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      paddingBottom: 100,
      backgroundColor: '#F2F2F7',
      fontFamily: font,
    }}>
      {/* Header */}
      <h1 style={{
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: '#000000',
        textAlign: 'center',
        margin: 0,
        padding: '60px 20px 20px',
        fontFamily: font,
      }}>
        Budgets
      </h1>

      {/* ── Summary card ───────────────────────────────────────────────── */}
      {(() => {
        const totalBudget = categories.reduce((s, c) => s + (parseFloat(getBudgetStr(c.id!, c.budget)) || 0), 0);
        return (
          <div style={{
            backgroundColor: '#fff', borderRadius: 16, padding: '16px 20px',
            marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: 13, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: '#8E8E93', fontFamily: font, margin: 0,
            }}>
              Budget total du mois
            </p>
            <p style={{
              fontSize: 34, fontWeight: 700, color: '#007AFF',
              fontFamily: font, letterSpacing: '-0.02em', lineHeight: 1.1,
              margin: '8px 0 0',
            }}>
              {totalBudget > 0 ? eur(totalBudget) : '—'}
            </p>
          </div>
        );
      })()}

      {/* ── Category cards ──────────────────────────────────────────────── */}
      <div style={{ padding: '0 0' }}>
        {[...categories].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).map((cat) => {
          const spent     = spentByCategory.get(cat.id!) ?? 0;
          const budgetStr = getBudgetStr(cat.id!, cat.budget);
          const budget    = parseFloat(budgetStr) || 0;
          const pct      = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
          const barColor = getBarColor(spent, budget);

          return (
            <div
              key={cat.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              }}
            >
              {/* Top row: emoji + name | spent / budget */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}>
                <span style={{
                  fontSize: 15, fontWeight: 600, color: '#000000', fontFamily: font,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                  {cat.name}
                </span>
                <span style={{ fontSize: 13, color: '#8E8E93', fontFamily: font }}>
                  {eur(spent)}
                  {budget > 0 && <span style={{ color: '#C7C7CC' }}> / {eur(budget)}</span>}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: 6,
                borderRadius: 4,
                backgroundColor: '#E5E5EA',
                overflow: 'hidden',
                marginBottom: 12,
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: barColor,
                  width: `${pct}%`,
                  transition: 'width 0.3s ease, background-color 0.3s ease',
                }} />
              </div>

              {/* Budget input row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 6,
              }}>
                <span style={{ fontSize: 13, color: '#8E8E93', fontFamily: font }}>
                  Budget mensuel
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={budgetStr}
                  placeholder="—"
                  onChange={(e) => handleBudgetChange(cat.id!, e.target.value)}
                  style={{
                    width: 80,
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: font,
                    color: '#000000',
                    textAlign: 'right',
                    border: 'none',
                    borderBottom: `1px solid ${catId_isDirty(cat.id!, budgetInputs) ? cat.color : '#E5E5EA'}`,
                    outline: 'none',
                    backgroundColor: 'transparent',
                    padding: '2px 0',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  } as React.CSSProperties}
                />
                <span style={{ fontSize: 13, color: '#8E8E93', fontFamily: font }}>
                  € / mois
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button — appears when changes are pending */}
      {hasPendingChanges && (
        <div style={{ padding: '16px 16px 0' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 12,
              backgroundColor: saving ? '#C7C7CC' : '#007AFF',
              color: '#ffffff',
              fontSize: 17,
              fontWeight: 600,
              fontFamily: font,
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  );
}

// Helper — is this category's budget currently edited?
function catId_isDirty(id: string, inputs: Record<string, string>): boolean {
  return id in inputs;
}
