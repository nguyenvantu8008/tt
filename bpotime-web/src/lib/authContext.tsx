import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

export interface UserSession {
  userId: string
  email: string
  username: string
  roles: string[]
  employeeId?: string | null
  fullName?: string | null
  avatar?: string | null
}

interface AuthContextType {
  token: string | null
  user: UserSession | null
  isAuthenticated: boolean
  isAdmin: boolean
  isEmployee: boolean
  isManager: boolean
  login: (token: string, user: UserSession) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<UserSession | null>(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  // Synchronize Axios default Authorization header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  const login = (newToken: string, newUser: UserSession) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  const roles = user?.roles || []
  const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || roles.includes('HR_MANAGER')
  const isManager = isAdmin || roles.includes('PROJECT_MANAGER') || roles.includes('TEAM_LEADER')
  const isEmployee = !isAdmin && (roles.includes('EMPLOYEE') || roles.length === 0)

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isAdmin,
        isEmployee,
        isManager,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
