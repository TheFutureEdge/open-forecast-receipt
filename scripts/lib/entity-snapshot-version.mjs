import { createHash } from 'node:crypto';
import { canonicalize } from 'json-canonicalize';

/** Identity of a new immutable snapshot; old version IDs remain untouched. */
export function entitySnapshotIdentityKey(value) {
  const { currentVersionId: _current, versionId: _version, ...snapshot } = value;
  return `${snapshot.entityId}|snapshot-sha256:${createHash('sha256').update(canonicalize(snapshot)).digest('hex')}`;
}
