import React, { useEffect, useRef } from 'react';
import type { ReleaseNote } from '@nb-feedback-kit/shared-types';

export interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  releases: ReleaseNote[];
  loading?: boolean;
  error?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export function ReleaseNotesModal({
  isOpen,
  onClose,
  releases,
  loading = false,
  error = null,
  className = '',
  style,
}: ReleaseNotesModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the close button on open
  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const formatDate = (isoDate: string): string => {
    try {
      return new Date(isoDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        ...style,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-notes-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h2 id="release-notes-modal-title" style={{ margin: 0, fontSize: '24px' }}>
            Release Notes
          </h2>
        </div>

        {/* Close Button */}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close release notes"
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

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
            Loading release notes...
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div role="alert" style={{ padding: '16px', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && releases.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
            No release notes available yet.
          </div>
        )}

        {/* Release List */}
        {!loading && !error && releases.length > 0 && (
          <div>
            {releases.map((release, index) => (
              <article
                key={`${release.version}-${index}`}
                style={{
                  padding: '16px 0',
                  borderBottom: index < releases.length - 1 ? '1px solid #eee' : 'none',
                }}
              >
                <header style={{ marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>
                    {release.url ? (
                      <a
                        href={release.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          marginRight: '8px',
                          textDecoration: 'none',
                        }}
                      >
                        {release.version} ↗
                      </a>
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          marginRight: '8px',
                        }}
                      >
                        {release.version}
                      </span>
                    )}
                  </h3>
                  <time
                    style={{
                      color: '#666',
                      fontSize: '12px',
                    }}
                  >
                    {formatDate(release.date)}
                  </time>
                </header>
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#333',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {release.body}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}