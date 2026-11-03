import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Hela Laget',
  description: 'Träningar, matcher och cuper för laget',
  robots: { index: false, follow: false },
  applicationName: 'Hela Laget',
  appleWebApp: {
    capable: true,
    title: 'Hela Laget',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Ljust tema är standard, oavsett telefonens inställning
  themeColor: '#fafafa',
}

// Sätter mörkt läge innan sidan ritas om användaren valt det, så att det inte blinkar.
// Annars är temat ljust.
// Samma nyckel och logik som hooks/useTheme.
const themeScript = `(function(){try{if(localStorage.getItem('hl-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
