import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminLayout from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Lock, 
  ShieldCheck, 
  Coins, 
  FileSpreadsheet, 
  Loader2,
  CalendarDays,
  UserCheck,
  X,
  Eye,
  Building2,
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react'
import { exportPayrollToExcel } from '@/lib/excelExport'

export default function PayrollWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const periodCode = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  // Preview / Calculation Data from Backend
  const [payrollData, setPayrollData] = useState<any>(null)
  const [status, setStatus] = useState<'Draft' | 'Calculated' | 'Approved' | 'Locked'>('Draft')

  // Breakdown Modal state
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false)
  const [selectedEmpBreakdown, setSelectedEmpBreakdown] = useState<any>(null)

  // Step 4 filter
  const [anomalyFilter, setAnomalyFilter] = useState<'ALL' | 'ANOMALY' | 'UNCONFIGURED'>('ALL')

  const steps = [
    { num: 1, title: 'Rà soát Bảng công' },
    { num: 2, title: 'Thẩm định Tăng ca' },
    { num: 3, title: 'Tính toán Lương' },
    { num: 4, title: 'Phát hiện Dị thường' },
    { num: 5, title: 'Ban Lãnh đạo Duyệt' },
    { num: 6, title: 'Lập Lệnh Thanh toán' },
    { num: 7, title: 'Khóa Kỳ Lương' }
  ]

  const fetchPayrollPreview = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`/api/payroll/${periodCode}/preview`)
      setPayrollData(res.data)
      setStatus(res.data.status || 'Draft')
    } catch (err: any) {
      console.error('Lỗi nạp dữ liệu kỳ lương:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayrollPreview()
  }, [selectedMonth, selectedYear])

  // Chốt tính lương & Lưu snapshot
  const handleCalculateAndSnapshot = async () => {
    try {
      setCalculating(true)
      const res = await axios.post(`/api/payroll/${periodCode}/calculate`)
      alert(res.data.message || 'Đã tính toán và lưu snapshot kỳ lương thành công!')
      await fetchPayrollPreview()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi tính toán kỳ lương.'
      alert(msg)
    } finally {
      setCalculating(false)
    }
  }

  // Phê duyệt kỳ lương
  const handleApprove = async () => {
    try {
      const res = await axios.post(`/api/payroll/${periodCode}/approve`)
      alert(res.data.message || 'Đã phê duyệt kỳ lương!')
      setStatus('Approved')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi phê duyệt.')
    }
  }

  // Khóa sổ vĩnh viễn
  const handleLock = async () => {
    const confirmLock = window.confirm(
      `CẢNH BÁO BẢO MẬT & KIỂM TOÁN:\n\nBạn có chắc chắn muốn KHÓA SỔ VĨNH VIỄN kỳ lương ${periodCode}?\n\nSau khi khóa, hệ thống sẽ đóng băng chống sửa đổi toàn bộ công và tiền lương của kỳ này.`
    )
    if (!confirmLock) return

    try {
      const res = await axios.post(`/api/payroll/${periodCode}/lock`)
      alert(res.data.message || 'Đã khóa sổ kỳ lương thành công!')
      setStatus('Locked')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi khóa sổ.')
    }
  }

  // Mở modal breakdown
  const openBreakdown = (item: any) => {
    let parsedLines = item.breakdownLines || []
    if ((!parsedLines || parsedLines.length === 0) && item.breakdownJson) {
      try {
        parsedLines = JSON.parse(item.breakdownJson)
      } catch {
        parsedLines = [item.breakdownJson]
      }
    }
    setSelectedEmpBreakdown({ ...item, breakdownLines: parsedLines })
    setBreakdownModalOpen(true)
  }

  const items: any[] = payrollData?.items || []
  const isLocked = status === 'Locked'
  const isApproved = status === 'Approved' || isLocked

  // Filtered items for Step 4
  const displayedItems = items.filter(item => {
    if (anomalyFilter === 'ANOMALY') return item.isAnomaly
    if (anomalyFilter === 'UNCONFIGURED') return !item.salaryPolicyId
    return true
  })

  // Format Helper for Salary Product Unit
  const formatProductUnit = (item: any) => {
    switch (item.salaryType) {
      case 'Hourly':
      case 1:
        return `${item.workedHours?.toFixed(1) || 0} giờ`
      case 'DailyAttendance':
      case 2:
        return `${item.attendanceUnits?.toFixed(2) || 0} công`
      case 'DailyCalendar':
      case 3:
        return `${item.validWorkDays || 0} ngày`
      case 'Monthly':
      case 4:
        return item.attendanceUnits >= item.standardWorkDaysPerMonth 
          ? '1.0 tháng (đủ công)' 
          : `${item.attendanceUnits?.toFixed(1)}/${item.standardWorkDaysPerMonth} công`
      default:
        return `${item.workedHours || 0}h`
    }
  }

  // Format Helper for Salary Type Badge
  const renderSalaryTypeBadge = (salaryType: any) => {
    const typeStr = String(salaryType)
    if (typeStr === 'Hourly' || typeStr === '1') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">Theo giờ</span>
    }
    if (typeStr === 'DailyAttendance' || typeStr === '2') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">Theo công</span>
    }
    if (typeStr === 'DailyCalendar' || typeStr === '3') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">Theo ngày</span>
    }
    if (typeStr === 'Monthly' || typeStr === '4') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Theo tháng</span>
    }
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">Chưa cấu hình</span>
  }

  return (
    <AdminLayout 
      title="Payroll Calculation Wizard" 
      subtitle="Quy trình 7 bước tính lương đa phương thức (Giờ / Công / Ngày / Tháng), kiểm soát dị thường và đóng sổ kỳ lương"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Top Control Bar: Period Selector & Status Badge */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
              <CalendarDays className="h-4 w-4 text-indigo-600 ml-2" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m < 10 ? `0${m}` : m}</option>
                ))}
              </select>
              <span className="text-slate-400">/</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer pr-2"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-2">
              {status === 'Locked' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                  <Lock className="h-3.5 w-3.5" />
                  KỲ LƯƠNG ĐÃ KHÓA (LOCKED)
                </span>
              ) : status === 'Approved' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  ĐÃ PHÊ DUYỆT (APPROVED)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Calculator className="h-3.5 w-3.5" />
                  ĐANG RÀ SOÁT / TÍNH TOÁN
                </span>
              )}
            </div>
          </div>

          {/* Quick 4-method counts */}
          {payrollData && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100">
                Công: <strong>{payrollData.dailyAttendanceCount || 0}</strong>
              </span>
              <span className="px-2 py-1 rounded-xl bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100">
                Giờ: <strong>{payrollData.hourlyCount || 0}</strong>
              </span>
              <span className="px-2 py-1 rounded-xl bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-100">
                Ngày: <strong>{payrollData.dailyCalendarCount || 0}</strong>
              </span>
              <span className="px-2 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                Tháng: <strong>{payrollData.monthlyCount || 0}</strong>
              </span>
              {payrollData.unconfiguredCount > 0 && (
                <span className="px-2 py-1 rounded-xl bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200 animate-pulse">
                  Chưa gán: <strong>{payrollData.unconfiguredCount}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stepper Bar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] gap-2">
            {steps.map(step => {
              const isPast = currentStep > step.num
              const isCurrent = currentStep === step.num
              return (
                <div key={step.num} className="flex-1 flex flex-col items-center text-center relative">
                  <button
                    onClick={() => setCurrentStep(step.num)}
                    className={`
                      h-9 w-9 rounded-full flex items-center justify-center text-xs font-black transition-all cursor-pointer mb-1.5
                      ${isCurrent 
                        ? 'bg-indigo-600 text-white shadow-md ring-4 ring-indigo-50' 
                        : isPast 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-100 text-slate-400'}
                    `}
                  >
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                  </button>
                  <span className={`text-[11px] font-bold ${isCurrent ? 'text-indigo-700' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          
          {/* Header Step Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Bước {currentStep} / 7
              </span>
              <h2 className="text-lg font-black text-slate-900">
                {steps[currentStep - 1].title}
              </h2>
            </div>

            {/* Quick KPI for Current Step */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400 block">Tổng quỹ lương Net</span>
                <span className="text-base font-black text-indigo-600 font-mono">
                  {Number(payrollData?.totalNetPay || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="text-right pl-4 border-l border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 block">Cảnh báo dị thường</span>
                <span className={`text-base font-black font-mono ${payrollData?.anomaliesCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {payrollData?.anomaliesCount || 0} trường hợp
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-semibold">Đang nạp dữ liệu kỳ lương từ máy chủ...</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* STEP 1: RÀ SOÁT BẢNG CÔNG & LOẠI LƯƠNG */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 leading-relaxed flex items-start gap-3">
                    <CalendarDays className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Quy tắc rà soát bảng công:</strong> Hệ thống tự động bóc tách số giờ làm, số công, số ngày hợp lệ theo từng chính sách lương (Theo giờ, Theo công, Theo ngày, Theo tháng). Vui lòng kiểm tra kỹ sản lượng trước khi tính toán.
                    </div>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-bold block">Theo công</span>
                      <span className="text-lg font-black text-blue-700">{payrollData?.dailyAttendanceCount || 0} nhân sự</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-bold block">Theo giờ</span>
                      <span className="text-lg font-black text-amber-700">{payrollData?.hourlyCount || 0} nhân sự</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-bold block">Theo ngày</span>
                      <span className="text-lg font-black text-purple-700">{payrollData?.dailyCalendarCount || 0} nhân sự</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-bold block">Theo tháng</span>
                      <span className="text-lg font-black text-emerald-700">{payrollData?.monthlyCount || 0} nhân sự</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: THẨM ĐỊNH TĂNG CA */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Cơ chế quy đổi đơn giá tăng ca (OT):</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        <li><strong>Theo giờ:</strong> Đơn giá OT gốc = Hourly Rate.</li>
                        <li><strong>Theo công:</strong> Đơn giá OT gốc = Daily Rate / 8h chuẩn.</li>
                        <li><strong>Theo ngày:</strong> Đơn giá OT gốc = Daily Calendar Rate / 8h chuẩn.</li>
                        <li><strong>Theo tháng:</strong> Đơn giá OT gốc = Monthly Salary / 26 công / 8h chuẩn.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: TÍNH TOÁN LƯƠNG & CHỐT SNAPSHOT */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                    <div>
                      <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                        Hệ thống Tính Lương Hợp Nhất (Unified Engine)
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Bấm <strong>"Chốt Tính Lương & Lưu Snapshot"</strong> để ghi nhận dữ liệu chính thức vào cơ sở dữ liệu.
                      </p>
                    </div>

                    <Button
                      onClick={handleCalculateAndSnapshot}
                      disabled={calculating || isLocked}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      {calculating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          Đang tính toán...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4 mr-1.5" />
                          Chốt Tính Lương & Lưu Snapshot
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: PHÁT HIỆN DỊ THƯỜNG */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Kiểm soát chất lượng kỳ lương:</strong> Phát hiện {payrollData?.anomaliesCount || 0} trường hợp bất thường (Lương &le; 0, Tăng ca &gt; 40h, hoặc chưa có chính sách lương).
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAnomalyFilter('ALL')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                        anomalyFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Tất cả ({items.length})
                    </button>
                    <button
                      onClick={() => setAnomalyFilter('ANOMALY')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                        anomalyFilter === 'ANOMALY' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Dị thường ({payrollData?.anomaliesCount || 0})
                    </button>
                    {payrollData?.unconfiguredCount > 0 && (
                      <button
                        onClick={() => setAnomalyFilter('UNCONFIGURED')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                          anomalyFilter === 'UNCONFIGURED' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Chưa cấu hình ({payrollData.unconfiguredCount})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: BAN LÃNH ĐẠO DUYỆT */}
              {currentStep === 5 && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Thẩm định & Phê duyệt Ban Giám Đốc</h3>
                      <p className="text-xs text-slate-500">Kỳ lương: {periodCode} | Tổng quỹ chi trả: {Number(payrollData?.totalNetPay || 0).toLocaleString('vi-VN')} đ</p>
                    </div>
                    <Button
                      onClick={handleApprove}
                      disabled={isApproved || isLocked}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4 mr-1.5" />
                      {isApproved ? 'ĐÃ PHÊ DUYỆT THÀNH CÔNG' : 'XÁC NHẬN PHÊ DUYỆT'}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 6: LẬP LỆNH THANH TOÁN */}
              {currentStep === 6 && (
                <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-indigo-950">Xuất Bảng Lương & Lệnh Chi Tiền Ngân Hàng</h3>
                    <p className="text-xs text-slate-600">Hỗ trợ xuất bảng thanh toán lương đa phương thức chuẩn định dạng Excel.</p>
                  </div>
                  <Button
                    onClick={() => exportPayrollToExcel(periodCode, items)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                    Xuất File Excel Bảng Lương
                  </Button>
                </div>
              )}

              {/* STEP 7: KHÓA SỔ KỲ LƯƠNG */}
              {currentStep === 7 && (
                <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4">
                  <div className="flex items-center gap-2 text-sm font-black text-amber-400">
                    <Lock className="h-5 w-5" />
                    <span>ĐÓNG BĂNG VÀ KHÓA SỔ KỲ LƯƠNG VĨNH VIỄN (LOCKED)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    Khi kỳ lương đã khóa, hệ thống sẽ cấm mọi thao tác sửa đổi giờ công, ngày làm, tăng ca hoặc đơn giá lương của kỳ này. Mọi thay đổi phát sinh sau này bắt buộc phải xử lý qua nghiệp vụ <strong>Điều chỉnh lương (Payroll Adjustment)</strong> để đảm bảo tính toàn vẹn kiểm toán.
                  </p>
                  <Button
                    onClick={handleLock}
                    disabled={isLocked}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    {isLocked ? 'ĐÃ KHÓA SỔ VĨNH VIỄN' : 'XÁC NHẬN KHÓA SỔ KỲ LƯƠNG'}
                  </Button>
                </div>
              )}

              {/* MAIN DATA TABLE: Universal for all steps */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Mã NV</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Loại lương</th>
                      <th className="py-2.5 px-3 text-right">Sản lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th className="py-2.5 px-3 text-right">Lương cơ bản</th>
                      <th className="py-2.5 px-3 text-right">OT Pay</th>
                      <th className="py-2.5 px-3 text-right">BHXH trừ</th>
                      <th className="py-2.5 px-3 text-right font-black text-indigo-700">Thực lĩnh (Net)</th>
                      <th className="py-2.5 px-3 text-center">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedItems.map(p => (
                      <tr 
                        key={p.employeeId} 
                        onClick={() => openBreakdown(p)}
                        className={`hover:bg-indigo-50/20 cursor-pointer transition-colors ${p.isAnomaly ? 'bg-rose-50/25' : ''}`}
                      >
                        <td className="py-2 px-3 font-mono font-bold text-indigo-600">{p.employeeCode}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          <div>{p.employeeName}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{p.department}</span>
                        </td>
                        <td className="py-2 px-3">
                          {renderSalaryTypeBadge(p.salaryType)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {formatProductUnit(p)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {Number(p.rateUnit || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {Number(p.basePay || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-700">
                          {p.otPay > 0 ? `+${Number(p.otPay).toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">
                          -{Number(p.insuranceDeduction || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-indigo-700 text-sm">
                          {Number(p.netPay || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openBreakdown(p)
                            }}
                            className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                            title="Xem giải trình công thức"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Stepper Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Bước trước
            </Button>

            <Button
              size="sm"
              onClick={() => setCurrentStep(prev => Math.min(7, prev + 1))}
              disabled={currentStep === 7}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
            >
              Tiếp theo
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>

        </div>

        {/* MODAL PAYROLL BREAKDOWN (Giải trình chi tiết từng phép tính) */}
        {breakdownModalOpen && selectedEmpBreakdown && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Giải trình Chi tiết Lương (Payroll Breakdown)</h3>
                    <p className="text-xs text-slate-500">
                      Nhân viên: <strong>{selectedEmpBreakdown.employeeCode} - {selectedEmpBreakdown.employeeName}</strong>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setBreakdownModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Breakdown Cards */}
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-slate-500">Phương thức tính lương:</span>
                  <div className="font-bold text-slate-900">
                    {renderSalaryTypeBadge(selectedEmpBreakdown.salaryType)}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-slate-500">Đơn giá cơ bản:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {Number(selectedEmpBreakdown.rateUnit || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* Arithmetic Steps from Backend Engine */}
                <div className="p-4 rounded-2xl bg-linear-to-br from-indigo-50/50 to-slate-50 border border-indigo-100 space-y-2">
                  <h4 className="text-[11px] font-black uppercase text-indigo-900 tracking-wide">
                    Các bước tính toán hệ thống:
                  </h4>
                  <div className="space-y-1.5 font-mono text-xs">
                    {(selectedEmpBreakdown.breakdownLines || []).map((line: string, i: number) => (
                      <div key={i} className={`p-1.5 rounded-lg ${line.includes('NET') || line.includes('GROSS') ? 'bg-indigo-100/70 font-black text-indigo-950' : 'text-slate-700'}`}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedEmpBreakdown.isAnomaly && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Lý do cảnh báo: <strong>{selectedEmpBreakdown.anomalyReason}</strong></span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 text-right">
                <Button 
                  size="sm" 
                  onClick={() => setBreakdownModalOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  Đã hiểu
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
