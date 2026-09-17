import { useState, useEffect } from 'react'
import axios from 'axios'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet,
  HelpCircle,
  Loader2,
  PlusCircle
} from 'lucide-react'
import MakeupAttendanceModal from '@/components/attendance/MakeupAttendanceModal'

export default function MonthlyTimesheet() {
  const [targetMonth, setTargetMonth] = useState(9)
  const [targetYear, setTargetYear] = useState(2026)
  const [matrixData, setMatrixData] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [daysCount, setDaysCount] = useState(30)
  const [loading, setLoading] = useState(true)

  const [selectedProjectId, setSelectedProjectId] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [makeupModalOpen, setMakeupModalOpen] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])

  const fetchMonthlyData = async () => {
    try {
      setLoading(true)
      const [matrixRes, projRes, empRes, shiftRes] = await Promise.all([
        axios.get(`/api/attendance/monthly?month=${targetMonth}&year=${targetYear}`),
        axios.get('/api/projects'),
        axios.get('/api/employees'),
        axios.get('/api/shifts'),
      ])

      setMatrixData(matrixRes.data.data)
      setDaysCount(matrixRes.data.daysInMonth)
      setProjects(projRes.data)
      setEmployees(empRes.data)
      setShifts(shiftRes.data)
    } catch (err) {
      console.error('Lỗi khi tải ma trận công:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonthlyData()
  }, [targetMonth, targetYear])

  // Generate days array
  const daysInMonth = Array.from({ length: daysCount }, (_, i) => {
    const day = i + 1
    const dateObj = new Date(targetYear, targetMonth - 1, day)
    const dayOfWeek = dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
    return { day, dayOfWeek, isWeekend }
  })

  // Export to Excel CSV with UTF-8 BOM
  const handleExportExcel = () => {
    if (matrixData.length === 0) return

    const now = new Date()
    const isCurrentMonth = targetMonth === now.getMonth() + 1 && targetYear === now.getFullYear()
    const isPastMonth = targetYear < now.getFullYear() || (targetYear === now.getFullYear() && targetMonth < now.getMonth() + 1)

    let csv = '\uFEFF' // UTF-8 BOM for Excel
    // Header
    const headerDays = daysInMonth.map(d => `Ngày ${d.day} (${d.dayOfWeek})`).join(',')
    csv += `Mã NV,Họ và Tên,Phòng ban,Dự án,${headerDays},Tổng Công TT,Tổng Giờ OT,Số Lần Muộn,Nghỉ Phép\n`

    matrixData.forEach(row => {
      const dayValues = daysInMonth.map(d => {
        if (d.isWeekend) return 'OFF'
        const dayStat = row.dailyStatuses?.[d.day]
        if (dayStat) {
          if (dayStat.status === 'PRESENT') return 'X'
          if (dayStat.status === 'LATE') return 'L'
          if (dayStat.status === 'HALFDAY') return '1/2'
          if (dayStat.status === 'LEAVE') return 'P'
          if (dayStat.status === 'ABSENT') return 'V'
          if (dayStat.status === 'OFF') return 'OFF'
          return dayStat.status
        }
        const isPast = isPastMonth || (isCurrentMonth && d.day <= now.getDate())
        return isPast ? '—' : ''
      }).join(',')

      csv += `"${row.employeeCode}","${row.employeeName}","${row.department || ''}","${row.projectCode || ''}",${dayValues},${row.totalWorkedDays},${row.totalOtHours},${row.totalLateCount},${row.totalLeaveDays}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Bang_Cong_BPOTime_Thang_${targetMonth}_${targetYear}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredData = matrixData.filter(emp => {
    const matchesProject = selectedProjectId === 'ALL' || emp.projectCode === selectedProjectId
    const matchesSearch = emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesProject && matchesSearch
  })

  return (
    <AppLayout 
      title="Bảng công Tổng hợp Tháng (Dữ liệu PostgreSQL)" 
      subtitle="Ma trận chấm công chi tiết được tổng hợp trực tiếp từ cơ sở dữ liệu để xuất bảng lương"
    >
      <div className="space-y-6 max-w-[100vw] mx-auto">
        
        {/* Header Filter & Action Bar */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100/80 rounded-lg p-1 border border-slate-200/60 text-xs font-semibold">
              <button 
                onClick={() => setTargetMonth(prev => prev > 1 ? prev - 1 : 12)}
                className="p-1 hover:bg-white rounded-md text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 px-3 py-0.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-sm font-bold text-slate-800">Tháng {targetMonth.toString().padStart(2, '0')} / {targetYear}</span>
              </div>
              <button 
                onClick={() => setTargetMonth(prev => prev < 12 ? prev + 1 : 1)}
                className="p-1 hover:bg-white rounded-md text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="text-xs text-slate-500 font-medium">Tổng số công chuẩn: <strong className="text-slate-800">22 công</strong></span>
          </div>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhân viên..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">-- Tất cả Dự án --</option>
              {projects.map(p => (
                <option key={p.id} value={p.code}>{p.code}</option>
              ))}
            </select>

            <Button
              size="sm"
              onClick={() => setMakeupModalOpen(true)}
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              Chấm công bù
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Xuất Excel (CSV)
            </Button>
          </div>
        </div>

        {/* Legend bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-white border border-slate-200/80 rounded-xl p-3 px-4 shadow-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
            Ký hiệu công:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">X</span>
            <span>Đủ công (1.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-md bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-[10px]">L</span>
            <span>Đi muộn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">P</span>
            <span>Nghỉ phép (1.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-md bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[10px]">V</span>
            <span>Vắng không phép (0.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-md bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[10px]">OFF</span>
            <span>Nghỉ tuần/lễ</span>
          </div>
        </div>

        {/* 30-Day Matrix Table with Sticky Columns */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">Đang tổng hợp dữ liệu chấm công từ PostgreSQL...</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] relative">
              <table className="w-full text-center border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs shadow-xs border-b border-slate-200">
                  <tr>
                    <th className="sticky left-0 z-30 bg-slate-100/95 py-2.5 px-4 text-left font-bold text-slate-700 min-w-[200px] border-r border-slate-200">
                      Nhân viên BPO
                    </th>
                    
                    {daysInMonth.map(d => (
                      <th 
                        key={d.day} 
                        className={`
                          py-2 px-1 min-w-[34px] border-r border-slate-200/60
                          ${d.isWeekend ? 'bg-slate-200/60 text-slate-400' : 'text-slate-700'}
                        `}
                      >
                        <span className="block text-[10px] text-slate-400 font-normal">{d.dayOfWeek}</span>
                        <span className="font-bold text-xs">{d.day}</span>
                      </th>
                    ))}

                    <th className="py-2 px-3 font-bold text-emerald-700 bg-emerald-50/80 border-r border-slate-200 min-w-[65px]">
                      Công TT
                    </th>
                    <th className="py-2 px-3 font-bold text-amber-700 bg-amber-50/80 border-r border-slate-200 min-w-[65px]">
                      Giờ OT
                    </th>
                    <th className="py-2 px-3 font-bold text-indigo-700 bg-indigo-50/80 border-r border-slate-200 min-w-[60px]">
                      Phép
                    </th>
                    <th className="py-2 px-3 font-bold text-rose-700 bg-rose-50/80 min-w-[60px]">
                      Đi muộn
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((emp, empIdx) => {
                    return (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 py-2.5 px-4 text-left border-r border-slate-200 shadow-xs">
                          <p className="font-bold text-slate-900 leading-none truncate">{emp.employeeName}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-1">{emp.employeeCode} • {emp.department}</p>
                        </td>

                        {daysInMonth.map(d => {
                          if (d.isWeekend) {
                            return (
                              <td key={d.day} className="py-1 px-0.5 border-r border-slate-100 bg-slate-50/40">
                                <span className="inline-block w-6 h-6 leading-6 rounded-md text-[10px] text-center text-slate-400 bg-slate-100/70">
                                  OFF
                                </span>
                              </td>
                            )
                          }

                          const dayStat = emp.dailyStatuses?.[d.day]
                          let code = ''
                          let color = 'text-slate-300'

                          const now = new Date()
                          const isCurrentMonth = targetMonth === now.getMonth() + 1 && targetYear === now.getFullYear()
                          const isPastMonth = targetYear < now.getFullYear() || (targetYear === now.getFullYear() && targetMonth < now.getMonth() + 1)
                          const isPast = isPastMonth || (isCurrentMonth && d.day <= now.getDate())

                          if (dayStat) {
                            if (dayStat.status === 'PRESENT') {
                              code = 'X'
                              color = 'text-emerald-700 bg-emerald-100/70 font-bold'
                            } else if (dayStat.status === 'LATE') {
                              code = 'L'
                              color = 'text-amber-700 bg-amber-100/80 font-bold'
                            } else if (dayStat.status === 'HALFDAY') {
                              code = '½'
                              color = 'text-sky-700 bg-sky-100 font-bold'
                            } else if (dayStat.status === 'LEAVE') {
                              code = 'P'
                              color = 'text-indigo-700 bg-indigo-100/80 font-bold'
                            } else if (dayStat.status === 'ABSENT') {
                              code = 'V'
                              color = 'text-rose-700 bg-rose-100 font-bold'
                            } else if (dayStat.status === 'OFF') {
                              code = 'OFF'
                              color = 'text-slate-400 bg-slate-100/70'
                            } else {
                              code = dayStat.status.slice(0, 1)
                              color = 'text-slate-700 bg-slate-100 font-bold'
                            }
                          } else {
                            code = isPast ? '—' : '·'
                            color = isPast ? 'text-slate-400 font-medium' : 'text-slate-200'
                          }

                          return (
                            <td key={d.day} className="py-1 px-0.5 border-r border-slate-100 text-[11px]">
                              <span className={`inline-block w-6 h-6 leading-6 rounded-md text-[10px] text-center ${color}`}>
                                {code}
                              </span>
                            </td>
                          )
                        })}

                        <td className="py-2.5 px-3 font-bold font-mono text-emerald-700 bg-emerald-50/30 border-r border-slate-200">
                          {emp.totalWorkedDays}
                        </td>
                        <td className="py-2.5 px-3 font-bold font-mono text-amber-700 bg-amber-50/30 border-r border-slate-200">
                          +{emp.totalOtHours}h
                        </td>
                        <td className="py-2.5 px-3 font-semibold font-mono text-indigo-700 bg-indigo-50/30 border-r border-slate-200">
                          {emp.totalLeaveDays}
                        </td>
                        <td className="py-2.5 px-3 font-semibold font-mono text-rose-700 bg-rose-50/30">
                          {emp.totalLateCount}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Chấm công bù */}
        <MakeupAttendanceModal
          isOpen={makeupModalOpen}
          onClose={() => setMakeupModalOpen(false)}
          onSuccess={fetchMonthlyData}
          employees={employees}
          shifts={shifts}
        />

      </div>
    </AppLayout>
  )
}
