import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/authContext'
import { 
  Building2, 
  LayoutDashboard, 
  ClipboardCheck, 
  AlertTriangle, 
  Users, 
  FolderKanban, 
  CalendarDays, 
  Calculator, 
  FileSpreadsheet, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Clock,
  Sparkles,
  ChevronDown,
  UserCheck
} from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuGroups = [
    {
      label: 'TỔNG QUAN',
      items: [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Attendance Center', path: '/admin/attendance', icon: ClipboardCheck, badge: 'Realtime' },
        { name: 'Cảnh báo & Ngoại lệ', path: '/admin/exceptions', icon: AlertTriangle, badgeColor: 'bg-rose-100 text-rose-700' },
      ]
    },
    {
      label: 'NHÂN SỰ & DỰ ÁN',
      items: [
        { name: 'Quản lý Nhân viên', path: '/admin/employees', icon: Users },
        { name: 'Dự án BPO & Geofence', path: '/admin/projects', icon: FolderKanban },
      ]
    },
    {
      label: 'CÔNG & LƯƠNG',
      items: [
        { name: 'Bảng công tháng', path: '/admin/timesheet', icon: CalendarDays },
        { name: 'Tính lương (Wizard)', path: '/admin/payroll', icon: Calculator, badge: '7 Bước' },
      ]
    },
    {
      label: 'HỆ THỐNG',
      items: [
        { name: 'Tài khoản & Phân quyền', path: '/admin/system/users', icon: ShieldCheck },
        { name: 'Audit Log', path: '/admin/system/audit', icon: FileSpreadsheet },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans antialiased">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Admin Sidebar Navigation */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-200 ease-in-out shadow-lg shadow-slate-100 lg:shadow-none
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
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">BPOTime</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium -mt-0.5">Enterprise Portal</p>
            </div>
          </div>
          <button 
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu Groups */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-4">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 pb-1">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.label}
                </span>
              </div>
              {group.items.map(item => {
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
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : (item.badgeColor || 'bg-slate-100 text-slate-600')
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Quick link to Mobile Preview & User Info Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <Link
            to="/app/home"
            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold transition-colors"
          >
            <span>📱 Xem giao diện Nhân viên</span>
            <span className="text-xs">→</span>
          </Link>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {(user?.fullName?.[0] || user?.username?.[0] || 'A').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user?.fullName || user?.username || 'Admin'}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate uppercase">Quản trị viên</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/70 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 font-normal hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick date indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 font-medium">
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>

            {/* Notification trigger */}
            <button 
              onClick={() => navigate('/admin/exceptions')}
              title="Cảnh báo ngoại lệ chấm công"
              className="relative p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            </button>

            {/* Admin User Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-700">
                {user?.fullName || user?.username || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
