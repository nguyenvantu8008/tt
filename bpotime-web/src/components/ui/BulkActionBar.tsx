import React from 'react'
import { Button } from '@/components/ui/button'
import { X, Trash2, Edit3, CalendarPlus, Loader2 } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkEdit?: () => void
  onBulkDelete?: () => void
  onBulkAttendance?: () => void
  editLabel?: string
  deleteLabel?: string
  attendanceLabel?: string
  loading?: boolean
  children?: React.ReactNode
}

export default function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkEdit,
  onBulkDelete,
  onBulkAttendance,
  editLabel = 'Cập nhật',
  deleteLabel = 'Xóa hàng loạt',
  attendanceLabel = 'Chấm công bù',
  loading = false,
  children
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 text-white shadow-2xl shadow-slate-900/40 border border-slate-700/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Selected Counter Pill */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
        <div className="h-6 w-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-black">
          {selectedCount}
        </div>
        <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
          Đã chọn {selectedCount} mục
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onBulkEdit && (
          <Button
            size="sm"
            onClick={onBulkEdit}
            disabled={loading}
            className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>{editLabel}</span>
          </Button>
        )}

        {onBulkAttendance && (
          <Button
            size="sm"
            onClick={onBulkAttendance}
            disabled={loading}
            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>{attendanceLabel}</span>
          </Button>
        )}

        {children}

        {onBulkDelete && (
          <Button
            size="sm"
            onClick={onBulkDelete}
            disabled={loading}
            className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            <span>{deleteLabel}</span>
          </Button>
        )}
      </div>

      {/* Clear Selection Button */}
      <button
        onClick={onClearSelection}
        title="Bỏ chọn tất cả"
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
