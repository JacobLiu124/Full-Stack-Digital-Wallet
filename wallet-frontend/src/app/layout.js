import './globals.css'

export const metadata = {
  title: 'Wallet',
  description: 'Your personal digital wallet',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
