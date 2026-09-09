export interface EntityCatalogPreset {
  key: string;
  view: "forecastable" | "context" | "all";
  title: string;
  description: string;
  metricLabel: string;
  categoryLabel?: string;
  entityTypes?: string[];
}

export const ENTITY_CATALOG_PRESETS: Record<string, EntityCatalogPreset> = {
  directory: {
    key: "directory",
    view: "all",
    title: "Browse the entity directory",
    description: "Explore forecast subjects and the corporations, funds, venues, countries, and other contextual entities connected to them in the Knowledge Graph.",
    metricLabel: "Graph entities",
  },
  "all-forecast-subjects": {
    key: "all-forecast-subjects",
    view: "forecastable",
    title: "Browse all forecast subjects",
    description: "Start with the exact market instruments and other governed subjects that can receive forecast-target bindings and forecast receipts.",
    metricLabel: "Forecast subjects",
  },
  "listed-securities": {
    key: "listed-securities",
    view: "forecastable",
    title: "Browse stocks",
    description: "Explore separately identifiable listed shares and depositary receipts, each connected to its issuer, trading venue, and governed identifiers.",
    metricLabel: "Stocks",
    categoryLabel: "Stocks",
    entityTypes: ["listed_security"],
  },
  "funds-etfs": {
    key: "funds-etfs",
    view: "forecastable",
    title: "Browse funds and ETFs",
    description: "Explore forecastable exchange-traded fund instruments separately from the investment-fund entities that issue or govern them.",
    metricLabel: "Funds & ETFs",
    categoryLabel: "Funds & ETFs",
    entityTypes: ["listed_fund_share"],
  },
  cryptoassets: {
    key: "cryptoassets",
    view: "forecastable",
    title: "Browse cryptoassets",
    description: "Explore governed cryptoasset subjects, their stable identifiers, and future relationships to networks and protocols.",
    metricLabel: "Cryptoassets",
    categoryLabel: "Cryptoassets",
    entityTypes: ["cryptoasset"],
  },
  commodities: {
    key: "commodities",
    view: "forecastable",
    title: "Browse commodities",
    description: "Explore governed commodity spot subjects and the measurable targets that may be forecast about them.",
    metricLabel: "Commodities",
    categoryLabel: "Commodities",
    entityTypes: ["commodity_spot"],
  },
  "currency-pairs": {
    key: "currency-pairs",
    view: "forecastable",
    title: "Browse currency pairs",
    description: "Explore governed foreign-exchange pairs as distinct forecast subjects with explicit base and quote currencies.",
    metricLabel: "Currency pairs",
    categoryLabel: "Currency Pairs",
    entityTypes: ["currency_pair"],
  },
  "market-indices": {
    key: "market-indices",
    view: "forecastable",
    title: "Browse market indices",
    description: "Explore governed index subjects separately from the funds and securities that may track them.",
    metricLabel: "Market indices",
    categoryLabel: "Market Indices",
    entityTypes: ["market_index"],
  },
  corporations: {
    key: "corporations",
    view: "context",
    title: "Browse corporations",
    description: "Explore issuer and operating-company entities separately from their listed securities. One corporation may connect to several market instruments.",
    metricLabel: "Corporations",
    categoryLabel: "Corporations",
    entityTypes: ["corporation"],
  },
  "investment-funds": {
    key: "investment-funds",
    view: "context",
    title: "Browse investment funds",
    description: "Explore governed investment-fund entities separately from their exchange-traded market representations.",
    metricLabel: "Investment funds",
    categoryLabel: "Investment Funds",
    entityTypes: ["investment_fund"],
  },
};
