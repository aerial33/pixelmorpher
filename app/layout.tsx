import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'

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
		<ClerkProvider appearance={{ variables: { colorPrimary: '#624cf5' } }}>
			<html lang='en'>
				<body className={cn('font-inter antialiased', inter.variable)}>
					{children}
				</body>
			</html>
		</ClerkProvider>
	)
}
