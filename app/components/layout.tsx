'use client'
import Sidebar from './sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-h-screen overflow-x-hidden" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 w-full overflow-auto pt-14 md:pt-0">
        {children}
      </div>
    </div>
  )
}