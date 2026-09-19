import { useState, useEffect } from 'react'
import axios from 'axios'
import EmployeeLayout from '@/components/layout/EmployeeLayout'
import { useAuth } from '@/lib/authContext'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Loader2,
  CalendarDays,
  ExternalLink
} from 'lucide-react'

export default function EmployeeHistory() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        if (user?.employeeId) {
          const res = await axios.get(`/api/attendance/employee/${user.employeeId}/history?limit=30`)
          setHistory(res.data || [])
        } else {
          // Fallback if admin previewing
          const empRes = await axios.get('/api/employees')
          const firstId = empRes.data?.[0]?.id
          if (firstId) {
            const res = await axios.get(`/api/attendance/employee/${firstId}/history?limit=30`)
            setHistory(res.data || [])
          }
        }
      } catch (err) {
        console.error('Lỗi tải lịch sử chấm công:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  const STATUS_CONFIG: Record<string, { label: string, color: string, badgeBg: string }> = {
    PRESENT: { label: 'Có mặt', color: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' },
    LATE: { label: 'Đi muộn', color: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200' },
    HALFDAY: { label: 'Nửa ngày', color: 'text-sky-700', badgeBg: 'bg-sky-50 border-sky-200' },
    LEAVE: { label: 'Nghỉ phép', color: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
    ABSENT: { label: 'Vắng mặt', color: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
    OFF: { label: 'Nghỉ ca', color: 'text-slate-600', badgeBg: 'bg-slate-100 border-slate-200' },
  }

  return (
    <EmployeeLayout title="Lịch Sử Chấm Công" subtitle="Nhật ký dập thẻ và thời gian làm việc cá nhân">
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Đang tải lịch sử từ PostgreSQL...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-slate-400 border border-slate-200">
            <CalendarDays className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium">Chưa có bản ghi chấm công nào được ghi nhận.</p>
          </div>
        ) : (
          history.map((record) => {
            const statusConf = STATUS_CONFIG[record.status] || STATUS_CONFIG.PRESENT
            const dateObj = new Date(record.date)
            const formattedDate = dateObj.toLocaleDateString('vi-VN', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })

            return (
              <div 
                key={record.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5 transition-all hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs capitalize">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{formattedDate}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConf.badgeBg} ${statusConf.color}`}>
                    {statusConf.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50/70 rounded-xl px-3 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Vào ca</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {record.checkIn || '--:--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Tan ca</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {record.checkOut || '--:--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Số giờ</span>
                    <span className="font-bold text-indigo-700 font-mono">
                      {record.workedHours}h {record.otHours > 0 ? `(+${record.otHours}h)` : ''}
                    </span>
                  </div>
                </div>

                {/* Notes & GPS indicator */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span className="truncate max-w-[220px]">
                    {record.notes || record.projectName || 'Chi nhánh BPO'}
                  </span>
                  {record.checkInLatitude && record.checkInLongitude && (
                    <a
                      href={`https://www.google.com/maps?q=${record.checkInLatitude},${record.checkInLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
                    >
                      <MapPin className="h-3 w-3" /> Bản đồ
                    </a>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </EmployeeLayout>
  )
}
