import { describe, expect, it } from 'vitest';
import { publicLedgerBatchKey } from '../lib/publication-input.mjs';

describe('public ledger location', () => {
  it('keeps a following-day provider response in its published batch entry', () => {
    expect(publicLedgerBatchKey(7, '2026-09-21T01:00:00Z', '2026-09-20-sb7')).toBe('2026-09-20-sb7');
  });
  it('rejects a missing or different-batch catalog key for a new batch', () => {
    expect(() => publicLedgerBatchKey(7, '2026-09-20T01:00:00Z')).toThrow(/governed/);
    expect(() => publicLedgerBatchKey(7, '2026-09-20T01:00:00Z', '2026-09-20-sb6')).toThrow(/governed/);
  });
  it('preserves the historical Batch 6 fallback', () => {
    expect(publicLedgerBatchKey(6, '2026-07-05T14:00:00Z')).toBe('2026-07-05-sb6');
  });
});
