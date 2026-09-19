import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/authContext'
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/layout/RouteGuards'

// Public Auth Pages
import Login from './pages/Login'

// Employee Experience Pages (Mobile-First)
import EmployeeHome from './pages/employee/EmployeeHome'
import EmployeePunch from './pages/employee/EmployeePunch'
import EmployeeHistory from './pages/employee/EmployeeHistory'
import EmployeePayslip from './pages/employee/EmployeePayslip'
import EmployeeProfile from './pages/employee/EmployeeProfile'

// Admin / Manager Experience Pages (Desktop-First)
import Dashboard from './pages/Dashboard'
import DailyAttendance from './pages/DailyAttendance'
import AttendanceExceptions from './pages/admin/AttendanceExceptions'
import MonthlyTimesheet from './pages/MonthlyTimesheet'
import EmployeeList from './pages/EmployeeList'
import ProjectList from './pages/ProjectList'
import PayrollWizard from './pages/admin/PayrollWizard'

function RootRedirect() {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={isAdmin ? "/admin/dashboard" : "/app/home"} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />

          {/* Root Redirect based on Role */}
          <Route path="/" element={<RootRedirect />} />

          {/* EMPLOYEE EXPERIENCE ROUTES (Protected) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app/home" element={<EmployeeHome />} />
            <Route path="/app/punch" element={<EmployeePunch />} />
            <Route path="/app/history" element={<EmployeeHistory />} />
            <Route path="/app/payslip" element={<EmployeePayslip />} />
            <Route path="/app/profile" element={<EmployeeProfile />} />
          </Route>

          {/* ADMIN & MANAGER EXPERIENCE ROUTES (Admin Only) */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/attendance" element={<DailyAttendance />} />
            <Route path="/admin/exceptions" element={<AttendanceExceptions />} />
            <Route path="/admin/timesheet" element={<MonthlyTimesheet />} />
            <Route path="/admin/employees" element={<EmployeeList />} />
            <Route path="/admin/projects" element={<ProjectList />} />
            <Route path="/admin/payroll" element={<PayrollWizard />} />
          </Route>

          {/* Backward Compatibility Aliases */}
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/daily-attendance" element={<Navigate to="/admin/attendance" replace />} />
          <Route path="/monthly-timesheet" element={<Navigate to="/admin/timesheet" replace />} />
          <Route path="/employees" element={<Navigate to="/admin/employees" replace />} />
          <Route path="/projects" element={<Navigate to="/admin/projects" replace />} />
          <Route path="/my-attendance" element={<Navigate to="/app/punch" replace />} />
          <Route path="/onsite-kiosk" element={<Navigate to="/admin/attendance" replace />} />

          {/* Fallback 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
