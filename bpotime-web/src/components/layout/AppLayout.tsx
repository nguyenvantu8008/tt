import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Building2, 
  LayoutDashboard, 
  Clock, 
  ClipboardCheck, 
  CalendarDays, 
  Users, 
  FolderKanban, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  ShieldCheck,
  ChevronRight,
  Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null
  const roles: string[] = user?.roles || []
  const isEmployeeOnly = roles.includes('EMPLOYEE') && !roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN') && !roles.includes('HR_MANAGER')

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const allNavItems = [
    { name: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard, adminOnly: true },
    { name: 'Chấm công cá nhân (GPS)', path: '/my-attendance', icon: Clock, badge: 'PWA' },
    { name: 'Kiosk Hiện Trường (Đi xa)', path: '/onsite-kiosk', icon: Smartphone, badge: 'Mới' },
    { name: 'Điểm danh hàng ngày', path: '/daily-attendance', icon: ClipboardCheck, adminOnly: true },
    { name: 'Bảng công tháng', path: '/monthly-timesheet', icon: CalendarDays, adminOnly: true },
    { name: 'Quản lý Nhân sự', path: '/employees', icon: Users, adminOnly: true },
    { name: 'Dự án BPO & Vị trí GPS', path: '/projects', icon: FolderKanban, adminOnly: true },
  ]

  const navItems = isEmployeeOnly ? allNavItems.filter(item => !item.adminOnly) : allNavItems

  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  return (
    <div className="min-h-screen bg-slate-50/60 flex text-slate-900 font-sans">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900">BPOTime</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">BPO Solutions Vietnam</p>
            </div>
          </div>
          <button 
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Hệ Thống Quản Lý</span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 animate-pulse'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user?.fullName || user?.username} 
                  className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200" 
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                  {(user?.fullName?.[0] || user?.username?.[0] || 'A').toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName || user?.username || 'Quản trị viên'}</p>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span className="text-[10px] text-slate-500 font-medium truncate">
                    {isEmployeeOnly ? 'NHÂN VIÊN (BPO)' : (roles[0] || 'SUPER_ADMIN')}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base lg:text-lg font-bold text-slate-900 leading-none">{title}</h1>
              </div>
              {subtitle && <p className="text-xs text-slate-500 mt-1 hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          {/* Right Header Status Bar */}
          <div className="flex items-center gap-4">
            {/* Live Real-time Clock */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-100/70 border border-slate-200/60 text-xs">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-semibold text-slate-700 capitalize">{formattedDate}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono font-bold text-blue-600 text-sm">{formattedTime}</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-blue-600 rounded-full ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
