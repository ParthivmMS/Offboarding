'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  LayoutDashboard, 
  LogOut, 
  Settings, 
  FileText, 
  CheckSquare, 
  Users,
  Menu,
  X,
  Sparkles,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import OrganizationSwitcher from '@/components/dashboard/OrganizationSwitcher'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClient()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Offboardings', href: '/dashboard/offboardings', icon: FileText },
    { name: 'My Tasks', href: '/dashboard/tasks', icon: CheckSquare },
    { name: 'Templates', href: '/dashboard/templates', icon: FileText },
    { name: 'AI Insights', href: '/dashboard/insights', icon: Sparkles, highlight: true },
    { name: 'Security', href: '/dashboard/security', icon: Shield, highlight: true },
    { name: 'Team', href: '/dashboard/team', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SINGLE Mobile Header - Only shown on mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">OffboardPro</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="hover:bg-gray-100"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Sidebar - Hidden on mobile unless menu open */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r transition-transform duration-300 shadow-lg lg:shadow-none
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo - Desktop Only */}
          <div className="p-6 border-b hidden lg:flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">OffboardPro</span>
          </div>

          {/* Mobile: Add padding to push menu below mobile header */}
          <div className="lg:hidden h-16"></div>

          {/* Organization Switcher */}
          <div className="p-4 border-b">
            <OrganizationSwitcher />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const isHighlight = item.highlight
              const active = isActive(item.href)
              
              // Different colors for special items
              let activeClasses = 'bg-blue-50 text-blue-600'
              if (item.name === 'AI Insights' && active) {
                activeClasses = 'bg-purple-50 text-purple-600'
              } else if (item.name === 'Security' && active) {
                activeClasses = 'bg-red-50 text-red-600'
              }
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative
                    ${
                      active
                        ? `${activeClasses} font-medium`
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${
                    item.name === 'AI Insights' && active ? 'text-purple-600' :
                    item.name === 'Security' && active ? 'text-red-600' : ''
                  }`} />
                  {item.name}
                  {isHighlight && (
                    <span className="ml-auto">
                      {item.name === 'AI Insights' ? (
                        <Sparkles className="w-3 h-3 text-purple-400" />
                      ) : item.name === 'Security' ? (
                        <Shield className="w-3 h-3 text-red-400" />
                      ) : null}
                    </span>
                  )}
                  {item.name === 'Security' && !active && (
                    <span className="ml-auto">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        NEW
                      </span>
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
