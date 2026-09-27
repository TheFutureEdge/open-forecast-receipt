import { describe, it, expect } from 'vitest';
import { entitySnapshotIdentityKey } from '../lib/entity-snapshot-version.mjs';
const entity = {entityId:'same-entity',currentVersionId:'legacy-id',source:{sourceVersion:4,predictionCohort:{scoringBatch:6}}};
describe('append-only entity snapshot identity', () => {
  it('creates a distinct version for another cohort while retaining entity identity', () => {
    const next = {...entity,source:{...entity.source,predictionCohort:{scoringBatch:7}}};
    expect(entitySnapshotIdentityKey(next)).not.toBe(entitySnapshotIdentityKey(entity));
    expect(next.entityId).toBe(entity.entityId);
    expect(entity.currentVersionId).toBe('legacy-id');
  });
  it('does not hash the version identifiers back into their own identity', () => {
    expect(entitySnapshotIdentityKey({...entity,currentVersionId:'another',versionId:'another'})).toBe(entitySnapshotIdentityKey(entity));
  });
});
