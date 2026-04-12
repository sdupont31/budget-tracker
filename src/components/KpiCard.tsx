interface KpiCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
}

export function KpiCard({ title, value, icon, color }: KpiCardProps) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif',
    }}>
      {/* Top row: emoji + color dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span role="img" aria-label={title} style={{ fontSize: 24, lineHeight: 1 }}>
          {icon}
        </span>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: color, flexShrink: 0,
        }} />
      </div>

      {/* Bottom row: value + title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
          lineHeight: 1.2, color: '#000000',
        }}>
          {value}
        </span>
        <span style={{ fontSize: 13, color: '#8E8E93', lineHeight: 1.4 }}>
          {title}
        </span>
      </div>
    </div>
  );
}
