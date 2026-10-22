import { getImageProps } from "next/image";

/**
 * Two pre-sized files. next/image supplies the img attributes.
 * Files are already WebP and AVIF, so the optimizer is skipped.
 */
export function LandingPicture({
  name,
  alt,
  width,
  height,
  priority = false,
  className,
  sizes = "(max-width: 767px) 100vw, 50vw"
}: {
  name: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const mobileW = Math.round(width / 2);
  const mobileH = Math.round(height / 2);
  const mobile = getImageProps({
    src: `/landing/${name}-800.webp`,
    alt,
    width: mobileW,
    height: mobileH,
    unoptimized: true,
    priority,
    sizes
  }).props;
  const desktop = getImageProps({
    src: `/landing/${name}-1600.webp`,
    alt,
    width,
    height,
    unoptimized: true,
    sizes
  }).props;

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={`/landing/${name}-1600.avif`} type="image/avif" />
      <source media="(min-width: 768px)" srcSet={desktop.srcSet || desktop.src} type="image/webp" />
      <source srcSet={`/landing/${name}-800.avif`} type="image/avif" />
      <source srcSet={mobile.srcSet || mobile.src} type="image/webp" />
      <img
        src={mobile.src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={className}
        decoding={priority ? "sync" : "async"}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
