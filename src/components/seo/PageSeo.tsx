import { useEffect } from "react";

export interface PageSeoProps {
  title: string;
  description: string;
  canonicalPath: string;
  pageType?: "website" | "article" | "profile";
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return `/${pathname.replace(/^\/+|\/+$/g, "")}`;
}

export function getPublicSiteOrigin(): string {
  const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim();
  if (projectId === "oflapp-prod") return "https://oflapp-prod.web.app";
  if (projectId === "oflapp-staging") return "https://oflapp-staging.web.app";
  return typeof window === "undefined" ? "https://oflapp-prod.web.app" : window.location.origin;
}

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

export function PageSeo({ title, description, canonicalPath, pageType = "website" }: PageSeoProps) {
  useEffect(() => {
    const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim();
    const canonicalUrl = `${getPublicSiteOrigin()}${normalizePath(canonicalPath)}`;
    const robots = projectId === "oflapp-prod"
      ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
      : "noindex,nofollow";

    document.title = title;
    setCanonical(canonicalUrl);
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", robots);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:type"]', "property", "og:type", pageType);
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", "Open Forecast Library");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
  }, [canonicalPath, description, pageType, title]);

  return null;
}
