import { NextResponse, type NextRequest } from "next/server";
import { CANONICAL_PRODUCTION_ORIGIN } from "./src/lib/siteOrigin";
import profiles from "./deployment-profiles.json";

export function proxy(request: NextRequest) {
  const production = process.env.NEXT_PUBLIC_OFL_ENVIRONMENT === "production"
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "oflapp-prod";
  // App Hosting terminates HTTPS before forwarding to Next.js. Its trusted
  // forwarded host carries the public domain; nextUrl.origin may be internal.
  const publicHost = (request.headers.get("x-forwarded-host")
    || request.headers.get("host")
    || request.nextUrl.host).split(",")[0].trim().toLowerCase();
  // Only this project's provider-assigned protected hosts may serve a
  // production candidate before DNS cutover. Arbitrary hosts still redirect.
  const candidateHosts = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];
  const productionCandidate = process.env.VERCEL === "1"
    && process.env.VERCEL_ENV === "production"
    && process.env.VERCEL_PROJECT_ID === profiles.production.vercelProjectId
    && publicHost.endsWith(".vercel.app")
    && candidateHosts.includes(publicHost);
  if (production && publicHost !== new URL(CANONICAL_PRODUCTION_ORIGIN).host && !productionCandidate) {
    const destination = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, CANONICAL_PRODUCTION_ORIGIN);
    return NextResponse.redirect(destination, 308);
  }

  const response = NextResponse.next();
  if (!production || productionCandidate) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  // Include robots.txt and sitemap.xml so staging receives the noindex header
  // and every production hosted.app URL redirects to the canonical domain.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
