interface NavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const links = [
  { path: '/', label: 'Home' },
  { path: '/features', label: 'Features' },
  { path: '/about', label: 'About' },
];

export function Nav({ currentPath, onNavigate }: NavProps) {
  return (
    <nav
      style={{
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        padding: '16px 0',
        borderBottom: '1px solid #eee',
        marginBottom: '32px',
      }}
    >
      <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#3b82f6' }}>NB Feedback Kit</span>
      <div style={{ display: 'flex', gap: '16px' }}>
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => onNavigate(link.path)}
            style={{
              padding: '6px 12px',
              border: 'none',
              background: currentPath === link.path ? '#3b82f6' : 'transparent',
              color: currentPath === link.path ? 'white' : '#3b82f6',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  );
}