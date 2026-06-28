export function AboutPage() {
  return (
    <div>
      <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>About</h1>
      <p style={{ lineHeight: '1.6', color: '#555', maxWidth: '700px' }}>
        <strong>NB Feedback Kit</strong> is an open-source feedback collection toolkit for React applications. It
        routes user feedback directly to GitHub Issues, so your team can manage bugs, feature requests, and general
        feedback in the same place you already work.
      </p>

      <h2 style={{ fontSize: '24px', marginTop: '2rem' }}>How It Works</h2>
      <ol style={{ lineHeight: '2', color: '#555' }}>
        <li>The SDK captures feedback and metadata from your users.</li>
        <li>The Cloudflare Workers API authenticates the request and rate-limits abuse.</li>
        <li>The API creates a GitHub Issue in your repository with all context attached.</li>
        <li>Your team triages feedback directly in GitHub.</li>
      </ol>

      <h2 style={{ fontSize: '24px', marginTop: '2rem' }}>Try It Now</h2>
      <p style={{ lineHeight: '1.6', color: '#555' }}>
        Navigate between pages and submit feedback — each submission includes the current route, so you can see exactly
        where users were when they reported an issue.
      </p>

      <div
        style={{
          marginTop: '2rem',
          padding: '1.25rem',
          background: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #f59e0b',
        }}
      >
        <strong>📍 Route tracking demo:</strong> Notice how the captured metadata changes as you move between Home,
        Features, and About pages.
      </div>
    </div>
  );
}