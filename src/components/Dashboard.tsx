import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db, getBudgetForMonth } from '../db/database';
import { KpiCard } from './KpiCard';
import type { Category } from '../types';

const font = '-apple-system,BlinkMacSystemFont,sans-serif';
const eur  = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

function monthKey(d: Date) { return format(d, 'yyyy-MM'); }
function cap(s: string)     { return s.charAt(0).toUpperCase() + s.slice(1); }

const card: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  fontFamily: font,
};

/* ── Pie tooltip ─────────────────────────────────────────────────────────── */

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: 10, padding: '8px 12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 13, fontFamily: font,
    }}>
      <div style={{ fontWeight: 600, color: item.payload.color }}>
        {item.payload.icon} {item.payload.name}
      </div>
      <div style={{ color: '#000000' }}>
        {item.value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
      </div>
    </div>
  );
};

/* ── Line tooltip ────────────────────────────────────────────────────────── */

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const depenses = payload.find((p: any) => p.dataKey === 'depenses')?.value ?? 0;
  const budget   = payload.find((p: any) => p.dataKey === 'budget')?.value ?? 0;
  const diff     = budget - depenses;
  const hasBudget = budget > 0;
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 13, fontFamily: font,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: '#000' }}>{label}</div>
      <div style={{ color: '#378ADD' }}>Dépenses : {eur(depenses)}</div>
      {hasBudget && <div style={{ color: '#8E8E93' }}>Budget : {eur(budget)}</div>}
      {hasBudget && (
        <div style={{
          color: diff >= 0 ? '#34C759' : '#FF3B30',
          fontWeight: 600, marginTop: 6,
        }}>
          {diff >= 0 ? `✓ Économie : ${eur(diff)}` : `⚠ Dépassement : +${eur(-diff)}`}
        </div>
      )}
    </div>
  );
};

/* ── Custom dot (colored by budget status) ───────────────────────────────── */

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const over  = payload.budget > 0 && payload.depenses > payload.budget;
  const color = over ? '#FF3B30' : '#34C759';
  return <circle cx={cx} cy={cy} r={7} fill={color} stroke="#fff" strokeWidth={2} />;
};

const ActiveDot = (props: any) => {
  const { cx, cy, payload } = props;
  const over  = payload.budget > 0 && payload.depenses > payload.budget;
  const color = over ? '#FF3B30' : '#34C759';
  return <circle cx={cx} cy={cy} r={9} fill={color} stroke="#fff" strokeWidth={2} />;
};

/* ── Dashboard ───────────────────────────────────────────────────────────── */

export function Dashboard() {
  const now           = new Date();
  const currentMonth  = monthKey(now);
  const previousMonth = monthKey(subMonths(now, 1));

  const allExpenses   = useLiveQuery(() => db.expenses.toArray(),   []) ?? [];
  const allCategories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  // Monthly budget totals loaded asynchronously
  const [monthBudgets, setMonthBudgets] = useState<number[]>([]);

  const {
    thisMonthExpenses, total, variation,
    pieData, lineBase, months, topCategory, totalBudget,
  } = useMemo(() => {
    const categoryMap = new Map<string, Category>(allCategories.map((c) => [c.id!, c]));

    const thisMonthExpenses = allExpenses.filter((e) => e.date.startsWith(currentMonth));
    const total             = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
    const lastMonthTotal    = allExpenses
      .filter((e) => e.date.startsWith(previousMonth))
      .reduce((s, e) => s + e.amount, 0);

    const variation = lastMonthTotal === 0
      ? null
      : ((total - lastMonthTotal) / lastMonthTotal) * 100;

    const byCategory = new Map<string, number>();
    for (const e of thisMonthExpenses) {
      byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + e.amount);
    }
    const pieData = [...byCategory.entries()]
      .filter(([, v]) => v > 0)
      .map(([id, value]) => {
        const cat = categoryMap.get(id);
        return { id, name: cat?.name ?? 'Autre', color: cat?.color ?? '#8E8E93', icon: cat?.icon ?? '💰', value };
      })
      .sort((a, b) => b.value - a.value);

    const topCategory = pieData[0] ?? null;
    const sixMonthsAgo = startOfMonth(subMonths(now, 5));
    const months       = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

    const lineBase = months.map((m) => {
      const key      = monthKey(m);
      const label    = cap(format(m, 'MMM', { locale: fr }));
      const depenses = allExpenses.filter((e) => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
      return { name: label, month: key, depenses };
    });

    const totalBudget = allCategories.reduce((s, c) => s + (c.budget ?? 0), 0);

    return { thisMonthExpenses, total, variation, pieData, lineBase, months, topCategory, totalBudget };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allExpenses, allCategories, currentMonth, previousMonth]);

  // Load budget for each of the 6 months asynchronously
  useEffect(() => {
    if (months.length === 0) return;
    Promise.all(months.map((m) => getBudgetForMonth(monthKey(m))))
      .then(setMonthBudgets)
      .catch(() => setMonthBudgets(months.map(() => 0)));
  }, [allCategories, months.length]); // re-run when categories change (budgets updated)

  // Merge expenses + budgets into LineChart data
  const lineData = lineBase.map((d, i) => ({ ...d, budget: monthBudgets[i] ?? 0 }));

  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(undefined);

  const monthLabel     = cap(format(now, 'MMMM yyyy', { locale: fr }));
  const hasExpenses    = thisMonthExpenses.length > 0;
  const remaining      = totalBudget > 0 ? totalBudget - total : null;
  const variationColor = variation === null ? '#8E8E93' : variation > 0 ? '#FF3B30' : '#34C759';
  const variationLabel = variation === null
    ? 'premier mois'
    : `${variation > 0 ? '+' : ''}${variation.toFixed(1)}% vs mois dernier`;

  /* ── Header ─────────────────────────────────────────────────────────────── */
  const header = (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 20px 20px', textAlign: 'center' }}>
      <p style={{
        fontSize: 13, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: '#8E8E93', fontFamily: font, margin: '0 0 4px',
      }}>
        {monthLabel}
      </p>
      <p style={{
        fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em',
        color: '#000000', fontFamily: font, margin: '0 0 4px', lineHeight: 1.1,
      }}>
        {eur(total)}
      </p>
      <p style={{ fontSize: 15, color: variationColor, fontFamily: font, margin: 0 }}>
        {variationLabel}
      </p>
    </div>
  );

  /* ── Empty state ─────────────────────────────────────────────────────────── */
  if (!hasExpenses) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
        paddingBottom: 100, paddingLeft: 16, paddingRight: 16,
        backgroundColor: '#F2F2F7', fontFamily: font,
      }}>
        {header}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <span style={{ fontSize: 72, lineHeight: 1 }}>📊</span>
          <p style={{ fontSize: 20, fontWeight: 600, color: '#000000', fontFamily: font, margin: 0, textAlign: 'center' }}>
            Aucune dépense ce mois
          </p>
          <p style={{ fontSize: 15, color: '#8E8E93', fontFamily: font, margin: 0, textAlign: 'center', maxWidth: 280 }}>
            Commence à suivre tes finances en ajoutant ta première dépense avec le bouton +
          </p>
        </div>
      </div>
    );
  }

  /* ── Main layout ─────────────────────────────────────────────────────────── */
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      paddingBottom: 100, paddingLeft: 16, paddingRight: 16,
      backgroundColor: '#F2F2F7', fontFamily: font, gap: 12,
    }}>
      {header}

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <KpiCard title="Dépensé" value={eur(total)} icon="💸" color="#FF3B30" />
        <KpiCard
          title={remaining !== null ? 'Restant' : 'Budget non défini'}
          value={remaining !== null ? eur(Math.max(0, remaining)) : '—'}
          icon="🎯"
          color={remaining !== null && remaining < 0 ? '#FF3B30' : '#34C759'}
        />
        <KpiCard title="Transactions" value={String(thisMonthExpenses.length)} icon="🧾" color="#5856D6" />
        <KpiCard
          title="Top catégorie"
          value={topCategory ? `${topCategory.icon} ${topCategory.name}` : '—'}
          icon="🏆"
          color={topCategory?.color ?? '#8E8E93'}
        />
      </div>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <div style={card}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#000000', fontFamily: font, margin: '0 0 16px' }}>
            Répartition
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={3} dataKey="value" strokeWidth={0}
                activeIndex={activePieIndex}
                onMouseEnter={(_, index) => setActivePieIndex(index)}
                onMouseLeave={() => setActivePieIndex(undefined)}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={entry.id}
                    fill={entry.color}
                    opacity={activePieIndex === undefined || activePieIndex === index ? 1 : 0.4}
                    style={{ transition: 'opacity 0.2s ease' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 12 }}>
            {pieData.map((entry) => {
              const pct = total > 0 ? (entry.value / total) * 100 : 0;
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{entry.icon}</span>
                  <span style={{
                    fontSize: 12, color: '#3C3C43', fontFamily: font,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {entry.name}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: entry.color, flexShrink: 0, fontFamily: font }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Line chart — dépenses vs budget */}
      <div style={card}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#000000', fontFamily: font, margin: '0 0 4px' }}>
          Évolution 6 mois
        </p>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 3, backgroundColor: '#378ADD', borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: '#8E8E93', fontFamily: font }}>Dépenses</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 2, borderTop: '2px dashed #C7C7CC' }} />
            <span style={{ fontSize: 11, color: '#8E8E93', fontFamily: font }}>Budget</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={lineData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#8E8E93', fontFamily: font }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<LineTooltip />} />

            {/* Budget line — dashed gray */}
            <Line
              type="monotone"
              dataKey="budget"
              stroke="#C7C7CC"
              strokeWidth={2}
              strokeDasharray="7 5"
              dot={false}
              activeDot={false}
            />

            {/* Expenses line — colored dots */}
            <Line
              type="monotone"
              dataKey="depenses"
              stroke="#378ADD"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={<ActiveDot />}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
