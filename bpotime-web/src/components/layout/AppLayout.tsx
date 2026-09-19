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
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-in-out shadow-lg shadow-slate-100 lg:shadow-none
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-20 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/25 text-white ring-2 ring-indigo-100">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">BPOTime</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60 shadow-2xs">ENTERPRISE</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Workforce & GPS Attendance</p>
            </div>
          </div>
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-5 px-4 overflow-y-auto space-y-1.5">
          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Menu Điều Hướng</span>
            <Sparkles className="h-3 w-3 text-indigo-400" />
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
                  group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 translate-x-1' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 hover:translate-x-0.5'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50/60'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="tracking-tight">{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user?.fullName || user?.username} 
                  className="h-10 w-10 rounded-xl object-cover shrink-0 ring-2 ring-slate-100" 
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                  {(user?.fullName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{user?.fullName || user?.username || 'Quản trị viên'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span className="text-[10px] text-slate-500 font-semibold truncate uppercase">
                    {isEmployeeOnly ? 'NHÂN VIÊN' : (roles[0] || 'QUẢN TRỊ VIÊN')}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất khỏi hệ thống"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/70 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2.5 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight leading-none">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          {/* Right Header Navigation & Tools */}
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Quick Search Box (Desktop) */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/60 text-slate-400 text-xs w-64 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Tìm nhân sự, ca làm, mã..." 
                className="bg-transparent border-none outline-hidden text-slate-700 w-full placeholder:text-slate-400" 
              />
            </div>

            {/* Live Real-time Clock Widget */}
            <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs shadow-2xs">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </div>
              <span className="font-semibold text-slate-600 capitalize">{formattedDate}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono font-bold text-indigo-600 text-sm tracking-tight">{formattedTime}</span>
            </div>

            {/* Notifications Button */}
            <button className="relative p-2.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-indigo-600 rounded-full ring-2 ring-white" />
            </button>

            {/* User Mini Chip (Desktop) */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user?.fullName || user?.username} 
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200" 
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {(user?.fullName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user?.fullName?.split(' ').slice(-1)[0] || user?.username || 'Admin'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">BPO Team</p>
              </div>
            </div>
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

