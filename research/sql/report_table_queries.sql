-- advisor_summary_sql
SELECT advisor, mode, rating, terminal_return_pct, source_forecast_bytes, quarterly_receipt_bytes
FROM advisor_forecasts
ORDER BY ordinal;

-- receipt_fields_sql
SELECT field, pepsi_value, source_mapping, purpose
FROM receipt_fields
ORDER BY ordinal;

-- fidelity_sql
SELECT scope, receipts, quarterly_bytes, annual_only_bytes, bytes_saved, decision
FROM fidelity_comparison
ORDER BY ordinal;

-- lifecycle_sql
SELECT "order", stage, existing_behavior, receipt_behavior
FROM lifecycle
ORDER BY "order";

-- ledger_ui_sql
SELECT surface, proposed_proof_ui, click_result
FROM ledger_ui_states
ORDER BY ordinal;

-- cost_sql
SELECT scope, receipt_count, observed_anchor_usd, planning_envelope_usd, note
FROM cost_scenarios
ORDER BY ordinal;
