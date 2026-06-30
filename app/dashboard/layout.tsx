import Sidebar from '@/app/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-56 flex-1 bg-indigo-50/40">
        {children}
      </div>
    </div>
  )
}