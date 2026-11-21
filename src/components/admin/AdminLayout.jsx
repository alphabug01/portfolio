import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { user, role, isPlatformAdmin, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin" replace />
  }

  if (role !== 'admin') {
    return (
      <div className="admin-loading">
        <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Access Denied</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>You do not have permission to access this page.</p>
          <button className="admin-btn admin-btn-outline" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-inner">
          <a href="/admin/dashboard" className="admin-logo">
            Portfolio Admin
          </a>
          <nav className="admin-nav">
            <a href="/admin/dashboard">Dashboard</a>
            {isPlatformAdmin && <a href="/admin/users">Users &amp; Apps</a>}
            <a href="/admin/change-password">Change Password</a>
            <button onClick={logout} className="admin-btn admin-btn-outline admin-btn-sm">
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
