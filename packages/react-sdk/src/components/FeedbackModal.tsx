import React, { useEffect, useRef, useState, FormEvent } from 'react';
import type { FeedbackType } from '@nb-feedback-kit/shared-types';

export interface FeedbackFormData {
  type: FeedbackType;
  title: string;
  description: string;
}

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FeedbackFormData) => void | Promise<void>;
  className?: string;
  style?: React.CSSProperties;
}

export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  className = '',
  style,
}: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('feedback');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus trap on open
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
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

  const validateForm = (): boolean => {
    const newErrors: { title?: string; description?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null); // clear previous error on retry
    try {
      await onSubmit({
        type,
        title: title.trim(),
        description: description.trim(),
      });

      // Reset form on success
      setType('feedback');
      setTitle('');
      setDescription('');
      setErrors({});
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit feedback';
      console.error('Failed to submit feedback:', message);
      // Surface inline error so user can see what went wrong and retry
      setSubmitError(message);
      // Keep modal open on error so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

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
      aria-labelledby="feedback-modal-title"
      onClick={(e) => {
        // Close on backdrop click
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
        ref={modalRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '500px',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <h2 id="feedback-modal-title" style={{ margin: 0, fontSize: '24px' }}>
              Send Feedback
            </h2>
          </div>

          {/* Close Button */}
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onClose}
            aria-label="Close feedback form"
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

          {/* Type Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="feedback-type" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Feedback Type
            </label>
            <select
              id="feedback-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="bug">🐛 Bug Report</option>
              <option value="feature">💡 Feature Request</option>
              <option value="feedback">💬 General Feedback</option>
            </select>
          </div>

          {/* Title Input */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="feedback-title" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Title *
            </label>
            <input
              id="feedback-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) {
                  setErrors({ ...errors, title: undefined });
                }
              }}
              placeholder="Brief summary of your feedback"
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${errors.title ? '#ef4444' : '#ccc'}`,
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            {errors.title && (
              <div id="title-error" role="alert" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.title}
              </div>
            )}
          </div>

          {/* Description Textarea */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="feedback-description" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Description *
            </label>
            <textarea
              id="feedback-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors({ ...errors, description: undefined });
                }
              }}
              placeholder="Detailed description of your feedback"
              rows={5}
              aria-required="true"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${errors.description ? '#ef4444' : '#ccc'}`,
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
            {errors.description && (
              <div id="description-error" role="alert" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.description}
              </div>
            )}
          </div>

          {/* Submission Error Banner */}
          {submitError && (
            <div
              role="alert"
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                color: '#991b1b',
                fontSize: '14px',
              }}
            >
              <strong>⚠️ Submission failed:</strong> {submitError}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isSubmitting ? '#ccc' : '#3b82f6',
                color: 'white',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
