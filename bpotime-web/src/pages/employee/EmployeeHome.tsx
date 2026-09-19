import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import EmployeeLayout from '@/components/layout/EmployeeLayout'
import { useAuth } from '@/lib/authContext'
import { 
  Calendar, 
  Clock, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  TrendingUp,
  MapPin,
  Loader2,
  ChevronRight
} from 'lucide-react'

export default function EmployeeHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [todayAtt, setTodayAtt] = useState<any>(null)
  const [employeeInfo, setEmployeeInfo] = useState<any>(null)
  const [monthlyStats, setMonthlyStats] = useState({
    workedDays: 0,
    totalHours: 0,
    otHours: 0
  })

  const todayStr = new Date().toISOString().split('T')[0]
  const formattedToday = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  useEffect(() => {
    const fetchEmployeeHomeData = async () => {
      try {
        setLoading(true)
        const [empRes, todayRes] = await Promise.all([
          axios.get('/api/employees'),
          axios.get(`/api/attendance/daily?date=${todayStr}`)
        ])

        const allEmps = empRes.data || []
        const currentEmp = user?.employeeId 
          ? allEmps.find((e: any) => e.id === user.employeeId) 
          : (allEmps[0] || null)

        setEmployeeInfo(currentEmp)

        if (currentEmp) {
          const myToday = todayRes.data?.find((a: any) => a.employeeId === currentEmp.id)
          setTodayAtt(myToday || null)

          // Fetch personal history to compute monthly stats
          try {
            const histRes = await axios.get(`/api/attendance/employee/${currentEmp.id}/history?limit=31`)
            const hist = histRes.data || []
            const currentMonth = new Date().getMonth()
            const currentYear = new Date().getFullYear()

            const thisMonthRecords = hist.filter((r: any) => {
              const d = new Date(r.date)
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear
            })

            const worked = thisMonthRecords.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length
            const hours = thisMonthRecords.reduce((acc: number, r: any) => acc + (r.workedHours || 0), 0)
            const ot = thisMonthRecords.reduce((acc: number, r: any) => acc + (r.otHours || 0), 0)

            setMonthlyStats({
              workedDays: worked,
              totalHours: Math.round(hours * 10) / 10,
              otHours: Math.round(ot * 10) / 10
            })
          } catch (e) {
            console.error('Lỗi tính thống kê tháng:', e)
          }
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu trang chủ nhân viên:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEmployeeHomeData()
  }, [user, todayStr])

  const hasCheckedIn = !!todayAtt?.checkIn
  const hasCheckedOut = !!todayAtt?.checkOut

  const statusText = hasCheckedOut 
    ? 'Đã hoàn thành ca' 
    : hasCheckedIn 
      ? 'Đang trong ca làm việc' 
      : 'Chưa điểm danh hôm nay'

  const statusColor = hasCheckedOut
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : hasCheckedIn
      ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
      : 'bg-amber-50 text-amber-700 border-amber-200'

  return (
    <EmployeeLayout>
      <div className="space-y-4">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-indigo-200 font-medium capitalize flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formattedToday}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 border border-white/10">
                {employeeInfo?.code || 'NV-BPO'}
              </span>
            </div>

            <h2 className="text-xl font-extrabold tracking-tight">
              Xin chào, {user?.fullName || employeeInfo?.fullName || 'Nhân sự'} 👋
            </h2>
            <p className="text-xs text-indigo-200/90 mt-1 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Dự án: <strong>{employeeInfo?.projectCode || employeeInfo?.projectName || 'Chi nhánh BPO'}</strong></span>
            </p>
          </div>
        </div>

        {/* Today Punch Status Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ca làm việc hôm nay</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
              {statusText}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100">
            <div className="bg-slate-50 rounded-2xl p-3">
              <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-emerald-600" /> Giờ vào
              </span>
              <span className="text-xl font-extrabold text-slate-800 font-mono">
                {todayAtt?.checkIn || '--:--'}
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3">
              <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600" /> Giờ ra
              </span>
              <span className="text-xl font-extrabold text-slate-800 font-mono">
                {todayAtt?.checkOut || '--:--'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <span>Tổng giờ hôm nay:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">
              {todayAtt?.workedHours ? `${todayAtt.workedHours} giờ` : '0.0 giờ'}
            </span>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => navigate('/app/punch')}
            className={`
              w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer
              ${hasCheckedOut 
                ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                : hasCheckedIn 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25' 
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-indigo-500/30'}
            `}
          >
            {hasCheckedOut ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>ĐÃ HOÀN THÀNH CA HÔM NAY</span>
              </>
            ) : hasCheckedIn ? (
              <>
                <Clock className="h-5 w-5" />
                <span>CHẤM CÔNG RA (TAN CA)</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                <Clock className="h-5 w-5" />
                <span>CHẤM CÔNG VÀO (VÀO CA)</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Monthly Summary Statistics */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tích lũy tháng này</span>
            <span className="text-xs text-indigo-600 font-bold">Tháng {new Date().getMonth() + 1}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-medium block">Số ngày công</span>
              <span className="text-lg font-extrabold text-slate-900 mt-1 block font-mono">
                {monthlyStats.workedDays}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-medium block">Tổng giờ làm</span>
              <span className="text-lg font-extrabold text-slate-900 mt-1 block font-mono">
                {monthlyStats.totalHours}h
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-medium block">Tăng ca (OT)</span>
              <span className="text-lg font-extrabold text-amber-600 mt-1 block font-mono">
                +{monthlyStats.otHours}h
              </span>
            </div>
          </div>
        </div>

        {/* Quick Help / Info Link */}
        <div 
          onClick={() => navigate('/app/history')}
          className="bg-white rounded-2xl p-4 border border-slate-200/70 flex items-center justify-between text-xs text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Xem lịch sử chi tiết</p>
              <p className="text-[10px] text-slate-400">Xem bảng chấm công và giờ vào ra các ngày trước</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    </EmployeeLayout>
  )
}
