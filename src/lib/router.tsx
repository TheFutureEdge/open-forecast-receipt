"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

export function normalizeBasePath(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

const APP_BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH || "");

export function addBasePath(pathname: string, basePath = APP_BASE_PATH): string {
  if (pathname.startsWith("#")) return pathname;
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalizedBase = normalizeBasePath(basePath);
  return `${normalizedBase}${normalizedPath}` || "/";
}

export function stripBasePath(pathname: string, basePath = APP_BASE_PATH): string {
  const normalizedBase = normalizeBasePath(basePath);
  if (!normalizedBase) return pathname || "/";
  if (pathname === normalizedBase || pathname === `${normalizedBase}/`) return "/";
  if (pathname.startsWith(`${normalizedBase}/`)) {
    return pathname.slice(normalizedBase.length) || "/";
  }
  return pathname || "/";
}

export function useLocation(): { pathname: string; search: string; hash: string } {
  const pathname = stripBasePath(usePathname() || "/");
  const searchParams = useSearchParams();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  return {
    pathname,
    search: searchParams.size > 0 ? `?${searchParams.toString()}` : "",
    hash,
  };
}

export function navigate(to: string, options?: { replace?: boolean }): void {
  if (typeof window === "undefined") return;
  const browserPath = addBasePath(to);
  if (options?.replace) window.location.replace(browserPath);
  else window.location.assign(browserPath);
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, ...props }: LinkProps) {
  return (
    <a href={addBasePath(to)} {...props}>
      {children}
    </a>
  );
}
