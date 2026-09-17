import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  TrendingUp, 
  FileText, 
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AttendanceHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  employee: {
    id: string
    code: string
    fullName: string
    avatar?: string
    department?: string
    position?: string
  } | null
}

interface HistoryItem {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  workedHours: number
  otHours: number
  notes: string | null
  isGpsVerified: boolean
  distanceToProjectMeters: number | null
  checkInDevice: string | null
  projectName: string | null
  projectCode: string | null
  shiftName: string | null
}

export default function AttendanceHistoryModal({ isOpen, onClose, employee }: AttendanceHistoryModalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !employee) return

    const fetchHistory = async () => {
      try {
        setLoading(true)
        const res = await axios.get(`/api/attendance/employee/${employee.id}/history`)
        setHistory(res.data)
      } catch (err) {
        console.error('Lỗi khi tải lịch sử chấm công:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [isOpen, employee])

  if (!isOpen || !employee) return null

  // Calculate summary stats
  const totalDays = history.length
  const presentDays = history.filter(h => h.status === 'PRESENT').length
  const lateDays = history.filter(h => h.status === 'LATE').length
  const totalOt = history.reduce((sum, h) => sum + (h.otHours || 0), 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="h-3 w-3" /> Có mặt</span>
      case 'LATE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="h-3 w-3" /> Đi muộn</span>
      case 'LEAVE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><FileText className="h-3 w-3" /> Phép</span>
      case 'ABSENT':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="h-3 w-3" /> Vắng</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{status}</span>
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <img 
              src={employee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
              alt={employee.fullName} 
              className="h-11 w-11 rounded-xl object-cover ring-2 ring-blue-100 shrink-0" 
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{employee.fullName}</h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {employee.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {employee.position} • {employee.department}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50/80 border-b border-slate-100 text-center">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
            <p className="text-[11px] text-slate-500 font-medium">Bản ghi đã lưu</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{totalDays} ngày</p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
            <p className="text-[11px] text-slate-500 font-medium">Đúng giờ</p>
            <p className="text-lg font-bold text-emerald-600 mt-0.5">{presentDays} ngày</p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
            <p className="text-[11px] text-slate-500 font-medium">Đi muộn</p>
            <p className="text-lg font-bold text-amber-600 mt-0.5">{lateDays} lần</p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
            <p className="text-[11px] text-slate-500 font-medium">Tổng làm thêm (OT)</p>
            <p className="text-lg font-bold text-blue-600 mt-0.5">+{totalOt.toFixed(1)}h</p>
          </div>
        </div>

        {/* History Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">Đang tải lịch sử chấm công từ PostgreSQL...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Chưa có lịch sử chấm công</p>
              <p className="text-xs text-slate-400 mt-1">Nhân viên này chưa thực hiện check-in hoặc chưa có công trong hệ thống.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Ngày</th>
                  <th className="py-2.5 px-3 text-center">Giờ Vào</th>
                  <th className="py-2.5 px-3 text-center">Giờ Ra</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-2 text-center">Công / Giờ</th>
                  <th className="py-2.5 px-2 text-center">Làm thêm</th>
                  <th className="py-2.5 px-3">Vị trí / GPS</th>
                  <th className="py-2.5 px-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(item => {
                  const dateObj = new Date(item.date)
                  const dayOfWeek = dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900">{item.date}</span>
                            <span className="text-[10px] text-slate-400 ml-1">({dayOfWeek})</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-medium">
                        {item.checkIn ? (
                          <span className={item.status === 'LATE' ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                            {item.checkIn}
                          </span>
                        ) : (
                          <span className="text-slate-300">--:--</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                        {item.checkOut || <span className="text-slate-300">--:--</span>}
                      </td>

                      <td className="py-2.5 px-3">
                        {getStatusBadge(item.status)}
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-700">
                        {item.workedHours}h
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono">
                        {item.otHours > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[10px]">
                            +{item.otHours}h
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {item.isGpsVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            GPS chuẩn
                            {item.distanceToProjectMeters ? ` (${Math.round(item.distanceToProjectMeters)}m)` : ''}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            {item.checkInDevice || 'Portal/Kiosk'}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[11px] text-slate-500 max-w-[150px] truncate" title={item.notes || ''}>
                        {item.notes || <span className="text-slate-300 italic">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-medium">
            Đóng
          </Button>
        </div>

      </div>
    </div>
  )
}
