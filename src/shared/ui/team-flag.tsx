import Image from "next/image";

export type TeamFlagProps = {
  name: string;
  flagUrl: string | null;
  /** Pixel size (both width and height). Defaults to 30. */
  size?: number;
  /** Class for the <Image> when flagUrl is present. Defaults to the standard ring-border pill. */
  imageClassName?: string;
  /** Class for the placeholder <div> when flagUrl is null. Defaults to a dashed-border circle. */
  placeholderClassName?: string;
};

const DEFAULT_SIZE = 30;

// size-[30px] is explicit so Tailwind preflight `img { height: auto }` cannot
// override the height and turn circles into ellipses.
const DEFAULT_IMAGE_CLASS =
  "size-[30px] shrink-0 rounded-full object-cover ring-[1.5px] ring-inset ring-border";

const DEFAULT_PLACEHOLDER_CLASS_30 =
  "size-[30px] shrink-0 rounded-full border border-dashed border-border bg-card-muted";

const DEFAULT_PLACEHOLDER_CLASS_CUSTOM =
  "shrink-0 rounded-full border border-dashed border-border bg-card-muted";

/**
 * Null-safe team flag avatar.
 * When `flagUrl` is null, renders an aria-hidden placeholder circle instead of
 * crashing or showing a broken image — the most common case during group-stage
 * setup where teams are TBD.
 */
export function TeamFlag({
  name,
  flagUrl,
  size = DEFAULT_SIZE,
  imageClassName,
  placeholderClassName,
}: TeamFlagProps) {
  const isDefault = size === DEFAULT_SIZE;
  const sizeStyle = isDefault ? undefined : { width: size, height: size };

  if (flagUrl) {
    return (
      <Image
        src={flagUrl}
        alt={`Bandera de ${name}`}
        width={size}
        height={size}
        unoptimized
        style={sizeStyle}
        className={imageClassName ?? DEFAULT_IMAGE_CLASS}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={sizeStyle}
      className={
        placeholderClassName ??
        (isDefault
          ? DEFAULT_PLACEHOLDER_CLASS_30
          : DEFAULT_PLACEHOLDER_CLASS_CUSTOM)
      }
    />
  );
}
