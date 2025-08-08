import { useState, useEffect } from "react"

interface NFTMeta {
  tokenId: string
  projectName?: string
  generatorUrl: string
}

interface ArtworkDisplayProps {
  currentNFT: NFTMeta
  nextNFT: NFTMeta | null
  showBorder: boolean
  isFullscreen: boolean
}

export function ArtworkDisplay({ 
  currentNFT, 
  nextNFT, 
  showBorder,
  isFullscreen 
}: ArtworkDisplayProps) {
  const [, setNextIframeLoaded] = useState(false)

  useEffect(() => {
    setNextIframeLoaded(false)
  }, [currentNFT.tokenId])

  return (
    <div className={`absolute inset-0 flex items-center justify-center ${showBorder ? 'p-12' : ''}`}>
      {/* Container with border that contains the iframe */}
      <div 
        className={`w-full h-full relative ${showBorder ? 'bg-white p-4' : ''}`}
        style={showBorder ? {
          boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.05)'
        } : undefined}
      >
        {/* Main iframe - fills the entire available space inside the padding */}
        <iframe
          key={`current-${currentNFT.tokenId}-${showBorder}-${isFullscreen}`}
          src={currentNFT.generatorUrl}
          className="w-full h-full border-0"
          title={`${currentNFT.projectName} #${currentNFT.tokenId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms"
          loading="eager"
        />
        
        {/* Preload iframe */}
        {nextNFT && (
          <iframe
            key={`next-${nextNFT.tokenId}-${showBorder}-${isFullscreen}`}
            src={nextNFT.generatorUrl}
            className="absolute inset-0 w-full h-full border-0 opacity-0 pointer-events-none"
            style={{
              zIndex: -1
            }}
            title={`Preloading: ${nextNFT.projectName} #${nextNFT.tokenId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="eager"
            onLoad={() => setNextIframeLoaded(true)}
          />
        )}
      </div>
    </div>
  )
}