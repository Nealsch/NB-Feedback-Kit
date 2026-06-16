import { useState } from 'react';
import {
  FeedbackProvider,
  useFeedback,
  useSubmitFeedback,
  FeedbackButton,
  FeedbackModal,
} from '@nb-feedback-kit/react-sdk';

function DemoContent() {
  const { config, metadata } = useFeedback();
  const { submitFeedback } = useSubmitFeedback();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>NB Feedback Kit</h1>
      <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '18px' }}>✓ SDK successfully integrated!</p>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #3b82f6' }}>
        <h2 style={{ marginTop: 0, color: '#1e40af' }}>🎉 Try the Feedback System</h2>
        <p style={{ lineHeight: '1.6' }}>
          Click the floating <strong>"Feedback"</strong> button in the bottom-right corner, or use the button below to
          open the feedback modal. The form includes validation, accessibility features, and simulates submission.
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            marginTop: '12px',
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Open Feedback Modal
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '24px' }}>✨ Features Implemented</h2>
        <ul style={{ lineHeight: '2', fontSize: '16px' }}>
          <li>🎯 <strong>Automatic Metadata Capture</strong> - Browser, OS, route, screen size, timestamp</li>
          <li>🎨 <strong>Headless UI Components</strong> - FeedbackButton & FeedbackModal (fully customizable)</li>
          <li>✅ <strong>Form Validation</strong> - Real-time validation with error messages</li>
          <li>♿ <strong>Accessibility</strong> - ARIA labels, keyboard nav, ESC to close, focus trap</li>
          <li>🔄 <strong>Loading States</strong> - Proper submission feedback with disabled states</li>
          <li>📱 <strong>Responsive</strong> - Works on all screen sizes</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {showDetails ? '▼ Hide' : '▶ Show'} Captured Metadata & Config
        </button>

        {showDetails && (
          <>
            <div style={{ marginTop: '1rem' }}>
              <h3>📊 Captured Metadata</h3>
              <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '14px' }}>
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <h3>⚙️ SDK Configuration</h3>
              <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '14px' }}>
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>

      {/* Floating Feedback Button */}
      <FeedbackButton
        position="bottom-right"
        onClick={() => setIsModalOpen(true)}
        style={{
          padding: '12px 24px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '24px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s',
        }}
      >
        💬 Feedback
      </FeedbackButton>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (formData) => {
          const result = await submitFeedback(formData);
          console.log('✅ Feedback submitted successfully:', result);
          alert(`Feedback submitted! Check console for details.\nIssue URL: ${result.issueUrl}`);
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <FeedbackProvider
      config={{
        applicationName: 'Demo App',
        version: '0.0.1',
        apiEndpoint: 'http://localhost:8787',
        apiKey: 'demo-key',
        userId: 'test-user-123',
      }}
    >
      <DemoContent />
    </FeedbackProvider>
  );
}
