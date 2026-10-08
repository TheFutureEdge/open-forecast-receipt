import { describe, expect, it } from 'vitest';
import { buildLegacyReceiptRedirects } from '../export-ipulse-legacy-receipt-redirects.mjs';

const identity = 'a'.repeat(64);
const digest = 'b'.repeat(64);
const receiptId = `https://ipulseai.com/receipts/sha256/${identity}`;

describe('legacy publisher receipt redirects', () => {
  it('maps the identity hash to the actual sealed digest without confusing them', () => {
    expect(buildLegacyReceiptRedirects([{ receiptId, digest }])).toEqual({ [identity]: digest });
  });
  it('does not turn new URN identities or other publishers into iPulse URLs', () => {
    expect(buildLegacyReceiptRedirects([
      { receiptId: `urn:ofr:receipt:sha256:${identity}`, digest },
      { receiptId: `https://other.example/receipts/sha256/${identity}`, digest },
    ])).toEqual({});
  });
  it('fails rather than sending an ambiguous identifier to the wrong evidence', () => {
    expect(() => buildLegacyReceiptRedirects([
      { receiptId, digest }, { receiptId, digest: 'c'.repeat(64) },
    ])).toThrow('Ambiguous legacy receipt identity');
  });
  it('rejects malformed digests and unexpected publisher receipt paths', () => {
    expect(() => buildLegacyReceiptRedirects([{ receiptId, digest: '../other' }])).toThrow();
    expect(() => buildLegacyReceiptRedirects([{ receiptId: 'https://ipulseai.com/receipts/unknown', digest }])).toThrow();
  });
});
