import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import EmployeeLayout from '@/components/layout/EmployeeLayout'
import { useAuth } from '@/lib/authContext'
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2, 
  ShieldCheck, 
  LogOut, 
  KeyRound,
  CheckCircle,
  HelpCircle
} from 'lucide-react'

export default function EmployeeProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const res = await axios.get('/api/employees')
        const all = res.data || []
        const current = user?.employeeId ? all.find((e: any) => e.id === user.employeeId) : (all[0] || null)
        setEmployee(current)
      } catch (err) {
        console.error('Lỗi tải hồ sơ cá nhân:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <EmployeeLayout title="Hồ Sơ Cá Nhân" subtitle="Thông tin nhân sự và tài khoản dập thẻ">
      <div className="space-y-4">
        
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col items-center text-center">
          <img 
            src={employee?.avatar || user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee?.code || 'BPO'}`} 
            alt={employee?.fullName || 'Avatar'} 
            className="h-20 w-20 rounded-3xl object-cover ring-4 ring-indigo-50 shadow-md mb-3"
          />
          <h2 className="text-lg font-black text-slate-900 leading-tight">
            {employee?.fullName || user?.fullName || 'Nhân sự BPO'}
          </h2>
          <p className="text-xs font-mono font-bold text-indigo-600 mt-0.5">
            Mã NV: {employee?.code || 'BPO-1001'}
          </p>

          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Đang làm việc (Active)</span>
          </div>
        </div>

        {/* Metadata Details Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Thông tin công việc</h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-indigo-600" /> Vị trí:
              </span>
              <span className="font-bold text-slate-800">{employee?.position || 'Chuyên viên'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" /> Phòng ban:
              </span>
              <span className="font-bold text-slate-800">{employee?.department || 'CSKH & Hotline'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" /> Chi nhánh / Dự án:
              </span>
              <span className="font-bold text-slate-800">{employee?.projectCode || 'Chi nhánh BPO'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-indigo-600" /> Email:
              </span>
              <span className="font-medium text-slate-800 font-mono">{employee?.email || user?.email || '—'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-indigo-600" /> Điện thoại:
              </span>
              <span className="font-medium text-slate-800 font-mono">{employee?.phone || '—'}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-indigo-600" /> Tài khoản dập thẻ:
              </span>
              <span className="font-bold text-indigo-700 font-mono">
                {employee?.code} (Pass: 123456)
              </span>
            </div>
          </div>
        </div>

        {/* Logout Action */}
        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất khỏi thiết bị này</span>
        </button>

      </div>
    </EmployeeLayout>
  )
}
