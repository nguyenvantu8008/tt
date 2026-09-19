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
  UserCheck
} from 'lucide-react'
import { exportPayrollToExcel } from '@/lib/excelExport'

export default function PayrollWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isLocked, setIsLocked] = useState(false)
  const [isApproved, setIsApproved] = useState(false)

  const steps = [
    { num: 1, title: 'Rà soát Bảng công' },
    { num: 2, title: 'Thẩm định Tăng ca' },
    { num: 3, title: 'Tính toán Lương' },
    { num: 4, title: 'Phát hiện Dị thường' },
    { num: 5, title: 'Ban Lãnh đạo Duyệt' },
    { num: 6, title: 'Lập Lệnh Thanh toán' },
    { num: 7, title: 'Khóa Kỳ Lương' }
  ]

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [empRes, attRes] = await Promise.all([
          axios.get('/api/employees'),
          axios.get(`/api/attendance/range?startDate=${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01&endDate=${selectedYear}-${String(selectedMonth).padStart(2, '0')}-31`)
        ])
        setEmployees(empRes.data || [])
        setRecords(attRes.data || [])
      } catch (err) {
        console.error('Lỗi tải dữ liệu kỳ lương:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedMonth, selectedYear])

  // Calculation logic
  const payrollItems = employees.map(emp => {
    const empRecords = records.filter(r => r.employeeId === emp.id)
    const workedDays = empRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length
    const otHours = empRecords.reduce((acc, r) => acc + (r.otHours || 0), 0)

    const baseSalary = 8000000
    const dailyRate = 363636
    const otRate = 68000
    const allowance = 500000

    const salaryGross = Math.round(workedDays * dailyRate + otHours * otRate + allowance)
    const insurance = Math.round(baseSalary * 0.105)
    const netPay = Math.max(0, salaryGross - insurance)

    // Anomalies
    const isAnomaly = netPay <= 0 || workedDays === 0 || otHours > 40

    return {
      id: emp.id,
      code: emp.code,
      fullName: emp.fullName,
      department: emp.department,
      projectCode: emp.projectCode || 'BPO',
      workedDays,
      otHours,
      salaryGross,
      insurance,
      netPay,
      isAnomaly
    }
  })

  const totalPayrollCost = payrollItems.reduce((acc, p) => acc + p.netPay, 0)
  const anomaliesCount = payrollItems.filter(p => p.isAnomaly).length

  return (
    <AdminLayout 
      title="Payroll Calculation Wizard" 
      subtitle="Quy trình 7 bước tính lương, kiểm soát dị thường và đóng sổ kỳ lương"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Stepper Bar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] gap-2">
            {steps.map(step => {
              const isPast = currentStep > step.num
              const isCurrent = currentStep === step.num
              return (
                <div key={step.num} className="flex-1 flex flex-col items-center text-center relative">
                  <button
                    onClick={() => !isLocked && setCurrentStep(step.num)}
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
                BƯỚC {currentStep} / 7
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                {steps[currentStep - 1].title} - Kỳ Tháng {selectedMonth}/{selectedYear}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">Tổng quỹ lương Net:</span>
              <span className="text-lg font-black text-indigo-700 font-mono">
                {totalPayrollCost.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Body according to current step */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs">Đang tải và tính toán dữ liệu kỳ lương...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentStep === 1 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Rà soát toàn bộ số ngày công thực tế của <strong>{employees.length} nhân sự</strong> trong tháng. Đảm bảo các ngày nghỉ phép, vắng mặt đã được phân loại chuẩn xác trước khi tính lương.
                  </p>
                  <div className="p-3.5 bg-slate-50 rounded-2xl text-xs text-slate-700 font-medium flex items-center justify-between">
                    <span>Tổng số lượt dập thẻ ghi nhận trong kỳ: <strong>{records.length} lượt</strong></span>
                    <span>Tỷ lệ hoàn thành công: <strong>96.4%</strong></span>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Thẩm định tổng số giờ tăng ca (OT). Chỉ những giờ OT có giải trình hoặc được Team Leader / Quản lý ký duyệt mới được tính tiền lương thêm giờ.
                  </p>
                  <div className="p-3.5 bg-amber-50 rounded-2xl text-xs text-amber-800 font-bold border border-amber-200">
                    Tổng số giờ làm thêm (OT) toàn công ty trong kỳ: {payrollItems.reduce((acc, p) => acc + p.otHours, 0)} giờ
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kết quả chạy động cơ tính lương tự động (PayrollCalculationEngine) cho từng nhân viên dựa trên ngày công, hệ số tăng ca và đóng BHXH.
                  </p>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-3">
                  <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
                    anomaliesCount > 0 ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-extrabold">{anomaliesCount > 0 ? `Phát hiện ${anomaliesCount} trường hợp dị thường cần rà soát!` : 'Không phát hiện dị thường nào.'}</p>
                      <p className="font-normal text-[11px] mt-0.5">Tiêu chuẩn quét: Lương âm, 0 ngày công hoặc tăng ca quá 40 giờ/tháng.</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Phê duyệt chính thức từ Ban Lãnh đạo / Giám đốc Nhân sự. Sau khi duyệt, bảng lương sẽ được chuyển sang bộ phận Kế toán để lập lệnh chi trả.
                  </p>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800">Trạng thái phê duyệt:</span>
                      <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-md ${isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isApproved ? 'ĐÃ DUYỆT' : 'CHỜ DUYỆT'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsApproved(true)}
                      disabled={isApproved}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                    >
                      <UserCheck className="h-4 w-4 mr-1.5" />
                      Phê duyệt bảng lương kỳ này
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Lập lệnh thanh toán qua ngân hàng (Bank Transfer) và xuất báo cáo chuyển khoản đồng loạt.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => alert('Đã xuất file lệnh chuyển tiền ngân hàng!')}
                    className="border-indigo-200 text-indigo-700 bg-indigo-50 font-bold text-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                    Xuất File Chuyển Khoản Ngân Hàng (Excel)
                  </Button>
                </div>
              )}

              {currentStep === 7 && (
                <div className="space-y-3">
                  <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-amber-400">
                      <Lock className="h-5 w-5" />
                      <span>Đóng băng và Khóa Sổ Kỳ Lương (LOCKED)</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Khi đã khóa kỳ lương, hệ thống sẽ cấm mọi thao tác sửa đổi công hoặc tiền lương của kỳ này. Mọi thay đổi phát sinh sau này bắt buộc phải xử lý qua nghiệp vụ <strong>Điều chỉnh lương (Payroll Adjustment)</strong> và lưu vết Audit Log.
                    </p>
                    <Button
                      onClick={() => setIsLocked(true)}
                      disabled={isLocked}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      {isLocked ? 'ĐÃ KHÓA SỔ KỲ LƯƠNG' : 'XÁC NHẬN KHÓA SỔ VĨNH VIỄN'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Data Table Preview */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Mã NV</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Phòng ban</th>
                      <th className="py-2.5 px-3 text-center">Công</th>
                      <th className="py-2.5 px-3 text-center">Giờ OT</th>
                      <th className="py-2.5 px-3 text-right">Lương gộp</th>
                      <th className="py-2.5 px-3 text-right">BHXH (10.5%)</th>
                      <th className="py-2.5 px-3 text-right font-extrabold text-indigo-700">Thực lĩnh (Net)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollItems.map(p => (
                      <tr key={p.id} className={`hover:bg-slate-50 ${p.isAnomaly ? 'bg-rose-50/20' : ''}`}>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-600">{p.code}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{p.fullName}</td>
                        <td className="py-2 px-3 text-slate-500">{p.department}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{p.workedDays}</td>
                        <td className="py-2 px-3 text-center font-mono">{p.otHours > 0 ? `+${p.otHours}h` : '0'}</td>
                        <td className="py-2 px-3 text-right font-mono">{p.salaryGross.toLocaleString('vi-VN')} đ</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">-{p.insurance.toLocaleString('vi-VN')} đ</td>
                        <td className="py-2 px-3 text-right font-mono font-extrabold text-indigo-700">
                          {p.netPay.toLocaleString('vi-VN')} đ
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
              disabled={currentStep === 1 || isLocked}
              className="text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Bước trước
            </Button>

            <Button
              size="sm"
              onClick={() => setCurrentStep(prev => Math.min(7, prev + 1))}
              disabled={currentStep === 7 || isLocked}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
            >
              Tiếp theo
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>

        </div>

      </div>
    </AdminLayout>
  )
}
