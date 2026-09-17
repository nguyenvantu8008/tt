import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MyAttendance from './pages/MyAttendance'
import DailyAttendance from './pages/DailyAttendance'
import MonthlyTimesheet from './pages/MonthlyTimesheet'
import EmployeeList from './pages/EmployeeList'
import ProjectList from './pages/ProjectList'
import OnsiteKiosk from './pages/OnsiteKiosk'

function App() {
  const token = localStorage.getItem('token')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-attendance" element={<MyAttendance />} />
        <Route path="/onsite-kiosk" element={<OnsiteKiosk />} />
        <Route path="/daily-attendance" element={<DailyAttendance />} />
        <Route path="/monthly-timesheet" element={<MonthlyTimesheet />} />
        <Route path="/employees" element={<EmployeeList />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
