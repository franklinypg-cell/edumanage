import Sidebar from '@/app/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-56 flex-1 bg-gray-50">
        {children}
      </div>
    </div>
  )
}