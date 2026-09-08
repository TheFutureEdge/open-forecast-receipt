import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../src/index.css";
import { getPublicSiteOrigin } from "../src/lib/siteOrigin";

const production = process.env.NEXT_PUBLIC_OFL_ENVIRONMENT === "production"
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "oflapp-prod";
const siteOrigin = getPublicSiteOrigin();
const organizationId = "https://ftredge.com/#organization";

const siteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      url: siteOrigin,
      name: "Forecast Library",
      description: "A public library of verifiable forecast records built on the Open Forecast Receipt standard.",
      publisher: { "@id": organizationId },
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": organizationId,
      name: "Future Edge Group FZE",
      url: "https://ftredge.com",
      logo: `${siteOrigin}/future-edge-group.svg`,
      foundingDate: "2024-07-26",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Business Centre, Sharjah Publishing City Free Zone",
        addressLocality: "Sharjah",
        addressCountry: "AE",
      },
      sameAs: [
        "https://www.linkedin.com/company/future-edge-group",
        "https://github.com/TheFutureEdge",
        "https://ipulseai.com",
      ],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Forecast Library | Verifiable Public Forecasts",
    template: "%s | Forecast Library",
  },
  description: "Browse public forecasts, inspect their Open Forecast Receipts, verify integrity, and follow optional per-receipt blockchain proofs and later evaluations.",
  applicationName: "Forecast Library",
  openGraph: {
    type: "website",
    siteName: "Forecast Library",
    title: "Forecast Library | Verifiable Public Forecasts",
    description: "Browse public forecasts, inspect their receipts and provenance, verify integrity, and follow later evaluations.",
  },
  twitter: {
    card: "summary",
    title: "Forecast Library | Verifiable Public Forecasts",
    description: "Browse public forecasts, inspect their receipts and provenance, verify integrity, and follow later evaluations.",
  },
  robots: production
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
