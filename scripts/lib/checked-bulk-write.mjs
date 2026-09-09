/** BulkWriter.close() drains work but does not reject for failed operations. */
export async function checkedBulkWrite(db, operations) {
  if (!operations.length) return;
  const writer = db.bulkWriter();
  const pending = operations.map(({ kind, reference, value }) =>
    kind === "delete" ? writer.delete(reference) : writer.set(reference, value));
  const settled = Promise.allSettled(pending);
  await writer.close();
  const failures = (await settled).filter((result) => result.status === "rejected");
  if (failures.length) {
    throw new AggregateError(failures.map((result) => result.reason), `${failures.length} catalog operation(s) failed; publication is incomplete`);
  }
}
