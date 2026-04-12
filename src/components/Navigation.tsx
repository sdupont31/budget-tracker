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

const LEFT_TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', OutlineIcon: ChartPieOutline,   SolidIcon: ChartPieSolid },
  { id: 'expenses',  label: 'Dépenses',  OutlineIcon: ListBulletOutline, SolidIcon: ListBulletSolid },
];
const RIGHT_TABS: Tab[] = [
  { id: 'budget', label: 'Budgets', OutlineIcon: ChartBarOutline, SolidIcon: ChartBarSolid },
];

export function Navigation({ current, onChange, onAdd }: NavigationProps) {
  const isDark = useDarkMode();

  const bg          = isDark ? 'rgba(28,28,30,0.92)'  : 'rgba(255,255,255,0.92)';
  const border      = isDark ? '1px solid #38383A'    : '1px solid #E5E5EA';
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
      display: 'flex',
      alignItems: 'center',
      zIndex: 1000,
      fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif',
    }}>

      {/* Groupe gauche — flex:1, 2 onglets répartis */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
        {LEFT_TABS.map((tab) => (
          <TabButton key={tab.id} tab={tab} current={current} onChange={onChange} inactiveColor={inactiveClr} />
        ))}
      </div>

      {/* Bouton + — taille fixe, ne flex pas */}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Ajouter une dépense"
        style={{
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
          flexShrink: 0,
          flexGrow: 0,
          margin: '0 8px',
        }}
      >
        <span style={{ color: 'white', fontSize: 28, lineHeight: 1, fontWeight: 300, userSelect: 'none' }}>
          +
        </span>
      </button>

      {/* Groupe droite — même flex:1, 1 onglet + div vide pour équilibrer */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
        {RIGHT_TABS.map((tab) => (
          <TabButton key={tab.id} tab={tab} current={current} onChange={onChange} inactiveColor={inactiveClr} />
        ))}
        <div style={{ minWidth: 60 }} />
      </div>

    </nav>
  );
}

/* ── Tab button ──────────────────────────────────────────────────────────── */

interface TabButtonProps {
  tab: Tab;
  current: string;
  onChange: (tab: string) => void;
  inactiveColor: string;
}

function TabButton({ tab, current, onChange, inactiveColor }: TabButtonProps) {
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        minWidth: 60,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: '4px 0',
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
