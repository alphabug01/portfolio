import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  adminCreateUser,
  adminDeleteUser,
  createApp,
  denyAccessRequest,
  getAccessRequests,
  getApps,
  getPlatformUsers,
  setUserAccess,
  updateApp,
} from '../../lib/api'

const ACCESS_OPTIONS = [
  { value: '', label: 'No access' },
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
]

function blankUser() {
  return { email: '', password: '', access: {} }
}

function blankApp() {
  return { slug: '', name: '', url: '', self_signup: false }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—'
}

export default function AdminUsers() {
  const { user: me, isPlatformAdmin } = useAuth()
  const [apps, setApps] = useState([])
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState({}) // "userId:app" -> true while saving

  const [userForm, setUserForm] = useState(null) // null | blankUser()
  const [appForm, setAppForm] = useState(null)   // null | blankApp()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isPlatformAdmin) load()
  }, [isPlatformAdmin])

  async function load() {
    setLoading(true)
    try {
      const [a, u, r] = await Promise.all([getApps(), getPlatformUsers(), getAccessRequests()])
      setApps(a)
      setUsers(u)
      setRequests(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function changeAccess(u, app, role) {
    const key = `${u.id}:${app}`
    const previous = u.access ?? {}
    const next = { ...previous }
    if (role) next[app] = role
    else delete next[app]

    setError('')
    setPending((p) => ({ ...p, [key]: true }))
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, access: next } : x)))
    try {
      await setUserAccess(u.id, app, role)
      // The RPC also marks any open request for this access as approved.
      if (role) setRequests((list) => list.filter((r) => !(r.user_id === u.id && r.app === app)))
    } catch (e) {
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, access: previous } : x)))
      setError(e.message)
    } finally {
      setPending((p) => {
        const { [key]: _, ...rest } = p
        return rest
      })
    }
  }

  async function decideRequest(req, role) {
    const key = `${req.user_id}:${req.app}`
    setError('')
    setPending((p) => ({ ...p, [key]: true }))
    try {
      if (role) await setUserAccess(req.user_id, req.app, role)
      else await denyAccessRequest(req.user_id, req.app)
      setRequests((list) => list.filter((r) => !(r.user_id === req.user_id && r.app === req.app)))
      if (role) {
        setUsers((list) =>
          list.map((x) =>
            x.id === req.user_id ? { ...x, access: { ...x.access, [req.app]: role } } : x,
          ),
        )
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setPending((p) => {
        const { [key]: _, ...rest } = p
        return rest
      })
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const access = Object.fromEntries(
        Object.entries(userForm.access).filter(([, role]) => role),
      )
      await adminCreateUser(userForm.email, userForm.password, access)
      setUserForm(null)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser(u) {
    if (!confirm(`Delete ${u.email}? This removes the account and its access to every app.`)) return
    setError('')
    try {
      await adminDeleteUser(u.id)
      setUsers((list) => list.filter((x) => x.id !== u.id))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleCreateApp(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createApp({ ...appForm, slug: appForm.slug.trim().toLowerCase() })
      setAppForm(null)
      setApps(await getApps())
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleApp(app, field) {
    setError('')
    try {
      const updated = await updateApp(app.slug, { [field]: !app[field] })
      setApps((list) => list.map((a) => (a.slug === app.slug ? updated : a)))
    } catch (e) {
      setError(e.message)
    }
  }

  if (!isPlatformAdmin) {
    return (
      <div className="admin-dashboard">
        <section className="admin-section">
          <p className="admin-empty">Only platform admins can manage users and apps.</p>
        </section>
      </div>
    )
  }

  if (loading) return <p className="admin-loading-text">Loading…</p>

  const memberCount = (slug) => users.filter((u) => u.access?.[slug]).length
  const appName = (slug) => apps.find((a) => a.slug === slug)?.name ?? slug

  return (
    <div className="admin-dashboard">
      {error && <div className="admin-error">{error}</div>}

      {/* ── Access requests ───────────────────────────────── */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Access Requests ({requests.length})</h2>
        </div>

        <p className="admin-hint">
          People who signed in to an invite-only app without access. A denied request stays denied
          unless you grant access in the Users table.
        </p>

        <div className="admin-table-wrap">
          <table className="admin-table admin-table-matrix">
            <thead>
              <tr>
                <th>Email</th>
                <th>App</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const busy = pending[`${req.user_id}:${req.app}`]
                return (
                  <tr key={`${req.user_id}:${req.app}`}>
                    <td>{req.email || req.user_id.slice(0, 8) + '…'}</td>
                    <td>{appName(req.app)}</td>
                    <td>{formatDate(req.requested_at)}</td>
                    <td className="admin-actions">
                      <button
                        className="admin-btn admin-btn-primary admin-btn-sm"
                        disabled={busy}
                        onClick={() => decideRequest(req, 'member')}
                      >
                        Approve
                      </button>
                      <button
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        disabled={busy}
                        onClick={() => decideRequest(req, 'admin')}
                      >
                        Approve as admin
                      </button>
                      <button
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        disabled={busy}
                        onClick={() => decideRequest(req, null)}
                      >
                        Deny
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!requests.length && (
                <tr>
                  <td colSpan={4} className="admin-empty">No pending requests</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Users ─────────────────────────────────────────── */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Users ({users.length})</h2>
          {!userForm && (
            <button
              onClick={() => { setUserForm(blankUser()); setError('') }}
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              + Add User
            </button>
          )}
        </div>

        <p className="admin-hint">
          New accounts get no access. Grant each app here, or let people join an app whose
          sign-up is open.
        </p>

        {userForm && (
          <div className="admin-user-form-wrap">
            <h3>Add New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label htmlFor="new-user-email">Email</label>
                  <input
                    id="new-user-email"
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="new-user-password">Password</label>
                  <input
                    id="new-user-password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    value={userForm.password}
                    onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="admin-access-grid">
                {apps.map((app) => (
                  <div className="admin-field" key={app.slug}>
                    <label htmlFor={`new-user-${app.slug}`}>{app.name}</label>
                    <select
                      id={`new-user-${app.slug}`}
                      value={userForm.access[app.slug] ?? ''}
                      onChange={(e) =>
                        setUserForm((f) => ({
                          ...f,
                          access: { ...f.access, [app.slug]: e.target.value },
                        }))
                      }
                    >
                      {ACCESS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create User'}
                </button>
                <button type="button" className="admin-btn admin-btn-outline" onClick={() => setUserForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="admin-table-wrap">
          <table className="admin-table admin-table-matrix">
            <thead>
              <tr>
                <th>Email</th>
                {apps.map((app) => (
                  <th key={app.slug} title={app.slug}>
                    {app.name}
                    {!app.active && <span className="admin-muted"> (off)</span>}
                  </th>
                ))}
                <th>Last sign-in</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === me?.id
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        <span>{u.email || u.id.slice(0, 8) + '…'}</span>
                        {isMe && <span className="admin-tag">you</span>}
                        {u.is_platform_admin && (
                          <span className="admin-role-badge admin-role-admin">platform</span>
                        )}
                      </div>
                    </td>
                    {apps.map((app) => {
                      const locked = isMe && app.slug === 'portfolio'
                      return (
                        <td key={app.slug}>
                          <select
                            className={`admin-access-select${u.access?.[app.slug] ? ' has-access' : ''}`}
                            aria-label={`${u.email} access to ${app.name}`}
                            value={u.access?.[app.slug] ?? ''}
                            disabled={locked || pending[`${u.id}:${app.slug}`]}
                            title={locked ? 'You cannot change your own portfolio access' : ''}
                            onChange={(e) => changeAccess(u, app.slug, e.target.value)}
                          >
                            {ACCESS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                      )
                    })}
                    <td>{formatDate(u.last_sign_in_at)}</td>
                    <td className="admin-actions">
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        disabled={isMe}
                        title={isMe ? 'You cannot delete your own account' : 'Delete the account everywhere'}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!users.length && (
                <tr>
                  <td colSpan={apps.length + 3} className="admin-empty">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Apps ──────────────────────────────────────────── */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Apps ({apps.length})</h2>
          {!appForm && (
            <button
              onClick={() => { setAppForm(blankApp()); setError('') }}
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              + Add App
            </button>
          )}
        </div>

        <p className="admin-hint">
          Open sign-up lets anyone who signs in to that app join it as a member, and gives them
          nothing else. Invite only means you grant access here.
        </p>

        {appForm && (
          <div className="admin-user-form-wrap">
            <h3>Add New App</h3>
            <form onSubmit={handleCreateApp}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label htmlFor="new-app-name">Name</label>
                  <input
                    id="new-app-name"
                    required
                    value={appForm.name}
                    onChange={(e) => setAppForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="new-app-slug">Slug</label>
                  <input
                    id="new-app-slug"
                    required
                    pattern="[a-z][a-z0-9_\-]{1,31}"
                    title="Lowercase letters, numbers, - or _, starting with a letter"
                    placeholder="e.g. myapp"
                    value={appForm.slug}
                    onChange={(e) => setAppForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label htmlFor="new-app-url">URL</label>
                  <input
                    id="new-app-url"
                    type="url"
                    placeholder="https://…"
                    value={appForm.url}
                    onChange={(e) => setAppForm((f) => ({ ...f, url: e.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="new-app-signup">Sign-up</label>
                  <select
                    id="new-app-signup"
                    value={appForm.self_signup ? 'open' : 'invite'}
                    onChange={(e) => setAppForm((f) => ({ ...f, self_signup: e.target.value === 'open' }))}
                  >
                    <option value="invite">Invite only</option>
                    <option value="open">Open sign-up</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ? 'Adding…' : 'Add App'}
                </button>
                <button type="button" className="admin-btn admin-btn-outline" onClick={() => setAppForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="admin-table-wrap">
          <table className="admin-table admin-table-matrix">
            <thead>
              <tr>
                <th>App</th>
                <th>Slug</th>
                <th>Users</th>
                <th>Sign-up</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.slug}>
                  <td>
                    {app.url ? (
                      <a href={app.url} target="_blank" rel="noreferrer">{app.name}</a>
                    ) : (
                      app.name
                    )}
                  </td>
                  <td><code>{app.slug}</code></td>
                  <td>{memberCount(app.slug)}</td>
                  <td>
                    <button
                      className="admin-btn admin-btn-outline admin-btn-sm"
                      onClick={() => toggleApp(app, 'self_signup')}
                      title="Switch between open sign-up and invite only"
                    >
                      {app.self_signup ? 'Open' : 'Invite only'}
                    </button>
                  </td>
                  <td>
                    <button
                      className="admin-btn admin-btn-outline admin-btn-sm"
                      onClick={() => toggleApp(app, 'active')}
                      disabled={app.slug === 'portfolio'}
                      title={app.active ? 'Turning an app off blocks everyone from its data' : 'Turn the app back on'}
                    >
                      {app.active ? 'Active' : 'Off'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
