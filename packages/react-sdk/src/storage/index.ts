import type { StorageProvider, StorageProviderConfig } from './types';
import { NoneStorageProvider } from './none-provider';
import { CustomEndpointProvider } from './custom-endpoint-provider';

/**
 * Factory that maps a {@link StorageProviderConfig} to a concrete
 * {@link StorageProvider}. Defaults to {@link NoneStorageProvider} so
 * existing integrations keep working without any config change.
 *
 * To add a new provider, extend the {@link StorageProviderConfig} union in
 * `./types.ts` and add a branch here. Implementations live in their own file.
 */
export function createStorageProvider(config: StorageProviderConfig): StorageProvider {
  switch (config.type) {
    case 'none':
      return new NoneStorageProvider();

    case 'custom':
      return new CustomEndpointProvider(config.endpoint);

    default: {
      // Exhaustiveness guard: adding a new provider type without handling it
      // here becomes a compile error.
      const exhaustive: never = config;
      throw new Error(`Unknown storage provider type: ${JSON.stringify(exhaustive)}`);
    }
  }
}