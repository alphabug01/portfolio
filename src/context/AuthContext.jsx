import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabasePublic } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)     // 'admin' | 'member' | null
  const [loading, setLoading] = useState(true)

  async function syncRole(sessionUser) {
    if (!sessionUser) {
      setRole(null)
      return
    }
    try {
      const { data, error } = await supabasePublic
        .from('user_projects')
        .select('role')
        .eq('user_id', sessionUser.id)
        .eq('project', 'portfolio')
        .single()
      if (error && error.code !== 'PGRST116') throw error
      setRole(data?.role ?? 'member')
    } catch {
      setRole('member')
    }
  }

  useEffect(() => {
    // Hydrate from existing session (getSession reads localStorage — fast, no network)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      await syncRole(u)
      setLoading(false)
    })

    // Keep state in sync across tabs / token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      await syncRole(u)
    })

    return () => subscription.unsubscribe()
  }, [])

  /** Sign in with email + password (Supabase Auth). */
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    await syncRole(data.user)
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

