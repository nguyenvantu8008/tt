import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CalendarDays, 
  TrendingUp, 
  ArrowRight, 
  Briefcase, 
  Building2, 
  Play, 
  Square,
  Sparkles,
  ChevronRight,
  Loader2,
  FolderPlus
} from 'lucide-react'

export default function Dashboard() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [todayAttendance, setTodayAttendance] = useState<any[]>([])

  // Quick punch state for current employee
  const [currentEmployee, setCurrentEmployee] = useState<any>(null)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [empRes, projRes, shiftRes, attRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/projects'),
        axios.get('/api/shifts'),
        axios.get('/api/attendance/today')
      ])

      const emps = empRes.data || []
      const projs = projRes.data || []
      const sfts = shiftRes.data || []
      const atts = attRes.data || []

      setEmployees(emps)
      setProjects(projs)
      setShifts(sfts)
      setTodayAttendance(atts)

      // Resolve current employee
      let activeEmp = null
      if (user?.employeeId) {
        activeEmp = emps.find((e: any) => e.id === user.employeeId)
      }
      if (!activeEmp && emps.length > 0) {
        activeEmp = emps[0]
      }
      setCurrentEmployee(activeEmp)

      if (activeEmp) {
        const myAtt = atts.find((a: any) => a.employeeId === activeEmp.id)
        if (myAtt && myAtt.checkIn) {
          setIsCheckedIn(!myAtt.checkOut)
          if (myAtt.workedHours) {
            setElapsedSeconds(Math.round(myAtt.workedHours * 3600))
          }
        } else {
          setIsCheckedIn(false)
          setElapsedSeconds(0)
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Timer simulation
  useEffect(() => {
    let interval: any = null
    if (isCheckedIn) {
      interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isCheckedIn])

  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleQuickToggle = async () => {
    if (!currentEmployee) {
      alert('Chưa có thông tin nhân sự. Vui lòng thêm nhân viên trước.')
      return
    }

    try {
      setActionLoading(true)
      if (!isCheckedIn) {
        await axios.post('/api/attendance/check-in', {
          employeeId: currentEmployee.id,
          projectId: currentEmployee.projectId || (projects[0]?.id ?? undefined),
          notes: 'Check-in nhanh từ Dashboard',
          device: 'Web Dashboard'
        })
        setIsCheckedIn(true)
      } else {
        await axios.post('/api/attendance/check-out', {
          employeeId: currentEmployee.id,
          device: 'Web Dashboard'
        })
        setIsCheckedIn(false)
      }
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi chấm công')
    } finally {
      setActionLoading(false)
    }
  }

  // Real summary calculations
  const totalStaff = employees.length
  const presentToday = todayAttendance.filter(a => a.checkIn || a.status === 'ON_TIME' || a.status === 'LATE').length
  const lateToday = todayAttendance.filter(a => a.status === 'LATE').length
  const onLeaveToday = todayAttendance.filter(a => a.status === 'ON_LEAVE').length
  const attendanceRate = totalStaff > 0 ? ((presentToday / totalStaff) * 100).toFixed(1) : '0'

  const totalHoursToday = todayAttendance.reduce((acc, a) => acc + (a.workedHours || 0), 0)
  const totalOtHoursToday = todayAttendance.reduce((acc, a) => acc + (a.otHours || 0), 0)

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  return (
    <AppLayout 
      title="Tổng quan Hoạt động" 
      subtitle="Trung tâm điều hành chấm công, phân bổ dự án và chuyên cần toàn bộ nhân sự BPO"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Welcome Banner */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-6 lg:p-8 text-white shadow-lg shadow-blue-600/15 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-xs rounded-full text-xs font-semibold mb-3 border border-white/20">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Hệ thống chấm công BPO thời gian thực (PostgreSQL)
              </div>
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
                Xin chào, {user?.fullName || user?.username || 'Quản trị viên'}! 👋
              </h2>
              <p className="text-blue-100 text-xs lg:text-sm mt-1 max-w-xl leading-relaxed capitalize">
                Hôm nay là {todayStr}. Tỷ lệ chuyên cần toàn công ty đang đạt <strong className="text-white font-bold">{attendanceRate}%</strong> với {projects.length} chiến dịch BPO đang hoạt động.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/daily-attendance">
                <Button className="bg-white hover:bg-blue-50 text-blue-700 font-semibold text-xs shadow-md">
                  Vào bảng điểm danh
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Bento Grid Top Row: 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
              <span className="font-medium">Quân số hiện diện</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{presentToday}</span>
              <span className="text-xs text-slate-400 font-medium">/ {totalStaff} NV</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Đạt {attendanceRate}% quân số</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
              <span className="font-medium">Đi muộn hôm nay</span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600">{lateToday}</span>
              <span className="text-xs text-slate-400 font-medium">trường hợp</span>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Ghi nhận theo giờ bắt đầu ca
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
              <span className="font-medium">Nghỉ phép có lương</span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-indigo-600">{onLeaveToday}</span>
              <span className="text-xs text-slate-400 font-medium">người</span>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {onLeaveToday > 0 ? 'Đã được phê duyệt' : 'Chưa có đơn nghỉ hôm nay'}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
              <span className="font-medium">Tổng giờ làm hôm nay</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{totalHoursToday.toFixed(1)}h</span>
              {totalOtHoursToday > 0 && (
                <span className="text-xs text-emerald-600 font-bold">+{totalOtHoursToday.toFixed(1)}h OT</span>
              )}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Cập nhật từ thời gian thực CSDL
            </div>
          </div>
        </div>

        {/* Bento Middle Row: Live Punch Widget & Projects Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Quick Attendance Widget */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                <h3 className="font-bold text-slate-900 text-sm">Chấm công Nhanh của Bạn</h3>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                {currentEmployee?.fullName || 'Nhân viên'}
              </span>
            </div>

            <div className="my-6 text-center">
              <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wider">Thời gian ca làm hôm nay</p>
              <div className="font-mono text-4xl font-extrabold text-slate-900 tracking-tight">
                {formatElapsed(elapsedSeconds)}
              </div>
              <p className={`text-xs font-medium mt-2 ${isCheckedIn ? 'text-emerald-600' : 'text-slate-500'}`}>
                {isCheckedIn ? 'Đang trong ca làm việc' : 'Chưa check-in ca hôm nay'}
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleQuickToggle}
                disabled={actionLoading || !currentEmployee}
                className={`
                  w-full h-11 font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2
                  ${isCheckedIn 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                `}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCheckedIn ? (
                  <>
                    <Square className="h-4 w-4 fill-current" />
                    Tan ca (Check-out)
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Bắt đầu ca (Check-in)
                  </>
                )}
              </Button>

              <Link to="/my-attendance" className="block text-center text-xs text-slate-500 hover:text-blue-600 font-medium">
                Xem chi tiết lịch sử chấm công cá nhân →
              </Link>
            </div>
          </div>

          {/* Right: Shift Status & BPO Projects Allocation */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Quân số theo Dự án BPO ({projects.length} Dự án)
              </h3>
              <Link to="/projects" className="text-xs text-blue-600 hover:underline font-medium">
                Quản lý dự án
              </Link>
            </div>

            <div className="space-y-3.5">
              {projects.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p>Chưa có dự án nào trong CSDL.</p>
                  <Link to="/projects" className="text-blue-600 font-semibold underline mt-1 inline-block">
                    Tạo dự án mới
                  </Link>
                </div>
              ) : (
                projects.map(proj => {
                  const membersCount = employees.filter(e => e.projectId === proj.id).length
                  const percent = totalStaff > 0 ? Math.round((membersCount / totalStaff) * 100) : 0
                  return (
                    <div key={proj.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color || '#3b82f6' }} />
                          <span className="font-bold text-slate-800">{proj.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({proj.code})</span>
                        </div>
                        <span className="font-semibold text-slate-700">{membersCount} NV ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%`, backgroundColor: proj.color || '#3b82f6' }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {shifts.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                {shifts.map(s => (
                  <div key={s.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-800 block text-xs">{s.code}</span>
                    <span className="text-[10px] text-slate-400 block">{s.startTime?.slice(0, 5)}-{s.endTime?.slice(0, 5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Bottom Table: Who is currently working */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Nhân sự Đang trong Ca làm việc</h3>
              <p className="text-xs text-slate-500 mt-0.5">Dữ liệu thời gian thực cập nhật từ PostgreSQL</p>
            </div>
            <Link to="/daily-attendance">
              <Button variant="outline" size="sm" className="text-xs text-slate-700">
                Xem toàn bộ bảng điểm danh
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Nhân sự</th>
                  <th className="pb-3">Dự án</th>
                  <th className="pb-3">Ca kíp</th>
                  <th className="pb-3 text-center">Giờ vào</th>
                  <th className="pb-3 text-center">Trạng thái</th>
                  <th className="pb-3 text-right">Giờ làm hôm nay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayAttendance.filter(a => a.checkIn).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Chưa có lượt điểm danh nào trong ngày hôm nay. Dữ liệu sẽ cập nhật thời gian thực khi nhân viên check-in.
                    </td>
                  </tr>
                ) : (
                  todayAttendance.filter(a => a.checkIn).slice(0, 10).map(att => {
                    const emp = employees.find(e => e.id === att.employeeId) || {
                      fullName: att.employeeName || 'Nhân viên',
                      code: att.employeeCode || '',
                      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    const proj = projects.find(p => p.id === att.projectId)
                    const shift = shifts.find(s => s.id === (att.shiftId || emp.shiftId))

                    return (
                      <tr key={att.id} className="hover:bg-slate-50/50">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <img src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={emp.fullName} className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200" />
                            <div>
                              <p className="font-bold text-slate-900">{emp.fullName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{emp.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          {proj ? (
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                              style={{ backgroundColor: `${proj.color || '#3b82f6'}15`, color: proj.color || '#3b82f6' }}
                            >
                              {proj.code}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3 font-medium text-slate-600">{shift?.name || 'Ca chuẩn'}</td>
                        <td className="py-3 text-center font-mono font-medium text-slate-800">{att.checkIn || '-'}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            att.checkOut 
                              ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${att.checkOut ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                            {att.checkOut ? 'Đã tan ca' : 'Đang làm việc'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-blue-600">
                          {att.workedHours ? `${att.workedHours.toFixed(1)}h` : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

