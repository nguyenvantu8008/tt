import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { 
  Play, 
  Square, 
  Calendar, 
  Briefcase, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  History,
  Timer,
  Loader2,
  Navigation,
  Smartphone,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'
import { getCurrentGpsPosition, calcDistanceMeters, type GpsCoordinates } from '@/lib/geoUtils'
import { logClientError } from '@/lib/clientLogger'

export default function MyAttendance() {
  const [projects, setProjects] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [currentEmployee, setCurrentEmployee] = useState<any>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [note, setNote] = useState('Xử lý ca sáng trực hotline CSKH')
  
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [todayLogs, setTodayLogs] = useState<any[]>([])

  // GPS state
  const [currentGps, setCurrentGps] = useState<GpsCoordinates | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'scanning' | 'success' | 'denied' | 'error'>('idle')
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null)

  // Reason & Mode when outside 20m
  const [checkInMode, setCheckInMode] = useState<'BUSINESS_TRIP' | 'OTHER'>('BUSINESS_TRIP')
  const [remoteReason, setRemoteReason] = useState('')

  const [pastHistory, setPastHistory] = useState<any[]>([])

  // Load initial projects, employees and attendance
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [projRes, empRes, attRes] = await Promise.all([
          axios.get('/api/projects'),
          axios.get('/api/employees'),
          axios.get('/api/attendance/today'),
        ])

        setProjects(projRes.data)
        setEmployees(empRes.data)

        if (empRes.data.length > 0) {
          const userStr = localStorage.getItem('user')
          const user = userStr ? JSON.parse(userStr) : null

          let activeEmp = null
          if (user?.employeeId) {
            activeEmp = empRes.data.find((e: any) => e.id === user.employeeId)
          }
          if (!activeEmp) {
            activeEmp = empRes.data[0]
          }

          setCurrentEmployee(activeEmp)
          setSelectedProjectId(activeEmp.projectId || (projRes.data[0]?.id ?? ''))

          // Check if today already has attendance for this employee
          const myAtt = attRes.data.find((a: any) => a.employeeId === activeEmp.id)
          if (myAtt && myAtt.checkIn) {
            setIsCheckedIn(!myAtt.checkOut)
            setTodayLogs([
              { 
                id: '1', 
                time: myAtt.checkIn, 
                type: 'CHECK_IN', 
                location: myAtt.isGpsVerified ? `Vị trí GPS dự án (${myAtt.projectCode || ''})` : 'Văn phòng BPO', 
                status: myAtt.status,
                distanceMeters: myAtt.distanceToProjectMeters 
              },
              ...(myAtt.checkOut ? [{
                id: '2',
                time: myAtt.checkOut,
                type: 'CHECK_OUT',
                location: 'Văn phòng BPO',
                status: 'COMPLETED'
              }] : [])
            ])
            setElapsedSeconds(myAtt.workedHours ? Math.round(myAtt.workedHours * 3600) : 0)
          }

          // Fetch personal history
          try {
            const histRes = await axios.get(`/api/attendance/employee/${activeEmp.id}/history?limit=15`)
            setPastHistory(histRes.data)
          } catch (e) {
            console.error('Lỗi khi tải lịch sử cá nhân:', e)
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu cá nhân:', err)
      }
    }

    loadInitialData()
    refreshGpsPosition()
  }, [])

  // Quét GPS tự động khi mở trang
  const refreshGpsPosition = async () => {
    setGpsStatus('scanning')
    setGpsErrorMsg(null)
    const res = await getCurrentGpsPosition()
    if (res.coords) {
      setCurrentGps(res.coords)
      setGpsStatus('success')
    } else {
      setGpsStatus(res.errorCode === 'PERMISSION_DENIED' ? 'denied' : 'error')
      setGpsErrorMsg(res.error || 'Không bắt được GPS')
    }
  }

  // Dự án được chọn
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null
  }, [projects, selectedProjectId])

  // Khoảng cách tính toán giữa GPS của thiết bị và vị trí dự án
  const distanceToProject = useMemo(() => {
    if (!currentGps || !selectedProject?.latitude || !selectedProject?.longitude) return null
    return calcDistanceMeters(
      currentGps.latitude,
      currentGps.longitude,
      selectedProject.latitude,
      selectedProject.longitude
    )
  }, [currentGps, selectedProject])

  const isWithinGeofence = useMemo(() => {
    if (!selectedProject?.requireGps) return true
    if (distanceToProject === null) return null
    return distanceToProject <= (selectedProject.allowedRadiusMeters || 20)
  }, [selectedProject, distanceToProject])

  // Timer ticker
  useEffect(() => {
    let interval: any = null
    if (isCheckedIn) {
      interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isCheckedIn])

  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle Real Check-In / Check-Out with GPS
  const handleToggleCheckIn = async () => {
    if (!currentEmployee) {
      alert('Chưa có hồ sơ nhân sự trong hệ thống hoặc tài khoản chưa liên kết nhân sự. Vui lòng thêm nhân viên trước.')
      return
    }

    try {
      setActionLoading(true)
      setGpsErrorMsg(null)

      if (isCheckedIn) {
        // Call backend API Check-out
        const res = await axios.post('/api/attendance/check-out', {
          employeeId: currentEmployee.id
        })

        setIsCheckedIn(false)
        setTodayLogs(prev => [
          { 
            id: String(Date.now()), 
            time: res.data.time, 
            type: 'CHECK_OUT', 
            location: selectedProject?.name || 'Vị trí hiện trường', 
            status: 'COMPLETED' 
          },
          ...prev
        ])
      } else {
        // Check GPS if project requires or available
        let coords = currentGps
        if (!coords) {
          setGpsStatus('scanning')
          const gpsRes = await getCurrentGpsPosition()
          if (gpsRes.coords) {
            coords = gpsRes.coords
            setCurrentGps(coords)
            setGpsStatus('success')
          } else {
            setGpsStatus(gpsRes.errorCode === 'PERMISSION_DENIED' ? 'denied' : 'error')
            setGpsErrorMsg(gpsRes.error || 'Không thể định vị GPS')
            if (selectedProject?.requireGps) {
              await logClientError('CHECKIN_BLOCKED_NO_GPS', 'Check-in bị chặn do không có GPS', gpsRes.error)
              alert(`Chi nhánh ${selectedProject.code} yêu cầu xác thực GPS! Vui lòng bật định vị trên điện thoại.`)
              setActionLoading(false)
              return
            }
          }
        }

        // Nếu ngoài bán kính 20m, BẮT BUỘC phải nhập lý do
        if (isWithinGeofence === false && !remoteReason.trim()) {
          alert(`Bạn đang cách chi nhánh ${distanceToProject}m (vượt quá bán kính cho phép ${selectedProject?.allowedRadiusMeters || 20}m). Vui lòng chọn chế độ Đi công tác / Vị trí khác và nhập lý do giải trình!`)
          setActionLoading(false)
          return
        }

        // Call backend API Check-in
        const res = await axios.post('/api/attendance/check-in', {
          employeeId: currentEmployee.id,
          projectId: selectedProjectId || undefined,
          notes: isWithinGeofence ? note : undefined,
          checkInMode: isWithinGeofence ? 'ONSITE' : checkInMode,
          reason: isWithinGeofence ? undefined : remoteReason.trim(),
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          accuracyMeters: coords?.accuracy,
          device: navigator.userAgent.includes('Mobile') ? 'Smartphone (PWA)' : 'Web Browser Desktop'
        })

        setIsCheckedIn(true)
        setRemoteReason('')
        setTodayLogs(prev => [
          { 
            id: String(Date.now()), 
            time: res.data.time, 
            type: 'CHECK_IN', 
            location: res.data.isGpsVerified 
              ? `Tại chi nhánh (${res.data.distanceMeters ?? 0}m)` 
              : `Ngoài chi nhánh (${res.data.distanceMeters ?? 0}m)`, 
            status: res.data.status 
          },
          ...prev
        ])
      }
    } catch (err: any) {
      console.error('Lỗi khi chấm công:', err)
      const errorData = err.response?.data
      const errorMsg = errorData?.message || 'Không thể thực hiện chấm công lúc này.'
      
      // Log client-side error to backend telemetry
      await logClientError(
        errorData?.code || 'CHECKIN_API_ERROR',
        errorMsg,
        JSON.stringify(errorData || err.message)
      )

      setGpsErrorMsg(errorMsg)
      alert(errorMsg)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <AppLayout 
      title="Chấm công Cá nhân (Lưu PostgreSQL)" 
      subtitle="Bấm Check-in/Check-out lưu trực tiếp vào cơ sở dữ liệu thời gian thực"
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        
        {/* Main Clocking Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 lg:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Live Clock & Action */}
            <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200/60 rounded-full text-xs font-semibold text-emerald-700 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isCheckedIn ? 'bg-emerald-400' : 'bg-slate-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isCheckedIn ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                </span>
                {isCheckedIn ? 'Đang trong ca làm việc' : 'Đang tạm dừng / Chưa check-in'}
              </div>

              <div className="font-mono text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-2">
                {formatElapsedTime(elapsedSeconds)}
              </div>

              <p className="text-sm text-slate-500 mb-6 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Nhân sự: <strong className="text-slate-800 font-semibold">{currentEmployee?.fullName || (employees.length === 0 ? 'Chưa có nhân sự trong CSDL' : 'Chưa liên kết nhân sự')}</strong> ({currentEmployee?.code || 'N/A'})
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  size="lg"
                  onClick={handleToggleCheckIn}
                  disabled={actionLoading}
                  className={`
                    h-13 px-8 text-base font-semibold rounded-xl shadow-md transition-all flex items-center gap-3
                    ${isCheckedIn 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'}
                  `}
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isCheckedIn ? (
                    <>
                      <Square className="h-5 w-5 fill-current" />
                      Check-out (Tan ca)
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 fill-current" />
                      Check-in (Vào ca)
                    </>
                  )}
                </Button>

                <div className="text-left text-xs text-slate-500 hidden sm:block">
                  <p className="font-medium text-slate-700">Ca làm việc:</p>
                  <p className="text-blue-600 font-semibold">{currentEmployee?.shiftName || 'Ca Hành Chính (08:00 - 17:00)'}</p>
                </div>
              </div>
            </div>

            {/* Right: Project & Task Inputs */}
            <div className="lg:col-span-6 bg-slate-50/70 border border-slate-200/60 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Dự án & Nội dung công việc (Lưu CSDL)
              </h3>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Chọn Dự án BPO</label>
                <div className="grid grid-cols-2 gap-2">
                  {projects.map(proj => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`
                        p-2.5 rounded-lg border text-left text-xs font-medium transition-all flex items-center gap-2
                        ${selectedProjectId === proj.id 
                          ? 'border-blue-600 bg-white shadow-xs text-slate-900 ring-1 ring-blue-600' 
                          : 'border-slate-200 bg-white/50 text-slate-600 hover:bg-white'}
                      `}
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                      <span className="truncate">{proj.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Ghi chú công việc hôm nay</label>
                <input 
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập task hoặc ghi chú..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Navigation className={`h-3.5 w-3.5 ${gpsStatus === 'success' ? 'text-emerald-500 animate-pulse' : gpsStatus === 'scanning' ? 'text-blue-500 animate-spin' : 'text-amber-500'}`} />
                    Tọa độ GPS hiện tại:
                  </span>
                  <button 
                    type="button" 
                    onClick={refreshGpsPosition}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold underline cursor-pointer"
                  >
                    Quét lại GPS
                  </button>
                </div>

                {gpsStatus === 'scanning' && (
                  <p className="text-[11px] text-blue-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Đang lấy tọa độ vệ tinh GPS chính xác cao...
                  </p>
                )}

                {gpsStatus === 'success' && currentGps && (
                  <div className="bg-white/80 rounded-lg p-2.5 border border-slate-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tọa độ:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {currentGps.latitude.toFixed(6)}, {currentGps.longitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Độ chính xác vệ tinh:</span>
                      <span className="text-emerald-600 font-medium">±{currentGps.accuracy} mét</span>
                    </div>
                    {distanceToProject !== null && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-600 font-medium">Khoảng cách tới {selectedProject?.code}:</span>
                        <span className={`font-bold ${isWithinGeofence ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {distanceToProject} m / Bán kính {selectedProject?.allowedRadiusMeters || 20}m
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {gpsStatus === 'denied' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block">Quyền vị trí bị từ chối</strong>
                      Nhấp vào biểu tượng 🔒 cạnh thanh địa chỉ URL và chọn "Cho phép truy cập Vị trí".
                    </div>
                  </div>
                )}

                {gpsErrorMsg && gpsStatus !== 'denied' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-[11px] text-rose-700">
                    {gpsErrorMsg}
                  </div>
                )}

                {selectedProject?.requireGps && (
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                      Dự án yêu cầu GPS Geofencing (≤ {selectedProject?.allowedRadiusMeters || 20}m)
                    </span>
                    {isWithinGeofence === true && (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        Hợp lệ trong bán kính
                      </span>
                    )}
                    {isWithinGeofence === false && (
                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                        Ngoài bán kính ({distanceToProject}m)
                      </span>
                    )}
                  </div>
                )}

                {/* Khi ở ngoài bán kính 20m: Bắt buộc chọn Chế độ và nhập Lý do */}
                {!isCheckedIn && isWithinGeofence === false && distanceToProject !== null && (
                  <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 space-y-2.5 mt-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          Vị trí cách chi nhánh {distanceToProject}m (&gt; {selectedProject?.allowedRadiusMeters || 20}m)
                        </p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          Chế độ chuyển sang <strong>Đi công tác</strong> hoặc <strong>Vị trí khác</strong>. Vui lòng nhập lý do giải trình để Admin xem xét:
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCheckInMode('BUSINESS_TRIP')}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                          checkInMode === 'BUSINESS_TRIP'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        🚗 Đi công tác
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckInMode('OTHER')}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                          checkInMode === 'OTHER'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        📍 Vị trí khác
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Lý do giải trình <span className="text-rose-500">* (Bắt buộc)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={remoteReason}
                        onChange={(e) => setRemoteReason(e.target.value)}
                        placeholder="VD: Làm việc tại văn phòng đối tác, công tác tỉnh, giao dịch bên ngoài..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PWA Mobile Shortcut Card */}
        <div className="bg-linear-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-700/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Smartphone className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                Dùng BPOTime như App di động trên điện thoại (PWA)
                <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-500/30 border border-indigo-400/30 px-2 py-0.5 rounded-full text-indigo-200">
                  Hướng 1: Điểm danh tự chủ
                </span>
              </h4>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Mở Safari / Chrome trên điện thoại ➔ Bấm nút <strong className="text-white font-semibold">Chia sẻ (Share)</strong> ➔ Chọn <strong className="text-white font-semibold">"Thêm vào Màn hình chính" (Add to Home Screen)</strong> để điểm danh 1 chạm như App cài đặt.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-xs font-semibold px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl cursor-default text-indigo-100 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Tự động ghi Log lỗi GPS
          </div>
        </div>

        {/* Weekly Stats Bento Grid - Derived from PostgreSQL History */}
        {(() => {
          const totalWorkedPastHours = pastHistory.reduce((acc, h) => acc + (h.workedHours || 0), 0)
          const currentSessionHours = elapsedSeconds / 3600
          const totalAccumHours = (totalWorkedPastHours + currentSessionHours).toFixed(1)
          
          const validRecords = pastHistory.filter(h => h.status)
          const onTimeRecords = validRecords.filter(h => h.status === 'ON_TIME' || h.status === 'COMPLETED')
          const onTimeRate = validRecords.length > 0 ? Math.round((onTimeRecords.length / validRecords.length) * 100) : 100

          const totalOtHours = pastHistory.reduce((acc, h) => acc + (h.otHours || 0), 0).toFixed(1)
          const remainingLeaveDays = (currentEmployee?.leaveBalance ?? 12).toFixed(1)

          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Tổng giờ làm tích lũy</span>
                  <Timer className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{totalAccumHours}h</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">Từ lịch sử điểm danh CSDL</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Tỷ lệ Đúng giờ</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{onTimeRate}%</p>
                <p className="text-[11px] text-slate-500 mt-1">{onTimeRecords.length}/{validRecords.length || 1} ca đúng giờ</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Tăng ca (OT) tích lũy</span>
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-amber-600">{totalOtHours}h</p>
                <p className="text-[11px] text-slate-500 mt-1">Hệ số tính từ ca làm</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Phép năm còn lại</span>
                  <AlertCircle className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold text-indigo-600">{remainingLeaveDays} ngày</p>
                <p className="text-[11px] text-slate-500 mt-1">Theo hồ sơ nhân sự</p>
              </div>
            </div>
          )
        })()}

        {/* Punch Logs Timeline */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              Lịch sử Check-in / Check-out trong ngày (Lưu DB)
            </h3>
            <span className="text-xs text-slate-500">Dữ liệu thời gian thực được đồng bộ từ PostgreSQL</span>
          </div>

          <div className="divide-y divide-slate-100">
            {todayLogs.length === 0 ? (
              <p className="py-4 text-xs text-slate-400 italic text-center">Hôm nay bạn chưa ghi nhận lượt Check-in nào.</p>
            ) : (
              todayLogs.map(log => (
                <div key={log.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`
                      h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs
                      ${log.type === 'CHECK_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}
                    `}>
                      {log.type === 'CHECK_IN' ? 'VÀO' : 'RA'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {log.type === 'CHECK_IN' ? 'Check-in thành công' : 'Check-out hoàn tất'}
                      </p>
                      <p className="text-[11px] text-slate-500">{log.location}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-slate-800">{log.time}</p>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Hợp lệ</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Past Days Attendance History Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Lịch sử các ngày công đã qua (Database PostgreSQL)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Danh sách các ca làm việc và dữ liệu chấm công thực tế của bạn</p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              {pastHistory.length} ngày gần nhất
            </span>
          </div>

          {pastHistory.length === 0 ? (
            <p className="py-8 text-xs text-slate-400 italic text-center">Chưa có dữ liệu chấm công các ngày trước.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Ngày</th>
                    <th className="py-2.5 px-3">Ca / Dự án</th>
                    <th className="py-2.5 px-3 text-center">Giờ Vào</th>
                    <th className="py-2.5 px-3 text-center">Giờ Ra</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-2 text-center">Giờ làm</th>
                    <th className="py-2.5 px-2 text-center">Giờ OT</th>
                    <th className="py-2.5 px-3">Xác thực GPS</th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastHistory.map(hist => (
                    <tr key={hist.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                        {hist.date}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="font-medium text-slate-800">{hist.projectCode || 'BPO'}</span>
                        <span className="text-[10px] text-slate-400 block">{hist.shiftName || 'Ca Hành Chính'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium">
                        {hist.checkIn ? (
                          <span className={hist.status === 'LATE' ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                            {hist.checkIn}
                          </span>
                        ) : (
                          <span className="text-slate-300">--:--</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                        {hist.checkOut || <span className="text-slate-300">--:--</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {hist.status === 'PRESENT' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Có mặt
                          </span>
                        )}
                        {hist.status === 'LATE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Đi muộn
                          </span>
                        )}
                        {hist.status === 'LEAVE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Nghỉ phép
                          </span>
                        )}
                        {hist.status === 'ABSENT' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Vắng mặt
                          </span>
                        )}
                        {!['PRESENT', 'LATE', 'LEAVE', 'ABSENT'].includes(hist.status) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                            {hist.status}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-700">
                        {hist.workedHours}h
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        {hist.otHours > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[10px]">
                            +{hist.otHours}h
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">
                        {hist.isGpsVerified ? (
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            GPS chuẩn
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {hist.checkInDevice || 'Portal'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 max-w-[160px] truncate" title={hist.notes || ''}>
                        {hist.notes || <span className="text-slate-300 italic">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
