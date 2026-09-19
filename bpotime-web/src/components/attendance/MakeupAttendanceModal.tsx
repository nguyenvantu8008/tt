import { useState, useEffect } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Calendar, 
  Clock, 
  FileText, 
  Users, 
  User, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Search,
  CheckSquare,
  Square
} from 'lucide-react'
import { logClientError } from '@/lib/clientLogger'

interface MakeupAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  employees: any[]
  shifts: any[]
  initialEmployeeIds?: string[]
}

export default function MakeupAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  employees,
  shifts,
  initialEmployeeIds = []
}: MakeupAttendanceModalProps) {
  const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE')
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])
  const [searchEmp, setSearchEmp] = useState('')

  const [date, setDate] = useState(() => {
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

  useEffect(() => {
    if (initialEmployeeIds && initialEmployeeIds.length > 1) {
      setMode('BULK')
      setSelectedEmpIds(initialEmployeeIds)
    } else if (initialEmployeeIds && initialEmployeeIds.length === 1) {
      setSelectedEmpId(initialEmployeeIds[0])
      setSelectedEmpIds(initialEmployeeIds)
    }
  }, [initialEmployeeIds, isOpen])

  if (!isOpen) return null

  const todayStr = new Date().toISOString().slice(0, 10)

  // Filtered employees for bulk search
  const filteredEmployees = employees.filter(e => 
    e.fullName?.toLowerCase().includes(searchEmp.toLowerCase()) ||
    e.code?.toLowerCase().includes(searchEmp.toLowerCase())
  )

  const toggleSelectEmp = (id: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const selectAllFiltered = () => {
    const allFilteredIds = filteredEmployees.map(e => e.id)
    const isAllSelected = allFilteredIds.every(id => selectedEmpIds.includes(id))
    if (isAllSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
    } else {
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...allFilteredIds])))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (mode === 'SINGLE' && !selectedEmpId) {
      setError('Vui lòng chọn nhân viên cần chấm công bù.')
      return
    }

    if (mode === 'BULK' && selectedEmpIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 nhân viên trong danh sách.')
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

      if (mode === 'BULK') {
        const res = await axios.post('/api/attendance/bulk-makeup', {
          employeeIds: selectedEmpIds,
          date,
          checkIn,
          checkOut: checkOut || null,
          shiftId: shiftId || null,
          reason: reason.trim()
        })
        setSuccessMsg(res.data.message || `Đã chấm công bù thành công cho ${selectedEmpIds.length} nhân viên!`)
      } else {
        const res = await axios.post('/api/attendance/makeup', {
          employeeId: selectedEmpId,
          date,
          checkIn,
          checkOut: checkOut || null,
          shiftId: shiftId || null,
          reason: reason.trim()
        })
        setSuccessMsg(res.data.message || 'Chấm công bù thành công!')
      }

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
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Chấm Công Bù & Phê Duyệt Ca
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bổ sung dữ liệu dập thẻ cho nhân sự đi công tác hoặc quên chấm công
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="px-6 pt-4 pb-1">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('SINGLE')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'SINGLE' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Chấm cho 1 nhân viên</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('BULK')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'BULK' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Chấm hàng loạt ({selectedEmpIds.length} người)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start gap-2.5 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SINGLE MODE EMPLOYEE SELECT */}
          {mode === 'SINGLE' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chọn nhân viên cần chấm bù <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-hidden"
                required
              >
                <option value="">-- Chọn nhân sự từ danh sách --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    [{e.code}] {e.fullName} - {e.department}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* BULK MODE MULTI SELECT */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chọn danh sách nhân viên ({selectedEmpIds.length} đã chọn) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                >
                  Chọn / Bỏ tất cả
                </button>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Lọc theo tên, mã nhân viên..."
                  value={searchEmp}
                  onChange={(e) => setSearchEmp(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50/50">
                {filteredEmployees.length === 0 ? (
                  <p className="p-3 text-center text-xs text-slate-400">Không tìm thấy nhân viên nào.</p>
                ) : (
                  filteredEmployees.map(emp => {
                    const isSelected = selectedEmpIds.includes(emp.id)
                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleSelectEmp(emp.id)}
                        className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/80 font-bold text-indigo-900' : 'hover:bg-slate-100/70 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span>[{emp.code}] {emp.fullName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">{emp.department}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ngày chấm công bù <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                max={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Áp dụng Ca làm việc
              </label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
              >
                <option value="">-- Mặc định theo ca của nhân viên --</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* In / Out times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Giờ vào (Check-in) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Giờ ra (Check-out)
              </label>
              <div className="relative">
                <Clock className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Lý do giải trình bù công <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileText className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
              <textarea
                rows={2}
                placeholder="VD: Đi công tác hiện trường, lỗi máy chấm công, quên quẹt thẻ..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-hidden resize-none"
                required
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold text-slate-600 rounded-xl cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang ghi nhận...
                </>
              ) : mode === 'BULK' ? (
                `Lưu bù công cho ${selectedEmpIds.length} người`
              ) : (
                'Xác nhận chấm bù'
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>
  )
}
