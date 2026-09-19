import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/authContext'

/**
 * Requires valid authenticated session
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

/**
 * Requires ADMIN or HR_MANAGER or SUPER_ADMIN role
 */
export function AdminRoute() {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin) {
    return <Navigate to="/app/home" replace />
  }
  return <Outlet />
}

/**
 * Route for Public Pages (e.g. /login)
 * If already logged in, automatically redirects to role-appropriate home
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin/dashboard" : "/app/home"} replace />
  }
  return <>{children}</>
}
