import { useState } from 'react'
import axios from 'axios'
import { 
  X, 
  FileSpreadsheet, 
  Calendar, 
  Download, 
  Loader2, 
  CheckCircle2, 
  CalendarDays,
  Clock,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  exportDailyAttendanceToExcel, 
  exportMonthlyAttendanceToExcel, 
  type AttendanceExportItem, 
  type MonthlyExportItem 
} from '@/lib/excelExport'

interface ExportExcelModalProps {
  isOpen: boolean
  onClose: () => void
  currentDate: string // YYYY-MM-DD
  employees: any[]
  projects: any[]
  shifts: any[]
  currentRecords: any[]
}

export default function ExportExcelModal({
  isOpen,
  onClose,
  currentDate,
  employees,
  projects,
  shifts,
  currentRecords
}: ExportExcelModalProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return currentDate ? currentDate.slice(0, 7) : new Date().toISOString().slice(0, 7)
  })
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  // Chuyển đổi trạng thái sang tiếng Việt và số công
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { text: 'Có mặt (1.0)', units: 1.0 }
      case 'LATE':
        return { text: 'Đi muộn (1.0)', units: 1.0 }
      case 'HALFDAY':
        return { text: 'Nửa ngày (0.5)', units: 0.5 }
      case 'LEAVE':
        return { text: 'Nghỉ phép (P)', units: 0 }
      case 'ABSENT':
        return { text: 'Vắng mặt (KP)', units: 0 }
      case 'OFF':
        return { text: 'Nghỉ ca (OFF)', units: 0 }
      default:
        return { text: 'Có mặt (1.0)', units: 1.0 }
    }
  }

  // 1. Xuất bảng công theo ngày
  const handleExportDaily = () => {
    try {
      setLoading(true)
      setSuccessMsg(null)

      const items: AttendanceExportItem[] = employees.map((emp, idx) => {
        const record = currentRecords.find(r => r.employeeId === emp.id)
        const proj = projects.find(p => p.id === (record?.projectId || emp.projectId))
        const shift = shifts.find(s => s.id === (record?.shiftId || emp.shiftId))
        const statusInfo = getStatusInfo(record?.status || 'PRESENT')

        let gpsStatus = 'Chưa quét GPS'
        let distanceStr = '-'
        let coordsStr = '-'

        if (record?.checkInLatitude && record?.checkInLongitude) {
          coordsStr = `${record.checkInLatitude.toFixed(5)}, ${record.checkInLongitude.toFixed(5)}`
          if (record.distanceToProjectMeters !== null && record.distanceToProjectMeters !== undefined) {
            const radius = record.projectRadius || proj?.allowedRadiusMeters || 20
            if (record.distanceToProjectMeters <= radius) {
              gpsStatus = `Tại chi nhánh (≤${radius}m)`
            } else {
              gpsStatus = `Ngoài chi nhánh (>${radius}m)`
            }
            distanceStr = `${record.distanceToProjectMeters}m`
          } else {
            gpsStatus = 'Có GPS'
          }
        }

        return {
          stt: idx + 1,
          empCode: emp.code,
          empName: emp.fullName,
          department: emp.department || 'BPO Operations',
          projectCode: proj?.code || emp.projectCode || 'CHƯA GÁN',
          projectName: proj?.name || 'Chi nhánh',
          shiftName: shift?.name || emp.shiftName || 'Ca Hành Chính',
          date: currentDate,
          checkIn: record?.checkIn || '',
          checkOut: record?.checkOut || '',
          workedHours: record?.workedHours ?? (record?.checkIn ? 8 : 0),
          otHours: record?.otHours ?? 0,
          statusText: statusInfo.text,
          workUnits: statusInfo.units,
          gpsStatus,
          distanceMeters: distanceStr,
          coords: coordsStr,
          notes: record?.notes || ''
        }
      })

      exportDailyAttendanceToExcel(currentDate, items)
      setSuccessMsg(`Đã xuất thành công file Excel bảng công ngày ${currentDate}!`)
    } catch (err) {
      console.error('Lỗi khi xuất Excel ngày:', err)
      alert('Không thể xuất Excel lúc này. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // 2. Xuất bảng tổng hợp công cả tháng
  const handleExportMonthly = async () => {
    try {
      setLoading(true)
      setSuccessMsg(null)

      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = `${selectedMonth}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`

      // Lấy toàn bộ bản ghi trong tháng
      const res = await axios.get(`/api/attendance/range?startDate=${startDate}&endDate=${endDate}`)
      const monthRecords: any[] = res.data || []

      // Gom nhóm theo từng nhân viên
      const summaryMap = new Map<string, MonthlyExportItem>()

      employees.forEach((emp, idx) => {
        const empRecords = monthRecords.filter(r => r.employeeId === emp.id)
        const proj = projects.find(p => p.id === emp.projectId)

        let totalUnits = 0
        let totalHours = 0
        let totalOt = 0
        let presentCount = 0
        let lateCount = 0
        let halfDayCount = 0
        let leaveCount = 0
        let absentCount = 0

        empRecords.forEach(r => {
          const info = getStatusInfo(r.status)
          totalUnits += info.units
          totalHours += r.workedHours || 0
          totalOt += r.otHours || 0

          if (r.status === 'PRESENT') presentCount++
          else if (r.status === 'LATE') { presentCount++; lateCount++ }
          else if (r.status === 'HALFDAY') halfDayCount++
          else if (r.status === 'LEAVE') leaveCount++
          else if (r.status === 'ABSENT') absentCount++
        })

        summaryMap.set(emp.id, {
          stt: idx + 1,
          empCode: emp.code,
          empName: emp.fullName,
          department: emp.department || 'BPO Operations',
          projectCode: proj?.code || emp.projectCode || 'CHƯA GÁN',
          standardDays: 24, // Chuẩn trung bình tháng 24 công
          totalWorkUnits: totalUnits,
          totalWorkedHours: totalHours,
          totalOtHours: totalOt,
          presentCount,
          lateCount,
          halfDayCount,
          leaveCount,
          absentCount
        })
      })

      const summaryItems = Array.from(summaryMap.values())

      // Chi tiết từng dòng cho Sheet 2
      const detailItems: AttendanceExportItem[] = monthRecords.map((r, idx) => {
        const emp = employees.find(e => e.id === r.employeeId)
        const proj = projects.find(p => p.id === r.projectId)
        const shift = shifts.find(s => s.id === r.shiftId)
        const statusInfo = getStatusInfo(r.status)

        return {
          stt: idx + 1,
          empCode: emp?.code || r.employeeCode || '',
          empName: emp?.fullName || r.employeeName || '',
          department: emp?.department || r.employeeDepartment || 'BPO Operations',
          projectCode: proj?.code || r.projectCode || '',
          projectName: proj?.name || r.projectName || '',
          shiftName: shift?.name || r.shiftName || 'Ca Chuẩn',
          date: r.date,
          checkIn: r.checkIn || '',
          checkOut: r.checkOut || '',
          workedHours: r.workedHours || 0,
          otHours: r.otHours || 0,
          statusText: statusInfo.text,
          workUnits: statusInfo.units,
          gpsStatus: r.isGpsVerified ? 'Hợp lệ GPS' : 'Ngoài phạm vi / Không GPS',
          distanceMeters: r.distanceToProjectMeters !== null ? `${r.distanceToProjectMeters}m` : '-',
          coords: r.checkInLatitude ? `${r.checkInLatitude.toFixed(5)}, ${r.checkInLongitude?.toFixed(5)}` : '-',
          notes: r.notes || ''
        }
      })

      exportMonthlyAttendanceToExcel(selectedMonth, summaryItems, detailItems)
      setSuccessMsg(`Đã xuất thành công file Excel tổng hợp tháng ${selectedMonth} (${monthRecords.length} lượt công)!`)
    } catch (err) {
      console.error('Lỗi khi xuất Excel tháng:', err)
      alert('Không thể tải dữ liệu tháng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Xuất Excel Bảng Chấm Công</h2>
            <p className="text-xs text-slate-500">Định dạng file .xlsx chuẩn Microsoft Excel có đầy đủ công thức và thông tin</p>
          </div>
        </div>

        {/* Tabs: Theo Ngày vs Theo Tháng */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('daily'); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'daily' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="h-4 w-4 text-emerald-600" />
            Bảng Công Theo Ngày
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('monthly'); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'monthly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="h-4 w-4 text-blue-600" />
            Tổng Hợp Cả Tháng
          </button>
        </div>

        {/* Tab 1: Xuất Theo Ngày */}
        {activeTab === 'daily' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ngày xuất báo cáo:</span>
                <span className="font-bold text-slate-900">{currentDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tổng nhân viên xuất:</span>
                <span className="font-bold text-emerald-700">{employees.length} người</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500">Bao gồm thông tin:</span>
                <span className="text-slate-700 font-medium">Giờ vào/ra, Giờ làm, OT, GPS & Lý do</span>
              </div>
            </div>

            <Button
              onClick={handleExportDaily}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tạo file Excel...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Tải Xuống Excel Bảng Công Ngày ({currentDate})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Tab 2: Xuất Cả Tháng */}
        {activeTab === 'monthly' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Chọn tháng cần xuất bảng công
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-600" /> File Excel gồm 2 Sheet chuyên nghiệp:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800 text-[11px] pl-1">
                <li><strong>Sheet 1 - Tổng hợp tháng:</strong> Tính tổng công thực tế, tổng giờ làm, giờ tăng ca, số lần đi muộn, nghỉ phép của từng nhân sự.</li>
                <li><strong>Sheet 2 - Chi tiết từng ngày:</strong> Lưu lại lịch sử toàn bộ các lượt chấm công trong tháng.</li>
              </ul>
            </div>

            <Button
              onClick={handleExportMonthly}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang truy xuất dữ liệu & tạo Excel...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Tải Xuống Bảng Tổng Hợp Công Tháng {selectedMonth}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  )
}
