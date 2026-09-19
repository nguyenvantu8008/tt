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
  MapPin,
  ShieldCheck,
  Radio,
  Filter,
  CheckCircle2
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
  const onLeaveToday = todayAttendance.filter(a => a.status === 'ON_LEAVE').length
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

  const formattedLiveTime = liveTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  return (
    <AppLayout 
      title="Tổng Quan Hoạt Động" 
      subtitle="Bảng điều hành nhân sự BPO, giám sát điểm danh GPS & tiến độ ca làm việc"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Top Grid: Real-time Punch Clock (Hero Dark) + KPI Metric Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* 1. Real-Time Punch Clock Widget (High-end Dark Card inspired by mockup) */}
          <div className="lg:col-span-4 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#111827] text-white rounded-3xl p-6 lg:p-7 shadow-xl shadow-indigo-950/20 border border-indigo-900/40 relative overflow-hidden flex flex-col justify-between">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Card Header */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCheckedIn ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCheckedIn ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                </span>
                <h3 className="font-extrabold text-sm tracking-tight text-slate-200">Đồng Hồ Chấm Công Live</h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 backdrop-blur-xs">
                {currentEmployee?.code || 'BPO-ID'}
              </span>
            </div>

            {/* Time Display */}
            <div className="relative z-10 my-6 text-center">
              <div className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
                {formattedLiveTime}
              </div>
              <p className="text-xs text-slate-400 mt-1 capitalize font-medium">{formattedLiveDate}</p>

              {/* Status Pill */}
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                <span className={`h-2 w-2 rounded-full ${isCheckedIn ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-slate-300 font-medium">
                  {isCheckedIn ? `Đang làm việc: ${formatElapsed(elapsedSeconds)}` : 'Chưa check-in vào ca'}
                </span>
              </div>
            </div>

            {/* Punch In/Out Button */}
            <div className="relative z-10 space-y-3">
              <Button 
                onClick={handleQuickToggle}
                disabled={actionLoading || !currentEmployee}
                className={`
                  w-full h-12 text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2
                  ${isCheckedIn 
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-rose-900/40' 
                    : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-indigo-500/30'}
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

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                <span>Nhân viên: <strong className="text-slate-200 font-semibold">{currentEmployee?.fullName || '---'}</strong></span>
                <Link to="/my-attendance" className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5">
                  Lịch sử <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* 2. Three Metric KPI Cards with Sparklines */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Total Active Today */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-indigo-200 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hiện diện hôm nay</span>
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-xs">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{presentToday}</span>
                  <span className="text-xs text-slate-400 font-medium">/{totalStaff} NV</span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 ml-auto border border-emerald-100">
                    +{attendanceRate}%
                  </span>
                </div>
              </div>
              
              {/* Subtle Sparkline SVG */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                <div className="w-full">
                  <svg className="w-full h-8 stroke-indigo-500 fill-none" viewBox="0 0 120 30">
                    <path d="M0,25 Q20,10 40,18 T80,8 T120,15" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Tỷ lệ chuyên cần đạt chuẩn</p>
            </div>

            {/* Card 2: Late Arrival */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-amber-200 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đi muộn</span>
                  <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-semibold text-xs">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-amber-600 tracking-tight">{lateToday}</span>
                  <span className="text-xs text-slate-400 font-medium">trường hợp</span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 ml-auto border border-amber-100">
                    {lateToday > 0 ? 'Cần nhắc' : 'Tốt'}
                  </span>
                </div>
              </div>
              
              {/* Sparkline SVG */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                <div className="w-full">
                  <svg className="w-full h-8 stroke-amber-500 fill-none" viewBox="0 0 120 30">
                    <path d="M0,15 Q30,22 60,10 T90,25 T120,12" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Ghi nhận theo giờ chuẩn ca</p>
            </div>

            {/* Card 3: Total Worked Hours */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-200 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng giờ tích lũy</span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold text-xs">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalHoursToday.toFixed(1)}</span>
                  <span className="text-xs text-slate-400 font-medium">giờ công</span>
                  {totalOtHoursToday > 0 && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 ml-auto border border-indigo-100">
                      +{totalOtHoursToday.toFixed(1)}h OT
                    </span>
                  )}
                </div>
              </div>
              
              {/* Sparkline SVG */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                <div className="w-full">
                  <svg className="w-full h-8 stroke-emerald-500 fill-none" viewBox="0 0 120 30">
                    <path d="M0,22 Q30,12 60,18 T90,8 T120,5" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Đồng bộ tự động từ CSDL</p>
            </div>

          </div>

        </div>

        {/* Middle Section: GPS Geofence Radar / Projects Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Projects Allocation Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Chiến Dịch BPO & Hiện Trường</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{projects.length} Dự án đang vận hành</p>
                </div>
              </div>
              <Link to="/projects" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p>Chưa có dự án nào trong CSDL.</p>
                </div>
              ) : (
                projects.slice(0, 4).map(proj => {
                  const membersCount = employees.filter(e => e.projectId === proj.id).length
                  const percent = totalStaff > 0 ? Math.round((membersCount / totalStaff) * 100) : 0
                  return (
                    <div key={proj.id} className="space-y-1.5 p-3 rounded-2xl hover:bg-slate-50/80 transition-colors border border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="h-3 w-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: proj.color || '#4f46e5' }} />
                          <span className="font-bold text-slate-800">{proj.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded-md bg-slate-100">
                            {proj.code}
                          </span>
                        </div>
                        <span className="font-bold text-slate-700">{membersCount} NV <span className="text-slate-400 font-normal">({percent}%)</span></span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%`, backgroundColor: proj.color || '#4f46e5' }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Quick Shift Pills */}
            {shifts.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Ca làm việc tiêu chuẩn</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  {shifts.map(s => (
                    <div key={s.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:border-indigo-200 transition-colors">
                      <span className="font-bold text-slate-800 block text-xs">{s.code}</span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* GPS Radar / Geofence Summary Card (Mockup Inspired) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                <h3 className="font-bold text-sm tracking-tight text-white">Radar Định Vị GPS Hiện Trường</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Geofence
              </span>
            </div>

            {/* Visual Radar Simulation Graphic */}
            <div className="my-5 relative h-36 rounded-2xl bg-slate-800/60 border border-slate-700/60 overflow-hidden flex items-center justify-center">
              {/* Radar circles */}
              <div className="absolute h-28 w-28 rounded-full border border-indigo-500/30 animate-ping opacity-25" />
              <div className="absolute h-20 w-20 rounded-full border border-indigo-400/40" />
              <div className="absolute h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-400 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-indigo-300" />
              </div>

              {/* Point beacons */}
              <div className="absolute top-4 left-8 flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-700 text-[10px]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Trụ sở chính: Chuẩn GPS</span>
              </div>
              <div className="absolute bottom-4 right-8 flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-700 text-[10px]">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span>Chi nhánh BPO: 100m Bán kính</span>
              </div>
            </div>

            {/* Bottom Status Info */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Xác thực tọa độ vệ tinh:
                </span>
                <span className="font-bold text-emerald-400">Bật 24/7</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Số điểm trạm Geofence:</span>
                <span className="font-bold text-white">{projects.length || 1} Vị trí</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Section: Live Employee Presence Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Danh Sách Nhân Sự Điểm Danh Hôm Nay</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {filteredAttendance.length} lượt
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Dữ liệu thời gian thực đồng bộ trực tiếp từ CSDL Neon PostgreSQL</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Đang làm việc
              </button>
              <button
                onClick={() => setStatusFilter('DONE')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${statusFilter === 'DONE' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Đã tan ca
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="pb-3.5 pl-2">Nhân Sự</th>
                  <th className="pb-3.5">Dự Án</th>
                  <th className="pb-3.5">Ca Kíp</th>
                  <th className="pb-3.5 text-center">Giờ Vào</th>
                  <th className="pb-3.5 text-center">Giờ Ra</th>
                  <th className="pb-3.5 text-center">Trạng Thái</th>
                  <th className="pb-3.5 text-right pr-2">Thời Gian Tích Lũy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="font-medium">Chưa có dữ liệu điểm danh phù hợp với bộ lọc hiện tại.</p>
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
                      <tr key={att.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-3">
                            {emp.avatar ? (
                              <img 
                                src={emp.avatar} 
                                alt={emp.fullName} 
                                className="h-9 w-9 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-indigo-200 transition-all" 
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                                {(emp.fullName?.[0] || 'U').toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{emp.fullName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.code || 'NV-BPO'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          {proj ? (
                            <span 
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold inline-block"
                              style={{ backgroundColor: `${proj.color || '#4f46e5'}15`, color: proj.color || '#4f46e5' }}
                            >
                              {proj.code}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3.5 font-medium text-slate-600">
                          {shift?.name || 'Ca chuẩn 8h'}
                        </td>
                        <td className="py-3.5 text-center font-mono font-bold text-slate-800">
                          {att.checkIn || '-'}
                        </td>
                        <td className="py-3.5 text-center font-mono font-bold text-slate-800">
                          {att.checkOut || '--:--'}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                            att.checkOut 
                              ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${att.checkOut ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
                            {att.checkOut ? 'Đã tan ca' : 'Đang làm việc'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right pr-2 font-mono font-extrabold text-indigo-600">
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


