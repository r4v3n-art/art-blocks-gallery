/** Default when project metadata has no usable aspect_ratio. */
export const DEFAULT_ASPECT_RATIO = 1

/**
 * Parse Art Blocks `projects_metadata.aspect_ratio` (width / height).
 * Hasura may return numeric as a number or a string.
 */
export function parseAspectRatio(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : undefined
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return undefined
}

export function resolveAspectRatio(value: unknown): number {
  return parseAspectRatio(value) ?? DEFAULT_ASPECT_RATIO
}

/**
 * Largest box of the given aspect ratio that fits in the available area
 * without cropping. Prefers filling height; letterboxes left/right when the
 * resulting width would overflow, or top/bottom when the piece is too tall.
 */
export function computeContainFrame(
  availableWidth: number,
  availableHeight: number,
  aspectRatio: number
): { width: number; height: number } {
  if (!(availableWidth > 0) || !(availableHeight > 0)) {
    return { width: 0, height: 0 }
  }

  const ratio = resolveAspectRatio(aspectRatio)
  const heightFirstWidth = availableHeight * ratio
  if (heightFirstWidth <= availableWidth) {
    return { width: heightFirstWidth, height: availableHeight }
  }
  return { width: availableWidth, height: availableWidth / ratio }
}

/** Off-white mat padding, matching the existing showBorder inner pad. */
export const MAT_PADDING_PX = 16
/** Outer/inner hairline thickness. */
export const MAT_HAIRLINE_PX = 1
/** Reserved right-side column so the TV caption can sit on black letterbox. */
export const CAPTION_GUTTER_PX = 300

export function matChromePx(): number {
  return (MAT_PADDING_PX + MAT_HAIRLINE_PX) * 2
}

/**
 * Size the generator (inner) box for the player.
 * Centered by default. Left-justifies only when a centered frame would
 * collide with the bottom-right caption gutter.
 */
export function computePlayerFrame(
  availableWidth: number,
  availableHeight: number,
  aspectRatio: number,
  captionGutter = CAPTION_GUTTER_PX
): { width: number; height: number; align: "left" | "center" } {
  const chrome = matChromePx()
  const innerAvailW = Math.max(1, availableWidth - chrome)
  const innerAvailH = Math.max(1, availableHeight - chrome)
  const centered = computeContainFrame(innerAvailW, innerAvailH, aspectRatio)
  const outerWidth = centered.width + chrome
  const leftOffset = Math.max(0, (availableWidth - outerWidth) / 2)
  const rightEdge = leftOffset + outerWidth
  const captionLeft = Math.max(0, availableWidth - captionGutter)

  if (rightEdge <= captionLeft) {
    return { ...centered, align: "center" }
  }

  const innerMaxW = Math.max(1, captionLeft - chrome)
  const fitted = computeContainFrame(innerMaxW, innerAvailH, aspectRatio)
  return { ...fitted, align: "left" }
}
