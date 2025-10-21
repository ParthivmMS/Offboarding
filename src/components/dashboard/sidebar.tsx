'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  ListTodo, 
  FileText,
  Settings,
  LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  user: any
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Offboardings', href: '/dashboard/offboardings', icon: Users },
  { name: 'My Tasks', href: '/dashboard/tasks', icon: ListTodo },
  { name: 'Templates', href: '/dashboard/templates', icon: ClipboardList },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-white border-r overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center px-6 py-4 border-b">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="ml-2 font-bold text-lg">OffboardPro</span>
        </div>

        {/* Organization Info */}
        <div className="px-6 py-4 border-b bg-slate-50">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Organization</p>
          <p className="mt-1 font-medium text-sm">{user?.organizations?.name}</p>
          <p className="text-xs text-slate-600 mt-1">{user?.name}</p>
          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
            {user?.role.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <item.icon className={cn('w-5 h-5 mr-3', isActive ? 'text-blue-700' : 'text-slate-400')} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-700 hover:bg-slate-50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-400" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}
