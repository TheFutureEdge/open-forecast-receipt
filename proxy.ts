import { NextResponse, type NextRequest } from "next/server";
import { CANONICAL_PRODUCTION_ORIGIN } from "./src/lib/siteOrigin";

export function proxy(request: NextRequest) {
  const production = process.env.NEXT_PUBLIC_OFL_ENVIRONMENT === "production"
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "oflapp-prod";
  if (production && request.nextUrl.origin !== CANONICAL_PRODUCTION_ORIGIN) {
    const destination = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, CANONICAL_PRODUCTION_ORIGIN);
    return NextResponse.redirect(destination, 308);
  }

  const response = NextResponse.next();
  if (!production) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  // Include robots.txt and sitemap.xml so staging receives the noindex header
  // and every production hosted.app URL redirects to the canonical domain.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
