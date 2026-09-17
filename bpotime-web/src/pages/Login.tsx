import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, AlertCircle, Loader2 } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
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

      // Save token and user details
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify({ userId, email, username, roles, employeeId, fullName, avatar }))

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message)
      } else if (err.code === 'ERR_NETWORK') {
        setErrorMessage('Không thể kết nối đến máy chủ Backend. Hãy chắc chắn Backend đang chạy.')
      } else {
        setErrorMessage('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">BPOTime</h1>
          <p className="text-xs text-slate-500 mt-1">Hệ thống quản lý nhân sự & chấm công thông minh</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="email">
              Email hoặc Tên đăng nhập
            </label>
            <Input 
              id="email" 
              type="text" 
              placeholder="nhanvien@bpotime.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-xs"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="password">
              Mật khẩu
            </label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-xs"
              required 
            />
          </div>
          
          <Button type="submit" className="w-full mt-6 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập hệ thống'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <p>BPOTime Cloud Security • Xác thực mã hóa chuẩn SSL 256-bit</p>
        </div>
      </div>
    </div>
  )
}

