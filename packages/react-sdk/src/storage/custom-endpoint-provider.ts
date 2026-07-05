import type { UploadedFile } from '@nb-feedback-kit/shared-types';
import type { CustomEndpointConfig, StorageProvider } from './types';

/**
 * Default field name for the multipart form part carrying the file.
 */
const DEFAULT_FIELD_NAME = 'file';

/**
 * Default dotted path into the JSON response that holds the uploaded URL.
 */
const DEFAULT_RESPONSE_URL_PATH = 'url';

/**
 * Resolve a dotted path (e.g. `data.url`) on an arbitrary JSON object.
 * Returns `undefined` if any segment is missing or not an object.
 */
function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Storage provider that uploads to a user-supplied HTTP endpoint.
 *
 * By default it sends a `multipart/form-data` request with the file under
 * {@link CustomEndpointConfig.fieldName} and reads the resulting URL from
 * {@link CustomEndpointConfig.responseUrlPath}. Use `PUT` for direct binary
 * uploads (the file is sent as the request body, no multipart envelope).
 *
 * Failures (non-2xx, network error, missing URL in response) throw so the
 * caller can fall back to creating the issue without the attachment.
 */
export class CustomEndpointProvider implements StorageProvider {
  readonly enabled = true;
  private readonly config: Required<Omit<CustomEndpointConfig, 'headers'>> & {
    headers: Record<string, string>;
  };

  constructor(config: CustomEndpointConfig) {
    if (!config.url) {
      throw new Error('CustomEndpointProvider: `url` is required.');
    }
    this.config = {
      url: config.url,
      method: config.method ?? 'POST',
      fieldName: config.fieldName ?? DEFAULT_FIELD_NAME,
      responseUrlPath: config.responseUrlPath ?? DEFAULT_RESPONSE_URL_PATH,
      headers: { ...(config.headers ?? {}) },
    };
  }

  async upload(file: File): Promise<UploadedFile> {
    // PUT → raw binary body; POST → multipart/form-data by convention.
    const isPut = this.config.method === 'PUT';

    const headers: Record<string, string> = { ...this.config.headers };
    let body: BodyInit;

    if (isPut) {
      headers['Content-Type'] = headers['Content-Type'] || file.type || 'application/octet-stream';
      body = file;
    } else {
      const form = new FormData();
      form.append(this.config.fieldName, file, file.name);
      body = form;
      // Do NOT set Content-Type manually for FormData — the browser sets the
      // multipart boundary. Overriding it breaks parsing on the server.
    }

    let response: Response;
    try {
      response = await fetch(this.config.url, {
        method: this.config.method,
        headers,
        body,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network request failed';
      throw new Error(`Screenshot upload failed (network): ${message}`);
    }

    if (!response.ok) {
      const text = await safeReadText(response);
      throw new Error(
        `Screenshot upload failed: endpoint responded with status ${response.status}${text ? ` — ${text}` : ''}`
      );
    }

    // Parse JSON and resolve the URL via the configured path.
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new Error(
        'Screenshot upload failed: endpoint did not return valid JSON.'
      );
    }

    const url = resolvePath(json, this.config.responseUrlPath);
    if (typeof url !== 'string' || !url) {
      throw new Error(
        `Screenshot upload failed: could not find a string URL at response path "${this.config.responseUrlPath}".`
      );
    }

    return {
      url,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    };
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    // Truncate long error bodies so the thrown message stays readable.
    return text.length > 300 ? `${text.slice(0, 300)}…` : text;
  } catch {
    return '';
  }
}