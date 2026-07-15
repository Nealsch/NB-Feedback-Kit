/**
 * "Test Connection" probe for storage providers.
 *
 * Sends a tiny (67-byte) 1×1 transparent PNG to the configured endpoint and
 * verifies:
 *   1. The host is reachable (no network failure).
 *   2. CORS is configured to allow the caller's origin.
 *   3. Authentication headers are accepted.
 *   4. The response is JSON and the URL can be resolved at the configured
 *      response path.
 *
 * The probe file is small enough to be negligible on the wire and avoids
 * leaving the user with a large test artifact. The filename is prefixed
 * `__nb-feedback-kit-test__` so the endpoint can identify and (optionally)
 * auto-delete probe uploads.
 */

import type { StorageProviderConfig, StorageTestResult } from './types';
import type { StorageHostContext } from './index';
import { S3StorageProvider } from './providers/s3';

/** 67-byte transparent 1×1 PNG. Smallest valid PNG. */
const PROBE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

/** Filename marker so endpoints can identify and clean up probe uploads. */
const PROBE_FILENAME = '__nb-feedback-kit-test__.png';

/**
 * Run a Test Connection probe against the given storage config.
 *
 * - `{ type: 'none' }` → always success (no network call).
 * - `{ type: 'custom' }` → sends a real probe upload to the endpoint.
 * - `{ type: 's3' }` → calls the Worker presign endpoint (no bytes written).
 *
 * @param config    Storage provider config to probe.
 * @param hostCtx   Required for `s3` (Worker base URL + API key). Ignored by
 *                  `none` and `custom`.
 * @returns A {@link StorageTestResult} describing the outcome.
 */
export async function testStorageProvider(
  config: StorageProviderConfig,
  hostCtx?: StorageHostContext
): Promise<StorageTestResult> {
  if (config.type === 'none') {
    return {
      success: true,
      message: 'Screenshots are disabled. No storage endpoint to test.',
    };
  }

  if (config.type === 'custom') {
    return testCustomEndpoint(config.endpoint);
  }

  if (config.type === 's3') {
    if (!hostCtx) {
      return {
        success: false,
        message: 'Cannot test S3 provider without the Worker API endpoint and key.',
      };
    }
    const provider = new S3StorageProvider({
      config: config.s3,
      apiEndpoint: hostCtx.apiEndpoint,
      apiKey: hostCtx.apiKey,
    });
    return provider.testConnection();
  }

  // Exhaustiveness guard.
  const exhaustive: never = config;
  return {
    success: false,
    message: `Unknown storage provider type: ${JSON.stringify(exhaustive)}`,
  };
}

/** Probe a custom endpoint with a tiny test upload. */
async function testCustomEndpoint(endpoint: {
  url: string;
  method?: 'POST' | 'PUT';
  fieldName?: string;
  headers?: Record<string, string>;
  responseUrlPath?: string;
}): Promise<StorageTestResult> {
  if (!endpoint.url) {
    return { success: false, message: 'Endpoint URL is required.' };
  }

  // Validate URL scheme early — only allow http/https to avoid e.g.
  // javascript: / data: being handed to fetch.
  let parsed: URL;
  try {
    parsed = new URL(endpoint.url);
  } catch {
    return { success: false, message: 'Endpoint URL is not a valid URL.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      success: false,
      message: `Endpoint URL must use http or https (got "${parsed.protocol}").`,
    };
  }

  const method = endpoint.method ?? 'POST';
  const fieldName = endpoint.fieldName ?? 'file';
  const responseUrlPath = endpoint.responseUrlPath ?? 'url';

  // Decode the probe PNG into a real File.
  const probeFile = base64ToFile(PROBE_PNG_BASE64, PROBE_FILENAME, 'image/png');

  // Build the request body the same way CustomEndpointProvider does.
  const headers: Record<string, string> = { ...(endpoint.headers ?? {}) };
  let body: BodyInit;

  if (method === 'PUT') {
    headers['Content-Type'] = headers['Content-Type'] || 'image/png';
    body = probeFile;
  } else {
    const form = new FormData();
    form.append(fieldName, probeFile, PROBE_FILENAME);
    body = form;
    // Don't set Content-Type for FormData — browser sets the boundary.
  }

  // Send the probe.
  let response: Response;
  try {
    response = await fetch(endpoint.url, { method, headers, body });
  } catch (err) {
    // fetch throws on network failure OR on a blocked CORS preflight. The
    // two are indistinguishable from JS, so surface both possibilities.
    const detail = err instanceof Error ? err.message : 'Network request failed';
    return {
      success: false,
      message:
        `Could not reach the endpoint (${detail}). ` +
        'Check the URL, that the server is running, and that CORS allows requests from this origin.',
    };
  }

  // Non-2xx → fail with status + truncated body.
  if (!response.ok) {
    const detail = await safeReadText(response);
    const authHint = response.status === 401 || response.status === 403
      ? ' This usually means the authentication headers are missing or incorrect.'
      : '';
    return {
      success: false,
      message: `Endpoint responded with status ${response.status}${
        detail ? ` — ${detail}` : ''
      }.${authHint}`,
    };
  }

  // Must return JSON.
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      success: false,
      message:
        'Endpoint did not return valid JSON. Verify the server returns a JSON body with the uploaded URL.',
    };
  }

  // Resolve the URL via the configured path.
  const url = resolvePath(json, responseUrlPath);
  if (typeof url !== 'string' || !url) {
    return {
      success: false,
      message:
        `Endpoint responded with 2xx, but no string URL was found at response path "${responseUrlPath}". ` +
        'Check the response shape or adjust the responseUrlPath setting.',
    };
  }

  return {
    success: true,
    message: `Connected successfully. Probe resolved to URL: ${url}`,
    probeUrl: url,
  };
}

/** Decode a base64 string into a File. */
function base64ToFile(base64: string, filename: string, contentType: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: contentType });
}

/** Resolve a dotted path (e.g. `data.url`) on an arbitrary JSON object. */
function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/** Read response text safely, truncated for readability. */
async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.length > 300 ? `${text.slice(0, 300)}…` : text;
  } catch {
    return '';
  }
}