import { NextResponse } from "next/server";
import { getPublicReceiptResolverServer } from "../../../src/lib/library/server-repository";
import { getPublicSiteOrigin } from "../../../src/lib/siteOrigin";

export const revalidate = 300;

// A route handler waits for resolution before sending headers. A streamed page
// can otherwise emit HTTP 200 before Next.js discovers the permanent redirect.
export async function GET(_request: Request, { params }: { params: Promise<{ digest: string }> }) {
  const { digest: rawDigest } = await params;
  const digest = rawDigest.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(digest)) return NextResponse.json({ error: "receipt_not_found" }, { status: 404 });
  const resolver = await getPublicReceiptResolverServer(digest);
  if (!resolver?.canonicalPath) return NextResponse.json({ error: "receipt_not_found" }, { status: 404 });
  const origin = getPublicSiteOrigin();
  const destination = new URL(resolver.canonicalPath, origin);
  if (destination.origin !== origin) throw new Error("Receipt resolver must remain on the canonical origin");
  const response = NextResponse.redirect(destination, 308);
  response.headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  return response;
}
