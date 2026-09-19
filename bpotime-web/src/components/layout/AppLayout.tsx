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
  Search,
  Sparkles,
  Smartphone,
  ChevronRight
} from 'lucide-react'

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
    weekday: 'short',
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
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans antialiased">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-in-out shadow-lg shadow-slate-100 lg:shadow-none
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">BPOTime</span>
              <p className="text-[11px] text-slate-400 font-medium -mt-0.5">Quản lý chấm công</p>
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
          <div className="px-3 pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Menu</span>
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
                  flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1 rounded-md transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user?.fullName || user?.username} 
                  className="h-8 w-8 rounded-lg object-cover shrink-0 ring-1 ring-slate-100" 
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {(user?.fullName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user?.fullName || user?.username || 'Quản trị viên'}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate uppercase mt-0.5">
                  {isEmployeeOnly ? 'Nhân viên' : (roles[0] || 'Quản trị')}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất khỏi hệ thống"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/70 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 font-normal hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          {/* Right Header Navigation & Tools */}
          <div className="flex items-center gap-3">
            {/* Live Real-time Clock Widget */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="capitalize font-medium">{formattedDate}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono font-bold text-slate-800">{formattedTime}</span>
            </div>

            {/* Notifications Button */}
            <button className="relative p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-indigo-600 rounded-full ring-2 ring-white" />
            </button>

            {/* User Mini Chip (Desktop) */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user?.fullName || user?.username} 
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200" 
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {(user?.fullName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <span className="hidden md:inline-block text-xs font-semibold text-slate-700 max-w-[120px] truncate">
                {user?.fullName?.split(' ').slice(-1)[0] || user?.username || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

