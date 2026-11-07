import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { canonicalize } from 'json-canonicalize';
import { describe, expect, it } from 'vitest';
import { buildReceipt } from '../generate-phase1-fixtures.mjs';

function generateReceipt() {
  return buildReceipt({
    source: {
      asset_id: 'test-asset', asset_name: 'Test Asset', asset_currency: 'USD', scoring_batch: 8,
      publication_snapshot: { publication_key: 'test-asset__sb8__r1', publication_revision: 1,
        frozen_at_utc: '2026-10-08T00:00:00Z' },
      input_context_snapshot: { market_anchor: { value: 100, timestamp_utc: '2026-10-07T00:00:00Z' } },
    },
    prediction: {
      prediction_request_task_id: 'test-forecast', investment_rating_by_model: 'hold',
      advisor_snapshot: { advisor_mode: 'RESEARCHER', advisor_id: 'test-advisor',
        forecast_timeseries_step_unit: 'month', forecast_timeseries_step_value: 3 },
      timeseries_numerical: [{ forecast_step: 1, forecast_timestamp_utc: '2027-01-07T00:00:00Z',
        predicted_step_over_step_change_percent: 2 }],
    },
    generation: { prediction_response_generated_at_utc: '2026-10-08T00:00:00Z',
      prediction_values_end_timestamp_utc: '2027-01-07T00:00:00Z' },
    contextMeta: {}, componentMeta: {}, asset: { subject_category: 'equity' },
    receiptIssuedAt: '2026-10-08T00:00:00Z',
  });
}

describe('new receipt identity', () => {
  it('generates a deterministic non-web identity accepted by the existing URI contract', () => {
    const built = generateReceipt();
    const identity = built.document.receiptPayload.receipt.receiptId;
    expect(identity).toMatch(/^urn:ofr:receipt:sha256:[a-f0-9]{64}$/);
    expect(generateReceipt().document.receiptPayload.receipt.receiptId).toBe(identity);
    expect(JSON.stringify(built.document)).not.toContain('ipulseai.com/receipts/');
    const ajv = new Ajv2020();
    addFormats(ajv);
    expect(ajv.validate({ type: 'string', format: 'uri' }, identity)).toBe(true);
    expect(createHash('sha256').update(canonicalize(built.document.receiptPayload)).digest('hex')).toBe(built.payloadDigest);
  });
  it('retains the existing sealed example and its original verified digest', () => {
    const sealed = JSON.parse(readFileSync('examples/ipulse/pepsi_batch6_ray_open_forecast_receipt_v0_1.json', 'utf8'));
    expect(sealed.receiptPayload.receipt.receiptId).toContain('https://ipulseai.com/receipts/sha256/');
    expect(createHash('sha256').update(canonicalize(sealed.receiptPayload)).digest('hex'))
      .toBe(sealed.proofEnvelope.payloadDigestSha256);
  });
});
