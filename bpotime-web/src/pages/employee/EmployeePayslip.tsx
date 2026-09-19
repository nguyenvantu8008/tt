import { useState, useEffect } from 'react'
import axios from 'axios'
import EmployeeLayout from '@/components/layout/EmployeeLayout'
import { useAuth } from '@/lib/authContext'
import { 
  Wallet, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  Clock,
  Coins,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

export default function EmployeePayslip() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)
  const [stats, setStats] = useState({
    workedDays: 0,
    totalHours: 0,
    otHours: 0,
    baseSalary: 8500000,
    dailyRate: 386000,
    otRate: 72000,
    allowance: 500000
  })

  useEffect(() => {
    const fetchPayslipData = async () => {
      try {
        setLoading(true)
        const [empRes, histRes] = await Promise.all([
          axios.get('/api/employees'),
          user?.employeeId 
            ? axios.get(`/api/attendance/employee/${user.employeeId}/history?limit=31`)
            : Promise.resolve({ data: [] })
        ])

        const allEmps = empRes.data || []
        const currentEmp = user?.employeeId 
          ? allEmps.find((e: any) => e.id === user.employeeId) 
          : (allEmps[0] || null)

        setEmployee(currentEmp)

        const records = histRes.data || []
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()

        const thisMonthRecords = records.filter((r: any) => {
          const d = new Date(r.date)
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        })

        const worked = thisMonthRecords.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length
        const totalH = thisMonthRecords.reduce((acc: number, r: any) => acc + (r.workedHours || 0), 0)
        const otH = thisMonthRecords.reduce((acc: number, r: any) => acc + (r.otHours || 0), 0)

        setStats(prev => ({
          ...prev,
          workedDays: worked,
          totalHours: Math.round(totalH * 10) / 10,
          otHours: Math.round(otH * 10) / 10
        }))
      } catch (err) {
        console.error('Lỗi tải dữ liệu bảng lương:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPayslipData()
  }, [user])

  const grossEarnings = Math.round(stats.workedDays * stats.dailyRate + stats.otHours * stats.otRate + stats.allowance)
  const insuranceDeduction = Math.round(stats.baseSalary * 0.105) // BHXH, BHYT, BHTN 10.5%
  const netEstimated = Math.max(0, grossEarnings - insuranceDeduction)

  const currentMonthName = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`

  return (
    <EmployeeLayout title="Phiếu Lương & Thu Nhập" subtitle="Tạm tính thời gian thực dựa trên ngày công và giờ OT">
      <div className="space-y-4">
        
        {/* Main Net Pay Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-indigo-200 mb-2 font-medium">
            <span>Kỳ lương: <strong>{currentMonthName}</strong></span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
              Đang tích lũy
            </span>
          </div>

          <p className="text-xs text-slate-300 font-medium">Thu nhập thực nhận tạm tính (Net):</p>
          <div className="text-3xl font-black tracking-tight text-white mt-1 font-mono">
            {netEstimated.toLocaleString('vi-VN')} <span className="text-sm font-bold text-indigo-200">VNĐ</span>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200">
            <span>Số ngày công: <strong>{stats.workedDays} ngày</strong></span>
            <span>Tăng ca: <strong>+{stats.otHours}h OT</strong></span>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Chi tiết các khoản thu nhập</h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Lương ngày công ({stats.workedDays} x {stats.dailyRate.toLocaleString('vi-VN')}đ)</span>
              <span className="font-bold text-slate-900 font-mono">
                {(stats.workedDays * stats.dailyRate).toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Tiền làm thêm giờ ({stats.otHours}h x {stats.otRate.toLocaleString('vi-VN')}đ)</span>
              <span className="font-bold text-amber-600 font-mono">
                +{(Math.round(stats.otHours * stats.otRate)).toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Phụ cấp công việc & xăng xe</span>
              <span className="font-bold text-emerald-600 font-mono">
                +{stats.allowance.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Trích đóng BHXH, BHYT, BHTN (10.5%)</span>
              <span className="font-bold text-rose-600 font-mono">
                -{insuranceDeduction.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 text-sm font-extrabold">
              <span className="text-slate-800">Thực lĩnh ước tính:</span>
              <span className="text-indigo-600 font-mono">
                {netEstimated.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>

        {/* Security & Payroll Policy Disclaimer */}
        <div className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200/60 flex items-start gap-2.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <p>
            Bảng lương chính thức sẽ được kế toán khóa sổ và chi trả vào ngày 05 hàng tháng sau khi Admin phê duyệt toàn bộ ngoại lệ và OT.
          </p>
        </div>

      </div>
    </EmployeeLayout>
  )
}
