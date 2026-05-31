import Image from "next/image";

export type TeamFlagProps = {
  name: string;
  flagUrl: string | null;
  /**
   * Flag height in pixels. The width is derived from the 4:3 aspect ratio of
   * the flagcdn source images. Defaults to 30.
   */
  size?: number;
  /** Class for the <Image> when flagUrl is present. Defaults to the standard rectangular flag. */
  imageClassName?: string;
  /** Class for the placeholder <div> when flagUrl is null. Defaults to a dashed-border rectangle. */
  placeholderClassName?: string;
};

const DEFAULT_SIZE = 30;

// flagcdn `wNNN` images are 4:3, so we render a 4:3 box: a flag-shaped
// rectangle rather than a circle (which clipped flags awkwardly). Slightly
// rounded corners keep it soft without distorting the proportions.
const ASPECT = 4 / 3;

const DEFAULT_IMAGE_CLASS =
  "shrink-0 rounded-[3px] object-cover ring-[1.5px] ring-inset ring-border";

const DEFAULT_PLACEHOLDER_CLASS =
  "shrink-0 rounded-[3px] border border-dashed border-border bg-card-muted";

/**
 * Null-safe team flag.
 * When `flagUrl` is null, renders an aria-hidden placeholder rectangle instead
 * of crashing or showing a broken image — the most common case during
 * group-stage setup where teams are TBD.
 */
export function TeamFlag({
  name,
  flagUrl,
  size = DEFAULT_SIZE,
  imageClassName,
  placeholderClassName,
}: TeamFlagProps) {
  const height = size;
  const width = Math.round(size * ASPECT);
  // Width/height are set inline so Tailwind preflight (`img { height: auto }`)
  // cannot override them and squash the flag.
  const dimensionStyle = { width, height };

  if (flagUrl) {
    return (
      <Image
        src={flagUrl}
        alt={`Bandera de ${name}`}
        width={width}
        height={height}
        unoptimized
        style={dimensionStyle}
        className={imageClassName ?? DEFAULT_IMAGE_CLASS}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={dimensionStyle}
      className={placeholderClassName ?? DEFAULT_PLACEHOLDER_CLASS}
    />
  );
}
