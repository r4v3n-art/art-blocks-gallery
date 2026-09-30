/** Live minted count from `projects_metadata.invocations` (not max_invocations). */
export function parseMintedCount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }
  return undefined
}

export function parseMintedAt(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

/** Token `minted_at` as "Month YYYY" (UTC). */
export function formatMintMonthYear(mintedAt: string | undefined): string | undefined {
  if (!mintedAt) return undefined
  const date = new Date(mintedAt)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
}

export function formatSeriesLine(
  mintedCount: number | undefined,
  mintedAt: string | undefined
): string | undefined {
  const series = mintedCount ? `Series of ${mintedCount.toLocaleString("en-US")}` : undefined
  const when = formatMintMonthYear(mintedAt)
  if (series && when) return `${series}, ${when}`
  return series ?? when
}

export function formatTitleLine(
  projectName: string | undefined,
  invocation: number | string | undefined
): string | undefined {
  if (!projectName) return undefined
  if (invocation === undefined || invocation === null || invocation === "") return projectName
  return `${projectName} #${invocation}`
}
