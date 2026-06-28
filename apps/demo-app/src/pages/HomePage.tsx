interface HomePageProps {
  onOpenFeedback: () => void;
  onOpenReleaseNotes: () => void;
  onOpenRoadmap: () => void;
}

export function HomePage({ onOpenFeedback, onOpenReleaseNotes, onOpenRoadmap }: HomePageProps) {
  return (
    <div>
      <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>NB Feedback Kit</h1>
      <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '18px' }}>✓ SDK successfully integrated!</p>

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #3b82f6',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#1e40af' }}>🎉 Try the Feedback System</h2>
        <p style={{ lineHeight: '1.6' }}>
          Click the floating <strong>"Feedback"</strong> button in the bottom-right corner, or use the buttons below.
          Feedback submissions create real GitHub Issues (when the API is configured).
        </p>
        <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={onOpenFeedback} style={btnStyle('#3b82f6')}>
            Open Feedback Modal
          </button>
          <button onClick={onOpenReleaseNotes} style={btnStyle('#22c55e')}>
            📋 Release Notes
          </button>
          <button onClick={onOpenRoadmap} style={btnStyle('#8b5cf6')}>
            🗺️ Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '12px 24px',
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '600',
  };
}