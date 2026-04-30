import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Подобар Прилеп',
  description: 'Граѓанска платформа за пријавување градски проблеми во Прилеп',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mk" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased font-sans bg-white text-zinc-900">
        <div className="w-full max-w-350 mx-auto h-full">
          {children}
        </div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
