import { NextResponse } from "next/server";
import { getLibraryReceiptServer } from "../../../../../src/lib/library/server-repository";

export const revalidate = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ digest: string }> }) {
  const { digest: rawDigest } = await params;
  const digest = rawDigest.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    return NextResponse.json({ error: "invalid_receipt_digest" }, { status: 400 });
  }
  const receipt = await getLibraryReceiptServer(digest);
  if (!receipt) return NextResponse.json({ error: "receipt_not_found" }, { status: 404 });

  return NextResponse.json(receipt.document, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      ETag: `"sha256-${digest}"`,
      "X-Content-Type-Options": "nosniff",
      "X-OFR-Payload-Digest-SHA256": digest,
      "X-OFR-Spec-Version": receipt.document.specVersion,
    },
  });
}
