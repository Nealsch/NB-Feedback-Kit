import React, { useState } from 'react';
import type {
  StorageProviderConfig,
  StorageTestResult,
  CustomEndpointConfig,
} from '../storage/types';
import { testStorageProvider } from '../storage/test-connection';

/**
 * Props for {@link StorageConfigPanel}.
 */
export interface StorageConfigPanelProps {
  /**
   * Initial config to seed the form. Defaults to `{ type: 'none' }`.
   * Callers typically pass the currently-applied config so the form opens
   * in sync with the live system.
   */
  initialConfig?: StorageProviderConfig;
  /**
   * Called when the user clicks "Apply". The host should pass `config` to
   * `FeedbackProvider` and persist it as desired.
   */
  onApply: (config: StorageProviderConfig) => void;
  /** Optional close handler. When provided, a Cancel button is rendered. */
  onCancel?: () => void;
  /** Optional className/style passthrough (same convention as FeedbackModal). */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Internal form state. Mirrors {@link StorageProviderConfig} but keeps the
 * custom-endpoint fields editable as strings (URL, JSON headers) so the user
 * can type partial values without the discriminated union fighting them.
 */
interface FormState {
  type: 'none' | 'custom';
  url: string;
  method: 'POST' | 'PUT';
  fieldName: string;
  responseUrlPath: string;
  headersText: string; // JSON-encoded headers, edited as free text
}

/**
 * Configuration UI for the screenshot storage provider.
 *
 * Renders a provider-type selector, dynamic config fields for the chosen
 * provider, and a **Test Connection** button that runs a live probe via
 * {@link testStorageProvider} before the user commits the config.
 *
 * Styled with inline styles to match {@link FeedbackModal} — no CSS
 * dependency, no class-name collisions, drop-in anywhere.
 */
export function StorageConfigPanel({
  initialConfig,
  onApply,
  onCancel,
  className = '',
  style,
}: StorageConfigPanelProps) {
  const initial = toFormState(initialConfig);
  const [form, setForm] = useState<FormState>(initial);

  // Test Connection state.
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<StorageTestResult | null>(null);

  // Apply-time validation errors.
  const [formError, setFormError] = useState<string | null>(null);

  /** Convert the form state into a StorageProviderConfig (or null if invalid). */
  const buildConfig = (): StorageProviderConfig | { error: string } => {
    if (form.type === 'none') {
      return { type: 'none' };
    }

    if (!form.url.trim()) {
      return { error: 'Endpoint URL is required for the custom provider.' };
    }

    // Parse headers JSON (may be empty).
    let headers: Record<string, string> | undefined;
    const trimmedHeaders = form.headersText.trim();
    if (trimmedHeaders) {
      try {
        const parsed = JSON.parse(trimmedHeaders);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { error: 'Headers must be a JSON object, e.g. {"X-API-Key":"..."}.' };
        }
        headers = parsed as Record<string, string>;
      } catch {
        return { error: 'Headers are not valid JSON.' };
      }
    }

    const endpoint: CustomEndpointConfig = {
      url: form.url.trim(),
      method: form.method,
      ...(form.fieldName.trim() ? { fieldName: form.fieldName.trim() } : {}),
      ...(form.responseUrlPath.trim() ? { responseUrlPath: form.responseUrlPath.trim() } : {}),
      ...(headers ? { headers } : {}),
    };

    return { type: 'custom', endpoint };
  };

  /** Run the Test Connection probe. */
  const handleTestConnection = async () => {
    setFormError(null);
    const built = buildConfig();
    if ('error' in built) {
      setFormError(built.error);
      setTestResult(null);
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testStorageProvider(built);
      setTestResult(result);
    } catch (err) {
      // Defensive — testStorageProvider catches internally, but never say never.
      const message = err instanceof Error ? err.message : 'Unexpected error during test.';
      setTestResult({ success: false, message });
    } finally {
      setIsTesting(false);
    }
  };

  /** Apply the config (after a final validation). */
  const handleApply = () => {
    setFormError(null);
    const built = buildConfig();
    if ('error' in built) {
      setFormError(built.error);
      return;
    }
    onApply(built);
  };

  // Shared input style (matches FeedbackModal).
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '4px',
    fontWeight: 'bold',
    fontSize: '14px',
  };

  return (
    <div className={className} style={style}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Screenshot Storage Settings</h2>

      {/* Provider type selector */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="storage-type" style={labelStyle}>
          Storage Provider
        </label>
        <select
          id="storage-type"
          value={form.type}
          onChange={(e) => {
            setForm({ ...form, type: e.target.value as 'none' | 'custom' });
            setTestResult(null);
            setFormError(null);
          }}
          style={inputStyle}
        >
          <option value="none">None — screenshots disabled (default)</option>
          <option value="custom">Custom Endpoint — upload to your own URL</option>
        </select>
      </div>

      {/* Dynamic fields for the custom endpoint */}
      {form.type === 'custom' && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="storage-url" style={labelStyle}>
              Endpoint URL *
            </label>
            <input
              id="storage-url"
              type="url"
              value={form.url}
              onChange={(e) => {
                setForm({ ...form, url: e.target.value });
                setTestResult(null);
              }}
              placeholder="https://upload.example.com/api/screenshots"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="storage-method" style={labelStyle}>
                Method
              </label>
              <select
                id="storage-method"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value as 'POST' | 'PUT' })}
                style={inputStyle}
              >
                <option value="POST">POST (multipart/form-data)</option>
                <option value="PUT">PUT (raw binary body)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="storage-field" style={labelStyle}>
                Form Field Name
              </label>
              <input
                id="storage-field"
                type="text"
                value={form.fieldName}
                onChange={(e) => setForm({ ...form, fieldName: e.target.value })}
                placeholder="file"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="storage-path" style={labelStyle}>
              Response URL Path
            </label>
            <input
              id="storage-path"
              type="text"
              value={form.responseUrlPath}
              onChange={(e) => setForm({ ...form, responseUrlPath: e.target.value })}
              placeholder="url"
              style={inputStyle}
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Dotted path to the uploaded URL in the JSON response. e.g. <code>data.url</code> for
              <code>{' { data: { url: "..." } }'}</code>.
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="storage-headers" style={labelStyle}>
              Extra Headers (JSON)
            </label>
            <textarea
              id="storage-headers"
              value={form.headersText}
              onChange={(e) => {
                setForm({ ...form, headersText: e.target.value });
                setTestResult(null);
              }}
              placeholder={'{ "X-API-Key": "your-key", "X-Tenant": "acme" }'}
              rows={3}
              style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Optional. Sent with every upload. Never put secrets you can't rotate.
            </div>
          </div>
        </>
      )}

      {/* Form-level validation error */}
      {formError && (
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
          <strong>⚠️ </strong>{formError}
        </div>
      )}

      {/* Test Connection result */}
      {testResult && (
        <div
          role={testResult.success ? 'status' : 'alert'}
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: testResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${testResult.success ? '#22c55e' : '#ef4444'}`,
            borderRadius: '4px',
            color: testResult.success ? '#166534' : '#991b1b',
            fontSize: '14px',
            wordBreak: 'break-word',
          }}
        >
          <strong>{testResult.success ? '✅ ' : '❌ '}</strong>
          {testResult.message}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isTesting}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: isTesting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isTesting}
          style={{
            padding: '8px 16px',
            border: '1px solid #3b82f6',
            borderRadius: '4px',
            backgroundColor: isTesting ? '#eff6ff' : 'white',
            color: '#3b82f6',
            cursor: isTesting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {isTesting ? 'Testing…' : '🔌 Test Connection'}
        </button>

        <button
          type="button"
          onClick={handleApply}
          disabled={isTesting}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: isTesting ? '#ccc' : '#3b82f6',
            color: 'white',
            cursor: isTesting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/**
 * Convert a {@link StorageProviderConfig} into editable form state.
 * Defaults to `{ type: 'none' }` when undefined.
 */
function toFormState(config?: StorageProviderConfig): FormState {
  if (!config || config.type === 'none') {
    return {
      type: 'none',
      url: '',
      method: 'POST',
      fieldName: 'file',
      responseUrlPath: 'url',
      headersText: '',
    };
  }

  const e = config.endpoint;
  return {
    type: 'custom',
    url: e.url,
    method: e.method ?? 'POST',
    fieldName: e.fieldName ?? 'file',
    responseUrlPath: e.responseUrlPath ?? 'url',
    headersText:
      e.headers && Object.keys(e.headers).length > 0 ? JSON.stringify(e.headers, null, 2) : '',
  };
}