import './globals.css'

export const metadata = {
  title: 'Doctor App',
  description: 'Doctor Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
