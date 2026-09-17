import { useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Calendar, 
  Clock, 
  FileText, 
  User, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react'
import { logClientError } from '@/lib/clientLogger'

interface MakeupAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  employees: any[]
  shifts: any[]
}

export default function MakeupAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  employees,
  shifts
}: MakeupAttendanceModalProps) {
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [date, setDate] = useState(() => {
    // Mặc định là ngày hôm qua
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [checkIn, setCheckIn] = useState('08:00')
  const [checkOut, setCheckOut] = useState('17:00')
  const [shiftId, setShiftId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const todayStr = new Date().toISOString().slice(0, 10)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!selectedEmpId) {
      setError('Vui lòng chọn nhân viên cần chấm công bù.')
      return
    }

    if (!date) {
      setError('Vui lòng chọn ngày chấm công bù.')
      return
    }

    if (date > todayStr) {
      setError('Không thể chấm công bù cho ngày tương lai.')
      return
    }

    if (!checkIn) {
      setError('Vui lòng nhập giờ vào (Check-in).')
      return
    }

    if (checkOut && checkOut <= checkIn) {
      setError('Giờ ra (Check-out) phải lớn hơn giờ vào.')
      return
    }

    if (!reason.trim()) {
      setError('Vui lòng nhập lý do giải trình chấm công bù.')
      return
    }

    try {
      setLoading(true)
      const res = await axios.post('/api/attendance/makeup', {
        employeeId: selectedEmpId,
        date,
        checkIn,
        checkOut: checkOut || null,
        shiftId: shiftId || null,
        reason: reason.trim()
      })

      setSuccessMsg(res.data.message || 'Chấm công bù thành công!')
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi chấm công bù.'
      setError(msg)
      await logClientError('MAKEUP_ATTENDANCE_ERROR', msg, err.message, '/makeup-modal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Chấm Công Bù (Ngày Đã Qua)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bổ sung dữ liệu dập thẻ cho nhân viên quên chấm công hoặc gặp sự cố
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Chọn nhân viên */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Nhân viên cần chấm công bù <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedEmpId}
              onChange={e => {
                setSelectedEmpId(e.target.value)
                const emp = employees.find(x => x.id === e.target.value)
                if (emp && emp.shiftId) setShiftId(emp.shiftId)
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Chọn nhân viên --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.code} - {emp.fullName} ({emp.department})
                </option>
              ))}
            </select>
          </div>

          {/* Chọn ngày và Ca làm việc */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Ngày chấm công bù <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                max={todayStr}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Ca làm việc áp dụng
              </label>
              <select
                value={shiftId}
                onChange={e => setShiftId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Ca theo nhân sự --</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Giờ vào & Giờ ra */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Giờ vào (Check-in) <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Giờ ra (Check-out)
              </label>
              <input
                type="time"
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lý do giải trình */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Lý do giải trình chấm công bù <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Quên dập thẻ đầu ca, điện thoại hết pin, đi công tác xử lý khách hàng đột xuất..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Đang ghi vào PostgreSQL...
                </>
              ) : (
                'Lưu Chấm Công Bù'
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>
  )
}
