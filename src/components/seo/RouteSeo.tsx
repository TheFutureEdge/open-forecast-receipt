import { PageSeo, type PageSeoProps } from "./PageSeo";

const entityCatalogMetadata: Record<string, Omit<PageSeoProps, "canonicalPath">> = {
  "/entities": {
    title: "Semantic Entity Catalog for Verifiable Forecasts | Open Forecast Library",
    description: "Browse governed forecast subjects, their stable identifiers, measurable forecast targets, and connections to corporations, funds, venues, and other context entities.",
  },
  "/entities/directory": {
    title: "Knowledge Graph Entity Directory | Open Forecast Library",
    description: "Explore forecast subjects and context entities connected through the Open Forecast Library semantic Knowledge Graph.",
  },
  "/entities/subjects/listed-securities": {
    title: "Listed Security Forecast Subjects | Open Forecast Library",
    description: "Browse governed listed securities with stable identities, market identifiers, issuer relationships, and forecast-ready target bindings.",
  },
  "/entities/subjects/funds-etfs": {
    title: "ETF and Listed Fund Forecast Subjects | Open Forecast Library",
    description: "Browse forecastable ETF and listed fund shares separately from the investment-fund entities that issue or govern them.",
  },
  "/entities/subjects/cryptoassets": {
    title: "Cryptoasset Forecast Subjects | Open Forecast Library",
    description: "Browse governed cryptoasset subjects, identifiers, forecast targets, and future network or protocol relationships.",
  },
  "/entities/subjects/commodities": {
    title: "Commodity Forecast Subjects | Open Forecast Library",
    description: "Browse governed commodity spot subjects and the measurable targets that may be forecast about them.",
  },
  "/entities/subjects/currency-pairs": {
    title: "Currency Pair Forecast Subjects | Open Forecast Library",
    description: "Browse governed foreign-exchange pairs with explicit base and quote currencies and stable forecast identities.",
  },
  "/entities/subjects/market-indices": {
    title: "Market Index Forecast Subjects | Open Forecast Library",
    description: "Browse governed market index subjects separately from the securities and funds that may track them.",
  },
  "/entities/subjects/macroeconomics": {
    title: "Macroeconomic Forecast Subjects | Open Forecast Library",
    description: "Preview the governed economic measures, policy rates, inflation indicators, and other macroeconomic targets planned for the forecast Knowledge Graph.",
  },
  "/entities/context/corporations": {
    title: "Corporations in the Forecast Knowledge Graph | Open Forecast Library",
    description: "Browse issuer and operating-company entities separately from their listed securities and forecast records.",
  },
  "/entities/organizations": {
    title: "Corporations in the Forecast Knowledge Graph | Open Forecast Library",
    description: "Browse issuer and operating-company entities separately from their listed securities and forecast records.",
  },
  "/entities/context/investment-funds": {
    title: "Investment Funds in the Forecast Knowledge Graph | Open Forecast Library",
    description: "Browse investment-fund entities separately from their listed fund shares and exchange-traded market representations.",
  },
  "/entities/context/countries": {
    title: "Countries and Economies in the Forecast Knowledge Graph | Open Forecast Library",
    description: "Preview governed country and economy entities that will connect macroeconomic forecast subjects, institutions, measures, and policy targets.",
  },
  "/entities/context/markets-venues": {
    title: "Markets and Venues in the Forecast Knowledge Graph | Open Forecast Library",
    description: "Preview governed exchanges, markets, and trading venues that connect listed securities to stable market identifiers and forecast context.",
  },
  "/entities/context/networks-protocols": {
    title: "Networks and Protocols in the Forecast Knowledge Graph | Open Forecast Library",
    description: "Preview governed blockchain networks and protocols that connect cryptoasset forecast subjects to their technical context.",
  },
};

function metadataForPath(pathname: string): Omit<PageSeoProps, "canonicalPath"> {
  const normalized = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const exact = entityCatalogMetadata[normalized];
  if (exact) return exact;

  if (normalized === "/") {
    return {
      title: "Open Forecast Library | Give Forecasts a Memory",
      description: "Browse public forecasts, inspect Open Forecast Receipts, verify integrity, and follow optional per-receipt blockchain proofs.",
    };
  }
  if (normalized === "/forecasts" || normalized === "/showcase" || normalized === "/manifest/batch-6") {
    return {
      title: "iPulse AI Public Market Forecasts | Open Forecast Library",
      description: "Browse individual iPulse AI market forecasts, inspect their Open Forecast Receipts, and check optional blockchain proof status.",
    };
  }
  if (normalized === "/forecasters" || normalized === "/entities/forecasters") {
    return {
      title: "AI and Algorithmic Forecaster Profiles | Open Forecast Library",
      description: "Browse publisher-governed forecaster profiles, their models, operating modes, specializations, forecast coverage, and review status.",
    };
  }
  if (normalized === "/standards") {
    return {
      title: "How Open Forecast Library and Open Forecast Receipt Work",
      description: "Understand the forecast Knowledge Graph, target definitions, receipt lifecycle, integrity verification, and optional blockchain proof model.",
      pageType: "article",
    };
  }
  if (normalized === "/test") {
    return {
      title: "Forecast Receipt Integrity Test | Open Forecast Library",
      description: "Change a forecast value and see deterministic receipt verification detect that the sealed forecast payload no longer matches its digest.",
    };
  }
  if (/^\/entities\/(subjects|context)\/[^/]+$/.test(normalized)) {
    return {
      title: "Knowledge Graph Category | Open Forecast Library",
      description: "Explore this governed Open Forecast Library Knowledge Graph category and its relationship to forecast subjects and targets.",
    };
  }
  if (/^\/entities\/[^/]+$/.test(normalized)) {
    return {
      title: "Governed Entity Profile | Open Forecast Library",
      description: "Inspect a governed entity, its stable identifiers, semantic type, relationships, and linked public forecast collections.",
      pageType: "profile",
    };
  }
  if (/^\/(showcase|assets)\/[^/]+$/.test(normalized) || /^\/manifest\/[^/]+\/assets\/[^/]+$/.test(normalized)) {
    return {
      title: "Public Forecast Receipts | Open Forecast Library",
      description: "Inspect individual forecasts, forecast paths, timing boundaries, receipt JSON, integrity status, and optional blockchain proof.",
    };
  }
  if (/^\/receipts\/[0-9a-fA-F]{64}$/.test(normalized)) {
    return {
      title: "Open Forecast Receipt Verification | Open Forecast Library",
      description: "Inspect and independently verify one sealed Open Forecast Receipt, including its forecast, provenance, digest, and optional blockchain proof.",
      pageType: "article",
    };
  }
  return {
    title: "Open Forecast Library",
    description: "A governed public library of forecasts, entities, Open Forecast Receipts, integrity checks, and optional blockchain proofs.",
  };
}

export function RouteSeo({ pathname }: { pathname: string }) {
  const metadata = metadataForPath(pathname);
  return <PageSeo {...metadata} canonicalPath={pathname} />;
}
