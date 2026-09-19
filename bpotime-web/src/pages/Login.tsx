import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Building2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail
} from 'lucide-react'

import { useAuth } from '@/lib/authContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      })

      const { token, userId, username, roles, employeeId, fullName, avatar } = response.data

      // Save session into AuthContext
      login(token, { userId, email, username, roles, employeeId, fullName, avatar })

      // Role-based redirection
      const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN') || roles.includes('HR_MANAGER')
      if (isAdmin) {
        navigate('/admin/dashboard')
      } else {
        navigate('/app/home')
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message)
      } else if (err.code === 'ERR_NETWORK') {
        setErrorMessage('Không thể kết nối đến máy chủ Backend. Hãy chắc chắn Backend đang hoạt động.')
      } else {
        setErrorMessage('Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleQuickFill = (demoAccount: string, demoPass = 'Admin@123') => {
    setEmail(demoAccount)
    setPassword(demoPass)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left Panel: Enterprise Branding & Showcase (Visible on lg screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0B132B] relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Background decorative glow effects */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        
        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-white">BPOTime</span>
              <span className="ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-400/30">
                PRO SUITE
              </span>
            </div>
          </div>
        </div>

        {/* Center Feature Showcase */}
        <div className="relative z-10 my-auto py-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nền tảng Chấm công Hiện trường & BPO Thế Hệ Mới</span>
          </div>
          
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-snug">
            Quản trị nhân lực thông minh, chính xác từng giây với <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">Radar GPS</span>.
          </h2>

          <p className="mt-4 text-sm text-slate-300/90 leading-relaxed">
            Hỗ trợ điểm danh ca làm việc linh hoạt, quét bán kính Geofence hiện trường dự án, duyệt công tức thì và xuất bảng lương tự động 24/7.
          </p>

          <div className="mt-8 space-y-3.5">
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span>Định vị chấm công GPS chống gian lận & Fake GPS</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 ring-1 ring-indigo-500/30">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span>Kiosk điểm danh tập trung không cần cài app</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 ring-1 ring-blue-500/30">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span>Dữ liệu đồng bộ Real-time trên Cloud tốc độ cao</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>Mã hóa AES-256 Cloud Infrastructure</span>
          </div>
          <span>© 2026 BPOTime Systems</span>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="h-12 w-12 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white mb-3">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">BPOTime</h1>
            <p className="text-xs text-slate-500 mt-1">Hệ thống quản lý nhân sự & chấm công thông minh</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-10">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Đăng Nhập</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">Đăng nhập bằng Email hoặc <strong>Mã nhân viên (VD: BPO-1001)</strong></p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="email">
                  Mã nhân viên hoặc Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input 
                    id="email" 
                    type="text" 
                    placeholder="VD: BPO-1001 hoặc admin@bpotime.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 text-xs rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="password">
                    Mật khẩu
                  </label>
                  <span className="text-[11px] text-slate-400">NV mặc định: 123456</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 text-xs rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required 
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 mt-4 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.99] cursor-pointer" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang xác thực...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>Đăng nhập hệ thống</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Quick Demo Access Bar */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold text-slate-400">Tài khoản mẫu (Bấm thử):</span>
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">1-Click Đăng nhập</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@bpotime.com', 'Admin@123')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/60 hover:border-indigo-200 text-left transition-colors cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-slate-800">Admin Quản trị</p>
                  <p className="text-[10px] text-slate-400 truncate">admin@bpotime.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('BPO-1001', '123456')}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-left transition-colors cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-emerald-800">NV BPO-1001</p>
                  <p className="text-[10px] text-emerald-600 truncate">Mật khẩu: 123456</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('BPO-1002', '123456')}
                  className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-left transition-colors cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-blue-800">NV BPO-1002</p>
                  <p className="text-[10px] text-blue-600 truncate">Mật khẩu: 123456</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('nv.anh@bpotime.com', 'Admin@123')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/60 hover:border-indigo-200 text-left transition-colors cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-slate-800">Email NV.Anh</p>
                  <p className="text-[10px] text-slate-400 truncate">nv.anh@bpotime.com</p>
                </button>
              </div>
              <p className="mt-2 text-[10px] text-slate-400 text-center">
                Mọi nhân viên có thể đăng nhập bằng chính <strong>Mã nhân viên</strong> của mình (Mật khẩu: <code>123456</code>).
              </p>
            </div>

            <div className="mt-6 text-center text-[11px] text-slate-400">
              <p>BPOTime Cloud Security • SSL 256-bit Encrypted</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


