import Sidebar from '@/app/components/sidebar'
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-56 flex-1 min-h-screen">
        {children}
      </div>
    </div>
  )
}
