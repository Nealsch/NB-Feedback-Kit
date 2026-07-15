import React, { useEffect, useRef, useState, FormEvent } from 'react';
import type { FeedbackType, UploadedFile } from '@nb-feedback-kit/shared-types';
import type { StorageProvider } from '../storage/types';

export interface FeedbackFormData {
  type: FeedbackType;
  title: string;
  description: string;
  /**
   * Successfully uploaded screenshots to embed in the issue. Absent when the
   * storage provider is disabled. May be shorter than the number of files
   * the user picked if some uploads failed (see `uploadErrors`).
   */
  attachments?: UploadedFile[];
}

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FeedbackFormData) => void | Promise<void>;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Storage provider used to upload screenshots. When omitted or when
   * `provider.enabled === false`, the screenshot picker is hidden entirely.
   * Typically sourced from `useFeedback().storage`.
   */
  storageProvider?: StorageProvider;
}

/**
 * Per-file state for the screenshot picker.
 * `uploading` files are in-flight; `uploaded` files succeeded; `error`
 * files failed (kept visible so the user can retry by removing + re-adding).
 */
interface AttachmentState {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'uploaded' | 'error';
  uploaded?: UploadedFile;
  error?: string;
}

export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  className = '',
  style,
  storageProvider,
}: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('feedback');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Screenshot attachments. Only used when storageProvider?.enabled === true.
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Screenshots are shown only when a provider is enabled.
  const screenshotsEnabled = !!storageProvider?.enabled;

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

  /**
   * Handle one or more files chosen from the photo album. Adds them to state
   * and kicks off uploads immediately; per-file failures are recorded and
   * do not block form submission.
   */
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0 || !storageProvider) return;

    const newEntries: AttachmentState[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading' as const,
      }));

    if (newEntries.length === 0) return;
    setAttachments((prev) => [...prev, ...newEntries]);

    // Upload each file independently.
    newEntries.forEach(async (entry) => {
      try {
        const uploaded = await storageProvider.upload(entry.file);
        setAttachments((prev) =>
          prev.map((a) => (a.id === entry.id ? { ...a, status: 'uploaded', uploaded } : a))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        console.error(`Screenshot upload failed for ${entry.file.name}:`, message);
        setAttachments((prev) =>
          prev.map((a) => (a.id === entry.id ? { ...a, status: 'error', error: message } : a))
        );
      }
    });
  };

  /** Remove an attachment and revoke its object URL to avoid leaks. */
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  /** Successfully uploaded files to forward to onSubmit. */
  const completedAttachments = (): UploadedFile[] =>
    attachments.filter((a) => a.status === 'uploaded' && a.uploaded).map((a) => a.uploaded!);

  const hasUploadingAttachments = attachments.some((a) => a.status === 'uploading');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null); // clear previous error on retry
    try {
      const attachmentsDone = completedAttachments();
      await onSubmit({
        type,
        title: title.trim(),
        description: description.trim(),
        // Only include the attachments key when screenshots are enabled, so
        // disabled-config payloads stay byte-identical to before.
        ...(screenshotsEnabled ? { attachments: attachmentsDone } : {}),
      });

      // Reset form on success (including revoking object URLs).
      setType('feedback');
      setTitle('');
      setDescription('');
      setErrors({});
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      setAttachments([]);
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

          {/* Screenshot Picker (only when a storage provider is enabled) */}
          {screenshotsEnabled && (
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="feedback-screenshots"
                style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
              >
                Screenshots
              </label>

              {/* Hidden input rendered via a button to invoke the native album/camera picker. */}
              <input
                ref={fileInputRef}
                id="feedback-screenshots"
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  // Reset so selecting the same file again still fires onChange.
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 16px',
                  border: '1px dashed #9ca3af',
                  borderRadius: '4px',
                  backgroundColor: '#f9fafb',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                📎 Attach Screenshot
              </button>

              {/* Preview thumbnails */}
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        position: 'relative',
                        width: '72px',
                        height: '72px',
                        border: `1px solid ${a.status === 'error' ? '#ef4444' : '#ccc'}`,
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={a.previewUrl}
                        alt={a.file.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor:
                            a.status === 'uploading'
                              ? 'rgba(255,255,255,0.6)'
                              : a.status === 'error'
                                ? 'rgba(239,68,68,0.6)'
                                : 'transparent',
                          color: a.status === 'error' ? 'white' : '#374151',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          padding: '2px',
                        }}
                      >
                        {a.status === 'uploading' ? 'Uploading…' : a.status === 'error' ? 'Failed' : ''}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.id)}
                        aria-label={`Remove ${a.file.name}`}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '18px',
                          height: '18px',
                          padding: 0,
                          border: 'none',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Per-upload failure note (graceful: does not block submit). */}
              {attachments.some((a) => a.status === 'error') && (
                <div role="note" style={{ color: '#991b1b', fontSize: '12px', marginTop: '6px' }}>
                  One or more screenshots failed to upload. The feedback will still be submitted
                  without them. Remove and re-attach to retry.
                </div>
              )}
            </div>
          )}

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
              disabled={isSubmitting || hasUploadingAttachments}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isSubmitting || hasUploadingAttachments ? '#ccc' : '#3b82f6',
                color: 'white',
                cursor: isSubmitting || hasUploadingAttachments ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              {isSubmitting
                ? 'Submitting...'
                : hasUploadingAttachments
                  ? 'Uploading screenshots…'
                  : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
