import { useState, useEffect } from 'react'
import axios from 'axios'
import EmployeeLayout from '@/components/layout/EmployeeLayout'
import { useAuth } from '@/lib/authContext'
import { getCurrentGpsPosition, calcDistanceMeters, type GpsCoordinates } from '@/lib/geoUtils'
import { 
  Navigation, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Briefcase, 
  Loader2, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'

export default function EmployeePunch() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [employee, setEmployee] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [attendance, setAttendance] = useState<any>(null)

  // GPS state
  const [gps, setGps] = useState<GpsCoordinates | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Outside 20m state
  const [checkInMode, setCheckInMode] = useState<'BUSINESS_TRIP' | 'OTHER'>('BUSINESS_TRIP')
  const [reason, setReason] = useState('')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  const loadData = async () => {
    try {
      setLoading(true)
      const [empRes, projRes, attRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/projects'),
        axios.get(`/api/attendance/daily?date=${todayStr}`)
      ])

      const allEmps = empRes.data || []
      const currentEmp = user?.employeeId 
        ? allEmps.find((e: any) => e.id === user.employeeId) 
        : (allEmps[0] || null)

      setEmployee(currentEmp)

      if (currentEmp) {
        const assignedProj = projRes.data?.find((p: any) => p.id === currentEmp.projectId) || projRes.data?.[0]
        setProject(assignedProj || null)

        const myAtt = attRes.data?.find((a: any) => a.employeeId === currentEmp.id)
        setAttendance(myAtt || null)
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu chấm công:', err)
    } finally {
      setLoading(false)
    }
  }

  const scanGps = async () => {
    setGpsLoading(true)
    setGpsError(null)
    const result = await getCurrentGpsPosition()
    if (result.coords) {
      setGps(result.coords)
    } else {
      setGpsError(result.error || 'Không thể lấy định vị GPS. Vui lòng cấp quyền truy cập vị trí trên trình duyệt.')
    }
    setGpsLoading(false)
  }

  useEffect(() => {
    loadData()
    scanGps()
  }, [user])

  // Compute distance
  let distanceMeters: number | null = null
  if (gps && project?.latitude && project?.longitude) {
    distanceMeters = Math.round(calcDistanceMeters(gps.latitude, gps.longitude, project.latitude, project.longitude))
  }

  const allowedRadius = project?.allowedRadiusMeters || 20
  const isWithinRadius = distanceMeters !== null && distanceMeters <= allowedRadius
  const isOutsideRadius = distanceMeters !== null && distanceMeters > allowedRadius

  const isCheckedIn = !!attendance?.checkIn
  const isCheckedOut = !!attendance?.checkOut

  const handlePunch = async () => {
    if (!employee) return
    setActionSuccess(null)

    // Validation for check-in outside 20m
    if (!isCheckedIn && isOutsideRadius && !reason.trim()) {
      alert(`Bạn đang cách chi nhánh ${distanceMeters}m (vượt quá bán kính ${allowedRadius}m). Vui lòng nhập lý do giải trình để chấm công!`)
      return
    }

    try {
      setSubmitting(true)

      if (!isCheckedIn) {
        // PUNCH IN
        const res = await axios.post('/api/attendance/check-in', {
          employeeId: employee.id,
          projectId: project?.id || employee.projectId,
          notes: isOutsideRadius ? `[${checkInMode === 'BUSINESS_TRIP' ? 'Đi công tác' : 'Vị trí khác'} - Cách ${distanceMeters}m] ${reason.trim()}` : 'Đúng giờ tại chi nhánh',
          latitude: gps?.latitude,
          longitude: gps?.longitude,
          device: 'Mobile PWA',
          checkInMode: isOutsideRadius ? checkInMode : undefined,
          reason: isOutsideRadius ? reason.trim() : undefined
        })
        setActionSuccess('Chấm công vào (Check-in) thành công!')
      } else {
        // PUNCH OUT
        const res = await axios.post('/api/attendance/check-out', {
          employeeId: employee.id
        })
        setActionSuccess('Chấm công ra (Check-out) thành công! Ca làm việc đã hoàn thành.')
      }

      await loadData()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi chấm công. Vui lòng thử lại.'
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <EmployeeLayout title="Chấm Công Hiện Trường" subtitle="Định vị GPS Geofence xác thực vị trí tự động">
      <div className="space-y-4">
        
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Project & Geofence Status Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chi nhánh làm việc</span>
            <span 
              className="px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: `${project?.color || '#2563EB'}15`, color: project?.color || '#2563EB' }}
            >
              {project?.code || 'Dự án BPO'}
            </span>
          </div>

          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-snug">{project?.name || 'Văn phòng Chi nhánh'}</h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{project?.address || 'Địa chỉ đang cập nhật'}</span>
            </p>
          </div>

          {/* GPS Radar Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Navigation className={`h-4 w-4 ${gpsLoading ? 'text-indigo-600 animate-spin' : isWithinRadius ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span>Trạng thái Radar GPS:</span>
              </span>
              <button
                type="button"
                onClick={scanGps}
                disabled={gpsLoading}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                Quét lại GPS
              </button>
            </div>

            {gps ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Khoảng cách tới chi nhánh:</span>
                  <span className={`font-mono font-extrabold ${isWithinRadius ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {distanceMeters !== null ? `${distanceMeters} mét` : 'Chưa xác định'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  {isWithinRadius ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Hợp lệ (Trong bán kính quy định ≤ {allowedRadius}m)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Ngoài bán kính &gt; {allowedRadius}m (Cần giải trình)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-rose-600 flex items-center gap-1.5 py-1 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{gpsError || 'Đang dò sóng vệ tinh GPS...'}</span>
              </div>
            )}
          </div>

          {/* Form Giải Trình khi Check-in ngoài bán kính */}
          {!isCheckedIn && isOutsideRadius && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Giải trình dập thẻ xa chi nhánh ({distanceMeters}m &gt; {allowedRadius}m)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCheckInMode('BUSINESS_TRIP')}
                  className={`py-2 px-3 rounded-xl border transition-all cursor-pointer ${
                    checkInMode === 'BUSINESS_TRIP' 
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  🚗 Đi công tác
                </button>
                <button
                  type="button"
                  onClick={() => setCheckInMode('OTHER')}
                  className={`py-2 px-3 rounded-xl border transition-all cursor-pointer ${
                    checkInMode === 'OTHER' 
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  📍 Vị trí khác
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lý do giải trình (Bắt buộc để Admin duyệt) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Gặp khách hàng tại đối tác, kiểm tra tiến độ hiện trường..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Primary Punch Button Card (The Single Big Action) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs text-center space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isCheckedOut 
                ? 'Ca làm việc hôm nay đã kết thúc' 
                : isCheckedIn 
                  ? 'Bạn đang trong ca làm việc' 
                  : 'Sẵn sàng bắt đầu ca'}
            </span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {attendance?.checkIn ? `Giờ vào: ${attendance.checkIn}` : 'Chưa điểm danh vào'}
            </div>
          </div>

          <button
            onClick={handlePunch}
            disabled={submitting || isCheckedOut}
            className={`
              w-full py-5 px-6 rounded-3xl font-extrabold text-base flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 cursor-pointer
              ${isCheckedOut
                ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed'
                : isCheckedIn
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/30'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/35'}
            `}
          >
            {submitting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Đang xử lý dập thẻ...</span>
              </>
            ) : isCheckedOut ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <span>ĐÃ HOÀN THÀNH CA LÀM VIỆC</span>
              </>
            ) : isCheckedIn ? (
              <>
                <Clock className="h-6 w-6" />
                <span>CHẤM CÔNG RA (TAN CA)</span>
              </>
            ) : (
              <>
                <Clock className="h-6 w-6" />
                <span>CHẤM CÔNG VÀO (VÀO CA)</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400">
            Hệ thống tự động lưu trữ tọa độ GPS và thiết bị vào CSDL PostgreSQL phục vụ tính lương.
          </p>
        </div>

      </div>
    </EmployeeLayout>
  )
}
