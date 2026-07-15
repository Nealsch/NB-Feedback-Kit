import { describe, it, expect } from 'vitest';
import { hashApiKey } from './hash';

describe('hashApiKey (FEEDBACK-4)', () => {
  it('produces a 64-character lowercase hex digest', async () => {
    const digest = await hashApiKey('nbfb_test_key_abc123');
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — the same input always hashes to the same digest', async () => {
    const key = 'nbfb_deterministic_key';
    const a = await hashApiKey(key);
    const b = await hashApiKey(key);
    expect(a).toBe(b);
  });

  it('produces different digests for different keys (collision sanity)', async () => {
    const a = await hashApiKey('key_one');
    const b = await hashApiKey('key_two');
    expect(a).not.toBe(b);
  });

  it('matches the known SHA-256 test vector for "hello"', async () => {
    // The SHA-256 of "hello" is well-known: matches RFC test vectors.
    const digest = await hashApiKey('hello');
    expect(digest).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('does not leak the raw key into the digest (one-way)', async () => {
    const key = 'nbfb_should_not_appear_in_output_SECRET';
    const digest = await hashApiKey(key);
    expect(digest).not.toContain(key);
    expect(digest).not.toContain('SECRET');
  });

  it('handles empty-string input without throwing', async () => {
    const digest = await hashApiKey('');
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    // SHA-256 of empty string is the well-known e3b0c44...
    expect(digest).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('handles unicode / multi-byte input', async () => {
    const digest = await hashApiKey('🔑-alpha-key-ßüå');
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});