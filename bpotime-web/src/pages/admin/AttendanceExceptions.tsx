import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminLayout from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  UserX, 
  Loader2, 
  ExternalLink, 
  Check, 
  UserCheck,
  RefreshCw,
  Send,
  Calendar,
  Filter
} from 'lucide-react'
import MakeupAttendanceModal from '@/components/attendance/MakeupAttendanceModal'

export default function AttendanceExceptions() {
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [todayRecords, setTodayRecords] = useState<any[]>([])
  const [pastRecords, setPastRecords] = useState<any[]>([])
  const [makeupModalOpen, setMakeupModalOpen] = useState(false)
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'ALL' | 'MISSING_IN' | 'MISSING_OUT' | 'REMOTE' | 'LATE' | 'OT'>('ALL')
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  const fetchData = async () => {
    try {
      setLoading(true)
      const [empRes, projRes, shiftRes, attRes, rangeRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/projects'),
        axios.get('/api/shifts'),
        axios.get(`/api/attendance/daily?date=${todayStr}`),
        axios.get(`/api/attendance/range?startDate=${new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]}&endDate=${todayStr}`)
      ])

      setEmployees(empRes.data || [])
      setProjects(projRes.data || [])
      setShifts(shiftRes.data || [])
      setTodayRecords(attRes.data || [])
      setPastRecords(rangeRes.data || [])
    } catch (err) {
      console.error('Lỗi tải dữ liệu ngoại lệ:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 1. Missing Check-in (Hôm nay chưa dập thẻ)
  const missingCheckIn = employees.filter(emp => {
    const r = todayRecords.find(rec => rec.employeeId === emp.id)
    return !r || !r.checkIn
  }).map(emp => ({
    type: 'MISSING_IN',
    id: `min-${emp.id}`,
    employeeId: emp.id,
    fullName: emp.fullName,
    code: emp.code,
    department: emp.department,
    projectName: emp.projectCode || 'Chưa gán',
    date: todayStr,
    details: 'Chưa có dữ liệu dập thẻ vào ca hôm nay'
  }))

  // 2. Missing Checkout (Các ngày trước hoặc hôm nay có checkIn nhưng không có checkOut)
  const missingCheckOut = pastRecords.filter(r => r.date < todayStr && r.checkIn && !r.checkOut).map(r => ({
    type: 'MISSING_OUT',
    id: `mout-${r.id}`,
    employeeId: r.employeeId,
    fullName: r.employeeName,
    code: r.employeeCode,
    department: r.employeeDepartment,
    projectName: r.projectCode,
    date: r.date,
    checkInTime: r.checkIn,
    details: `Vào lúc ${r.checkIn} nhưng quên dập thẻ tan ca`
  }))

  // 3. Remote / Outside Geofence (> 20m)
  const remoteExceptions = todayRecords.filter(r => r.distanceToProjectMeters && r.distanceToProjectMeters > (r.projectRadius || 20)).map(r => ({
    type: 'REMOTE',
    id: `rem-${r.id}`,
    employeeId: r.employeeId,
    fullName: r.employeeName,
    code: r.employeeCode,
    department: r.employeeDepartment,
    projectName: r.projectCode,
    date: r.date,
    distance: r.distanceToProjectMeters,
    allowed: r.projectRadius || 20,
    lat: r.checkInLatitude,
    lon: r.checkInLongitude,
    notes: r.notes || 'Không có giải trình',
    details: `Chấm công cách chi nhánh ${r.distanceToProjectMeters}m (quy định ≤ ${r.projectRadius || 20}m)`
  }))

  // 4. Late Check-in
  const lateExceptions = todayRecords.filter(r => r.status === 'LATE').map(r => ({
    type: 'LATE',
    id: `late-${r.id}`,
    employeeId: r.employeeId,
    fullName: r.employeeName,
    code: r.employeeCode,
    department: r.employeeDepartment,
    projectName: r.projectCode,
    date: r.date,
    checkInTime: r.checkIn,
    details: `Vào ca lúc ${r.checkIn} (Đi muộn)`
  }))

  // 5. Overtime
  const otExceptions = todayRecords.filter(r => r.otHours > 0).map(r => ({
    type: 'OT',
    id: `ot-${r.id}`,
    employeeId: r.employeeId,
    fullName: r.employeeName,
    code: r.employeeCode,
    department: r.employeeDepartment,
    projectName: r.projectCode,
    date: r.date,
    otHours: r.otHours,
    details: `Đăng ký tăng ca +${r.otHours} giờ`
  }))

  const allExceptions = [
    ...remoteExceptions,
    ...missingCheckIn,
    ...missingCheckOut,
    ...lateExceptions,
    ...otExceptions
  ]

  const displayedList = activeTab === 'ALL'
    ? allExceptions
    : allExceptions.filter(item => {
        if (activeTab === 'MISSING_IN') return item.type === 'MISSING_IN'
        if (activeTab === 'MISSING_OUT') return item.type === 'MISSING_OUT'
        if (activeTab === 'REMOTE') return item.type === 'REMOTE'
        if (activeTab === 'LATE') return item.type === 'LATE'
        if (activeTab === 'OT') return item.type === 'OT'
        return true
      })

  // Quick action: approve presence
  const handleQuickApprove = async (empId: string) => {
    try {
      await axios.post('/api/attendance/check-in', {
        employeeId: empId,
        notes: 'Admin duyệt có mặt đúng giờ',
        device: 'Portal Admin'
      })
      setActionMsg('Đã phê duyệt có mặt thành công!')
      setTimeout(() => setActionMsg(null), 3000)
      await fetchData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi khi phê duyệt.')
    }
  }

  // Quick action: auto close shift at 17:00
  const handleAutoCloseShift = async (empId: string, date: string, checkInTime: string) => {
    try {
      await axios.post('/api/attendance/makeup', {
        employeeId: empId,
        date: date,
        checkIn: checkInTime || '08:00',
        checkOut: '17:00',
        reason: 'Admin đóng ca tự động 17:00'
      })
      setActionMsg('Đã bổ sung giờ tan ca 17:00 thành công!')
      setTimeout(() => setActionMsg(null), 3000)
      await fetchData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi khi đóng ca.')
    }
  }

  return (
    <AdminLayout 
      title="Attendance Exceptions Center" 
      subtitle="Trung tâm kiểm soát và xử lý tự động toàn bộ bất thường chấm công"
    >
      <div className="space-y-5 max-w-7xl mx-auto">
        
        {actionMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div 
            onClick={() => setActiveTab('MISSING_IN')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'MISSING_IN' ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-rose-600 block">Chưa vào ca</span>
            <span className="text-2xl font-black text-rose-700 mt-1 block font-mono">{missingCheckIn.length}</span>
          </div>

          <div 
            onClick={() => setActiveTab('MISSING_OUT')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'MISSING_OUT' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-amber-600 block">Quên Checkout</span>
            <span className="text-2xl font-black text-amber-700 mt-1 block font-mono">{missingCheckOut.length}</span>
          </div>

          <div 
            onClick={() => setActiveTab('REMOTE')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'REMOTE' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-blue-600 block">Ngoài bán kính GPS</span>
            <span className="text-2xl font-black text-blue-700 mt-1 block font-mono">{remoteExceptions.length}</span>
          </div>

          <div 
            onClick={() => setActiveTab('LATE')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'LATE' ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-orange-600 block">Đi muộn</span>
            <span className="text-2xl font-black text-orange-700 mt-1 block font-mono">{lateExceptions.length}</span>
          </div>

          <div 
            onClick={() => setActiveTab('OT')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'OT' ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-purple-600 block">Tăng ca (OT)</span>
            <span className="text-2xl font-black text-purple-700 mt-1 block font-mono">{otExceptions.length}</span>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({allExceptions.length})
            </button>
            <button
              onClick={() => setActiveTab('MISSING_IN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'MISSING_IN' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Chưa vào ca ({missingCheckIn.length})
            </button>
            <button
              onClick={() => setActiveTab('MISSING_OUT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'MISSING_OUT' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Quên Checkout ({missingCheckOut.length})
            </button>
            <button
              onClick={() => setActiveTab('REMOTE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'REMOTE' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Ngoài bán kính GPS ({remoteExceptions.length})
            </button>
            <button
              onClick={() => setActiveTab('LATE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'LATE' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              Đi muộn ({lateExceptions.length})
            </button>
            <button
              onClick={() => setActiveTab('OT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'OT' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Tăng ca OT ({otExceptions.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button
              size="sm"
              onClick={() => setMakeupModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Chấm công bù nhanh
            </Button>
          </div>
        </div>

        {/* Exceptions List Table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs">Đang quét ngoại lệ chấm công từ CSDL...</p>
            </div>
          ) : displayedList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Không có ngoại lệ nào cần xử lý!</p>
              <p className="text-xs text-slate-500">Tất cả nhân sự đã chấm công hợp lệ đúng quy chuẩn.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Loại ngoại lệ</th>
                    <th className="py-3 px-4">Nhân viên</th>
                    <th className="py-3 px-3">Dự án</th>
                    <th className="py-3 px-3">Ngày</th>
                    <th className="py-3 px-4">Chi tiết bất thường</th>
                    <th className="py-3 px-4 text-right">Hành động xử lý 1-Click</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedList.map((item: any) => {
                    let badge = { text: 'Ngoại lệ', color: 'bg-slate-100 text-slate-700' }
                    if (item.type === 'MISSING_IN') badge = { text: 'Chưa vào ca', color: 'bg-rose-50 text-rose-700 border-rose-200' }
                    if (item.type === 'MISSING_OUT') badge = { text: 'Quên Checkout', color: 'bg-amber-50 text-amber-700 border-amber-200' }
                    if (item.type === 'REMOTE') badge = { text: 'Ngoài bán kính', color: 'bg-blue-50 text-blue-700 border-blue-200' }
                    if (item.type === 'LATE') badge = { text: 'Đi muộn', color: 'bg-orange-50 text-orange-700 border-orange-200' }
                    if (item.type === 'OT') badge = { text: 'Tăng ca', color: 'bg-purple-50 text-purple-700 border-purple-200' }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${badge.color}`}>
                            {badge.text}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          <div className="font-bold text-slate-900">{item.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.code} • {item.department}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                            {item.projectName}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-medium text-slate-600">
                          {item.date}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="leading-tight">{item.details}</div>
                          {item.notes && item.type === 'REMOTE' && (
                            <div className="text-[11px] text-slate-500 mt-1 italic">
                              Lý do: {item.notes}
                            </div>
                          )}
                          {item.lat && item.lon && (
                            <a
                              href={`https://www.google.com/maps?q=${item.lat},${item.lon}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5 mt-1"
                            >
                              <MapPin className="h-3 w-3" /> Xem tọa độ trên Bản đồ
                            </a>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.type === 'MISSING_IN' && (
                              <button
                                onClick={() => handleQuickApprove(item.employeeId)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition-colors cursor-pointer"
                              >
                                Duyệt Có mặt
                              </button>
                            )}

                            {item.type === 'MISSING_OUT' && (
                              <button
                                onClick={() => handleAutoCloseShift(item.employeeId, item.date, item.checkInTime)}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] border border-amber-200 transition-colors cursor-pointer"
                              >
                                Đóng ca 17:00
                              </button>
                            )}

                            {item.type === 'REMOTE' && (
                              <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Đã lưu GPS
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setSelectedEmpIds([item.employeeId])
                                setMakeupModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition-colors cursor-pointer"
                            >
                              Chấm bù
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <MakeupAttendanceModal
          isOpen={makeupModalOpen}
          onClose={() => setMakeupModalOpen(false)}
          onSuccess={fetchData}
          employees={employees}
          shifts={shifts}
          initialEmployeeIds={selectedEmpIds}
        />

      </div>
    </AdminLayout>
  )
}
