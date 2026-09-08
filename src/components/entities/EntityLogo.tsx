import { useEffect, useState } from "react";
import { Buildings } from "@phosphor-icons/react";

interface EntityLogoProps {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}

/** Render a governed entity logo without ever exposing the browser's broken-image icon. */
export function EntityLogo({ src, alt, className = "size-10", imageClassName = "p-1.5" }: EntityLogoProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-blue-50 text-blue-700 shadow-sm dark:border-slate-700 dark:bg-blue-950/40 dark:text-blue-300 ${className}`}>
      <Buildings size={20} weight="duotone" aria-hidden="true" />
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 size-full bg-white object-contain dark:bg-slate-900 ${imageClassName}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
