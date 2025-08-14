import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Art Blocks Gallery",
  description: "Discover and view generative art NFTs with an immersive gallery experience",
}

function ThemeInitScript() {
  // Inline script to set initial theme before React hydration to avoid flash
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function(){
  try{
    var key='abg-theme';
    var stored=localStorage.getItem(key);
    var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
    var useDark = stored ? stored === 'dark' : prefersDark;
    var root=document.documentElement;
    if(useDark){ root.classList.add('dark'); } else { root.classList.remove('dark'); }
  }catch(e){}
})();
        `.trim()
      }}
    />
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
