/**
 * Two pre-sized AVIF/WebP files. The optimizer is skipped because the files are already compressed.
 */
export function Shot({
  name,
  kind,
  alt,
  priority = false,
  sizes = "(max-width: 767px) 100vw, 50vw",
  className,
  width = 800,
  height = 1000,
  active,
  shot
}: {
  name: string;
  kind: "photo" | "ui";
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  width?: number;
  height?: number;
  active?: boolean;
  shot?: string;
}) {
  const folder = kind === "ui" ? "ui" : "photos";
  const small = kind === "ui" ? 480 : 640;
  const large = kind === "ui" ? 960 : 1280;
  const base = `/landing/${folder}/${name}`;
  return (
    <picture className={className ? `hv3-picture ${className}` : "hv3-picture"}>
      <source media="(min-width: 768px)" srcSet={`${base}-${large}.avif`} type="image/avif" />
      <source media="(min-width: 768px)" srcSet={`${base}-${large}.webp`} type="image/webp" />
      <source srcSet={`${base}-${small}.avif`} type="image/avif" />
      <source srcSet={`${base}-${small}.webp`} type="image/webp" />
      <img
        src={`${base}-${small}.webp`}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        decoding={priority ? "sync" : "async"}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        data-active={active ? "true" : undefined}
        data-shot={shot}
      />
    </picture>
  );
}
