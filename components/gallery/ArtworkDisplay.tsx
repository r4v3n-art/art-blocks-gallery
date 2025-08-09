import { useMemo, type CSSProperties } from "react"
import Head from "next/head"

interface NFTMeta {
  tokenId: string
  projectName?: string
  generatorUrl: string
}

interface ArtworkDisplayProps {
  currentNFT: NFTMeta
  nextNFT: NFTMeta | null
  showBorder: boolean
}

export function ArtworkDisplay({ 
  currentNFT, 
  nextNFT, 
  showBorder,
}: ArtworkDisplayProps) {
  const origins = useMemo(() => {
    const set = new Set<string>()
    try { set.add(new URL(currentNFT.generatorUrl).origin) } catch {}
    if (nextNFT) {
      try { set.add(new URL(nextNFT.generatorUrl).origin) } catch {}
    }
    return Array.from(set)
  }, [currentNFT.generatorUrl, nextNFT])

  const containerStyle: CSSProperties = showBorder
    ? {
        boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.05)',
        contain: 'layout paint size',
        willChange: 'transform',
      }
    : {
        contain: 'layout paint size',
        willChange: 'transform',
      }

  return (
    <div className={`absolute inset-0 flex items-center justify-center ${showBorder ? 'p-12' : ''}`}>
      {/* Resource hints for current and next origins */}
      <Head>
        {origins.map((origin) => (
          <link key={`preconnect-${origin}`} rel="preconnect" href={origin} crossOrigin="anonymous" />
        ))}
        {origins.map((origin) => (
          <link key={`dns-${origin}`} rel="dns-prefetch" href={origin} />
        ))}
        {nextNFT ? (
          <link key={`prefetch-${nextNFT.tokenId}`} rel="prefetch" href={nextNFT.generatorUrl} as="document" crossOrigin="anonymous" />
        ) : null}
      </Head>

      {/* Container with border that contains the iframe */}
      <div 
        className={`w-full h-full relative ${showBorder ? 'bg-white p-4' : ''}`}
        style={containerStyle}
      >
        {/* Main iframe - fills the entire available space inside the padding */}
        <iframe
          key={`current-${currentNFT.tokenId}`}
          src={currentNFT.generatorUrl}
          className="w-full h-full border-0"
          title={`${currentNFT.projectName} #${currentNFT.tokenId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms"
          referrerPolicy="no-referrer"
          loading="eager"
        />
        
        {/* Removed heavy hidden preload iframe in favor of connection hints */}
      </div>
    </div>
  )
}