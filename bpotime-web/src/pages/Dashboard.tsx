import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import AdminLayout from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Briefcase, 
  Building2, 
  Play, 
  Square,
  ChevronRight,
  Loader2,
  CheckCircle2,
  CalendarDays,
  MapPin,
  ExternalLink,
  FileSpreadsheet
} from 'lucide-react'

export default function Dashboard() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [todayAttendance, setTodayAttendance] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DONE'>('ALL')

  // Quick punch state for current employee
  const [currentEmployee, setCurrentEmployee] = useState<any>(null)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [liveTime, setLiveTime] = useState(new Date())

  // Ticking clock for widget
  useEffect(() => {
    const clockTimer = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(clockTimer)
  }, [])

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

  // Summary metrics
  const totalStaff = employees.length
  const presentToday = todayAttendance.filter(a => a.checkIn || a.status === 'ON_TIME' || a.status === 'LATE').length
  const lateToday = todayAttendance.filter(a => a.status === 'LATE').length
  const onLeaveToday = todayAttendance.filter(a => a.status === 'ON_LEAVE' || a.status === 'LEAVE').length
  const attendanceRate = totalStaff > 0 ? ((presentToday / totalStaff) * 100).toFixed(1) : '0'

  const totalHoursToday = todayAttendance.reduce((acc, a) => acc + (a.workedHours || 0), 0)
  const totalOtHoursToday = todayAttendance.reduce((acc, a) => acc + (a.otHours || 0), 0)

  // Filter attendance table
  const filteredAttendance = todayAttendance.filter(a => {
    if (!a.checkIn) return false
    if (statusFilter === 'ACTIVE') return !a.checkOut
    if (statusFilter === 'DONE') return !!a.checkOut
    return true
  })

  const formattedLiveDate = liveTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const formattedLiveTime = liveTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  return (
    <AdminLayout 
      title="Tổng Quan Hoạt Động" 
      subtitle="Bảng điều hành nhân sự BPO & điểm danh hàng ngày"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Row 1: 4 Balanced, Minimal Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Metric 1: Total Staff */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Tổng nhân viên</span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalStaff}</span>
              <span className="text-xs text-slate-400">nhân sự</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Đã đồng bộ từ CSDL</p>
          </div>

          {/* Metric 2: Present Today */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Có mặt hôm nay</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900">{presentToday}</span>
                <span className="text-xs text-slate-400">/{totalStaff}</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                {attendanceRate}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Tỷ lệ chuyên cần</p>
          </div>

          {/* Metric 3: Late / Leave */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Đi muộn / Nghỉ phép</span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-amber-600">{lateToday}</span>
                <span className="text-xs text-slate-400">muộn / {onLeaveToday} phép</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Theo giờ chuẩn ca</p>
          </div>

          {/* Metric 4: Total Worked Hours */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Tổng giờ công hôm nay</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalHoursToday.toFixed(1)}</span>
                <span className="text-xs text-slate-400">giờ</span>
              </div>
              {totalOtHoursToday > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                  +{totalOtHoursToday.toFixed(1)}h OT
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Tích lũy tự động</p>
          </div>

        </div>

        {/* Row 2: Punch Clock Widget (Clean & Minimalist) + Projects Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Clean Punch Clock Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Chấm Công Của Bạn</h3>
                </div>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {currentEmployee?.code || 'BPO-STAFF'}
                </span>
              </div>

              {/* Time Display */}
              <div className="my-6 text-center">
                <div className="font-mono text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  {formattedLiveTime}
                </div>
                <p className="text-xs text-slate-500 mt-1 capitalize font-medium">{formattedLiveDate}</p>

                {/* Status Indicator */}
                <div className="mt-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    isCheckedIn 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isCheckedIn ? `Đang làm việc: ${formatElapsed(elapsedSeconds)}` : 'Chưa vào ca làm việc'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="space-y-3 pt-2">
              <Button 
                onClick={handleQuickToggle}
                disabled={actionLoading || !currentEmployee}
                className={`
                  w-full h-11 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2
                  ${isCheckedIn 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'}
                `}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCheckedIn ? (
                  <>
                    <Square className="h-4 w-4 fill-current" />
                    Tan Ca (Punch Out)
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Vào Ca (Punch In)
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Nhân viên: <strong className="text-slate-800">{currentEmployee?.fullName || '---'}</strong></span>
                <Link to="/my-attendance" className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5">
                  Lịch sử <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Projects & Shifts Overview */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Chiến Dịch & Dự Án BPO</h3>
                </div>
                <Link to="/projects" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
                  Quản lý dự án <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3.5">
                {projects.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <Building2 className="h-7 w-7 mx-auto mb-1.5 opacity-40 text-slate-400" />
                    <p>Chưa có dự án nào.</p>
                  </div>
                ) : (
                  projects.slice(0, 4).map(proj => {
                    const membersCount = employees.filter(e => e.projectId === proj.id).length
                    const percent = totalStaff > 0 ? Math.round((membersCount / totalStaff) * 100) : 0
                    return (
                      <div key={proj.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: proj.color || '#4f46e5' }} />
                            <span className="font-semibold text-slate-800">{proj.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({proj.code})</span>
                          </div>
                          <span className="text-xs font-medium text-slate-600">{membersCount} NV <span className="text-slate-400">({percent}%)</span></span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-300" 
                            style={{ width: `${percent}%`, backgroundColor: proj.color || '#4f46e5' }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Quick Shift Pills */}
            {shifts.length > 0 && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-400 block mb-2">Ca làm việc tiêu chuẩn:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {shifts.map(s => (
                    <div key={s.id} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 flex items-center gap-1.5">
                      <span className="font-semibold">{s.code}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Row 3: Live Employee Attendance Table */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Điểm Danh Nhân Sự Hôm Nay</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {filteredAttendance.length} lượt
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Dữ liệu thời gian thực đồng bộ từ hệ thống</p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <Link
                to="/daily-attendance"
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors"
                title="Đến trang chấm công hàng ngày để xuất Excel chi tiết"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Xuất Bảng Công Excel
              </Link>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Đang làm việc
                </button>
                <button
                  onClick={() => setStatusFilter('DONE')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${statusFilter === 'DONE' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Đã tan ca
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="pb-3 pl-1">Nhân Sự</th>
                  <th className="pb-3">Dự Án</th>
                  <th className="pb-3">Ca Làm</th>
                  <th className="pb-3 text-center">Giờ Vào</th>
                  <th className="pb-3 text-center">Giờ Ra</th>
                  <th className="pb-3 text-center">Vị trí GPS</th>
                  <th className="pb-3 text-center">Trạng Thái</th>
                  <th className="pb-3 text-right pr-1">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <Clock className="h-6 w-6 mx-auto mb-1.5 opacity-30 text-slate-400" />
                      <p className="font-normal text-xs">Chưa có dữ liệu điểm danh phù hợp.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.slice(0, 15).map(att => {
                    const emp = employees.find(e => e.id === att.employeeId) || {
                      fullName: att.employeeName || 'Nhân viên',
                      code: att.employeeCode || '',
                      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    const proj = projects.find(p => p.id === att.projectId)
                    const shift = shifts.find(s => s.id === (att.shiftId || emp.shiftId))

                    return (
                      <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 pl-1">
                          <div className="flex items-center gap-2.5">
                            {emp.avatar ? (
                              <img 
                                src={emp.avatar} 
                                alt={emp.fullName} 
                                className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-100" 
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                {(emp.fullName?.[0] || 'U').toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight">{emp.fullName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.code || 'NV-BPO'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          {proj ? (
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold inline-block"
                              style={{ backgroundColor: `${proj.color || '#4f46e5'}15`, color: proj.color || '#4f46e5' }}
                            >
                              {proj.code}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3 text-slate-600 font-normal">
                          {shift?.name || 'Ca chuẩn 8h'}
                        </td>
                        <td className="py-3 text-center font-mono font-medium text-slate-800">
                          {att.checkIn || '-'}
                        </td>
                        <td className="py-3 text-center font-mono font-medium text-slate-800">
                          {att.checkOut || '--:--'}
                        </td>
                        <td className="py-3 text-center">
                          {att.checkInLatitude && att.checkInLongitude ? (
                            <div className="flex flex-col items-center gap-1">
                              {att.distanceToProjectMeters !== null && att.distanceToProjectMeters !== undefined ? (
                                att.distanceToProjectMeters <= (proj?.allowedRadiusMeters || 20) ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium text-[10px] border border-emerald-100">
                                    <MapPin className="h-2.5 w-2.5" /> {att.distanceToProjectMeters}m
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                                    <AlertTriangle className="h-2.5 w-2.5" /> {att.distanceToProjectMeters > 1000 ? `${(att.distanceToProjectMeters / 1000).toFixed(1)}km` : `${att.distanceToProjectMeters}m`}
                                  </span>
                                )
                              ) : null}
                              <a
                                href={`https://www.google.com/maps?q=${att.checkInLatitude},${att.checkInLongitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 underline font-medium"
                                title="Xem trên Google Maps"
                              >
                                <ExternalLink className="h-2.5 w-2.5" /> Bản đồ
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                            att.checkOut 
                              ? 'bg-slate-50 text-slate-600 border-slate-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${att.checkOut ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                            {att.checkOut ? 'Đã tan ca' : 'Đang làm việc'}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-1 font-mono font-semibold text-slate-800">
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
    </AdminLayout>
  )
}


