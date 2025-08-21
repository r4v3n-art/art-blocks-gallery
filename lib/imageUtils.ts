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
