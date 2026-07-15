import type { UploadedFile } from '@nb-feedback-kit/shared-types';
import type { StorageProvider } from './types';

/**
 * No-op storage provider. Screenshots are disabled: {@link upload} always
 * throws (it should never be called when `enabled` is false) and the picker
 * is hidden. This is the default so existing integrations keep working
 * without any config change.
 */
export class NoneStorageProvider implements StorageProvider {
  readonly enabled = false;

  upload(_file: File): Promise<UploadedFile> {
    return Promise.reject(
      new Error('Screenshot uploads are disabled (storage provider is "none").')
    );
  }
}