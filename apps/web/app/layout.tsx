import './globals.css'
export const metadata = { title: 'Plumbing Ops' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white border-b p-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="font-bold">Plumbing Ops</a>
              <a href="/builders" className="text-sm text-gray-600">Builders</a>
              <a href="/jobs" className="text-sm text-gray-600">Jobs</a>
              <a href="/service-calls" className="text-sm text-gray-600">Service Calls</a>
              <a href="/bids" className="text-sm text-gray-600">Bids</a>
            </div>
            <div>
              <a href="/login" className="text-sm text-gray-600">Login</a>
            </div>
          </nav>
          <div>{children}</div>
        </div>
      </body>
    </html>
  )
}
