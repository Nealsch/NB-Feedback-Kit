import React, { useState } from 'react';
import type {
  StorageProviderConfig,
  StorageTestResult,
  CustomEndpointConfig,
  S3Config,
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
  /**
   * Host context required to test the `s3` provider (Worker base URL +
   * API key). If omitted, the Test Connection button is disabled for S3.
   */
  hostContext?: { apiEndpoint: string; apiKey: string };
}

/** Provider types selectable in the UI. */
type ProviderType = 'none' | 'custom' | 's3';

/**
 * Internal form state. Mirrors {@link StorageProviderConfig} but keeps all
 * fields editable as strings so the user can type partial values without
 * the discriminated union fighting them.
 */
interface FormState {
  type: ProviderType;
  // — custom-endpoint fields —
  url: string;
  method: 'POST' | 'PUT';
  fieldName: string;
  responseUrlPath: string;
  headersText: string; // JSON-encoded headers, edited as free text
  // — s3 fields —
  s3Bucket: string;
  s3Region: string;
  s3Endpoint: string;
  s3KeyPrefix: string;
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
  hostContext,
}: StorageConfigPanelProps) {
  const initial = toFormState(initialConfig);
  const [form, setForm] = useState<FormState>(initial);

  // Test Connection state.
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<StorageTestResult | null>(null);

  // Apply-time validation errors.
  const [formError, setFormError] = useState<string | null>(null);

  /** Convert the form state into a StorageProviderConfig (or an error). */
  const buildConfig = (): StorageProviderConfig | { error: string } => {
    if (form.type === 'none') {
      return { type: 'none' };
    }

    if (form.type === 's3') {
      if (!form.s3Bucket.trim()) {
        return { error: 'Bucket name is required for the S3 provider.' };
      }
      if (!form.s3Region.trim()) {
        return { error: 'Region is required for the S3 provider.' };
      }
      const s3: S3Config = {
        bucket: form.s3Bucket.trim(),
        region: form.s3Region.trim(),
        ...(form.s3Endpoint.trim() ? { endpoint: form.s3Endpoint.trim() } : {}),
        ...(form.s3KeyPrefix.trim() ? { keyPrefix: form.s3KeyPrefix.trim() } : {}),
      };
      return { type: 's3', s3 };
    }

    // form.type === 'custom'
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
      const result = await testStorageProvider(built, hostContext);
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

  const canTestS3 = !!hostContext;

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
            setForm({ ...form, type: e.target.value as ProviderType });
            setTestResult(null);
            setFormError(null);
          }}
          style={inputStyle}
        >
          <option value="none">None — screenshots disabled (default)</option>
          <option value="s3">S3-Compatible — AWS S3, Cloudflare R2, MinIO, B2</option>
          <option value="custom">Custom Endpoint — upload to your own URL</option>
        </select>
      </div>

      {/* Dynamic fields for the S3-compatible provider */}
      {form.type === 's3' && (
        <>
          <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#eff6ff', borderRadius: '4px', fontSize: '12px', color: '#1e40af' }}>
            <strong>🔒 Secure by design:</strong> Cloud credentials (access key + secret) live
            only on the Worker as secrets — they are <strong>never</strong> embedded in the app
            bundle. The SDK asks the Worker for a short-lived presigned upload URL on each
            screenshot. Configure the Worker secrets <code>S3_ACCESS_KEY_ID</code>,{' '}
            <code>S3_SECRET_ACCESS_KEY</code>, and <code>S3_ALLOWED_BUCKETS</code>.
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="s3-bucket" style={labelStyle}>
              Bucket Name *
            </label>
            <input
              id="s3-bucket"
              type="text"
              value={form.s3Bucket}
              onChange={(e) => {
                setForm({ ...form, s3Bucket: e.target.value });
                setTestResult(null);
              }}
              placeholder="my-feedback-bucket"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="s3-region" style={labelStyle}>
                Region *
              </label>
              <input
                id="s3-region"
                type="text"
                value={form.s3Region}
                onChange={(e) => setForm({ ...form, s3Region: e.target.value })}
                placeholder="us-east-1 (or auto for R2)"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="s3-prefix" style={labelStyle}>
                Key Prefix
              </label>
              <input
                id="s3-prefix"
                type="text"
                value={form.s3KeyPrefix}
                onChange={(e) => setForm({ ...form, s3KeyPrefix: e.target.value })}
                placeholder="feedback/"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="s3-endpoint" style={labelStyle}>
              Custom Endpoint (optional)
            </label>
            <input
              id="s3-endpoint"
              type="url"
              value={form.s3Endpoint}
              onChange={(e) => {
                setForm({ ...form, s3Endpoint: e.target.value });
                setTestResult(null);
              }}
              placeholder="https://<account>.r2.cloudflarestorage.com (leave blank for AWS S3)"
              style={inputStyle}
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Omit for standard AWS S3. Set for Cloudflare R2, MinIO, or Backblaze B2.
            </div>
          </div>

          {!canTestS3 && (
            <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '12px' }}>
              ⚠️ Pass <code>hostContext</code> to <code>StorageConfigPanel</code> to enable the
              Test Connection probe for S3.
            </div>
          )}
        </>
      )}

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
          disabled={isTesting || (form.type === 's3' && !canTestS3)}
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
  const base: FormState = {
    type: 'none',
    url: '',
    method: 'POST',
    fieldName: 'file',
    responseUrlPath: 'url',
    headersText: '',
    s3Bucket: '',
    s3Region: '',
    s3Endpoint: '',
    s3KeyPrefix: '',
  };

  if (!config || config.type === 'none') {
    return base;
  }

  if (config.type === 's3') {
    return {
      ...base,
      type: 's3',
      s3Bucket: config.s3.bucket,
      s3Region: config.s3.region,
      s3Endpoint: config.s3.endpoint ?? '',
      s3KeyPrefix: config.s3.keyPrefix ?? '',
    };
  }

  // config.type === 'custom'
  const e = config.endpoint;
  return {
    ...base,
    type: 'custom',
    url: e.url,
    method: e.method ?? 'POST',
    fieldName: e.fieldName ?? 'file',
    responseUrlPath: e.responseUrlPath ?? 'url',
    headersText:
      e.headers && Object.keys(e.headers).length > 0 ? JSON.stringify(e.headers, null, 2) : '',
  };
}