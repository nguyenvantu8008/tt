import { useState, useEffect } from 'react'
import axios from 'axios'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  X, 
  Loader2, 
  Pencil, 
  Trash2, 
  Users, 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  UserPlus, 
  UserMinus,
  CheckCircle2,
  FolderKanban
} from 'lucide-react'
import { getCurrentGpsPosition } from '@/lib/geoUtils'
import { logClientError } from '@/lib/clientLogger'

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Create Project Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [color, setColor] = useState('#2563EB')
  const [requireGps, setRequireGps] = useState(false)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState('150')
  const [address, setAddress] = useState('')

  // Edit Project Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [editName, setEditName] = useState('')
  const [editClient, setEditClient] = useState('')
  const [editColor, setEditColor] = useState('#2563EB')
  const [editStatus, setEditStatus] = useState('ACTIVE')
  const [editRequireGps, setEditRequireGps] = useState(false)
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [editRadius, setEditRadius] = useState('150')
  const [editAddress, setEditAddress] = useState('')

  // Members Management Modal
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [selectedProjForMembers, setSelectedProjForMembers] = useState<any>(null)
  const [projectMembers, setProjectMembers] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [selectedNewEmpId, setSelectedNewEmpId] = useState('')
  const [memberActionLoading, setMemberActionLoading] = useState(false)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const [projRes, empRes] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/employees')
      ])
      setProjects(projRes.data)
      setEmployees(empRes.data)
    } catch (err: any) {
      console.error('Lỗi khi tải dự án:', err)
      await logClientError('PROJECT_FETCH_ERROR', 'Lỗi khi tải dự án', err.message, '/projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // Tự động lấy GPS cho modal tạo
  const handleAutoDetectGpsCreate = async () => {
    const res = await getCurrentGpsPosition()
    if (res.coords) {
      setLat(res.coords.latitude.toFixed(6))
      setLng(res.coords.longitude.toFixed(6))
      setRequireGps(true)
    } else {
      alert(res.error || 'Không lấy được GPS')
    }
  }

  // Tự động lấy GPS cho modal sửa
  const handleAutoDetectGpsEdit = async () => {
    const res = await getCurrentGpsPosition()
    if (res.coords) {
      setEditLat(res.coords.latitude.toFixed(6))
      setEditLng(res.coords.longitude.toFixed(6))
      setEditRequireGps(true)
    } else {
      alert(res.error || 'Không lấy được GPS')
    }
  }

  // Tạo dự án mới
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !name) return

    try {
      setSubmitting(true)
      const res = await axios.post('/api/projects', {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        client: client.trim(),
        color
      })

      const newProjId = res.data.id

      // Nếu có nhập tọa độ GPS thì cập nhật luôn
      if (lat && lng) {
        await axios.put(`/api/projects/${newProjId}/gps`, {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          allowedRadiusMeters: parseInt(radius) || 150,
          requireGps,
          address: address.trim() || null
        })
      }

      setCode('')
      setName('')
      setClient('')
      setLat('')
      setLng('')
      setAddress('')
      setModalOpen(false)

      await fetchProjects()
      alert('Tạo dự án mới thành công!')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi tạo dự án.'
      alert(msg)
      await logClientError('PROJECT_CREATE_ERROR', msg, err.message, '/projects')
    } finally {
      setSubmitting(false)
    }
  }

  // Mở modal sửa
  const openEditModal = (proj: any) => {
    setEditingProject(proj)
    setEditName(proj.name)
    setEditClient(proj.client || '')
    setEditColor(proj.color || '#2563EB')
    setEditStatus(proj.status || 'ACTIVE')
    setEditRequireGps(proj.requireGps || false)
    setEditLat(proj.latitude ? String(proj.latitude) : '')
    setEditLng(proj.longitude ? String(proj.longitude) : '')
    setEditRadius(proj.allowedRadiusMeters ? String(proj.allowedRadiusMeters) : '150')
    setEditAddress(proj.address || '')
    setEditModalOpen(true)
  }

  // Lưu chỉnh sửa dự án
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || !editName) return

    try {
      setSubmitting(true)
      await axios.put(`/api/projects/${editingProject.id}`, {
        name: editName.trim(),
        client: editClient.trim(),
        color: editColor,
        status: editStatus,
        latitude: editLat ? parseFloat(editLat) : null,
        longitude: editLng ? parseFloat(editLng) : null,
        allowedRadiusMeters: editRadius ? parseInt(editRadius) : 150,
        requireGps: editRequireGps,
        address: editAddress.trim() || null
      })

      setEditModalOpen(false)
      await fetchProjects()
      alert('Cập nhật dự án thành công!')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi cập nhật dự án.'
      alert(msg)
      await logClientError('PROJECT_UPDATE_ERROR', msg, err.message, '/projects')
    } finally {
      setSubmitting(false)
    }
  }

  // Xóa dự án
  const handleDeleteProject = async (proj: any) => {
    const confirmDelete = window.confirm(
      `Xác nhận xóa dự án: ${proj.name} (${proj.code})?\n\nLưu ý: Nếu còn nhân sự đang thuộc dự án này, hệ thống sẽ tự động gỡ liên kết các nhân sự đó về trạng thái "Chưa gán dự án".`
    )
    if (!confirmDelete) return

    try {
      const res = await axios.delete(`/api/projects/${proj.id}`)
      alert(res.data.message || 'Xóa dự án thành công!')
      await fetchProjects()
    } catch (err: any) {
      if (err.response?.data?.hasAttendances) {
        const forceConfirm = window.confirm(
          `CẢNH BÁO QUAN TRỌNG TỪ HỆ THỐNG:\n\n${err.response.data.message}\n\nBạn có chắc chắn muốn XÓA VĨNH VIỄN cả dự án và toàn bộ ${err.response.data.attendanceCount} bản ghi chấm công liên quan không?`
        )
        if (forceConfirm) {
          try {
            const forceRes = await axios.delete(`/api/projects/${proj.id}?force=true`)
            alert(forceRes.data.message || 'Đã xóa dự án thành công!')
            await fetchProjects()
            return
          } catch (forceErr: any) {
            alert(forceErr.response?.data?.message || 'Không thể xóa dự án.')
            return
          }
        }
        return
      }

      const msg = err.response?.data?.message || 'Không thể xóa dự án này.'
      alert(msg)
      await logClientError('PROJECT_DELETE_ERROR', msg, err.message, '/projects')
    }
  }

  // Mở modal quản lý thành viên
  const openMembersModal = async (proj: any) => {
    setSelectedProjForMembers(proj)
    setSelectedNewEmpId('')
    setMembersModalOpen(true)
    await loadProjectMembers(proj.id)
  }

  const loadProjectMembers = async (projId: string) => {
    try {
      setMembersLoading(true)
      const res = await axios.get(`/api/projects/${projId}/members`)
      setProjectMembers(res.data.members || [])
    } catch (err: any) {
      console.error('Lỗi khi tải thành viên dự án:', err)
    } finally {
      setMembersLoading(false)
    }
  }

  // Thêm thành viên vào dự án
  const handleAddMember = async () => {
    if (!selectedNewEmpId || !selectedProjForMembers) return

    try {
      setMemberActionLoading(true)
      await axios.post(`/api/projects/${selectedProjForMembers.id}/members`, {
        employeeId: selectedNewEmpId
      })
      setSelectedNewEmpId('')
      await loadProjectMembers(selectedProjForMembers.id)
      await fetchProjects()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi thêm thành viên.')
    } finally {
      setMemberActionLoading(false)
    }
  }

  // Rút thành viên khỏi dự án
  const handleRemoveMember = async (empId: string, empName: string) => {
    if (!confirm(`Xác nhận rút nhân viên ${empName} khỏi dự án này?`)) return

    try {
      setMemberActionLoading(true)
      await axios.delete(`/api/projects/${selectedProjForMembers.id}/members/${empId}`)
      await loadProjectMembers(selectedProjForMembers.id)
      await fetchProjects()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi rút thành viên.')
    } finally {
      setMemberActionLoading(false)
    }
  }

  // Danh sách nhân viên chưa thuộc dự án này
  const availableEmployeesToAdd = employees.filter(emp => emp.projectId !== selectedProjForMembers?.id)

  return (
    <AppLayout 
      title="Dự án BPO & Vị trí GPS (CSDL PostgreSQL)" 
      subtitle="Quản lý dự án, cấu hình Geofencing định vị công trường và phân bổ thành viên thời gian thực"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Tổng số: <strong className="text-slate-800 font-semibold">{projects.length} dự án trong cơ sở dữ liệu</strong>
          </p>
          <Button 
            size="sm" 
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Tạo dự án mới
          </Button>
        </div>

        {/* Project Cards Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Đang tải dự án từ PostgreSQL...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map(proj => {
              const hasGps = proj.latitude && proj.longitude
              return (
                <div 
                  key={proj.id} 
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                          style={{ backgroundColor: proj.color || '#2563EB' }}
                        >
                          {proj.code.split('-')[1]?.[0] || proj.code[0] || 'P'}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-tight">{proj.name}</h3>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {proj.code} • Khách hàng: {proj.client || 'Nội bộ'}
                          </p>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(proj)}
                          title="Chỉnh sửa dự án & GPS"
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(proj)}
                          title="Xóa dự án"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* GPS Geofencing Status Badge */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1.5 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                          Định vị GPS Geofencing:
                        </span>
                        {proj.requireGps ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                            Bắt buộc GPS
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[10px]">
                            Tự do / Không bắt buộc
                          </span>
                        )}
                      </div>

                      {hasGps ? (
                        <div className="text-[11px] text-slate-600 flex items-center justify-between font-mono">
                          <span>{proj.latitude.toFixed(5)}, {proj.longitude.toFixed(5)}</span>
                          <span className="text-blue-600 font-sans font-medium">Bán kính: {proj.allowedRadiusMeters || 150}m</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-600">Chưa cài đặt tọa độ công trường.</p>
                      )}

                      {proj.address && (
                        <p className="text-[11px] text-slate-400 truncate">Địa chỉ: {proj.address}</p>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Quân số dự án</span>
                        <span className="font-bold text-base text-slate-900">{proj.totalMembers || 0} NV</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Trạng thái vận hành</span>
                        <span className="font-semibold text-emerald-600">Đang triển khai</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer with Manage Members Button */}
                  <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Màu: <span className="font-mono text-slate-600">{proj.color}</span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openMembersModal(proj)}
                      className="text-xs font-semibold text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 border-blue-200 flex items-center gap-1.5"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Quản lý thành viên ({proj.totalMembers || 0})
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal Tạo Dự Án Mới */}
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border relative animate-in fade-in zoom-in-95 duration-150">
              <button 
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-base font-bold text-slate-900 mb-1">Tạo Dự Án / Chiến Dịch Mới</h2>
              <p className="text-xs text-slate-500 mb-5">Dự án mới sẽ được lưu trực tiếp vào cơ sở dữ liệu PostgreSQL</p>

              <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Mã Dự án *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. BPO-TIKI" 
                      value={code} 
                      onChange={e => setCode(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Tên Dự án *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. CSKH Tiki Marketplace" 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Khách hàng / Đối tác</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tiki Corporation" 
                      value={client} 
                      onChange={e => setClient(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Màu nhận diện</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={color} 
                        onChange={e => setColor(e.target.value)}
                        className="h-9 w-12 border rounded-xl cursor-pointer p-0.5"
                      />
                      <span className="font-mono text-xs text-slate-600">{color}</span>
                    </div>
                  </div>
                </div>

                {/* GPS Settings Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={requireGps} 
                        onChange={e => setRequireGps(e.target.checked)}
                        className="rounded text-blue-600 h-4 w-4"
                      />
                      Bắt buộc định vị GPS Geofencing
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoDetectGpsCreate}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 underline"
                    >
                      <Navigation className="h-3 w-3" /> Lấy GPS hiện tại của tôi
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Vĩ độ (Lat)</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="10.7725"
                        value={lat} 
                        onChange={e => setLat(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Kinh độ (Lng)</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="106.7012"
                        value={lng} 
                        onChange={e => setLng(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Bán kính (m)</label>
                      <input 
                        type="number" 
                        placeholder="150"
                        value={radius} 
                        onChange={e => setRadius(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Địa chỉ công trường</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tòa nhà Saigon Centre, Lê Lợi, Q1"
                      value={address} 
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5 border-t">
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
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tạo Dự Án Vào CSDL'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Chỉnh Sửa Dự Án */}
        {editModalOpen && editingProject && (
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
                Chỉnh Sửa Dự Án & Cấu Hình GPS
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Cập nhật thông tin cho chiến dịch <strong className="text-slate-800">{editingProject.code}</strong>
              </p>

              <form onSubmit={handleUpdateProject} className="space-y-4 text-xs">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Tên Dự án *</label>
                  <input 
                    type="text" 
                    required 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Khách hàng / Đối tác</label>
                    <input 
                      type="text" 
                      value={editClient} 
                      onChange={e => setEditClient(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Màu nhận diện</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={editColor} 
                        onChange={e => setEditColor(e.target.value)}
                        className="h-9 w-12 border rounded-xl cursor-pointer p-0.5"
                      />
                      <span className="font-mono text-xs text-slate-600">{editColor}</span>
                    </div>
                  </div>
                </div>

                {/* GPS Settings Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editRequireGps} 
                        onChange={e => setEditRequireGps(e.target.checked)}
                        className="rounded text-blue-600 h-4 w-4"
                      />
                      Bắt buộc định vị GPS Geofencing
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoDetectGpsEdit}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 underline"
                    >
                      <Navigation className="h-3 w-3" /> Lấy GPS hiện tại của tôi
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Vĩ độ (Lat)</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="10.7725"
                        value={editLat} 
                        onChange={e => setEditLat(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Kinh độ (Lng)</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="106.7012"
                        value={editLng} 
                        onChange={e => setEditLng(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Bán kính (m)</label>
                      <input 
                        type="number" 
                        placeholder="150"
                        value={editRadius} 
                        onChange={e => setEditRadius(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Địa chỉ công trường</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tòa nhà Saigon Centre, Lê Lợi, Q1"
                      value={editAddress} 
                      onChange={e => setEditAddress(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5 border-t">
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
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu Thay Đổi'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Quản Lý Thành Viên Dự Án */}
        {membersModalOpen && selectedProjForMembers && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border relative animate-in fade-in zoom-in-95 duration-150">
              <button 
                onClick={() => setMembersModalOpen(false)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Quân Số Dự Án: {selectedProjForMembers.code}
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                {selectedProjForMembers.name} • Hiện có {projectMembers.length} nhân sự
              </p>

              {/* Thêm nhân viên vào dự án */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                <select
                  value={selectedNewEmpId}
                  onChange={e => setSelectedNewEmpId(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                >
                  <option value="">-- Chọn nhân viên để thêm vào dự án --</option>
                  {availableEmployeesToAdd.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.code} - {emp.fullName} ({emp.department} - {emp.projectCode ? `Đang ở: ${emp.projectCode}` : 'Chưa gán'})
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!selectedNewEmpId || memberActionLoading}
                  onClick={handleAddMember}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Thêm vào
                </Button>
              </div>

              {/* Danh sách thành viên hiện tại */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {membersLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                    Đang tải danh sách thành viên...
                  </div>
                ) : projectMembers.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    Dự án này chưa có nhân sự nào được phân công.
                  </div>
                ) : (
                  projectMembers.map(member => (
                    <div key={member.id} className="p-3 flex items-center justify-between hover:bg-slate-50/70">
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.code}`} 
                          alt={member.fullName} 
                          className="h-9 w-9 rounded-lg object-cover bg-slate-100"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{member.fullName}</h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {member.code} • {member.position || 'Chuyên viên'} • Ca: {member.shiftName || 'Hành chính'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id, member.fullName)}
                        disabled={memberActionLoading}
                        title="Rút nhân viên khỏi dự án"
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        Gỡ khỏi dự án
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setMembersModalOpen(false)}
                  className="text-xs"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
