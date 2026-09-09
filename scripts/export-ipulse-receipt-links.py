#!/usr/bin/env python3
"""Export approved public iPulse receipts, independently of library taxonomy.

python scripts/export-ipulse-receipt-links.py --catalog catalog.json
  --inventory frozen-inventory.json --ipulse-root /path/to/ipulse_ui_next
Only public catalog metadata and published revision IDs are accepted. Existing
task/revision bindings are append-only; an identity conflict aborts before writes.
"""
import argparse
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--catalog', type=Path, required=True)
parser.add_argument('--inventory', type=Path, required=True)
parser.add_argument('--ipulse-root', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
catalog = json.loads(args.catalog.read_text())
assets = {key: value for part in catalog['data'] for key, value in part['assets'].items()}
records = json.loads(args.inventory.read_text())
history_path = args.ipulse_root / 'src/data/forecast-library-history.json'
history = json.loads(history_path.read_text()) if history_path.exists() else {}
# One-time conversion of the pre-release single-batch export.
history = {path: ({entry['batchKey']: {'forecasts': []}} if 'batchKey' in entry else entry) for path, entry in history.items()}
asset_path = root / 'src/data/ipulse-public-asset-paths.json'
paths = json.loads(asset_path.read_text()) if asset_path.exists() else {}
shards = {}
for record in records:
    source = record.get('originalSource') or {}
    assert source.get('publisherName') == 'iPulse AI', 'Only the iPulse publisher adapter may use this export'
    path = assets[record['entityId']]['url_path']
    assert re.fullmatch(r'/(stocks|crypto|forex|commodities|indices)/[a-z0-9-]+', path), path
    task = record['forecastId']
    match = re.fullmatch(r'predrqst_batch_task__xrefsubjtskconf_([0-9a-f]{2})[0-9a-f-]+__sb\d+__\d+', task)
    assert match, task
    prefix = match[1]
    assert re.fullmatch(r'f-[0-9a-hjkmnp-tv-z]{26}', record['forecastPublicId'])
    assert re.fullmatch(r'[0-9a-f]{64}', record['receiptDigest'])
    revision = int(record['sourceRevisionId'])
    assert revision >= 1
    publication = source['publicationId']
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}-sb\d+', publication)
    if prefix not in shards:
        shard_path = args.ipulse_root / f'public/forecast-library/task-links/v1/{prefix}.json'
        prior = json.loads(shard_path.read_text()) if shard_path.exists() else {}
        shards[prefix] = {(key if '#' in key else f"{key}#{value['revision']}"): value for key, value in prior.items()}
    item = {key: record[key] for key in ('forecastPublicId', 'receiptDigest')}
    item.update(revision=revision, mode=record.get('forecasterMode'))
    registry_key = f'{task}#{revision}'
    existing = shards[prefix].get(registry_key)
    assert existing is None or existing == item, f'Immutable registry conflict: {registry_key}'
    shards[prefix][registry_key] = item
    paths[record['entityId']] = path
    group = history.setdefault(path, {}).setdefault(publication, {'forecasts': []})
    if not any(row['forecastPublicId'] == record['forecastPublicId'] for row in group['forecasts']):
        label = record.get('forecasterLabel') or record['canonicalPath'].split('/')[-2].replace('-', ' ').title().replace(' Ai ', ' AI ')
        group['forecasts'].append({'forecastPublicId': record['forecastPublicId'], 'mode': record.get('forecasterMode'), 'label': label, 'revision': revision})

def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, separators=(',', ':'), sort_keys=True) + '\n')

save(asset_path, paths)
save(history_path, history)
for prefix, data in shards.items():
    save(args.ipulse_root / f'public/forecast-library/task-links/v1/{prefix}.json', data)
print(json.dumps({'publishedRecords': len(records), 'mappedSubjects': len(paths), 'shards': len(shards)}, indent=2))
