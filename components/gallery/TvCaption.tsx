"use client"

import { formatSeriesLine, formatTitleLine } from "@/lib/tvCaption"

interface TvCaptionProps {
  projectName?: string
  invocation?: number
  artist?: string
  mintedCount?: number
  mintedAt?: string
}

export function TvCaption({
  projectName,
  invocation,
  artist,
  mintedCount,
  mintedAt,
}: TvCaptionProps) {
  const title = formatTitleLine(projectName, invocation)
  const series = formatSeriesLine(mintedCount, mintedAt)

  if (!title && !artist && !series) return null

  return (
    <div
      className="absolute bottom-8 right-8 z-[5] max-w-[18rem] pointer-events-none text-right text-white"
      aria-hidden="true"
    >
      {title && (
        <div className="font-light text-lg leading-snug tracking-wide">
          {title}
        </div>
      )}
      {artist && (
        <div className="font-light text-sm leading-snug text-white/80 mt-1">
          {artist}
        </div>
      )}
      {series && (
        <div className="font-light text-sm leading-snug text-white/70 mt-1">
          {series}
        </div>
      )}
    </div>
  )
}
