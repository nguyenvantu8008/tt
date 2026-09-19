import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import {
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  Search,
  Navigation,
  Loader2,
  Briefcase,
  AlertTriangle,
  Building2,
  Play,
  Square,
  ExternalLink,
  ShieldCheck,
  Compass
} from 'lucide-react'
import { getCurrentGpsPosition, calcDistanceMeters, type GpsCoordinates } from '@/lib/geoUtils'
import { logClientError } from '@/lib/clientLogger'

export default function OnsiteKiosk() {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [employees, setEmployees] = useState<any[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Current selected employee for check-in
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')

  // GPS State
  const [deviceGps, setDeviceGps] = useState<GpsCoordinates | null>(null)
  const [gpsScanning, setGpsScanning] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Reason & Mode for check-in outside radius (> 20m)
  const [checkInMode, setCheckInMode] = useState<'BUSINESS_TRIP' | 'OTHER'>('BUSINESS_TRIP')
  const [remoteReason, setRemoteReason] = useState('')

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true)
      const [projRes, empRes, attRes] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/employees'),
        axios.get('/api/attendance/today'),
      ])

      const projs = projRes.data || []
      const emps = empRes.data || []
      setProjects(projs)
      setEmployees(emps)
      setAttendanceRecords(attRes.data || [])

      if (projs.length > 0 && !selectedProjectId) {
        // Default to user's assigned project or first project
        const userEmp = user?.employeeId ? emps.find((e: any) => e.id === user.employeeId) : null
        const defaultProjId = userEmp?.projectId || projs[0].id
        setSelectedProjectId(defaultProjId)
      }

      if (emps.length > 0 && !selectedEmpId) {
        if (user?.employeeId && emps.some((e: any) => e.id === user.employeeId)) {
          setSelectedEmpId(user.employeeId)
        } else {
          setSelectedEmpId(emps[0].id)
        }
      }
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu Kiosk:', err)
      await logClientError('KIOSK_FETCH_ERROR', 'Lỗi tải danh sách Kiosk', err.message, '/onsite-kiosk')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    scanDeviceGps()
  }, [])

  // Quét tọa độ GPS thực tế của thiết bị nhân viên
  const scanDeviceGps = async () => {
    setGpsScanning(true)
    setGpsError(null)
    const res = await getCurrentGpsPosition()
    if (res.coords) {
      setDeviceGps(res.coords)
    } else {
      setGpsError(res.error || 'Không lấy được GPS từ thiết bị.')
      await logClientError('KIOSK_GPS_ERROR', 'Không bắt được GPS thiết bị', res.error, '/onsite-kiosk')
    }
    setGpsScanning(false)
  }

  // Chi nhánh / Dự án đang chọn
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null
  }, [projects, selectedProjectId])

  // Bán kính quy định của chi nhánh (Mặc định 20m)
  const allowedRadius = useMemo(() => {
    return selectedProject?.allowedRadiusMeters && selectedProject.allowedRadiusMeters > 0
      ? selectedProject.allowedRadiusMeters
      : 20
  }, [selectedProject])

  // Khoảng cách thực tế từ thiết bị nhân viên tới địa điểm thực của chi nhánh
  const distanceToBranch = useMemo(() => {
    if (!deviceGps || !selectedProject?.latitude || !selectedProject?.longitude) return null
    return calcDistanceMeters(
      deviceGps.latitude,
      deviceGps.longitude,
      selectedProject.latitude,
      selectedProject.longitude
    )
  }, [deviceGps, selectedProject])

  // Kiểm tra nhân viên có ở trong bán kính chuẩn (<= 20m) hay không
  const isWithinRadius = useMemo(() => {
    if (distanceToBranch === null) return null
    return distanceToBranch <= allowedRadius
  }, [distanceToBranch, allowedRadius])

  // Danh sách nhân sự thuộc chi nhánh
  const branchEmployees = useMemo(() => {
    return employees
      .filter((emp) => !selectedProjectId || emp.projectId === selectedProjectId)
      .filter((emp) =>
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
  }, [employees, selectedProjectId, searchQuery])

  // Thông tin nhân viên đang chọn
  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || null
  }, [employees, selectedEmpId])

  // Trạng thái chấm công hôm nay của nhân viên đang chọn
  const currentAttendance = useMemo(() => {
    if (!selectedEmpId) return null
    return attendanceRecords.find((a) => a.employeeId === selectedEmpId) || null
  }, [attendanceRecords, selectedEmpId])

  const isCheckedIn = !!(currentAttendance && currentAttendance.checkIn && !currentAttendance.checkOut)

  // Thực hiện Check-in
  const handleCheckIn = async () => {
    if (!selectedEmpId) {
      alert('Vui lòng chọn nhân viên cần chấm công.')
      return
    }

    if (!selectedProjectId) {
      alert('Vui lòng chọn Chi nhánh / Dự án làm việc.')
      return
    }

    // Nếu ngoài bán kính 20m, BẮT BUỘC phải có lý do
    if (isWithinRadius === false) {
      if (!remoteReason.trim()) {
        alert(`Bạn đang cách chi nhánh ${distanceToBranch}m (vượt quá bán kính chuẩn ${allowedRadius}m). Vui lòng chọn chế độ và nhập rõ lý do giải trình!`)
        return
      }
    }

    try {
      setSubmitting(true)
      const res = await axios.post('/api/attendance/check-in', {
        employeeId: selectedEmpId,
        projectId: selectedProjectId,
        latitude: deviceGps?.latitude,
        longitude: deviceGps?.longitude,
        accuracyMeters: deviceGps?.accuracy,
        checkInMode: isWithinRadius ? 'ONSITE' : checkInMode,
        reason: isWithinRadius ? undefined : remoteReason.trim(),
        device: 'Kiosk Hiện Trường',
      })

      alert(res.data.message || 'Check-in thành công!')
      setRemoteReason('')

      // Reload dữ liệu
      const attRes = await axios.get('/api/attendance/today')
      setAttendanceRecords(attRes.data || [])
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi chấm công.'
      alert(msg)
      await logClientError('KIOSK_CHECKIN_ERROR', msg, err.message, '/onsite-kiosk')
    } finally {
      setSubmitting(false)
    }
  }

  // Thực hiện Check-out
  const handleCheckOut = async () => {
    if (!selectedEmpId) return

    try {
      setSubmitting(true)
      const res = await axios.post('/api/attendance/check-out', {
        employeeId: selectedEmpId,
      })

      alert(res.data.message || 'Tan ca (Check-out) thành công!')

      // Reload dữ liệu
      const attRes = await axios.get('/api/attendance/today')
      setAttendanceRecords(attRes.data || [])
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi khi tan ca.'
      alert(msg)
      await logClientError('KIOSK_CHECKOUT_ERROR', msg, err.message, '/onsite-kiosk')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout
      title="Kiosk Điểm Danh Hiện Trường & Chi Nhánh"
      subtitle="Xác thực khoảng cách GPS tới tọa độ thực tế của chi nhánh (Bán kính chuẩn 20m)"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Bước 1: Chọn Chi nhánh / Dự án thực tế */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                Địa Điểm Thực Tế Chi Nhánh / Dự Án
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tọa độ cố định do Quản trị viên thiết lập trên Google Maps
              </p>
            </div>
            
            {selectedProject?.latitude && selectedProject?.longitude && (
              <a
                href={`https://www.google.com/maps?q=${selectedProject.latitude},${selectedProject.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors shrink-0"
              >
                <MapPin className="h-3.5 w-3.5" />
                Xem vị trí chi nhánh trên Google Maps
                <ExternalLink className="h-3 w-3 ml-0.5" />
              </a>
            )}
          </div>

          {/* Project Cards Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {projects.map((proj) => {
              const isSelected = selectedProjectId === proj.id
              const hasGps = proj.latitude && proj.longitude
              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`
                    p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between
                    ${isSelected 
                      ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/20 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'}
                  `}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">{proj.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                        {proj.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {proj.address || 'Chưa cập nhật địa chỉ'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">
                      Bán kính: <strong className="text-indigo-600">{proj.allowedRadiusMeters || 20}m</strong>
                    </span>
                    {hasGps ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Đã setup GPS
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">Chưa có GPS</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bước 2: Bảng Điều Khiển Điểm Danh & Xác Thực Khoảng Cách 20m */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Cột Trái: Trạng thái GPS & Kiểm tra 20m */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Định Vị Thiết Bị Của Bạn</h3>
              </div>
              <button
                type="button"
                onClick={scanDeviceGps}
                disabled={gpsScanning}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 underline cursor-pointer"
              >
                {gpsScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                Quét lại GPS
              </button>
            </div>

            {/* GPS Scanning / Status Card */}
            {gpsScanning ? (
              <div className="py-8 text-center text-slate-500 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs font-medium">Đang lấy tọa độ vệ tinh GPS chính xác cao...</p>
              </div>
            ) : gpsError ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <AlertTriangle className="h-4 w-4" />
                  Không thể lấy vị trí GPS
                </div>
                <p>{gpsError}</p>
                <p className="text-[11px] text-rose-600 pt-1">
                  Vui lòng bật quyền truy cập Vị trí trên trình duyệt hoặc điện thoại để tiếp tục.
                </p>
              </div>
            ) : deviceGps ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tọa độ thiết bị:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {deviceGps.latitude.toFixed(6)}, {deviceGps.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Độ chính xác vệ tinh:</span>
                    <span className="text-emerald-600 font-medium">±{deviceGps.accuracy} mét</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-600 font-medium">Khoảng cách tới chi nhánh:</span>
                    <span className="font-bold text-sm">
                      {distanceToBranch !== null ? (
                        <span className={distanceToBranch <= allowedRadius ? 'text-emerald-600' : 'text-amber-600'}>
                          {distanceToBranch} mét {distanceToBranch <= allowedRadius ? `(≤ ${allowedRadius}m)` : `(> ${allowedRadius}m)`}
                        </span>
                      ) : (
                        '--'
                      )}
                    </span>
                  </div>
                </div>

                {/* Phân định TRONG BÁN KÍNH 20M hay NGOÀI BÁN KÍNH 20M */}
                {isWithinRadius === true ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Hợp Lệ Tại Chi Nhánh (≤ {allowedRadius}m)
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Bạn đang có mặt trong phạm vi chi nhánh <strong>{selectedProject?.name}</strong>. Bạn có thể bấm Chấm công bình thường.
                    </p>
                  </div>
                ) : isWithinRadius === false ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Ngoài Bán Kính Chi Nhánh ({distanceToBranch}m &gt; {allowedRadius}m)
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Định vị của bạn đang ở xa chi nhánh hơn {allowedRadius}m. Hệ thống yêu cầu chọn chế độ và <strong>nhập lý do công tác / làm việc ngoài</strong> để tiếp tục chấm công.
                    </p>

                    {/* Lựa chọn Chế độ: Đi công tác hoặc Vị trí khác */}
                    <div className="pt-2 border-t border-amber-200/80 space-y-2">
                      <label className="font-bold block text-[11px] text-amber-950">
                        Chọn Chế Độ Chấm Công Ngoài Chi Nhánh:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCheckInMode('BUSINESS_TRIP')}
                          className={`
                            p-2 rounded-lg text-xs font-bold transition-all text-center border cursor-pointer
                            ${checkInMode === 'BUSINESS_TRIP' 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                              : 'bg-white text-slate-700 border-amber-300 hover:bg-amber-100/50'}
                          `}
                        >
                          Đi Công Tác
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckInMode('OTHER')}
                          className={`
                            p-2 rounded-lg text-xs font-bold transition-all text-center border cursor-pointer
                            ${checkInMode === 'OTHER' 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                              : 'bg-white text-slate-700 border-amber-300 hover:bg-amber-100/50'}
                          `}
                        >
                          Vị Trí Khác
                        </button>
                      </div>

                      {/* Ô nhập Lý do bắt buộc */}
                      <div className="pt-1">
                        <label className="font-bold block text-[11px] text-amber-950 mb-1">
                          Lý do giải trình <span className="text-rose-600 font-bold">*</span>
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={remoteReason}
                          onChange={(e) => setRemoteReason(e.target.value)}
                          placeholder="Nhập lý do đi công tác hoặc làm việc ngoài chi nhánh (Bắt buộc)..."
                          className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
                        />
                        {!remoteReason.trim() && (
                          <p className="text-[10px] text-rose-600 mt-1 font-medium">
                            * Vui lòng điền lý do để mở khóa nút Chấm công.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Cột Phải: Chọn Nhân Sự & Nút Bấm Chấm Công */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Xác Nhận Nhân Sự Chấm Công</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {branchEmployees.length} nhân sự thuộc chi nhánh
                </span>
              </div>

              {/* Quick Search & Select Employee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc mã nhân viên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
                  />
                </div>

                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden bg-white text-slate-800"
                >
                  {branchEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.code} - {emp.fullName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Information Card */}
              {currentEmployee && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {currentEmployee.avatar ? (
                      <img
                        src={currentEmployee.avatar}
                        alt={currentEmployee.fullName}
                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-white shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {currentEmployee.fullName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 leading-tight truncate">
                        {currentEmployee.fullName}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {currentEmployee.code} • {currentEmployee.department}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ca làm việc: <strong className="text-slate-700">{currentEmployee.shiftName || 'Ca Chuẩn'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      isCheckedIn 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {isCheckedIn ? 'Đang trong ca' : 'Chưa vào ca'}
                    </span>
                    {currentAttendance?.checkIn && (
                      <p className="text-[11px] font-mono text-slate-500 mt-1">
                        Vào: <strong>{currentAttendance.checkIn}</strong>
                        {currentAttendance.checkOut && <> • Ra: <strong>{currentAttendance.checkOut}</strong></>}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons: Check In / Check Out */}
            <div className="pt-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleCheckIn}
                  disabled={
                    submitting ||
                    !selectedEmpId ||
                    isCheckedIn ||
                    (isWithinRadius === false && !remoteReason.trim())
                  }
                  className={`
                    h-12 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer
                    ${isCheckedIn 
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}
                  `}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      Vào Ca (Check-In)
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleCheckOut}
                  disabled={submitting || !selectedEmpId || !isCheckedIn}
                  className={`
                    h-12 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer
                    ${!isCheckedIn 
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'}
                  `}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Square className="h-4 w-4 fill-current" />
                      Tan Ca (Check-Out)
                    </>
                  )}
                </Button>
              </div>

              {/* Helper Notice */}
              {isWithinRadius === false && !remoteReason.trim() && (
                <p className="text-center text-xs text-rose-600 font-medium">
                  ⚠️ Nút Vào Ca đang khóa vì bạn ở xa chi nhánh hơn {allowedRadius}m. Vui lòng nhập lý do giải trình ở cột bên trái.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Bước 3: Danh Sách Điểm Danh Hôm Nay Tại Chi Nhánh (Admin Kiểm Tra Vị Trí & Lý Do) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Giám Sát Vị Trí & Lý Do Điểm Danh Hôm Nay
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản trị viên có thể xem khoảng cách thực tế, lý do giải trình và mở vị trí trên Google Maps
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {attendanceRecords.filter((a) => a.checkIn).length} lượt check-in hôm nay
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="pb-3 pl-1">Nhân Sự</th>
                  <th className="pb-3 text-center">Giờ Vào</th>
                  <th className="pb-3 text-center">Giờ Ra</th>
                  <th className="pb-3 text-center">Khoảng Cách GPS</th>
                  <th className="pb-3 text-center">Chế Độ & Trạng Thái</th>
                  <th className="pb-3">Lý Do Giải Trình / Ghi Chú</th>
                  <th className="pb-3 text-center">Xác Minh Vị Trí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRecords.filter((a) => a.checkIn).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <Clock className="h-6 w-6 mx-auto mb-1.5 opacity-30 text-slate-400" />
                      <p className="text-xs font-normal">Hôm nay chưa có lượt check-in nào.</p>
                    </td>
                  </tr>
                ) : (
                  attendanceRecords
                    .filter((a) => a.checkIn)
                    .map((att) => {
                      const emp = employees.find((e) => e.id === att.employeeId) || {
                        fullName: att.employeeName || 'Nhân viên',
                        code: att.employeeCode || '',
                        avatar: ''
                      }

                      const distance = att.distanceToProjectMeters
                      const isNear = distance !== null && distance !== undefined && distance <= 20
                      const hasCoords = att.checkInLatitude && att.checkInLongitude

                      return (
                        <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 pl-1">
                            <div className="flex items-center gap-2.5">
                              {emp.avatar ? (
                                <img
                                  src={emp.avatar}
                                  alt={emp.fullName}
                                  className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-100"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                  {emp.fullName?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-900 leading-tight">{emp.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.code || 'NV-BPO'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 text-center font-mono font-medium text-slate-800">
                            {att.checkIn || '--:--'}
                          </td>

                          <td className="py-3 text-center font-mono font-medium text-slate-800">
                            {att.checkOut || '--:--'}
                          </td>

                          <td className="py-3 text-center">
                            {distance !== null && distance !== undefined ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isNear 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isNear ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                Cách {distance}m
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Chưa đo GPS</span>
                            )}
                          </td>

                          <td className="py-3 text-center">
                            {isNear ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                                Tại chi nhánh (≤ 20m)
                              </span>
                            ) : att.notes?.includes('Đi công tác') ? (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                Đi công tác
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                Ngoài chi nhánh
                              </span>
                            )}
                          </td>

                          <td className="py-3 max-w-xs truncate text-[11px] text-slate-600">
                            {att.notes || <span className="text-slate-300 italic">Đúng giờ</span>}
                          </td>

                          <td className="py-3 text-center">
                            {hasCoords ? (
                              <a
                                href={`https://www.google.com/maps?q=${att.checkInLatitude},${att.checkInLongitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                              >
                                <MapPin className="h-3 w-3 text-indigo-600" />
                                Google Maps
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              <span className="text-slate-300 text-[10px]">Không có tọa độ</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
