import React, { useEffect, useRef } from 'react';
import type { RoadmapItem } from '@nb-feedback-kit/shared-types';

export interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  roadmap: RoadmapItem[];
  loading?: boolean;
  error?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

type Status = RoadmapItem['status'];

const STATUS_META: Record<Status, { label: string; emoji: string }> = {
  planned: { label: 'Planned', emoji: '📋' },
  'in-progress': { label: 'In Progress', emoji: '🚧' },
  released: { label: 'Released', emoji: '✅' },
};

/**
 * Groups roadmap items by status, preserving the canonical display order:
 * planned → in-progress → released.
 */
function groupByStatus(items: RoadmapItem[]): Record<Status, RoadmapItem[]> {
  const grouped: Record<Status, RoadmapItem[]> = {
    planned: [],
    'in-progress': [],
    released: [],
  };

  for (const item of items) {
    if (grouped[item.status]) {
      grouped[item.status].push(item);
    }
  }

  return grouped;
}

export function RoadmapModal({
  isOpen,
  onClose,
  roadmap,
  loading = false,
  error = null,
  className = '',
  style,
}: RoadmapModalProps) {
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

  const grouped = groupByStatus(roadmap);
  const statuses: Status[] = ['planned', 'in-progress', 'released'];

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
      aria-labelledby="roadmap-modal-title"
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
          <h2 id="roadmap-modal-title" style={{ margin: 0, fontSize: '24px' }}>
            Roadmap
          </h2>
        </div>

        {/* Close Button */}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close roadmap"
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
            Loading roadmap...
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div role="alert" style={{ padding: '16px', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && roadmap.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
            No roadmap items available yet.
          </div>
        )}

        {/* Roadmap by Status */}
        {!loading && !error && roadmap.length > 0 && (
          <div>
            {statuses.map((status) => {
              const items = grouped[status];
              if (items.length === 0) {
                return null;
              }

              const meta = STATUS_META[status];

              return (
                <section key={status} style={{ marginBottom: '24px' }}>
                  <h3
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <span aria-hidden="true">{meta.emoji}</span>
                    <span>{meta.label}</span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#999',
                        fontWeight: 'normal',
                      }}
                    >
                      ({items.length})
                    </span>
                  </h3>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {items.map((item) => (
                      <li key={item.id} style={{ padding: '8px 0' }}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#1f2937',
                            textDecoration: 'none',
                            fontSize: '14px',
                            lineHeight: '1.5',
                          }}
                        >
                          {item.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}