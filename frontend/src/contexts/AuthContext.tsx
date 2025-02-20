"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { getUserData, isAuthenticated, clearAuth } from '@/lib/auth'

interface AuthContextType {
  isAuthenticated: boolean
  user: { id: string; name: string; email: string } | null
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
  })

  useEffect(() => {
    setAuth({
      isAuthenticated: isAuthenticated(),
      user: getUserData(),
    })
  }, [])

  const logout = () => {
    clearAuth()
    setAuth({
      isAuthenticated: false,
      user: null,
    })
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth.isAuthenticated,
        user: auth.user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

