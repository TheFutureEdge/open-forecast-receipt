from pathlib import Path

import nbformat as nbf
from nbclient import NotebookClient


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RESEARCH_DIR = PROJECT_ROOT / "research"
NOTEBOOK_PATH = RESEARCH_DIR / "forecast_receipt_standard_and_capacity.ipynb"

nb = nbf.v4.new_notebook()
nb["metadata"] = {
    "kernelspec": {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    },
    "language_info": {"name": "python", "version": "3"},
}

nb["cells"] = [
    nbf.v4.new_markdown_cell(
        """# Open Forecast Receipt capacity and cost validation

**TL;DR.** PepsiCo Batch 6 contains 12 independent advisor forecasts. The recommended EAS transport is one asset-level `multiAttest`, which preserves 12 UIDs while reducing transaction operations from 12 to 1. The reviewed 17-field projection produces a 16,036-byte call. Hackathon Phase 1 is locked to five existing public assets, 60 UIDs, and five asset-level transactions.

This notebook reproduces the byte, gas-ceiling, cost-sensitivity, path-compounding, and receipt-digest calculations used in the companion report. It is a planning model, not an onchain quote."""
    ),
    nbf.v4.new_markdown_cell(
        """## Context and methods

- Production-safe PepsiCo values are loaded from the local OFR and EAS projection fixtures.
- The Base per-transaction cap is 16,777,216 gas.
- EIP-7623's data-heavy calldata floor is 10 gas per zero byte and 40 gas per non-zero byte.
- The gas sensitivity uses a deliberately conservative sum of separate-attestation estimates, so no unmeasured `multiAttest` savings are claimed.
- The exact L1 security fee is excluded and must be obtained from Base `GasPriceOracle.getL1Fee` on the fully serialized transaction.
- USD conversion uses the point-in-time planning assumption stored in `five_dollar_budget_model.json`."""
    ),
    nbf.v4.new_code_cell(
        """import copy
import hashlib
import json
import math
from pathlib import Path

project_root = Path.cwd()
receipt = json.loads((project_root / "examples/ipulse/pepsi_batch6_ray_open_forecast_receipt_v0_1.json").read_text())
projection = json.loads((project_root / "examples/ipulse/pepsi_batch6_ray_onchain_projection_v0_1.json").read_text())
budget = json.loads((project_root / "research/five_dollar_budget_model.json").read_text())
observations = json.loads((project_root / "research/base_cost_observations.json").read_text())

print("Loaded:", receipt["forecast"]["subject"]["name"], "Batch", receipt["forecast"]["run"]["runNumber"])
print("Forecast:", receipt["forecast"]["forecaster"]["name"], receipt["forecast"]["forecaster"]["mode"])
print("Points:", len(receipt["forecast"]["prediction"]["points"]))"""
    ),
    nbf.v4.new_markdown_cell("## Receipt-integrity test vector"),
    nbf.v4.new_code_cell(
        """digest_document = copy.deepcopy(receipt)
digest_document["integrity"].pop("receiptDigestSha256", None)
digest_document["integrity"].pop("proofs", None)

# The fixture contains only JCS-safe strings, booleans, integers, arrays, and objects.
canonical = json.dumps(digest_document, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
calculated_digest = hashlib.sha256(canonical).hexdigest()
stored_digest = receipt["integrity"]["receiptDigestSha256"]

assert calculated_digest == stored_digest
print("Canonical bytes:", len(canonical))
print("SHA-256:", calculated_digest)
print("Digest test: PASS")"""
    ),
    nbf.v4.new_markdown_cell("## Reconstruct the PepsiCo path"),
    nbf.v4.new_code_cell(
        """anchor = receipt["forecast"]["anchor"]["valueScaled"] / 10 ** receipt["forecast"]["anchor"]["scale"]
returns_bps = [point["value"] for point in receipt["forecast"]["prediction"]["points"]]

price = anchor
prices = []
for point, return_bps in zip(receipt["forecast"]["prediction"]["points"], returns_bps):
    price *= 1 + return_bps / 10_000
    prices.append((point["step"], point["validAt"][:10], return_bps, price))

annual = []
for end_step in (4, 8, 12, 16, 20):
    cumulative_bps = round((prices[end_step - 1][3] / anchor - 1) * 10_000)
    annual.append(cumulative_bps)

terminal_return_pct = (price / anchor - 1) * 100
assert annual == projection["derivationsNotStoredOnchain"]["annualCumulativeReturnBps"]
print("Annual cumulative return bps:", annual)
print(f"Terminal return: {terminal_return_pct:.10f}%")
print(f"Terminal implied price: ${price:.4f}")"""
    ),
    nbf.v4.new_markdown_cell("## Base calldata ceilings and exact PepsiCo sizes"),
    nbf.v4.new_code_cell(
        """base_tx_gas_cap = 16_777_216
intrinsic_gas = 21_000
nonzero_ceiling = (base_tx_gas_cap - intrinsic_gas) // 40
zero_ceiling = (base_tx_gas_cap - intrinsic_gas) // 10

sizes = projection["calculatedSizes"]
planning_gas = budget["receipt_model"]["conservative_separate_attestation_gas_sum_per_asset"]
buffered_gas = math.ceil(planning_gas * 1.20)

assert sizes["pepsiBatch6TotalEasDataBytes"] == 12_768
assert sizes["pepsiBatch6MultiAttestCalldataBytes"] == 16_036
assert buffered_gas < base_tx_gas_cap

print(f"Theoretical all-nonzero calldata ceiling: {nonzero_ceiling:,} bytes")
print(f"Theoretical all-zero calldata ceiling: {zero_ceiling:,} bytes")
print(f"PepsiCo EAS data: {sizes['pepsiBatch6TotalEasDataBytes']:,} bytes")
print(f"PepsiCo multiAttest calldata: {sizes['pepsiBatch6MultiAttestCalldataBytes']:,} bytes")
print(f"Conservative planning gas: {planning_gas:,}")
print(f"Planning gas + 20%: {buffered_gas:,} ({buffered_gas / base_tx_gas_cap:.1%} of cap)")"""
    ),
    nbf.v4.new_markdown_cell("## Separate transactions versus native EAS batching"),
    nbf.v4.new_code_cell(
        """separate_calldata = budget["receipt_model"]["pepsi_batch6_separate_attest_calldata_bytes_combined"]
multi_calldata = budget["receipt_model"]["pepsi_batch6_multi_attest_calldata_bytes"]
saving = separate_calldata - multi_calldata

comparison = {
    "forecast_entities": (12, 12),
    "uids": (12, 12),
    "proof_links": (12, 12),
    "transactions": (12, 1),
    "combined_calldata_bytes": (separate_calldata, multi_calldata),
}
print(json.dumps(comparison, indent=2))
print(f"Calldata saved: {saving} bytes ({saving / separate_calldata:.2%})")
print("Interpretation: identity is unchanged; operational overhead falls sharply; execution/storage work remains.")"""
    ),
    nbf.v4.new_markdown_cell("## Exact observed Blockscout transaction terminology"),
    nbf.v4.new_code_cell(
        """opened_tx = observations["observations"][0]
assert opened_tx["transaction_hash"] == "0x0844ed67ae12d67db69abe06404ef13b3cf12b1bccc19d61496b095462384e06"
print("EAS data bytes:", opened_tx["eas_data_bytes"])
print("Submitted calldata bytes:", opened_tx["transaction_calldata_bytes"])
print("Serialized RPC receipt JSON bytes:", opened_tx["rpc_receipt_json_bytes_observed"])
print("Receipt logs:", opened_tx["receipt_log_count"])
print("Gas used:", f'{opened_tx["gas_used"]:,}')
print("Observed cost USD:", f'${opened_tx["transaction_cost_usd_including_l1_fee"]:.6f}')
print("The RPC receipt JSON is a response representation, not separately billed onchain data.")"""
    ),
    nbf.v4.new_markdown_cell("## Five-public-asset Phase 1 cost sensitivity"),
    nbf.v4.new_code_cell(
        """eth_usd = budget["eth_usd_assumption"]
gas_per_asset = budget["receipt_model"]["conservative_separate_attestation_gas_sum_per_asset"]

rows = []
for asset_count in (5,):
    for gas_price_gwei in (0.005, 0.006, 0.010, 0.020):
        cost = gas_per_asset * asset_count * gas_price_gwei * 1e-9 * eth_usd
        rows.append((asset_count, asset_count * 12, asset_count, gas_price_gwei, cost))

print("assets | UIDs | txs | gas gwei | execution USD")
for row in rows:
    print(f"{row[0]:>6} | {row[1]:>4} | {row[2]:>3} | {row[3]:>8.3f} | ${row[4]:.4f}")

threshold = 4.25 / (gas_per_asset * 5 * eth_usd) * 1e9
buffered_threshold = threshold / 1.10
print(f"\\nFive-asset execution-only threshold before L1: {threshold:.6f} gwei")
print(f"After 10% buffer, before L1: {buffered_threshold:.6f} gwei")"""
    ),
    nbf.v4.new_code_cell(
        """from IPython.display import HTML, display

chart_rows = [row for row in rows if row[3] in (0.006, 0.010, 0.020)]
max_cost = max(row[4] for row in chart_rows)
bar_width = 36
gap = 22
height = 240
left = 54
bottom = 42
usable_height = 170
width = left + len(chart_rows) * (bar_width + gap) + 20

bars = []
for index, (assets, uids, txs, gwei, cost) in enumerate(chart_rows):
    x = left + index * (bar_width + gap)
    bar_height = cost / max_cost * usable_height
    y = height - bottom - bar_height
    color = "#16a34a" if cost <= 4.25 else "#dc2626"
    bars.append(f'<rect x="{x}" y="{y:.1f}" width="{bar_width}" height="{bar_height:.1f}" rx="4" fill="{color}"/>')
    bars.append(f'<text x="{x + bar_width/2}" y="{y - 6:.1f}" text-anchor="middle" font-size="10">${cost:.2f}</text>')
    bars.append(f'<text x="{x + bar_width/2}" y="{height - 25}" text-anchor="middle" font-size="9">{assets}@{gwei:.3f}</text>')

cap_y = height - bottom - 4.25 / max_cost * usable_height
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 {width} {height}" role="img" aria-label="Cost sensitivity chart">
<rect width="100%" height="100%" fill="white"/>
<line x1="{left}" y1="{height-bottom}" x2="{width-10}" y2="{height-bottom}" stroke="#94a3b8"/>
<line x1="{left}" y1="{cap_y:.1f}" x2="{width-10}" y2="{cap_y:.1f}" stroke="#d97706" stroke-dasharray="5 4"/>
<text x="4" y="{cap_y + 4:.1f}" font-size="10" fill="#92400e">$4.25 cap</text>
{''.join(bars)}
<text x="{width/2}" y="{height-5}" text-anchor="middle" font-size="10">assets @ gas price (gwei); excludes exact L1 fee and batching savings</text>
</svg>'''
display(HTML(svg))"""
    ),
    nbf.v4.new_markdown_cell(
        """## Takeaways

1. Native EAS batching changes transport, not identity: PepsiCo still has 12 receipts and 12 UIDs.
2. The byte saving is modest (3.7%), so the exact cost advantage must be measured; the clear benefit is the reduction from 12 transaction operations to one.
3. The 16,036-byte PepsiCo call is well below theoretical calldata ceilings, and the conservative buffered gas plan fits the current Base transaction cap.
4. Phase 1 contains only the five existing public assets. The complete five-asset cohort requires an all-in preflight and may need to wait during higher fees.
5. The JSON receipt and compact onchain projection should remain separate, versioned, and independently testable.

Sources: [Base transaction troubleshooting](https://docs.base.org/base-chain/network-information/troubleshooting-transactions), [Base network fees](https://docs.base.org/base-chain/network-information/network-fees), [EIP-7623](https://eips.ethereum.org/EIPS/eip-7623), [EAS SDK](https://github.com/ethereum-attestation-service/eas-sdk), and [Hubverse model output](https://docs.hubverse.io/en/latest/user-guide/model-output.html)."""
    ),
]

nbf.write(nb, NOTEBOOK_PATH)

client = NotebookClient(
    nb,
    timeout=120,
    kernel_name="python3",
    resources={"metadata": {"path": str(PROJECT_ROOT)}},
)
executed = client.execute(cwd=str(PROJECT_ROOT))
nbf.write(executed, NOTEBOOK_PATH)

print(f"Wrote and executed {NOTEBOOK_PATH}")
