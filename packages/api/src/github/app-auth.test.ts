/**
 * Tests for GitHub App PEM private-key import.
 *
 * Background: GitHub App keys are downloaded as PKCS#1
 * (`-----BEGIN RSA PRIVATE KEY-----`), but the Web Crypto API only supports
 * PKCS#8 for private-key import. `importPrivateKey()` detects the format and
 * wraps PKCS#1 → PKCS#8 before calling `crypto.subtle.importKey`.
 *
 * These tests verify:
 *   1. PKCS#1 PEM imports successfully (the GitHub App format — the bug fix).
 *   2. PKCS#8 PEM imports successfully (the format that always worked).
 *   3. Both formats produce keys with the correct algorithm + usages.
 *   4. Literal `\n` newlines (how Cloudflare stores secrets) are handled.
 *   5. `wrapPkcs1ToPkcs8` round-trips correctly (wrap → import succeeds).
 *   6. Error cases: truncated PEM, invalid base64, empty input.
 *
 * No real secrets are embedded. A fresh 2048-bit RSA key pair is generated
 * in each test run via `crypto.subtle.generateKey`, then exported in both
 * DER formats to exercise both code paths.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { importPrivateKey, wrapPkcs1ToPkcs8 } from './app-auth';

// --- Shared test key (generated once per test run) ---

let pkcs8Der: ArrayBuffer;
let pkcs1Der: Uint8Array;
let pkcs8Pem: string;
let pkcs1Pem: string;

/** Convert an ArrayBuffer/Uint8Array to a base64 string (standard, with padding). */
function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const view = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < view.byteLength; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

/** Wrap base64 content in PEM header/footer with 64-char line wrapping. */
function base64ToPem(base64: string, header: string, footer: string): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.slice(i, i + 64));
  }
  return `-----BEGIN ${header}-----\n${lines.join('\n')}\n-----END ${footer}-----`;
}

/**
 * Extract the raw PKCS#1 key bytes from a PKCS#8 PrivateKeyInfo DER.
 *
 * PKCS#8 structure (for RSA):
 *   SEQUENCE {                          offset 0  (30 82 XX XX)
 *     INTEGER 0                         offset 4  (02 01 00)           — 3 bytes
 *     SEQUENCE { OID rsaEncryption }    offset 7  (30 0d 06 09 ...)    — 15 bytes
 *     OCTET STRING { <PKCS#1 bytes> }   offset 22 (04 82 XX XX)
 *   }
 *
 * The PKCS#1 bytes start at offset 26 (4+3+15+4).
 */
function extractPkcs1FromPkcs8(pkcs8: Uint8Array): Uint8Array {
  // Verify the outer tag is a SEQUENCE.
  expect(pkcs8[0]).toBe(0x30);

  // Verify the OCTET STRING tag is at the expected offset (22).
  expect(pkcs8[22]).toBe(0x04);
  expect(pkcs8[23]).toBe(0x82); // 2-byte length encoding

  // Read the OCTET STRING length (bytes 24-25, big-endian).
  const octetLength = (pkcs8[24] << 8) | pkcs8[25];

  // The PKCS#1 bytes are the octet string content (offset 26 onward).
  return pkcs8.slice(26, 26 + octetLength);
}

beforeAll(async () => {
  // Generate a fresh 2048-bit RSA key pair (same size as GitHub App keys).
  // `generateKey` returns `CryptoKey | CryptoKeyPair` depending on the
  // algorithm; RSA always produces a pair, so we assert the pair type.
  const keyPair = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, // extractable — needed so we can export
    ['sign', 'verify'],
  )) as CryptoKeyPair;

  // Export as PKCS#8 DER (the format Web Crypto natively supports).
  // `exportKey` returns `ArrayBuffer | JsonWebKey`; for 'pkcs8' it is always
  // an ArrayBuffer, so we assert to satisfy the type checker.
  pkcs8Der = (await crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey,
  )) as ArrayBuffer;
  const pkcs8Bytes = new Uint8Array(pkcs8Der);

  // Extract PKCS#1 bytes from the PKCS#8 envelope.
  pkcs1Der = extractPkcs1FromPkcs8(pkcs8Bytes);

  // Build PEM strings for both formats.
  const pkcs8Base64 = bufferToBase64(pkcs8Der);
  pkcs8Pem = base64ToPem(pkcs8Base64, 'PRIVATE KEY', 'PRIVATE KEY');

  const pkcs1Base64 = bufferToBase64(pkcs1Der);
  pkcs1Pem = base64ToPem(pkcs1Base64, 'RSA PRIVATE KEY', 'RSA PRIVATE KEY');
});

// ---------------------------------------------------------------------------
// importPrivateKey — format detection and successful import
// ---------------------------------------------------------------------------

describe('importPrivateKey', () => {
  describe('PKCS#1 format (GitHub App keys — BEGIN RSA PRIVATE KEY)', () => {
    it('imports a PKCS#1 PEM with real newlines', async () => {
      const key = await importPrivateKey(pkcs1Pem);
      expect(key).toBeDefined();
      expect(key.type).toBe('private');
      // The key must be usable for RS256 signing.
      expect(key.usages).toContain('sign');
    });

    it('imports a PKCS#1 PEM with literal \\n newlines (Cloudflare secret format)', async () => {
      // Cloudflare stores secrets with literal backslash-n, not real newlines.
      const literalNewlines = pkcs1Pem.replace(/\n/g, '\\n');
      const key = await importPrivateKey(literalNewlines);
      expect(key).toBeDefined();
      expect(key.usages).toContain('sign');
    });

    it('produces a key that can sign data (end-to-end RS256)', async () => {
      const key = await importPrivateKey(pkcs1Pem);
      const data = new TextEncoder().encode('test payload');
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
      expect(signature.byteLength).toBe(256); // 2048-bit key → 256-byte signature
    });
  });

  describe('PKCS#8 format (BEGIN PRIVATE KEY)', () => {
    it('imports a PKCS#8 PEM with real newlines', async () => {
      const key = await importPrivateKey(pkcs8Pem);
      expect(key).toBeDefined();
      expect(key.type).toBe('private');
      expect(key.usages).toContain('sign');
    });

    it('imports a PKCS#8 PEM with literal \\n newlines', async () => {
      const literalNewlines = pkcs8Pem.replace(/\n/g, '\\n');
      const key = await importPrivateKey(literalNewlines);
      expect(key).toBeDefined();
      expect(key.usages).toContain('sign');
    });
  });

  describe('format equivalence', () => {
    it('PKCS#1 and PKCS#8 of the same underlying key both import', async () => {
      // Both PEMs were derived from the same generated key pair, so both
      // should import without error. (We can't compare CryptoKey objects
      // directly, but successful import of both formats is the guarantee.)
      const key1 = await importPrivateKey(pkcs1Pem);
      const key8 = await importPrivateKey(pkcs8Pem);
      expect(key1.usages).toEqual(key8.usages);
      expect(key1.algorithm.name).toBe(key8.algorithm.name);
    });
  });
});

// ---------------------------------------------------------------------------
// Error handling — the bugs that caused the original production failure
// ---------------------------------------------------------------------------

describe('importPrivateKey — error cases', () => {
  it('throws a descriptive error for a truncated PEM (the original bug)', async () => {
    // Simulate a secret that was truncated to ~30 chars during paste.
    const truncated = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB\n';
    await expect(importPrivateKey(truncated)).rejects.toThrow(/truncated|Invalid/i);
  });

  it('throws for invalid base64 content', async () => {
    const invalid = '-----BEGIN RSA PRIVATE KEY-----\n!!!not-base64!!!\n-----END RSA PRIVATE KEY-----';
    await expect(importPrivateKey(invalid)).rejects.toThrow(/base64 decode failed|Invalid/i);
  });

  it('throws for an empty string', async () => {
    await expect(importPrivateKey('')).rejects.toThrow();
  });

  it('throws for a PEM with a valid header but no key body', async () => {
    const noBody = '-----BEGIN RSA PRIVATE KEY-----\n-----END RSA PRIVATE KEY-----';
    await expect(importPrivateKey(noBody)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// wrapPkcs1ToPkcs8 — ASN.1 envelope construction
// ---------------------------------------------------------------------------

describe('wrapPkcs1ToPkcs8', () => {
  it('produces valid PKCS#8 DER that crypto.subtle can import', async () => {
    // This is the core guarantee: wrapping PKCS#1 bytes produces DER that
    // the Web Crypto API accepts under the 'pkcs8' format.
    const wrapped = wrapPkcs1ToPkcs8(pkcs1Der);
    const key = await crypto.subtle.importKey(
      'pkcs8',
      wrapped,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    expect(key).toBeDefined();
    expect(key.usages).toContain('sign');
  });

  it('starts with the PKCS#8 SEQUENCE tag (0x30)', () => {
    const wrapped = wrapPkcs1ToPkcs8(pkcs1Der);
    expect(wrapped[0]).toBe(0x30); // SEQUENCE
    expect(wrapped[1]).toBe(0x82); // 2-byte length
  });

  it('includes the RSA algorithm OID at the expected offset', () => {
    const wrapped = wrapPkcs1ToPkcs8(pkcs1Der);
    // Offset 4: version INTEGER (02 01 00)
    expect(wrapped[4]).toBe(0x02);
    expect(wrapped[5]).toBe(0x01);
    expect(wrapped[6]).toBe(0x00);
    // Offset 7: algId SEQUENCE (30 0d)
    expect(wrapped[7]).toBe(0x30);
    expect(wrapped[8]).toBe(0x0d);
    // Offset 9: OID tag + length (06 09)
    expect(wrapped[9]).toBe(0x06);
    expect(wrapped[10]).toBe(0x09);
    // OID 1.2.840.113549.1.1.1 (rsaEncryption)
    expect(wrapped[11]).toBe(0x2a);
    expect(wrapped[12]).toBe(0x86);
    expect(wrapped[13]).toBe(0x48);
  });

  it('correctly encodes the total length in the outer SEQUENCE header', () => {
    const wrapped = wrapPkcs1ToPkcs8(pkcs1Der);
    // Bytes 2-3 are the big-endian length of the inner content.
    const declaredLength = (wrapped[2] << 8) | wrapped[3];
    // Actual inner content = total bytes minus the 4-byte SEQUENCE header.
    expect(declaredLength).toBe(wrapped.length - 4);
  });

  it('preserves the original PKCS#1 key bytes intact at the end of the DER', () => {
    const wrapped = wrapPkcs1ToPkcs8(pkcs1Der);
    // The PKCS#1 bytes are the last N bytes of the PKCS#8 DER.
    const extracted = wrapped.slice(wrapped.length - pkcs1Der.length);
    expect(extracted).toEqual(pkcs1Der);
  });
});