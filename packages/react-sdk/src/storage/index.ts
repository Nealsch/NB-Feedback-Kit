import type { StorageProvider, StorageProviderConfig } from './types';
import { NoneStorageProvider } from './none-provider';
import { CustomEndpointProvider } from './custom-endpoint-provider';
import { S3StorageProvider } from './providers/s3';

/**
 * Host context passed to providers that need to call back into the Worker
 * (e.g. the S3 provider needs the Worker base URL + API key to request
 * presigned URLs). `none` and `custom` providers ignore it.
 */
export interface StorageHostContext {
  /** Fully-qualified Worker base URL, e.g. `https://feedback.example.com`. */
  apiEndpoint: string;
  /** The host app's feedback API key (sent as `X-API-Key`). */
  apiKey: string;
}

/**
 * Factory that maps a {@link StorageProviderConfig} to a concrete
 * {@link StorageProvider}. Defaults to {@link NoneStorageProvider} so
 * existing integrations keep working without any config change.
 *
 * To add a new provider, extend the {@link StorageProviderConfig} union in
 * `./types.ts` and add a branch here. Implementations live in their own file.
 *
 * @param config    Provider config from {@link FeedbackConfig.storage}.
 * @param hostCtx   Host context for providers that call back into the Worker.
 */
export function createStorageProvider(
  config: StorageProviderConfig,
  hostCtx?: StorageHostContext
): StorageProvider {
  switch (config.type) {
    case 'none':
      return new NoneStorageProvider();

    case 'custom':
      return new CustomEndpointProvider(config.endpoint);

    case 's3': {
      if (!hostCtx) {
        throw new Error(
          "The 's3' storage provider requires host context (apiEndpoint + apiKey)."
        );
      }
      return new S3StorageProvider({
        config: config.s3,
        apiEndpoint: hostCtx.apiEndpoint,
        apiKey: hostCtx.apiKey,
      });
    }

    default: {
      // Exhaustiveness guard: adding a new provider type without handling it
      // here becomes a compile error.
      const exhaustive: never = config;
      throw new Error(`Unknown storage provider type: ${JSON.stringify(exhaustive)}`);
    }
  }
}
