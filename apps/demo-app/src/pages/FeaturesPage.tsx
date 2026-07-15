export function FeaturesPage() {
  return (
    <div>
      <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Features</h1>
      <p style={{ lineHeight: '1.6', color: '#555', marginBottom: '2rem' }}>
        Everything the NB Feedback Kit SDK provides out of the box.
      </p>

      <div style={{ display: 'grid', gap: '16px' }}>
        {features.map((feature) => (
          <div
            key={feature.title}
            style={{
              padding: '1.25rem',
              background: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #eee',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>
              {feature.icon} {feature.title}
            </h3>
            <p style={{ margin: 0, color: '#555', lineHeight: '1.5' }}>{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    icon: '🎯',
    title: 'Automatic Metadata Capture',
    desc: 'Browser, OS, route, screen size, and timestamp collected automatically with every submission.',
  },
  {
    icon: '🎨',
    title: 'Headless UI Components',
    desc: 'FeedbackButton, FeedbackModal, and ReleaseNotesModal — fully customizable, base styling only.',
  },
  {
    icon: '✅',
    title: 'Form Validation',
    desc: 'Real-time validation with clear error messages for title and description fields.',
  },
  {
    icon: '♿',
    title: 'Accessibility',
    desc: 'ARIA labels, keyboard navigation, ESC to close, focus management, and focus trapping.',
  },
  {
    icon: '🔄',
    title: 'Loading States',
    desc: 'Proper submission feedback with disabled states during API calls.',
  },
  {
    icon: '📋',
    title: 'Release Notes',
    desc: 'Display version history directly from your GitHub Releases.',
  },
  {
    icon: '🔐',
    title: 'Secure by Design',
    desc: 'API key authentication, per-key rate limiting, and GitHub PATs never exposed to clients.',
  },
];