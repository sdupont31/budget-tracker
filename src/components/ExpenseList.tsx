import { useEffect, useRef, useState } from 'react';
import { format, isToday, isYesterday, parseISO, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrashIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { useExpenses } from '../hooks/useExpenses';
import type { Category, Expense } from '../types';

const font = '-apple-system,BlinkMacSystemFont,sans-serif';
const eur  = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/* ── Date helpers ────────────────────────────────────────────────────────── */

function formatGroupLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d))     return "Aujourd'hui";
  if (isYesterday(d)) return 'Hier';
  return format(d, 'EEEE d MMMM', { locale: fr });
}

function groupByDate(expenses: Expense[]): Map<string, Expense[]> {
  const map = new Map<string, Expense[]>();
  for (const e of [...expenses].sort((a, b) => b.date.localeCompare(a.date))) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return map;
}

/* ── ExpenseList ─────────────────────────────────────────────────────────── */

export function ExpenseList() {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => format(new Date(), 'yyyy-MM'),
  );

  const { expenses, categories, deleteExpense } = useExpenses(selectedMonth);

  const categoryMap = new Map<string, Category>(
    categories.map((c) => [c.id!, c]),
  );

  const monthTotal   = expenses.reduce((sum, e) => sum + e.amount, 0);
  const grouped      = groupByDate(expenses);
  const monthLabel   = format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: fr });
  const monthDisplay = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  function prevMonth() {
    setSelectedMonth((m) => format(subMonths(parseISO(`${m}-01`), 1), 'yyyy-MM'));
  }
  function nextMonth() {
    setSelectedMonth((m) => format(addMonths(parseISO(`${m}-01`), 1), 'yyyy-MM'));
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      paddingBottom: 100, backgroundColor: '#F2F2F7', fontFamily: font,
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '60px 20px 20px' }}>
        <h1 style={{
          fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em',
          color: '#000000', margin: '0 0 16px', fontFamily: font,
          textAlign: 'center',
        }}>
          Dépenses
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Mois précédent"
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              backgroundColor: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeftIcon width={24} height={24} style={{ color: '#007AFF' }} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#000000', fontFamily: font }}>
              {monthDisplay}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#007AFF', fontFamily: font }}>
              {eur(monthTotal)}
            </span>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Mois suivant"
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              backgroundColor: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronRightIcon width={24} height={24} style={{ color: '#007AFF' }} />
          </button>
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {expenses.length === 0 && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 32px',
        }}>
          <span style={{ fontSize: 56, lineHeight: 1 }}>🎉</span>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#000000', fontFamily: font, margin: 0 }}>
            Aucune dépense ce mois-ci
          </p>
          <p style={{ fontSize: 15, color: '#8E8E93', fontFamily: font, textAlign: 'center', margin: 0 }}>
            Appuie sur + pour en ajouter une
          </p>
        </div>
      )}

      {/* ── Grouped list ───────────────────────────────────────────────── */}
      {expenses.length > 0 && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[...grouped.entries()].map(([date, rows]) => (
            <section key={date}>
              <p style={{
                fontSize: 13, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: '#8E8E93', fontFamily: font,
                margin: '0 0 8px 4px',
              }}>
                {formatGroupLabel(date)}
              </p>

              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}>
                {rows.map((expense, idx) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    category={categoryMap.get(expense.categoryId)}
                    onDelete={deleteExpense}
                    animationDelay={idx * 40}
                    isFirst={idx === 0}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ExpenseRow ──────────────────────────────────────────────────────────── */

type SwipeState = 'idle' | 'revealed' | 'removing';

const REVEAL_PX = 80;
const DELETE_PX = 150;

interface ExpenseRowProps {
  expense: Expense;
  category: Category | undefined;
  onDelete: (id: string) => Promise<void>;
  animationDelay: number;
  isFirst: boolean;
}

function ExpenseRow({ expense, category, onDelete, animationDelay, isFirst }: ExpenseRowProps) {
  const [hovered, setHovered]       = useState(false);
  const [swipeState, setSwipeState] = useState<SwipeState>('idle');
  const [offsetX, setOffsetX]       = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const rowRef          = useRef<HTMLDivElement>(null);
  const touchStartX     = useRef(0);
  const touchStartY     = useRef(0);
  const directionLocked = useRef<'h' | 'v' | null>(null);
  const liveOffset      = useRef(0);
  const liveSwipeState  = useRef<SwipeState>('idle');

  useEffect(() => { liveSwipeState.current = swipeState; }, [swipeState]);

  async function handleDelete() {
    if (!expense.id || liveSwipeState.current === 'removing') return;
    setSwipeState('removing');
    liveSwipeState.current = 'removing';
    setTimeout(() => onDelete(expense.id!), 280);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current     = e.touches[0].clientX;
    touchStartY.current     = e.touches[0].clientY;
    directionLocked.current = null;
    setIsDragging(true);
  }

  function handleTouchEnd() {
    setIsDragging(false);
    directionLocked.current = null;

    const offset = liveOffset.current;
    if (offset <= -DELETE_PX) {
      handleDelete();
    } else if (offset <= -REVEAL_PX) {
      liveOffset.current = -REVEAL_PX;
      setOffsetX(-REVEAL_PX);
      setSwipeState('revealed');
    } else {
      liveOffset.current = 0;
      setOffsetX(0);
      setSwipeState('idle');
    }
  }

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    function handleTouchMove(e: TouchEvent) {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;

      if (!directionLocked.current) {
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          directionLocked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        }
        return;
      }
      if (directionLocked.current === 'v') return;

      e.preventDefault();
      const base    = liveSwipeState.current === 'revealed' ? -REVEAL_PX : 0;
      const raw     = base + dx;
      const clamped = Math.min(0, Math.max(-(DELETE_PX + 24), raw));
      liveOffset.current = clamped;
      setOffsetX(clamped);
    }

    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMove);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRowClick() {
    if (swipeState === 'revealed') {
      liveOffset.current = 0;
      setOffsetX(0);
      setSwipeState('idle');
    }
  }

  const isRemoving = swipeState === 'removing';

  const transition = isDragging
    ? 'none'
    : isRemoving
      ? 'transform 0.28s ease-in, opacity 0.28s ease-in'
      : 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)';

  const transform = isRemoving ? 'translateX(-110%)' : `translateX(${offsetX}px)`;

  return (
    <div
      ref={rowRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        animation: `slideIn 0.25s ease both`,
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Red delete action (revealed on swipe) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: REVEAL_PX,
          backgroundColor: '#FF3B30',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={handleDelete}
          tabIndex={swipeState === 'revealed' ? 0 : -1}
          aria-label="Supprimer"
          style={{
            width: '100%', height: '100%', border: 'none', background: 'none',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2, color: '#ffffff',
          }}
        >
          <TrashIcon width={20} height={20} />
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: font, lineHeight: 1 }}>
            Supprimer
          </span>
        </button>
      </div>

      {/* Sliding row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          position: 'relative',
          transform, transition,
          opacity: isRemoving ? 0 : 1,
          backgroundColor: hovered ? '#F2F2F7' : '#ffffff',
          borderTop: isFirst ? 'none' : '1px solid #E5E5EA',
          boxSizing: 'border-box',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleRowClick}
      >
        {/* Category circle */}
        <span style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
          backgroundColor: category ? `${category.color}22` : '#8E8E9322',
        }}>
          {category?.icon ?? '💰'}
        </span>

        {/* Description + category */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 15, fontWeight: 600, color: '#000000', fontFamily: font,
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {expense.description || category?.name || 'Dépense'}
          </p>
          <p style={{
            fontSize: 13, color: '#8E8E93', fontFamily: font,
            margin: 0, lineHeight: 1.3,
          }}>
            {category?.name ?? '—'}
          </p>
        </div>

        {/* Amount */}
        <span style={{
          fontSize: 15, fontWeight: 600, color: '#FF3B30',
          fontFamily: font, flexShrink: 0,
        }}>
          {eur(expense.amount)}
        </span>

        {/* Desktop hover trash */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          aria-label="Supprimer"
          style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
            backgroundColor: 'rgba(255,59,48,0.12)',
            opacity: hovered ? 1 : 0,
            pointerEvents: hovered ? 'auto' : 'none',
            transition: 'opacity 0.15s',
            // Hide on touch devices via media query is not possible in inline styles;
            // the opacity:0 is sufficient — it's invisible until hover
          }}
        >
          <TrashIcon width={16} height={16} style={{ color: '#FF3B30' }} />
        </button>
      </div>
    </div>
  );
}
