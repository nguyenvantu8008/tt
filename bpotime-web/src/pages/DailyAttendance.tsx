import { useState, useEffect } from 'react'
import axios from 'axios'
import AppLayout from '@/components/layout/AppLayout'
import type { AttendanceStatus } from '@/types/attendance'
import { Button } from '@/components/ui/button'
import BulkActionBar from '@/components/ui/BulkActionBar'
import { 
  Calendar, 
  Search, 
  Save, 
  CheckCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PlusCircle,
  History,
  CheckSquare,
  Square,
  UserCheck
} from 'lucide-react'
import MakeupAttendanceModal from '@/components/attendance/MakeupAttendanceModal'
import AttendanceHistoryModal from '@/components/attendance/AttendanceHistoryModal'

interface BackendEmployee {
  id: string
  code: string
  fullName: string
  email: string
  phone: string
  department: string
  position: string
  avatar: string
  projectId: string | null
  projectCode: string | null
  projectColor: string | null
  shiftId: string | null
  shiftName: string | null
  shiftCode: string | null
}

interface BackendAttendance {
  id: string
  employeeId: string
  projectId: string
  shiftId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  workedHours: number
  otHours: number
  notes: string | null
}

export default function DailyAttendance() {
  const [employees, setEmployees] = useState<BackendEmployee[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [records, setRecords] = useState<BackendAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [makeupModalOpen, setMakeupModalOpen] = useState(false)
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<BackendEmployee | null>(null)

  // Multi-select rows state
  const [selectedRowEmpIds, setSelectedRowEmpIds] = useState<string[]>([])

  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL')
  const [selectedShiftId, setSelectedShiftId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])


  // Status mapping colors & labels
  const STATUS_CONFIG: Record<string, { label: string, color: string, badgeBg: string }> = {
    PRESENT: { label: 'Có mặt', color: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' },
    LATE: { label: 'Đi muộn', color: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200' },
    HALFDAY: { label: 'Nửa ngày', color: 'text-sky-700', badgeBg: 'bg-sky-50 border-sky-200' },
    LEAVE: { label: 'Nghỉ phép', color: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
    ABSENT: { label: 'Vắng mặt', color: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
    OFF: { label: 'Nghỉ ca', color: 'text-slate-600', badgeBg: 'bg-slate-100 border-slate-200' },
  }

  // Fetch real data from backend
  const fetchDailyAttendance = async (dateStr: string) => {
    try {
      setLoading(true)
      const res = await axios.get(`/api/attendance/daily?date=${dateStr}`)
      setRecords(res.data)
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu chấm công theo ngày:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [empRes, projRes, shiftRes, attRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/projects'),
        axios.get('/api/shifts'),
        axios.get(`/api/attendance/daily?date=${selectedDate}`),
      ])

      setEmployees(empRes.data)
      setProjects(projRes.data)
      setShifts(shiftRes.data)
      setRecords(attRes.data)
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu chấm công:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Date navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    const newDateStr = d.toISOString().split('T')[0]
    setSelectedDate(newDateStr)
    fetchDailyAttendance(newDateStr)
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    const newDateStr = d.toISOString().split('T')[0]
    setSelectedDate(newDateStr)
    fetchDailyAttendance(newDateStr)
  }

  const handleDateChange = (newDateStr: string) => {
    if (!newDateStr) return
    setSelectedDate(newDateStr)
    fetchDailyAttendance(newDateStr)
  }

  const handleToday = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    setSelectedDate(todayStr)
    fetchDailyAttendance(todayStr)
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  // Quick action: update status for single employee
  const handleUpdateStatus = (employeeId: string, newStatus: string) => {
    setSaveSuccess(false)
    setRecords(prev => {
      const existing = prev.find(r => r.employeeId === employeeId)
      if (existing) {
        return prev.map(rec => {
          if (rec.employeeId === employeeId) {
            return {
              ...rec,
              status: newStatus,
              workedHours: newStatus === 'PRESENT' ? 8 : (newStatus === 'HALFDAY' ? 4 : (newStatus === 'LATE' ? 7.5 : 0))
            }
          }
          return rec
        })
      } else {
        const emp = employees.find(e => e.id === employeeId)
        const newRec: BackendAttendance = {
          id: `temp-${Date.now()}`,
          employeeId,
          projectId: emp?.projectId || '',
          shiftId: emp?.shiftId || '',
          date: selectedDate,
          checkIn: '08:00',
          checkOut: null,
          status: newStatus,
          workedHours: newStatus === 'PRESENT' ? 8 : 4,
          otHours: 0,
          notes: ''
        }
        return [...prev, newRec]
      }
    })
  }

  // Quick action: Mark all as present
  const handleMarkAllPresent = () => {
    setSaveSuccess(false)
    setRecords(prev => {
      return employees.map(emp => {
        const existing = prev.find(r => r.employeeId === emp.id)
        return {
          id: existing?.id || `temp-${emp.id}`,
          employeeId: emp.id,
          projectId: emp.projectId || '',
          shiftId: emp.shiftId || '',
          date: selectedDate,
          checkIn: existing?.checkIn || '07:55',
          checkOut: existing?.checkOut || null,
          status: 'PRESENT',
          workedHours: 8,
          otHours: existing?.otHours || 0,
          notes: existing?.notes || 'Đúng giờ'
        }
      })
    })
  }

  // Save changes to backend PostgreSQL database
  const handleSaveToDatabase = async () => {
    try {
      setSaving(true)
      const payload = records.map(r => ({
        employeeId: r.employeeId,
        projectId: r.projectId,
        shiftId: r.shiftId,
        date: r.date || selectedDate,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
        workedHours: r.workedHours,
        otHours: r.otHours,
        notes: r.notes
      }))

      await axios.post('/api/attendance/bulk-save', payload)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err) {
      console.error('Lỗi khi lưu bảng công:', err)
      alert('Không thể lưu vào cơ sở dữ liệu. Vui lòng kiểm tra lại kết nối backend.')
    } finally {
      setSaving(false)
    }
  }

  // Row selection helpers
  const toggleSelectRow = (empId: string) => {
    setSelectedRowEmpIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  const toggleSelectAllRows = (visibleList: BackendEmployee[]) => {
    const visibleIds = visibleList.map(e => e.id)
    const isAll = visibleIds.length > 0 && visibleIds.every(id => selectedRowEmpIds.includes(id))
    if (isAll) {
      setSelectedRowEmpIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedRowEmpIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const handleBulkApprove = (status: AttendanceStatus) => {
    if (selectedRowEmpIds.length === 0) return
    selectedRowEmpIds.forEach(id => {
      handleUpdateStatus(id, status)
    })
    setSelectedRowEmpIds([])
  }

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesProject = selectedProjectId === 'ALL' || emp.projectId === selectedProjectId
    const matchesShift = selectedShiftId === 'ALL' || emp.shiftId === selectedShiftId
    const matchesSearch = emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesProject && matchesShift && matchesSearch
  })


  // Summary counts
  const presentCount = records.filter(r => r.status === 'PRESENT').length
  const lateCount = records.filter(r => r.status === 'LATE').length
  const leaveCount = records.filter(r => r.status === 'LEAVE').length
  const absentCount = records.filter(r => r.status === 'ABSENT').length

  return (
    <AppLayout 
      title="Điểm danh Hàng ngày (Database PostgreSQL)" 
      subtitle="Dữ liệu chấm công đồng bộ thời gian thực và lưu trữ vĩnh viễn trong CSDL"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Top Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Có mặt hôm nay</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{presentCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Đi muộn / Về sớm</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{lateCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Nghỉ phép có lương</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{leaveCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Vắng mặt không phép</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{absentCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Action and Filter Header */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Interactive Date Navigator */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100/80 rounded-lg p-1 border border-slate-200/60 text-xs font-semibold">
                <button 
                  onClick={handlePrevDay}
                  title="Ngày trước đó"
                  className="p-1 hover:bg-white rounded-md text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="bg-transparent border-none p-0 text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                  />
                </div>
                <button 
                  onClick={handleNextDay}
                  title="Ngày tiếp theo"
                  className="p-1 hover:bg-white rounded-md text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleToday}
                className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  isToday 
                    ? 'text-blue-700 bg-blue-50 border-blue-200 font-semibold' 
                    : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Hôm nay
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMakeupModalOpen(true)}
                className="text-xs font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 shadow-2xs"
              >
                <PlusCircle className="h-4 w-4 mr-1.5 text-blue-600" />
                Chấm công bù
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                className="text-xs font-medium text-slate-700 hover:bg-slate-50 border-slate-200"
              >
                <CheckCheck className="h-4 w-4 mr-1.5 text-emerald-600" />
                Điểm danh tất cả Có mặt
              </Button>

              <Button
                size="sm"
                onClick={handleSaveToDatabase}
                disabled={saving}
                className={`text-xs font-semibold shadow-xs flex items-center gap-1.5 ${saveSuccess ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang lưu DB...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Đã lưu CSDL thành công!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Lưu vào CSDL PostgreSQL
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filters & Search Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhân viên theo tên hoặc mã..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">-- Tất cả Dự án BPO --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>

            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              className="px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">-- Tất cả Ca làm việc --</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Attendance Table */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">Đang tải dữ liệu từ PostgreSQL...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectAllRows(filteredEmployees)}
                        className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                      >
                        {selectedRowEmpIds.length > 0 && filteredEmployees.length > 0 && filteredEmployees.every(e => selectedRowEmpIds.includes(e.id)) ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">Nhân viên</th>
                    <th className="py-3 px-3">Dự án BPO</th>
                    <th className="py-3 px-3">Ca kíp</th>
                    <th className="py-3 px-3 text-center">Giờ Vào</th>
                    <th className="py-3 px-3 text-center">Giờ Ra</th>
                    <th className="py-3 px-4">Trạng thái chấm công</th>
                    <th className="py-3 px-3 text-center">Giờ OT</th>
                    <th className="py-3 px-4">Ghi chú</th>
                    <th className="py-3 px-3 text-center">Lịch sử</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(emp => {
                    const record = records.find(r => r.employeeId === emp.id) || {
                      id: `temp-${emp.id}`,
                      employeeId: emp.id,
                      projectId: emp.projectId || '',
                      shiftId: emp.shiftId || '',
                      date: selectedDate,
                      checkIn: null,
                      checkOut: null,
                      status: 'PRESENT',
                      workedHours: 8,
                      otHours: 0,
                      notes: ''
                    }
                    const statusConf = STATUS_CONFIG[record.status] || STATUS_CONFIG.PRESENT
                    const isSelected = selectedRowEmpIds.includes(emp.id)

                    return (
                      <tr key={emp.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-indigo-50/25' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(emp.id)}
                            className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
                              alt={emp.fullName} 
                              className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0" 
                            />
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{emp.fullName}</p>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{emp.code} • {emp.department}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
                            style={{ backgroundColor: `${emp.projectColor || '#2563EB'}15`, color: emp.projectColor || '#2563EB' }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: emp.projectColor || '#2563EB' }} />
                            {emp.projectCode || 'Chưa gán'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          <span className="font-semibold text-slate-700">{emp.shiftCode || 'HC'}</span>
                          <span className="text-[11px] text-slate-400 block">{emp.shiftName || 'Ca Hành Chính'}</span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-medium">
                          {record.checkIn ? (
                            <span className={record.status === 'LATE' ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                              {record.checkIn}
                            </span>
                          ) : (
                            <span className="text-slate-300">--:--</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-medium text-slate-600">
                          {record.checkOut ? record.checkOut : <span className="text-slate-300">--:--</span>}
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={record.status}
                            onChange={(e) => handleUpdateStatus(emp.id, e.target.value)}
                            className={`
                              px-2.5 py-1 rounded-lg font-semibold text-xs border transition-colors
                              ${statusConf.badgeBg} ${statusConf.color} focus:outline-hidden focus:ring-1 focus:ring-blue-500
                            `}
                          >
                            <option value="PRESENT">✓ Có mặt (1.0 công)</option>
                            <option value="LATE">⏱ Đi muộn</option>
                            <option value="HALFDAY">½ Nửa ngày (0.5)</option>
                            <option value="LEAVE">📋 Nghỉ phép (P)</option>
                            <option value="ABSENT">✕ Vắng mặt (0.0)</option>
                            <option value="OFF">☕ Nghỉ ca (OFF)</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          {record.otHours > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                              +{record.otHours}h
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate text-[11px]">
                          {record.notes || <span className="text-slate-300 italic">Đúng giờ</span>}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setSelectedEmployeeForHistory(emp)}
                            title={`Xem toàn bộ lịch sử chấm công của ${emp.fullName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-800 border border-blue-200/70 rounded-lg transition-colors cursor-pointer"
                          >
                            <History className="h-3 w-3 text-blue-600" />
                            <span>Lịch sử</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>Hiển thị {filteredEmployees.length} nhân sự BPO từ CSDL PostgreSQL</span>
            <span className="text-slate-400">BPOTime Engine v1.0 • Connected</span>
          </div>
        </div>

        {/* Modal Chấm công bù */}
        <MakeupAttendanceModal
          isOpen={makeupModalOpen}
          onClose={() => setMakeupModalOpen(false)}
          onSuccess={() => {
            fetchData()
            setSelectedRowEmpIds([])
          }}
          employees={employees}
          shifts={shifts}
          initialEmployeeIds={selectedRowEmpIds}
        />

        {/* Modal Lịch sử chấm công nhân viên */}
        <AttendanceHistoryModal
          isOpen={!!selectedEmployeeForHistory}
          onClose={() => setSelectedEmployeeForHistory(null)}
          employee={selectedEmployeeForHistory}
        />

        {/* Floating Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedRowEmpIds.length}
          onClearSelection={() => setSelectedRowEmpIds([])}
          onBulkAttendance={() => setMakeupModalOpen(true)}
          attendanceLabel="Chấm bù đã chọn"
        >
          <Button
            size="sm"
            onClick={() => handleBulkApprove('PRESENT')}
            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Duyệt có mặt ({selectedRowEmpIds.length})</span>
          </Button>
        </BulkActionBar>

      </div>
    </AppLayout>
  )
}

