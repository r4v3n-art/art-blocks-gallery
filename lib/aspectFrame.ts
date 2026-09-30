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
