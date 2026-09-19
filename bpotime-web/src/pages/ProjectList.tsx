import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminLayout from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import BulkActionBar from '@/components/ui/BulkActionBar'
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
  FolderKanban,
  CheckSquare,
  Square,
  Edit3,
  Search,
  ExternalLink
} from 'lucide-react'
import { getCurrentGpsPosition } from '@/lib/geoUtils'
import { logClientError } from '@/lib/clientLogger'

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Multi-select state
  const [selectedProjIds, setSelectedProjIds] = useState<string[]>([])
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [bulkStatusVal, setBulkStatusVal] = useState('ACTIVE')
  const [bulkLoading, setBulkLoading] = useState(false)

  // Create Project Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [color, setColor] = useState('#2563EB')
  const [requireGps, setRequireGps] = useState(true)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState('20')
  const [address, setAddress] = useState('')

  // Edit Project Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [editName, setEditName] = useState('')
  const [editClient, setEditClient] = useState('')
  const [editColor, setEditColor] = useState('#2563EB')
  const [editStatus, setEditStatus] = useState('ACTIVE')
  const [editRequireGps, setEditRequireGps] = useState(true)
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [editRadius, setEditRadius] = useState('20')
  const [editAddress, setEditAddress] = useState('')

  // Google Maps Address Geocoding
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoMsg, setGeoMsg] = useState<string | null>(null)

  // Members Management Modal
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [selectedProjForMembers, setSelectedProjForMembers] = useState<any>(null)
  const [projectMembers, setProjectMembers] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [selectedNewEmpId, setSelectedNewEmpId] = useState('')
  const [memberActionLoading, setMemberActionLoading] = useState(false)

  const toggleSelectProj = (id: string) => {
    setSelectedProjIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAllProjects = () => {
    if (selectedProjIds.length === projects.length && projects.length > 0) {
      setSelectedProjIds([])
    } else {
      setSelectedProjIds(projects.map(p => p.id))
    }
  }

  const handleBulkStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedProjIds.length === 0) return

    try {
      setBulkLoading(true)
      const res = await axios.post('/api/projects/bulk-update-status', {
        projectIds: selectedProjIds,
        status: bulkStatusVal
      })
      alert(res.data.message || `Đã cập nhật trạng thái cho ${selectedProjIds.length} dự án!`)
      setBulkStatusOpen(false)
      setSelectedProjIds([])
      await fetchProjects()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái.')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkDeleteProjects = async () => {
    if (selectedProjIds.length === 0) return

    const confirmDelete = window.confirm(
      `CẢNH BÁO XÓA HÀNG LOẠT DỰ ÁN:\n\nBạn có chắc chắn muốn xóa ${selectedProjIds.length} dự án đã chọn?\n\n• Dự án đã có lịch sử chấm công: Hệ thống sẽ tự động chuyển sang 'Tạm dừng (ON_HOLD)' để bảo vệ toàn vẹn dữ liệu chấm công.\n• Dự án chưa có chấm công: Sẽ xóa vĩnh viễn khỏi hệ thống.`
    )
    if (!confirmDelete) return

    try {
      setBulkLoading(true)
      const res = await axios.post('/api/projects/bulk-delete', {
        projectIds: selectedProjIds
      })
      alert(res.data.message || 'Xóa dự án thành công!')
      setSelectedProjIds([])
      await fetchProjects()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xóa.')
    } finally {
      setBulkLoading(false)
    }
  }

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
      setEditLat(String(res.coords.latitude))
      setEditLng(String(res.coords.longitude))
    } else {
      alert(res.error || 'Không lấy được GPS từ thiết bị.')
    }
  }

  // Tự động tìm kiếm tọa độ từ Địa chỉ / Tên tòa nhà hoặc Link Google Maps
  const handleLookupAddress = async (mode: 'create' | 'edit', queryOverride?: string) => {
    const query = (queryOverride !== undefined ? queryOverride : (mode === 'create' ? address : editAddress)) || ''
    if (!query.trim()) {
      alert('Vui lòng nhập địa chỉ, tên tòa nhà hoặc dán liên kết Google Maps.')
      return
    }

    try {
      setGeoLoading(true)
      setGeoMsg(null)
      const res = await axios.get(`/api/geo/lookup?query=${encodeURIComponent(query.trim())}`)
      if (res.data && res.data.found) {
        if (mode === 'create') {
          setLat(String(res.data.latitude))
          setLng(String(res.data.longitude))
          if (res.data.formattedAddress && (!address || address.includes('http') || /^-?\d/.test(address))) {
            setAddress(res.data.formattedAddress)
          }
        } else {
          setEditLat(String(res.data.latitude))
          setEditLng(String(res.data.longitude))
          if (res.data.formattedAddress && (!editAddress || editAddress.includes('http') || /^-?\d/.test(editAddress))) {
            setEditAddress(res.data.formattedAddress)
          }
        }
        setGeoMsg(`Đã định vị thành công: ${res.data.latitude.toFixed(6)}, ${res.data.longitude.toFixed(6)}`)
      } else {
        setGeoMsg(res.data?.message || 'Không tìm thấy tọa độ cho địa chỉ này.')
      }
    } catch (err: any) {
      setGeoMsg(err.response?.data?.message || 'Không thể tra cứu tọa độ lúc này.')
    } finally {
      setGeoLoading(false)
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
          allowedRadiusMeters: parseInt(radius) || 20,
          requireGps,
          address: address.trim() || null
        })
      }

      setCode('')
      setName('')
      setClient('')
      setLat('')
      setLng('')
      setRadius('20')
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
    setEditRadius(proj.allowedRadiusMeters ? String(proj.allowedRadiusMeters) : '20')
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
        allowedRadiusMeters: editRadius ? parseInt(editRadius) : 20,
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
    <AdminLayout 
      title="Dự án BPO & Vị trí GPS (CSDL PostgreSQL)" 
      subtitle="Quản lý dự án, cấu hình Geofencing định vị công trường và phân bổ thành viên thời gian thực"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Top Header with Select All */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">
              Tổng số: <strong className="text-slate-800 font-bold">{projects.length} dự án trong CSDL</strong>
            </p>
            {projects.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllProjects}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-indigo-200 flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
              >
                {selectedProjIds.length === projects.length ? (
                  <>
                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                    <span>Bỏ chọn ({selectedProjIds.length})</span>
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 text-slate-400" />
                    <span>Chọn tất cả ({projects.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
          <Button 
            size="sm" 
            onClick={() => setModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Tạo dự án mới
          </Button>
        </div>

        {/* Project Cards Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-medium">Đang tải dự án từ PostgreSQL...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map(proj => {
              const hasGps = proj.latitude && proj.longitude
              const isSelected = selectedProjIds.includes(proj.id)
              return (
                <div 
                  key={proj.id} 
                  onClick={() => toggleSelectProj(proj.id)}
                  className={`bg-white border rounded-3xl p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                    isSelected 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/15' 
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelectProj(proj.id)
                          }}
                          className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-indigo-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                        <div 
                          className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                          style={{ backgroundColor: proj.color || '#2563EB' }}
                        >
                          {proj.code.split('-')[1]?.[0] || proj.code[0] || 'P'}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base leading-tight">{proj.name}</h3>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {proj.code} • Khách hàng: {proj.client || 'Nội bộ'}
                          </p>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEditModal(proj)}
                          title="Chỉnh sửa dự án & GPS"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
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
                        <div className="space-y-1.5">
                          <div className="text-[11px] text-slate-600 flex items-center justify-between font-mono">
                            <span>{proj.latitude.toFixed(5)}, {proj.longitude.toFixed(5)}</span>
                            <span className="text-indigo-700 bg-indigo-50 border border-indigo-200/60 font-sans font-bold px-1.5 py-0.5 rounded-md text-[10px]">
                              Bán kính: {proj.allowedRadiusMeters || 20}m
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500 truncate max-w-[180px]">{proj.address || 'Địa chỉ chi nhánh'}</span>
                            <a 
                              href={`https://www.google.com/maps?q=${proj.latitude},${proj.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 shrink-0 underline"
                            >
                              <Navigation className="h-3 w-3" /> Mở Maps
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-600">Chưa cài đặt tọa độ chi nhánh.</p>
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-bold text-slate-800 flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="checkbox" 
                        checked={requireGps} 
                        onChange={e => setRequireGps(e.target.checked)}
                        className="rounded text-indigo-600 h-4 w-4"
                      />
                      Định vị GPS thực tế chi nhánh
                    </label>
                    <div className="flex items-center gap-2">
                      <a
                        href="https://www.google.com/maps"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-600 hover:text-slate-800 font-semibold flex items-center gap-1 underline"
                        title="Mở Google Maps để tự chọn điểm và sao chép tọa độ"
                      >
                        <ExternalLink className="h-3 w-3" /> Mở Google Maps
                      </a>
                      <button
                        type="button"
                        onClick={handleAutoDetectGpsCreate}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 underline"
                      >
                        <Navigation className="h-3 w-3" /> Lấy GPS hiện tại
                      </button>
                    </div>
                  </div>

                  {/* Địa chỉ & Tự đọc tọa độ từ Google Maps */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Địa chỉ hoặc Link Google Maps (Tự đọc tọa độ chính xác)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Nhập tên tòa nhà, địa chỉ hoặc dán link Google Maps (VD: Keangnam, Bitexco, Landmark 81...)"
                        value={address} 
                        onChange={e => {
                          const val = e.target.value
                          setAddress(val)
                          if (val.includes('maps') || /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(val.trim())) {
                            handleLookupAddress('create', val)
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleLookupAddress('create')
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleLookupAddress('create')}
                        disabled={geoLoading}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        Tự đọc tọa độ
                      </button>
                    </div>
                    {geoMsg && (
                      <p className="text-[11px] text-indigo-700 font-medium mt-1">{geoMsg}</p>
                    )}
                  </div>

                  {/* Lat, Lng & Bán kính */}
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
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Bán kính (m) <span className="text-indigo-600 font-bold">*</span>
                      </label>
                      <input 
                        type="number" 
                        placeholder="20"
                        value={radius} 
                        onChange={e => setRadius(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono text-xs font-semibold text-indigo-700"
                      />
                    </div>
                  </div>

                  {/* Khung bản đồ Google Maps tương tác */}
                  {lat && lng && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                      <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-600" /> Bản đồ Google Maps ({Number(lat).toFixed(5)}, {Number(lng).toFixed(5)})
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${lat},${lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Mở toàn màn hình
                        </a>
                      </div>
                      <iframe
                        title="Xem trước vị trí Google Maps"
                        width="100%"
                        height="160"
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${lat},${lng}&hl=vi&z=17&output=embed`}
                        className="border-0 block"
                      />
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 italic">
                    * Mặc định 20m (Admin có thể thiết lập giá trị tùy ý). Nhân viên đứng xa quá bán kính này sẽ bắt buộc chuyển sang chế độ Đi công tác/Khác và phải nhập lý do giải trình.
                  </p>
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-bold text-slate-800 flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="checkbox" 
                        checked={editRequireGps} 
                        onChange={e => setEditRequireGps(e.target.checked)}
                        className="rounded text-indigo-600 h-4 w-4"
                      />
                      Định vị GPS thực tế chi nhánh
                    </label>
                    <div className="flex items-center gap-2">
                      <a
                        href="https://www.google.com/maps"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-600 hover:text-slate-800 font-semibold flex items-center gap-1 underline"
                        title="Mở Google Maps để tự chọn điểm và sao chép tọa độ"
                      >
                        <ExternalLink className="h-3 w-3" /> Mở Google Maps
                      </a>
                      <button
                        type="button"
                        onClick={handleAutoDetectGpsEdit}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 underline"
                      >
                        <Navigation className="h-3 w-3" /> Lấy GPS hiện tại
                      </button>
                    </div>
                  </div>

                  {/* Địa chỉ & Tự đọc tọa độ từ Google Maps */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Địa chỉ hoặc Link Google Maps (Tự đọc tọa độ chính xác)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Nhập tên tòa nhà, địa chỉ hoặc dán link Google Maps (VD: Keangnam, Bitexco, Landmark 81...)"
                        value={editAddress} 
                        onChange={e => {
                          const val = e.target.value
                          setEditAddress(val)
                          if (val.includes('maps') || /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(val.trim())) {
                            handleLookupAddress('edit', val)
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleLookupAddress('edit')
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleLookupAddress('edit')}
                        disabled={geoLoading}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        Tự đọc tọa độ
                      </button>
                    </div>
                    {geoMsg && (
                      <p className="text-[11px] text-indigo-700 font-medium mt-1">{geoMsg}</p>
                    )}
                  </div>

                  {/* Lat, Lng & Bán kính */}
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
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Bán kính (m) <span className="text-indigo-600 font-bold">*</span>
                      </label>
                      <input 
                        type="number" 
                        placeholder="20"
                        value={editRadius} 
                        onChange={e => setEditRadius(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono text-xs font-semibold text-indigo-700"
                      />
                    </div>
                  </div>

                  {/* Khung bản đồ Google Maps tương tác */}
                  {editLat && editLng && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                      <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-600" /> Bản đồ Google Maps ({Number(editLat).toFixed(5)}, {Number(editLng).toFixed(5)})
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${editLat},${editLng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Mở toàn màn hình
                        </a>
                      </div>
                      <iframe
                        title="Xem trước vị trí Google Maps"
                        width="100%"
                        height="160"
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${editLat},${editLng}&hl=vi&z=17&output=embed`}
                        className="border-0 block"
                      />
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 italic">
                    * Mặc định 20m (Admin có thể thiết lập giá trị tùy ý). Nhân viên đứng xa quá bán kính này sẽ bắt buộc chuyển sang chế độ Đi công tác/Khác và phải nhập lý do giải trình.
                  </p>
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

        {/* Modal Đổi Trạng Thái Hàng Loạt (Bulk Status Modal) */}
        {bulkStatusOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-indigo-600" />
                  Đổi Trạng Thái {selectedProjIds.length} Dự Án
                </h3>
                <button 
                  type="button"
                  onClick={() => setBulkStatusOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleBulkStatusSubmit} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Chọn trạng thái áp dụng đồng loạt
                  </label>
                  <select
                    value={bulkStatusVal}
                    onChange={e => setBulkStatusVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ACTIVE">Hoạt động (Active - Đang chạy)</option>
                    <option value="ON_HOLD">Tạm dừng (On Hold)</option>
                    <option value="COMPLETED">Đã kết thúc / Hoàn thành (Completed)</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkStatusOpen(false)}
                    className="text-xs font-bold rounded-xl"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={bulkLoading}
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20"
                  >
                    {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận cập nhật'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedProjIds.length}
          onClearSelection={() => setSelectedProjIds([])}
          onBulkEdit={() => setBulkStatusOpen(true)}
          onBulkDelete={handleBulkDeleteProjects}
          editLabel="Đổi trạng thái"
          deleteLabel="Xóa dự án"
          loading={bulkLoading}
        />

      </div>
    </AdminLayout>
  )
}

