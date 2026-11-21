import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { user, role, isPlatformAdmin, loading, logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the phone menu on navigation and on Escape.
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

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

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    ...(isPlatformAdmin ? [{ href: '/admin/users', label: 'Users & Apps' }] : []),
    { href: '/admin/change-password', label: 'Change Password' },
  ]

  return (
    <div className="admin-layout">
      {/* A sibling of the header, not a child: the header's backdrop-filter
          would make a fixed child size itself to the header bar. */}
      {menuOpen && (
        <div className="admin-menu-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}
      <header className="admin-header">
        <div className="admin-header-inner">
          <a href="/admin/dashboard" className="admin-logo">
            Portfolio Admin
          </a>
          <button
            type="button"
            className={`admin-menu-toggle${menuOpen ? ' active' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="admin-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span></span>
            <span></span>
          </button>
          <nav id="admin-nav" className={`admin-nav${menuOpen ? ' open' : ''}`}>
            {links.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
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
