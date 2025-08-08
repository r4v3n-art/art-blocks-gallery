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
    <div className={`absolute inset-0 flex items-center justify-center ${showBorder ? 'p-10' : ''}`}>
      <div className="w-full h-full max-w-none max-h-none relative">
        <iframe
          key={`current-${currentNFT.tokenId}-${showBorder}-${isFullscreen}`}
          src={currentNFT.generatorUrl}
          className="w-full h-full border-0"
          style={showBorder ? {
            boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.15), inset -1px -1px 3px rgba(255,255,255,0.7)'
          } : undefined}
          title={`${currentNFT.projectName} #${currentNFT.tokenId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms"
          loading="eager"
        />
        
        {nextNFT && (
          <iframe
            key={`next-${nextNFT.tokenId}-${showBorder}-${isFullscreen}`}
            src={nextNFT.generatorUrl}
            className="absolute inset-0 w-full h-full border-0 opacity-0 pointer-events-none"
            style={{
              zIndex: -1,
              ...(showBorder ? {
                boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.15), inset -1px -1px 3px rgba(255,255,255,0.7)'
              } : {})
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