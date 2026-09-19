import { useState, useEffect } from 'react'
import axios from 'axios'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import BulkActionBar from '@/components/ui/BulkActionBar'
import MakeupAttendanceModal from '@/components/attendance/MakeupAttendanceModal'
import { 
  Search, 
  UserPlus, 
  CheckCircle,
  X,
  Loader2,
  Pencil,
  Trash2,
  AlertCircle,
  UserCheck,
  UserX,
  Building2,
  Briefcase,
  Clock,
  CheckSquare,
  Square,
  Edit3,
  CalendarPlus,
  ShieldCheck
} from 'lucide-react'
import { logClientError } from '@/lib/clientLogger'

export default function EmployeeList() {
  const [employees, setEmployees] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('ALL')
  const [syncingAccounts, setSyncingAccounts] = useState(false)

  const handleSyncAccounts = async () => {
    try {
      setSyncingAccounts(true)
      const res = await axios.post('/api/employees/sync-accounts')
      alert(res.data.message || 'Đã đồng bộ tài khoản tự điểm danh thành công!')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi đồng bộ tài khoản'
      alert(msg)
      await logClientError('SYNC_ACCOUNTS_ERROR', msg, err.message, '/employees')
    } finally {
      setSyncingAccounts(false)
    }
  }

  // Multi-select state
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkMakeupOpen, setBulkMakeupOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  // Bulk Edit Form state
  const [bulkProjectId, setBulkProjectId] = useState('')
  const [bulkShiftId, setBulkShiftId] = useState('')
  const [bulkDept, setBulkDept] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')

  // Create Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newDept, setNewDept] = useState('CSKH & Hotline')
  const [newPos, setNewPos] = useState('Chuyên viên CSKH')
  const [newShiftId, setNewShiftId] = useState('')
  const [newProjectId, setNewProjectId] = useState('')

  // Edit Modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState<any>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDept, setEditDept] = useState('')
  const [editPos, setEditPos] = useState('')
  const [editShiftId, setEditShiftId] = useState('')
  const [editProjectId, setEditProjectId] = useState('')
  const [editStatus, setEditStatus] = useState('ACTIVE')

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const [empRes, projRes, shiftRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/projects'),
        axios.get('/api/shifts'),
      ])
      setEmployees(empRes.data)
      setProjects(projRes.data)
      setShifts(shiftRes.data)
      if (shiftRes.data.length > 0 && !newShiftId) setNewShiftId(shiftRes.data[0].id)
      if (projRes.data.length > 0 && !newProjectId) setNewProjectId(projRes.data[0].id)
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách nhân viên:', err)
      await logClientError('EMPLOYEE_FETCH_ERROR', 'Lỗi khi tải danh sách nhân sự', err.message, '/employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Multi-select toggle helpers
  const toggleSelectEmp = (id: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = (visibleEmployees: any[]) => {
    const visibleIds = visibleEmployees.map(e => e.id)
    const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => selectedEmpIds.includes(id))
    if (isAllSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  // Bulk update handler
  const handleBulkUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedEmpIds.length === 0) return

    try {
      setBulkLoading(true)
      const res = await axios.post('/api/employees/bulk-update', {
        employeeIds: selectedEmpIds,
        projectId: bulkProjectId ? bulkProjectId : undefined,
        shiftId: bulkShiftId ? bulkShiftId : undefined,
        department: bulkDept ? bulkDept : undefined,
        status: bulkStatus ? bulkStatus : undefined
      })

      alert(res.data.message || `Đã cập nhật ${selectedEmpIds.length} nhân viên thành công!`)
      setBulkEditOpen(false)
      setSelectedEmpIds([])
      // Reset bulk form
      setBulkProjectId('')
      setBulkShiftId('')
      setBulkDept('')
      setBulkStatus('')
      await fetchEmployees()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi khi cập nhật hàng loạt.'
      alert(msg)
      await logClientError('EMPLOYEE_BULK_UPDATE_ERROR', msg, err.message, '/employees')
    } finally {
      setBulkLoading(false)
    }
  }

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedEmpIds.length === 0) return

    const confirmDelete = window.confirm(
      `CẢNH BÁO XÓA HÀNG LOẠT:\n\nBạn có chắc chắn muốn xóa ${selectedEmpIds.length} nhân viên đã chọn?\n\n• Nhân viên đã có dữ liệu chấm công: Tự động chuyển sang 'Lưu trữ (Inactive)' để bảo toàn lịch sử chấm công.\n• Nhân viên chưa từng chấm công: Xóa hoàn toàn khỏi hệ thống.`
    )
    if (!confirmDelete) return

    try {
      setBulkLoading(true)
      const res = await axios.post('/api/employees/bulk-delete', {
        employeeIds: selectedEmpIds
      })

      alert(res.data.message || `Đã xử lý xóa ${selectedEmpIds.length} nhân viên!`)
      setSelectedEmpIds([])
      await fetchEmployees()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi khi xóa hàng loạt.'
      alert(msg)
      await logClientError('EMPLOYEE_BULK_DELETE_ERROR', msg, err.message, '/employees')
    } finally {
      setBulkLoading(false)
    }
  }


  // Tạo nhân viên mới
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCode || !newName) return

    try {
      setSubmitting(true)
      await axios.post('/api/employees', {
        code: newCode.trim().toUpperCase(),
        fullName: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        department: newDept,
        position: newPos,
        shiftId: newShiftId || null,
        projectId: newProjectId || null,
      })

      // Reset & close
      setNewCode('')
      setNewName('')
      setNewEmail('')
      setNewPhone('')
      setModalOpen(false)

      await fetchEmployees()
      alert('Tạo nhân viên mới thành công!')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi tạo nhân viên mới.'
      alert(msg)
      await logClientError('EMPLOYEE_CREATE_ERROR', msg, err.message, '/employees')
    } finally {
      setSubmitting(false)
    }
  }

  // Mở modal sửa
  const openEditModal = (emp: any) => {
    setEditingEmp(emp)
    setEditCode(emp.code)
    setEditName(emp.fullName)
    setEditEmail(emp.email || '')
    setEditPhone(emp.phone || '')
    setEditDept(emp.department || 'CSKH & Hotline')
    setEditPos(emp.position || 'Chuyên viên')
    setEditShiftId(emp.shiftId || (shifts[0]?.id ?? ''))
    setEditProjectId(emp.projectId || '')
    setEditStatus(emp.status || 'ACTIVE')
    setEditModalOpen(true)
  }

  // Lưu chỉnh sửa nhân viên
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmp || !editName) return

    try {
      setSubmitting(true)
      await axios.put(`/api/employees/${editingEmp.id}`, {
        code: editCode.trim().toUpperCase(),
        fullName: editName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        department: editDept,
        position: editPos,
        shiftId: editShiftId || null,
        projectId: editProjectId || null,
        status: editStatus
      })

      setEditModalOpen(false)
      await fetchEmployees()
      alert('Cập nhật thông tin nhân viên thành công!')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi cập nhật nhân viên.'
      alert(msg)
      await logClientError('EMPLOYEE_UPDATE_ERROR', msg, err.message, '/employees')
    } finally {
      setSubmitting(false)
    }
  }

  // Xóa nhân viên
  const handleDeleteEmployee = async (emp: any) => {
    const confirmDelete = window.confirm(
      `Xác nhận xóa nhân viên: ${emp.fullName} (${emp.code})?\n\nLưu ý: Nếu nhân viên đã có lịch sử chấm công, hệ thống sẽ tự động chuyển sang trạng thái "Nghỉ việc (Inactive)" để bảo tồn dữ liệu báo cáo.`
    )
    if (!confirmDelete) return

    try {
      const res = await axios.delete(`/api/employees/${emp.id}`)
      alert(res.data.message || 'Xóa nhân viên thành công!')
      await fetchEmployees()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa nhân viên này.'
      alert(msg)
      await logClientError('EMPLOYEE_DELETE_ERROR', msg, err.message, '/employees')
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.fullName.toLowerCase().includes(search.toLowerCase()) || 
                        emp.code.toLowerCase().includes(search.toLowerCase())
    const matchDept = department === 'ALL' || emp.department === department
    return matchSearch && matchDept
  })

  return (
    <AppLayout 
      title="Quản lý Nhân sự (CSDL PostgreSQL)" 
      subtitle="Thêm, sửa, phân công dự án và quản lý trạng thái hồ sơ nhân sự thời gian thực"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Top Controls: Search, Filter, Select All & Add Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm nhân viên theo họ tên hoặc mã..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <select 
              value={department} 
              onChange={e => setDepartment(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
            >
              <option value="ALL">Tất cả phòng ban</option>
              <option value="CSKH & Hotline">CSKH & Hotline</option>
              <option value="Kiểm duyệt nội dung">Kiểm duyệt nội dung</option>
              <option value="Nhập liệu & Số hóa">Nhập liệu & Số hóa</option>
              <option value="Kỹ thuật & Helpdesk">Kỹ thuật & Helpdesk</option>
            </select>

            {/* Select All Toggle Button */}
            <button
              type="button"
              onClick={() => toggleSelectAll(filteredEmployees)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-indigo-200 flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
            >
              {selectedEmpIds.length > 0 && filteredEmployees.length > 0 && filteredEmployees.every(e => selectedEmpIds.includes(e.id)) ? (
                <>
                  <CheckSquare className="h-4 w-4 text-indigo-600" />
                  <span>Bỏ chọn ({selectedEmpIds.length})</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 text-slate-400" />
                  <span>Chọn tất cả ({filteredEmployees.length})</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm" 
              onClick={handleSyncAccounts}
              disabled={syncingAccounts}
              className="border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
            >
              {syncingAccounts ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Đang đồng bộ...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-1.5 text-indigo-600" />
                  Đồng bộ tài khoản tự điểm danh
                </>
              )}
            </Button>

            <Button 
              size="sm" 
              onClick={() => setModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Thêm nhân viên mới
            </Button>
          </div>
        </div>

        {/* Employee Cards Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-medium">Đang tải danh sách nhân viên từ PostgreSQL...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
            <UserX className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            Không tìm thấy nhân viên nào phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredEmployees.map(emp => {
              const isActive = emp.status === 'ACTIVE'
              const isSelected = selectedEmpIds.includes(emp.id)
              return (
                <div 
                  key={emp.id} 
                  onClick={() => toggleSelectEmp(emp.id)}
                  className={`bg-white border rounded-3xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                    isSelected 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/15' 
                      : isActive 
                        ? 'border-slate-200/80 hover:border-slate-300' 
                        : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div>
                    {/* Header card with Checkbox, Avatar and Action Buttons */}
                    <div className="flex items-start justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelectEmp(emp.id)
                          }}
                          className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-indigo-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                        <img 
                          src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.code}`} 
                          alt={emp.fullName} 
                          className="h-11 w-11 rounded-xl object-cover ring-2 ring-slate-100 shrink-0 bg-slate-100" 
                        />
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-sm leading-tight truncate">{emp.fullName}</h3>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{emp.code}</p>
                        </div>
                      </div>

                      {/* Edit and Delete buttons */}
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          title="Chỉnh sửa nhân sự"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp)}
                          title="Xóa nhân sự"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Vị trí:</span>
                        <span className="font-medium text-slate-800 truncate max-w-[140px]">{emp.position || 'Chuyên viên'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Phòng ban:</span>
                        <span className="font-medium text-slate-800 truncate max-w-[140px]">{emp.department}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Ca làm việc:</span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                          {emp.shiftName || 'Ca Hành Chính'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Dự án:</span>
                        <span 
                          className="font-semibold px-2 py-0.5 rounded-md text-[10px]"
                          style={{ backgroundColor: `${emp.projectColor || '#2563EB'}15`, color: emp.projectColor || '#2563EB' }}
                        >
                          {emp.projectCode || 'Chưa gán dự án'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Đăng nhập:</span>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-100" title="Đăng nhập tự dập thẻ bằng Mã nhân viên và mật khẩu 123456">
                          {emp.code} • Pass: 123456
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer status */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className={`flex items-center gap-1 font-semibold ${isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isActive ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Đang làm việc
                        </>
                      ) : (
                        <>
                          <UserX className="h-3.5 w-3.5" />
                          Đã nghỉ việc
                        </>
                      )}
                    </span>
                    <span className="text-[11px] font-mono">{emp.phone || emp.email || '—'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal Thêm Nhân Viên Mới */}
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border relative animate-in fade-in zoom-in-95 duration-150">
              <button 
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-base font-bold text-slate-900 mb-1">Thêm Nhân Sự Mới</h2>
              <p className="text-xs text-slate-500 mb-5">Hồ sơ sẽ được lưu trực tiếp vào cơ sở dữ liệu PostgreSQL</p>

              <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Mã Nhân viên *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. BPO-1009" 
                      value={newCode} 
                      onChange={e => setNewCode(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden uppercase"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Họ và Tên *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Nguyễn Văn Nam" 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Email liên hệ</label>
                    <input 
                      type="email" 
                      placeholder="nam.nguyen@bpotime.com" 
                      value={newEmail} 
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Số điện thoại</label>
                    <input 
                      type="tel" 
                      placeholder="0912 345 678" 
                      value={newPhone} 
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Phòng ban</label>
                    <select 
                      value={newDept} 
                      onChange={e => setNewDept(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="CSKH & Hotline">CSKH & Hotline</option>
                      <option value="Kiểm duyệt nội dung">Kiểm duyệt nội dung</option>
                      <option value="Nhập liệu & Số hóa">Nhập liệu & Số hóa</option>
                      <option value="Kỹ thuật & Helpdesk">Kỹ thuật & Helpdesk</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Vị trí</label>
                    <input 
                      type="text" 
                      placeholder="Chuyên viên CSKH" 
                      value={newPos} 
                      onChange={e => setNewPos(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Dự án phân công</label>
                    <select 
                      value={newProjectId} 
                      onChange={e => setNewProjectId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="">-- Chưa gán dự án --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Ca làm việc</label>
                    <select 
                      value={newShiftId} 
                      onChange={e => setNewShiftId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2.5 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setModalOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu vào Cơ sở dữ liệu'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Sửa Nhân Viên */}
        {editModalOpen && editingEmp && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border relative animate-in fade-in zoom-in-95 duration-150">
              <button 
                onClick={() => setEditModalOpen(false)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Pencil className="h-4 w-4 text-blue-600" />
                Chỉnh Sửa Hồ Sơ Nhân Sự
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Cập nhật thông tin cho nhân sự <strong className="text-slate-800">{editingEmp.fullName}</strong> ({editingEmp.code})
              </p>

              <form onSubmit={handleUpdateEmployee} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Mã Nhân viên *</label>
                    <input 
                      type="text" 
                      required 
                      value={editCode} 
                      onChange={e => setEditCode(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Họ và Tên *</label>
                    <input 
                      type="text" 
                      required 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Email</label>
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Số điện thoại</label>
                    <input 
                      type="tel" 
                      value={editPhone} 
                      onChange={e => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Phòng ban</label>
                    <select 
                      value={editDept} 
                      onChange={e => setEditDept(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="CSKH & Hotline">CSKH & Hotline</option>
                      <option value="Kiểm duyệt nội dung">Kiểm duyệt nội dung</option>
                      <option value="Nhập liệu & Số hóa">Nhập liệu & Số hóa</option>
                      <option value="Kỹ thuật & Helpdesk">Kỹ thuật & Helpdesk</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Vị trí</label>
                    <input 
                      type="text" 
                      value={editPos} 
                      onChange={e => setEditPos(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Dự án phân công</label>
                    <select 
                      value={editProjectId} 
                      onChange={e => setEditProjectId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="">-- Chưa gán dự án --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Ca làm việc</label>
                    <select 
                      value={editShiftId} 
                      onChange={e => setEditShiftId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Trạng thái nhân sự</label>
                  <select 
                    value={editStatus} 
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="ACTIVE">Hoạt động (Active - Đang làm việc)</option>
                    <option value="TERMINATED">Nghỉ việc (Inactive - Khóa chấm công)</option>
                  </select>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2.5 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditModalOpen(false)}
                  >
                    Hủy bỏ
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cập nhật thay đổi'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Cập Nhật Hàng Loạt (Bulk Edit Modal) */}
        {bulkEditOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-indigo-600" />
                    Cập Nhật Hàng Loạt ({selectedEmpIds.length} Nhân Sự)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Các trường để trống sẽ giữ nguyên giá trị hiện tại của từng nhân viên
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setBulkEditOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleBulkUpdateSubmit} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Chuyển sang Dự án BPO mới
                  </label>
                  <select
                    value={bulkProjectId}
                    onChange={e => setBulkProjectId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Giữ nguyên dự án hiện tại --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Đổi Ca làm việc mới
                  </label>
                  <select
                    value={bulkShiftId}
                    onChange={e => setBulkShiftId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Giữ nguyên ca làm việc hiện tại --</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Đổi Phòng ban
                  </label>
                  <select
                    value={bulkDept}
                    onChange={e => setBulkDept(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Giữ nguyên phòng ban hiện tại --</option>
                    <option value="CSKH & Hotline">CSKH & Hotline</option>
                    <option value="Kiểm duyệt nội dung">Kiểm duyệt nội dung</option>
                    <option value="Nhập liệu & Số hóa">Nhập liệu & Số hóa</option>
                    <option value="Kỹ thuật & Helpdesk">Kỹ thuật & Helpdesk</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Đổi Trạng thái nhân sự
                  </label>
                  <select
                    value={bulkStatus}
                    onChange={e => setBulkStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Giữ nguyên trạng thái --</option>
                    <option value="ACTIVE">Hoạt động (Active - Đang làm việc)</option>
                    <option value="TERMINATED">Nghỉ việc (Inactive - Khóa chấm công)</option>
                  </select>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkEditOpen(false)}
                    className="text-xs font-bold rounded-xl"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    disabled={bulkLoading}
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20"
                  >
                    {bulkLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang cập nhật...
                      </>
                    ) : (
                      `Áp dụng cho ${selectedEmpIds.length} nhân sự`
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Chấm Công Bù Hàng Loạt */}
        <MakeupAttendanceModal
          isOpen={bulkMakeupOpen}
          onClose={() => setBulkMakeupOpen(false)}
          onSuccess={() => {
            fetchEmployees()
            setSelectedEmpIds([])
          }}
          employees={employees}
          shifts={shifts}
          initialEmployeeIds={selectedEmpIds}
        />

        {/* Floating Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedEmpIds.length}
          onClearSelection={() => setSelectedEmpIds([])}
          onBulkEdit={() => setBulkEditOpen(true)}
          onBulkAttendance={() => setBulkMakeupOpen(true)}
          onBulkDelete={handleBulkDelete}
          editLabel="Cập nhật hàng loạt"
          attendanceLabel="Chấm công bù"
          deleteLabel="Xóa đã chọn"
          loading={bulkLoading}
        />

      </div>
    </AppLayout>
  )
}

