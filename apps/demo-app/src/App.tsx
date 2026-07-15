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
  StorageConfigPanel,
  type StorageProviderConfig,
} from '@nb-feedback-kit/react-sdk';
import { useRouter } from './hooks/useRouter';
import { Nav } from './components/Nav';
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { AboutPage } from './pages/AboutPage';

interface DemoContentProps {
  /** Current screenshot storage config (lifted so it can change at runtime). */
  storageConfig: StorageProviderConfig;
  /** Setter used by the StorageConfigPanel's Apply button. */
  onStorageConfigChange: (config: StorageProviderConfig) => void;
}

function DemoContent({ storageConfig, onStorageConfigChange }: DemoContentProps) {
  const { config, metadata, storage } = useFeedback();
  const { submitFeedback } = useSubmitFeedback();
  const { releases, loading: releasesLoading, error: releasesError } = useReleaseNotes();
  const { roadmap, loading: roadmapLoading, error: roadmapError } = useRoadmap();
  const { path, navigate } = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isStoragePanelOpen, setIsStoragePanelOpen] = useState(false);
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

      {/* Screenshot Storage Settings launcher */}
      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => setIsStoragePanelOpen(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          ⚙️ Screenshot Storage Settings
        </button>
        <span style={{ marginLeft: '12px', fontSize: '13px', color: '#6b7280' }}>
          Current provider: <strong>{storageConfig.type}</strong>
        </span>
      </div>

      <div style={{ marginTop: '1rem' }}>
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
        storageProvider={storage}
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

      {/* Storage Settings overlay */}
      {isStoragePanelOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="storage-panel-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsStoragePanelOpen(false);
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            aria-hidden="true"
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '520px',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => setIsStoragePanelOpen(false)}
              aria-label="Close storage settings"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 'none',
                background: 'transparent',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ×
            </button>

            <StorageConfigPanel
              initialConfig={storageConfig}
              onApply={(next) => {
                onStorageConfigChange(next);
                setIsStoragePanelOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  // Storage config is lifted to App-level state so the StorageConfigPanel
  // can change it at runtime. Start with screenshots disabled (the default).
  const [storageConfig, setStorageConfig] = useState<StorageProviderConfig>({
    type: 'none',
  });

  return (
    <FeedbackProvider
      config={{
        applicationName: 'Demo App',
        version: '0.0.1',
        apiEndpoint: 'http://localhost:8787',
        apiKey: 'demo-key',
        userId: 'test-user-123',
        // Screenshot attachments. Changed at runtime via the
        // "Screenshot Storage Settings" button, which opens the
        // StorageConfigPanel (with its Test Connection probe).
        storage: storageConfig,
      }}
    >
      <DemoContent
        storageConfig={storageConfig}
        onStorageConfigChange={setStorageConfig}
      />
    </FeedbackProvider>
  );
}