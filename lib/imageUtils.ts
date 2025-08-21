/**
 * Enhanced media URL utilities for Art Blocks with different image sizes
 */

export type ImageSize = 'thumbnail' | 'standard' | 'hd'

/**
 * Compose Art Blocks media URL with size options
 * For Flagship collections, uses simple tokenId format (sequential from 0)
 */
export function composeMediaUrl(
  tokenId: string, 
  contractAddress?: string, 
  size: ImageSize = 'standard'
): string {
  // Engine contracts only support standard size
  if (contractAddress && contractAddress !== '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a') {
    return `https://media-proxy.artblocks.io/${encodeURIComponent(contractAddress)}/${encodeURIComponent(tokenId)}.png`
  }
  
  // For Flagship contracts, use simple tokenId format (sequential from 0)
  const baseUrl = 'https://media.artblocks.io'
  switch (size) {
    case 'thumbnail':
      return `${baseUrl}/thumb/${encodeURIComponent(tokenId)}.png`
    case 'hd':
      return `${baseUrl}/hd/${encodeURIComponent(tokenId)}.png`
    case 'standard':
    default:
      return `${baseUrl}/${encodeURIComponent(tokenId)}.png`
  }
}

/**
 * Determine optimal image size based on display dimensions
 */
export function getOptimalImageSize(displaySize: number): ImageSize {
  if (displaySize < 200) return 'thumbnail'  // Use thumbnails for small grid cells
  if (displaySize > 500) return 'hd'         // Use HD for large cells and full zoom
  return 'standard'                          // Standard for medium sizes
}

/**
 * Preload an image and return a promise
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/**
 * Get fallback image sizes for progressive loading
 */
export function getImageSizeFallbacks(preferredSize: ImageSize): ImageSize[] {
  switch (preferredSize) {
    case 'hd':
      return ['hd', 'standard', 'thumbnail']
    case 'standard':
      return ['standard', 'thumbnail']
    case 'thumbnail':
      return ['thumbnail', 'standard']
    default:
      return ['standard', 'thumbnail']
  }
}

/**
 * Compose srcset string for responsive images
 * Returns a srcset string with all available image sizes
 */
export function composeImageSrcSet(
  tokenId: string,
  contractAddress?: string
): string {
  // Engine contracts only support standard size
  if (contractAddress && contractAddress !== '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a') {
    const url = `https://media-proxy.artblocks.io/${encodeURIComponent(contractAddress)}/${encodeURIComponent(tokenId)}.png`
    // Provide same URL for both 1x and 2x to support retina displays
    return `${url} 1x, ${url} 2x`
  }
  
  // For Flagship contracts, provide all sizes with both width and density descriptors
  const baseUrl = 'https://media.artblocks.io'
  const thumbnailUrl = `${baseUrl}/thumb/${encodeURIComponent(tokenId)}.png`
  const standardUrl = `${baseUrl}/${encodeURIComponent(tokenId)}.png`
  const hdUrl = `${baseUrl}/hd/${encodeURIComponent(tokenId)}.png`
  
  // Return srcset with width descriptors for responsive sizing
  // Thumbnail: ~400px wide, Standard: ~1200px wide, HD: ~2400px wide
  // HD images will be used for retina displays automatically based on device pixel ratio
  return `${thumbnailUrl} 400w, ${standardUrl} 1200w, ${hdUrl} 2400w`
}

/**
 * Generate sizes attribute for responsive images
 * This tells the browser which image size to use at different viewport widths
 * Browser will automatically multiply by device pixel ratio for retina displays
 */
export function generateImageSizes(cellSize: number): string {
  // For grid cells, specify the actual rendered size
  // Browser automatically accounts for device pixel ratio (DPR)
  // On retina (2x) displays, browser will fetch 2x the resolution
  return `${cellSize}px`
}
