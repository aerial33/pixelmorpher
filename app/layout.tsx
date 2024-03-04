import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const inter = Inter({
	subsets: ['latin'],
	weight: ['400', '500', '700'],
	variable: '--font-inter',
})

export const metadata: Metadata = {
	title: 'PixelMorpher',
	description: 'Ai powered pixel art morphing',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='en'>
			<body className={cn('font-inter antialiased', inter.variable)}>
				{children}
			</body>
		</html>
	)
}
