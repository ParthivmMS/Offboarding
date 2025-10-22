import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user details from our users table
  const { data: userData } = await supabase
    .from('users')
    .select('*, organizations(name)')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={userData} />
      <div className="lg:pl-64">
        <Header user={userData} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
