import { useEffect, useState } from 'react';
import {
  ChartPieIcon   as ChartPieOutline,
  ListBulletIcon as ListBulletOutline,
  ChartBarIcon   as ChartBarOutline,
} from '@heroicons/react/24/outline';
import {
  ChartPieIcon   as ChartPieSolid,
  ListBulletIcon as ListBulletSolid,
  ChartBarIcon   as ChartBarSolid,
} from '@heroicons/react/24/solid';

function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState<boolean>(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDark;
}

interface NavigationProps {
  current: string;
  onChange: (tab: string) => void;
  onAdd: () => void;
}

interface Tab {
  id: string;
  label: string;
  OutlineIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  SolidIcon:   React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', OutlineIcon: ChartPieOutline,   SolidIcon: ChartPieSolid },
  { id: 'expenses',  label: 'Dépenses',  OutlineIcon: ListBulletOutline, SolidIcon: ListBulletSolid },
  { id: 'budget',    label: 'Budgets',   OutlineIcon: ChartBarOutline,   SolidIcon: ChartBarSolid },
];

export function Navigation({ current, onChange, onAdd }: NavigationProps) {
  const isDark = useDarkMode();

  const bg          = isDark ? 'rgba(28,28,30,0.92)'   : 'rgba(255,255,255,0.92)';
  const border      = isDark ? '1px solid #38383A'     : '1px solid #E5E5EA';
  const inactiveClr = isDark ? 'rgba(235,235,245,0.6)' : '#8E8E93';

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: bg,
      borderTop: border,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
    }}>

      {/* Dashboard — flex:2 → centre à 12.5% */}
      <TabButton
        tab={TABS[0]}
        current={current}
        onChange={onChange}
        inactiveColor={inactiveClr}
        flexValue={2}
      />
      {/* Dépenses — flex:1 → centre à 31.25% (milieu exact entre Dashboard et +) */}
      <TabButton
        tab={TABS[1]}
        current={current}
        onChange={onChange}
        inactiveColor={inactiveClr}
        flexValue={1}
      />
      {/* Spacer flex:3 — le + absolu flotte au-dessus du centre (50%) */}
      <div style={{ flex: 3 }} />
      {/* Budgets — flex:2 → centre à 87.5% (symétrique à Dashboard) */}
      <TabButton
        tab={TABS[2]}
        current={current}
        onChange={onChange}
        inactiveColor={inactiveClr}
        flexValue={2}
      />

      {/* + button — absolutely centred, never participates in flex layout */}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Ajouter une dépense"
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#007AFF',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,122,255,0.4)',
          zIndex: 1,
        }}
      >
        <span style={{
          color: 'white',
          fontSize: 28,
          fontWeight: 300,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          marginTop: '-1px',
        }}>
          +
        </span>
      </button>

    </nav>
  );
}

/* ── Tab button ──────────────────────────────────────────────────────────── */

interface TabButtonProps {
  tab: Tab;
  current: string;
  onChange: (tab: string) => void;
  inactiveColor: string;
  flexValue?: number;
}

function TabButton({ tab, current, onChange, inactiveColor, flexValue = 1 }: TabButtonProps) {
  const isActive = current === tab.id;
  const Icon     = isActive ? tab.SolidIcon : tab.OutlineIcon;
  const color    = isActive ? '#007AFF' : inactiveColor;

  return (
    <button
      type="button"
      onClick={() => onChange(tab.id)}
      aria-label={tab.label}
      aria-current={isActive ? 'page' : undefined}
      style={{
        flex: flexValue,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '4px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <Icon style={{ width: 24, height: 24, color }} />
      <span style={{
        fontSize: 10,
        fontWeight: 500,
        color,
        fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif',
        letterSpacing: '-0.01em',
      }}>
        {tab.label}
      </span>
    </button>
  );
}
