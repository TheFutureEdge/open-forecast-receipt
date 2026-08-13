import {
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

export function normalizeBasePath(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL);

export function addBasePath(pathname: string, basePath = APP_BASE_PATH): string {
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

function subscribeToLocation(onStoreChange: () => void): () => void {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("hashchange", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("hashchange", onStoreChange);
  };
}

function getPathname(): string {
  return stripBasePath(window.location.pathname);
}

function getSearch(): string {
  return window.location.search;
}

function getHash(): string {
  return window.location.hash;
}

export function useLocation(): { pathname: string; search: string; hash: string } {
  const pathname = useSyncExternalStore(
    subscribeToLocation,
    getPathname,
    () => "/"
  );
  const search = useSyncExternalStore(subscribeToLocation, getSearch, () => "");
  const hash = useSyncExternalStore(subscribeToLocation, getHash, () => "");
  return { pathname, search, hash };
}

export function navigate(to: string, options?: { replace?: boolean }): void {
  const browserPath = addBasePath(to);
  if (options?.replace) {
    window.history.replaceState(null, "", browserPath);
  } else {
    window.history.pushState(null, "", browserPath);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
  const hash = new URL(browserPath, window.location.origin).hash.slice(1);
  if (hash) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ block: "start", behavior: "auto" });
      });
    });
  } else {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, onClick, ...props }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={addBasePath(to)} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
