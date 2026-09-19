import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/authContext'
import { 
  Home, 
  Clock, 
  History, 
  Wallet, 
  User, 
  LogOut, 
  Building2 
} from 'lucide-react'

interface EmployeeLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export default function EmployeeLayout({ children, title, subtitle }: EmployeeLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { label: 'Trang chủ', path: '/app/home', icon: Home },
    { label: 'Chấm công', path: '/app/punch', icon: Clock, isPunch: true },
    { label: 'Lịch sử', path: '/app/history', icon: History },
    { label: 'Lương', path: '/app/payslip', icon: Wallet },
    { label: 'Cá nhân', path: '/app/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans pb-20">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 block leading-tight">BPOTime Mobile</span>
            <p className="text-[10px] text-slate-500 font-medium truncate max-w-[160px]">
              {user?.fullName || user?.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.fullName || 'User'} 
              className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200" 
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
              {(user?.fullName?.[0] || 'E').toUpperCase()}
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area (Max width optimized for phone/tablet) */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4">
        {(title || subtitle) && (
          <div className="mb-4">
            {title && <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>

      {/* Sticky Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 max-w-lg mx-auto shadow-lg">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex flex-col items-center justify-center py-1 rounded-xl transition-all select-none
                  ${isActive 
                    ? 'text-indigo-600 font-bold' 
                    : 'text-slate-400 hover:text-slate-700 font-medium'}
                  ${item.isPunch ? '-mt-4' : ''}
                `}
              >
                {({ isActive }) => (
                  <>
                    {item.isPunch ? (
                      <div className={`
                        h-12 w-12 rounded-2xl flex items-center justify-center shadow-md transition-transform active:scale-95
                        ${isActive 
                          ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-indigo-500/30' 
                          : 'bg-indigo-600 text-white shadow-slate-300'}
                      `}>
                        <Icon className="h-6 w-6" />
                      </div>
                    ) : (
                      <div className={`p-1 rounded-lg ${isActive ? 'bg-indigo-50' : ''}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    )}
                    <span className={`text-[10px] tracking-tight ${item.isPunch ? 'mt-1 font-bold text-indigo-600' : 'mt-0.5'}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
