import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import {
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Navigation,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  Smartphone,
  Zap,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'
import { getCurrentGpsPosition, calcDistanceMeters, type GpsCoordinates } from '@/lib/geoUtils'
import { logClientError } from '@/lib/clientLogger'

export default function OnsiteKiosk() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [employees, setEmployees] = useState<any[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Chế độ Đội trưởng Đi xa (Ủy quyền từ xa)
  const [isRemoteLeaderMode, setIsRemoteLeaderMode] = useState(false)

  // Đội trưởng GPS
  const [kioskGps, setKioskGps] = useState<GpsCoordinates | null>(null)
  const [gpsScanning, setGpsScanning] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Load Initial Data
  const fetchData = async () => {
    try {
      setLoading(true)
      const [projRes, empRes, attRes] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/employees'),
        axios.get('/api/attendance/today'),
      ])

      setProjects(projRes.data)
      setEmployees(empRes.data)
      setAttendanceRecords(attRes.data)

      if (projRes.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projRes.data[0].id)
      }
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu Onsite Kiosk:', err)
      await logClientError('KIOSK_FETCH_ERROR', 'Lỗi tải danh sách Kiosk', err.message, '/onsite-kiosk')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    scanLeaderGps()
  }, [])

  // Quét GPS của thiết bị Chỉ huy / Đội trưởng
  const scanLeaderGps = async () => {
    setGpsScanning(true)
    setGpsError(null)
    const res = await getCurrentGpsPosition()
    if (res.coords) {
      setKioskGps(res.coords)
    } else {
      setGpsError(res.error || 'Không lấy được GPS')
      await logClientError('KIOSK_GPS_ERROR', 'Đội trưởng không bắt được GPS', res.error, '/onsite-kiosk')
    }
    setGpsScanning(false)
  }

  // Dự án onsite đang chọn
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null
  }, [projects, selectedProjectId])

  // Khoảng cách từ máy Đội trưởng tới tâm dự án
  const distanceToProject = useMemo(() => {
    if (!kioskGps || !selectedProject?.latitude || !selectedProject?.longitude) return null
    return calcDistanceMeters(
      kioskGps.latitude,
      kioskGps.longitude,
      selectedProject.latitude,
      selectedProject.longitude
    )
  }, [kioskGps, selectedProject])

  const isLeaderOnsite = useMemo(() => {
    if (isRemoteLeaderMode) return true // Điểm danh từ xa không bị ràng buộc
    if (!selectedProject?.requireGps) return true
    if (distanceToProject === null) return null
    return distanceToProject <= (selectedProject.allowedRadiusMeters || 200)
  }, [isRemoteLeaderMode, selectedProject, distanceToProject])

  // Danh sách công nhân thuộc dự án được chọn
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => emp.projectId === selectedProjectId)
      .filter((emp) =>
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
  }, [employees, selectedProjectId, searchQuery])

  // Trạng thái chấm công từng nhân sự
  const getEmployeeAttendance = (empId: string) => {
    return attendanceRecords.find((a) => a.employeeId === empId) || null
  }

  // Đội trưởng Check-in hộ 1 chạm cho công nhân
  const handleKioskCheckIn = async (employeeId: string) => {
    try {
      setActionLoadingId(employeeId)
      const res = await axios.post('/api/attendance/check-in', {
        employeeId,
        projectId: selectedProjectId,
        notes: isRemoteLeaderMode ? 'Đội trưởng ủy quyền từ xa do đi công tác' : 'Đội trưởng điểm danh Onsite Kiosk',
        latitude: isRemoteLeaderMode ? undefined : kioskGps?.latitude,
        longitude: isRemoteLeaderMode ? undefined : kioskGps?.longitude,
        accuracyMeters: isRemoteLeaderMode ? undefined : kioskGps?.accuracy,
        device: isRemoteLeaderMode ? 'Kiosk Remote (Đội trưởng ủy quyền từ xa)' : 'Kiosk Onsite Tablet / Chỉ huy trưởng',
        isRemoteLeader: isRemoteLeaderMode,
      })

      // Refresh today's attendance records
      const attRes = await axios.get('/api/attendance/today')
      setAttendanceRecords(attRes.data)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể điểm danh cho nhân sự này.'
      alert(msg)
      await logClientError('KIOSK_CHECKIN_ERROR', msg, err.message, '/onsite-kiosk')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Đội trưởng Check-out hộ cho công nhân
  const handleKioskCheckOut = async (employeeId: string) => {
    try {
      setActionLoadingId(employeeId)
      await axios.post('/api/attendance/check-out', {
        employeeId,
      })

      const attRes = await axios.get('/api/attendance/today')
      setAttendanceRecords(attRes.data)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi Check-out.'
      alert(msg)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Đội trưởng điểm danh nhanh cho TẤT CẢ công nhân chưa check-in trong dự án
  const handleBulkCheckInAll = async () => {
    const uncheckEmps = filteredEmployees.filter((emp) => {
      const att = getEmployeeAttendance(emp.id)
      return !att || !att.checkIn
    })

    if (uncheckEmps.length === 0) {
      alert('Tất cả nhân sự trong dự án này đã được điểm danh hôm nay!')
      return
    }

    const confirmMsg = isRemoteLeaderMode
      ? `[CHẾ ĐỘ TỪ XA] Xác nhận duyệt điểm danh có mặt cho ${uncheckEmps.length} nhân sự thuộc ${selectedProject?.code}?`
      : `Xác nhận điểm danh có mặt cho ${uncheckEmps.length} nhân sự tại hiện trường?`

    if (!confirm(confirmMsg)) return

    try {
      setLoading(true)
      const nowTime = new Date().toTimeString().slice(0, 5)
      const todayStr = new Date().toISOString().slice(0, 10)

      const bulkItems = uncheckEmps.map((emp) => ({
        employeeId: emp.id,
        projectId: selectedProjectId,
        shiftId: emp.shiftId,
        date: todayStr,
        checkIn: nowTime,
        checkOut: null,
        status: 'PRESENT',
        workedHours: 8.0,
        otHours: 0,
        notes: isRemoteLeaderMode 
          ? 'Chỉ huy trưởng điểm danh hàng loạt từ xa (Ủy quyền đi công tác)' 
          : 'Chỉ huy trưởng điểm danh hàng loạt tại hiện trường Onsite',
      }))

      await axios.post('/api/attendance/bulk-save', bulkItems)
      await fetchData()
      alert(`Đã điểm danh thành công cho ${uncheckEmps.length} nhân sự!`)
    } catch (err: any) {
      alert('Lỗi khi điểm danh hàng loạt: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  // Thống kê nhanh quân số của dự án hôm nay
  const stats = useMemo(() => {
    const total = filteredEmployees.length
    let present = 0
    let late = 0
    let absent = 0

    filteredEmployees.forEach((emp) => {
      const att = getEmployeeAttendance(emp.id)
      if (!att || !att.checkIn) absent++
      else if (att.status === 'LATE') late++
      else present++
    })

    return { total, present, late, absent }
  }, [filteredEmployees, attendanceRecords])

  return (
    <AppLayout
      title="Chế độ Kiosk Hiện Trường & Đi Xa (Onsite & Remote Kiosk)"
      subtitle="Giải pháp toàn diện: Đội trưởng điểm danh trực tiếp tại công trường hoặc Ủy quyền từ xa khi đi công tác"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Remote Authorization Mode Switch */}
        <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isRemoteLeaderMode ? 'bg-amber-500/10 border-amber-300 ring-1 ring-amber-400' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isRemoteLeaderMode ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900">
                  Chế độ Đội trưởng Đi xa (Ủy quyền Điểm danh Từ xa)
                </h4>
                {isRemoteLeaderMode ? (
                  <span className="text-[10px] uppercase font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-md animate-pulse">
                    Đang kích hoạt
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-md">
                    Chế độ thường (Tại chỗ)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bật khi Đội trưởng đi công tác tỉnh xa, đi họp hoặc làm việc từ xa để điểm danh hộ công nhân mà không bị chặn khoảng cách GPS.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRemoteLeaderMode(!isRemoteLeaderMode)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${isRemoteLeaderMode ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'}`}
          >
            {isRemoteLeaderMode ? 'Tắt chế độ Đi xa' : 'Kích hoạt Điểm danh Từ xa'}
          </button>
        </div>

        {/* Header Kiosk Banner & GPS Verification */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Project Picker */}
            <div className="space-y-1.5 w-full lg:w-auto">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-600" />
                Chọn Dự Án Hiện Trường:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`
                      px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2
                      ${selectedProjectId === proj.id
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}
                    `}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: selectedProjectId === proj.id ? '#ffffff' : proj.color }}
                    />
                    {proj.code} - {proj.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Leader GPS Verification Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs w-full lg:w-auto flex items-center justify-between lg:justify-start gap-4">
              <div className="flex items-center gap-2">
                <Navigation
                  className={`h-4 w-4 ${
                    isRemoteLeaderMode 
                      ? 'text-amber-500' 
                      : kioskGps 
                      ? 'text-emerald-500 animate-pulse' 
                      : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    Trạng thái Đội trưởng:
                    {isRemoteLeaderMode ? (
                      <span className="text-amber-600 font-bold">Ủy quyền Từ xa (Không giới hạn GPS)</span>
                    ) : kioskGps ? (
                      <span className="text-emerald-600 font-bold">Đã xác thực GPS (±{kioskGps.accuracy}m)</span>
                    ) : gpsScanning ? (
                      <span className="text-blue-600 font-medium flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Đang quét GPS...
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">Chưa lấy GPS</span>
                    )}
                  </div>
                  {!isRemoteLeaderMode && distanceToProject !== null && (
                    <div className="text-[11px] text-slate-500">
                      Cách tâm dự án:{' '}
                      <strong className={isLeaderOnsite ? 'text-emerald-600' : 'text-rose-600'}>
                        {distanceToProject} mét
                      </strong>{' '}
                      (Cho phép {selectedProject?.allowedRadiusMeters || 200}m)
                    </div>
                  )}
                  {isRemoteLeaderMode && (
                    <div className="text-[11px] text-amber-700">
                      Dữ liệu dập thẻ sẽ được gắn nhãn [Ủy quyền từ xa]
                    </div>
                  )}
                </div>
              </div>

              {!isRemoteLeaderMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scanLeaderGps}
                  disabled={gpsScanning}
                  className="h-7 text-[11px] px-2.5 rounded-lg shrink-0"
                >
                  Quét lại
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row & Fast Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Tổng quân số dự án</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total} nhân sự</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <p className="text-xs text-emerald-600 font-medium">Đã có mặt (Đúng giờ)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.present}</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <p className="text-xs text-amber-600 font-medium">Đi muộn</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.late}</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <p className="text-xs text-rose-600 font-medium">Chưa điểm danh / Vắng</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.absent}</p>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-linear-to-br from-blue-600 to-indigo-700 rounded-xl p-3 text-white flex flex-col justify-center items-center text-center shadow-xs">
            <Button
              onClick={handleBulkCheckInAll}
              disabled={loading || stats.absent === 0}
              className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs h-9 rounded-lg shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Điểm danh cả đội ({stats.absent})
            </Button>
            <span className="text-[10px] text-blue-100 mt-1">1 chạm cho người chưa dập</span>
          </div>
        </div>

        {/* Workers List Section */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* Search bar & Filter */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm công nhân theo tên hoặc mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-slate-400" />
              Đội trưởng có thể dập thẻ hộ từng người hoặc dập cả đội mọi lúc mọi nơi
            </div>
          </div>

          {/* Table / Cards */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
              Đang tải danh sách công nhân hiện trường...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              Không tìm thấy nhân sự nào thuộc dự án này.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const att = getEmployeeAttendance(emp.id)
                const isWorking = att && att.checkIn && !att.checkOut
                const isCompleted = att && att.checkIn && att.checkOut
                const isAbsent = !att || !att.checkIn
                const isBusy = actionLoadingId === emp.id

                return (
                  <div
                    key={emp.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Worker Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <img
                          src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.code}`}
                          alt={emp.fullName}
                          className="h-12 w-12 rounded-xl object-cover border border-slate-200 bg-slate-100"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            isWorking ? 'bg-emerald-500' : isCompleted ? 'bg-blue-500' : 'bg-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{emp.fullName}</h4>
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                            {emp.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {emp.position || 'Nhân viên hiện trường'} • Ca: {emp.shiftCode || 'HC'} (
                          {emp.shiftName || 'Hành chính'})
                        </p>
                      </div>
                    </div>

                    {/* Status & Times */}
                    <div className="flex items-center gap-4 text-xs">
                      {isAbsent && (
                        <div className="flex items-center gap-1.5 text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                          <Clock className="h-4 w-4" />
                          Chưa điểm danh hôm nay
                        </div>
                      )}

                      {isWorking && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-lg text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold">Đang làm việc</span>
                            <span className="text-slate-500 ml-1.5 font-mono">(Vào: {att.checkIn})</span>
                          </div>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200/60 px-3 py-1.5 rounded-lg text-blue-800">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-bold">Đã hoàn thành ca</span>
                            <span className="text-slate-500 ml-1.5 font-mono">
                              ({att.checkIn} - {att.checkOut})
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons for Leader */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isAbsent && (
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleKioskCheckIn(emp.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs"
                          >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Vào ca (Check-in)'}
                          </Button>
                        )}

                        {isWorking && (
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleKioskCheckOut(emp.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs"
                          >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tan ca (Check-out)'}
                          </Button>
                        )}

                        {isCompleted && (
                          <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-lg">
                            Đã chốt công
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
