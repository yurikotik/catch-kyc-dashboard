import type { Metadata } from "next"
import { Figtree } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

/* Figtree = Senior Planet companion font (Gotham is Adobe-licensed) */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
})

export const metadata: Metadata = {
  title: "TOP DOGS 20/20 PLAY DECK - CEF Index Daily Data & Rank",
  description:
    "TOP DOGS 20/20 PLAY DECK - Top 50 CEF Index daily data and rank for closed-end fund Z-scores, discounts, and distribution rates",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${figtree.variable} bg-background`} suppressHydrationWarning>
      <head>
        {/* Apply saved text scale before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.remove('dark');var s=localStorage.getItem('gy-text-size');var scale=s==='xl'?1.16:s==='lg'?1.08:1;document.documentElement.style.setProperty('--gy-scale',String(scale))}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${figtree.className} antialiased`}>
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
