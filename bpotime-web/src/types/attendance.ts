export type AttendanceStatus = 
  | 'PRESENT'   // Có mặt đủ công (1.0)
  | 'LATE'      // Đi muộn (0.75 hoặc 0.5)
  | 'HALF_DAY'  // Nửa ngày (0.5)
  | 'LEAVE'     // Nghỉ phép có lương (1.0)
  | 'ABSENT'    // Nghỉ không phép (0.0)
  | 'OFF'       // Ngày nghỉ tuần

export interface Shift {
  id: string
  name: string
  code: string
  startTime: string
  endTime: string
  breakTime: string
  totalHours: number
}

export interface Project {
  id: string
  code: string
  name: string
  client: string
  color: string
  totalMembers: number
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
}

export interface Employee {
  id: string
  code: string
  fullName: string
  email: string
  phone: string
  department: string
  position: string
  shiftId: string
  projectId: string
  avatar: string
  joinDate: string
  status: 'ACTIVE' | 'PROBATION' | 'INACTIVE'
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  projectId: string
  date: string // YYYY-MM-DD
  checkIn: string | null // HH:mm
  checkOut: string | null // HH:mm
  status: AttendanceStatus
  workedHours: number
  otHours: number
  notes?: string
}

export interface CheckInEvent {
  employeeId: string
  timestamp: string
  type: 'CHECK_IN' | 'CHECK_OUT'
  projectId: string
  location: string
}
