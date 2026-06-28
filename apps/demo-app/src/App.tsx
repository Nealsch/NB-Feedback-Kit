import { useState } from 'react';
import {
  FeedbackProvider,
  useFeedback,
  useSubmitFeedback,
  useReleaseNotes,
  useRoadmap,
  FeedbackButton,
  FeedbackModal,
  ReleaseNotesModal,
  RoadmapModal,
} from '@nb-feedback-kit/react-sdk';
import { useRouter } from './hooks/useRouter';
import { Nav } from './components/Nav';
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { AboutPage } from './pages/AboutPage';

function DemoContent() {
  const { config, metadata } = useFeedback();
  const { submitFeedback } = useSubmitFeedback();
  const { releases, loading: releasesLoading, error: releasesError } = useReleaseNotes();
  const { roadmap, loading: roadmapLoading, error: roadmapError } = useRoadmap();
  const { path, navigate } = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const renderPage = () => {
    switch (path) {
      case '/features':
        return <FeaturesPage />;
      case '/about':
        return <AboutPage />;
      case '/':
      default:
        return (
          <HomePage
            onOpenFeedback={() => setIsModalOpen(true)}
            onOpenReleaseNotes={() => setIsReleaseNotesOpen(true)}
            onOpenRoadmap={() => setIsRoadmapOpen(true)}
          />
        );
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <Nav currentPath={path} onNavigate={navigate} />

      {renderPage()}

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
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: '1rem',
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '14px',
                }}
              >
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <h3>⚙️ SDK Configuration</h3>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: '1rem',
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '14px',
                }}
              >
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
          // Only reached on success — failures throw and are surfaced inline by the modal.
          console.log('✅ Feedback submitted successfully:', result);
          alert(`Feedback submitted! Check console for details.\nIssue URL: ${result.issueUrl}`);
        }}
      />

      {/* Release Notes Modal */}
      <ReleaseNotesModal
        isOpen={isReleaseNotesOpen}
        onClose={() => setIsReleaseNotesOpen(false)}
        releases={releases}
        loading={releasesLoading}
        error={releasesError}
      />

      {/* Roadmap Modal */}
      <RoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
        roadmap={roadmap}
        loading={roadmapLoading}
        error={roadmapError}
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