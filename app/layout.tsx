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
    
    // If user has explicitly chosen a theme, use that
    // Otherwise, default to OS preference
    var useDark;
    if (stored === 'dark' || stored === 'light') {
      useDark = stored === 'dark';
    } else {
      useDark = prefersDark;
    }
    
    var root=document.documentElement;
    if(useDark){ 
      root.classList.add('dark'); 
    } else { 
      root.classList.remove('dark'); 
    }
    
    // Listen for OS theme changes and update if user hasn't made explicit choice
    var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', function(e) {
      var currentStored = localStorage.getItem(key);
      // Only auto-update if user hasn't explicitly chosen a theme
      if (currentStored !== 'dark' && currentStored !== 'light') {
        var newPrefersDark = e.matches;
        if (newPrefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    });
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
