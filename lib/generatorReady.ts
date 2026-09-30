/** Origins that host Art Blocks live generators. */
const ARTBLOCKS_HOST = /(?:^|\.)artblocks\.io$/i

const READY_MESSAGE_TYPES = new Set([
  "ready",
  "preview-ready",
  "preview-render-complete",
  "rendercomplete",
  "render-complete",
  "loaded",
  "complete",
])

function normalizeType(value: string): string {
  return value.toLowerCase().replace(/[_\s]/g, "-")
}

export function isArtBlocksOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname
    return ARTBLOCKS_HOST.test(host)
  } catch {
    return false
  }
}

/**
 * Art Blocks generators do not share one official "canvas ready" event, but
 * some engine/wrapper pages post a message when the first frame is up.
 * Accept the common type/kind names without treating arbitrary postMessage
 * traffic as a ready signal.
 */
export function isGeneratorReadyMessage(data: unknown): boolean {
  if (typeof data === "string") {
    return READY_MESSAGE_TYPES.has(normalizeType(data))
  }
  if (!data || typeof data !== "object") return false

  const rec = data as Record<string, unknown>
  const type = rec.type ?? rec.kind ?? rec.event ?? rec.message
  if (typeof type === "string" && READY_MESSAGE_TYPES.has(normalizeType(type))) {
    return true
  }
  return rec.ready === true || rec.complete === true
}

/** Two animation frames: generator setup/draw can paint after iframe `load`. */
export function afterNextPaint(callback: () => void): () => void {
  let cancelled = false
  const id = requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!cancelled) callback()
    })
  })
  return () => {
    cancelled = true
    cancelAnimationFrame(id)
  }
}

/** Safety net if `load` never fires (network hang, broken generator). */
export const GENERATOR_READY_FALLBACK_MS = 12_000
