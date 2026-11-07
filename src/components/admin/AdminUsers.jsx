import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { adminCreateUser, adminDeleteUser, getUsers, updateUser } from '../../lib/api'

function blankForm() {
  return { email: '', password: '', role: 'member' }
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null) // 'add' | 'edit' | null
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(blankForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      setUsers(await getUsers())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setMode('add')
    setEditId(null)
    setForm(blankForm())
    setError('')
  }

  function openEdit(u) {
    setMode('edit')
    setEditId(u.id)
    setForm({ email: u.email ?? '', password: '', role: u.role ?? 'member' })
    setError('')
  }

  function close() {
    setMode(null)
    setEditId(null)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (mode === 'add') {
        await adminCreateUser(form.email, form.password, form.role)
      } else {
        await updateUser(editId, { role: form.role })
      }
      close()
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this user from Portfolio? Their account is kept if they use another app.')) return
    try {
      await adminDeleteUser(id)
      setUsers((p) => p.filter((u) => u.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) return <p className="admin-loading-text">Loading…</p>

  return (
    <div className="admin-dashboard">
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Users ({users.length})</h2>
          {!mode && (
            <button onClick={openAdd} className="admin-btn admin-btn-primary admin-btn-sm">
              + Add User
            </button>
          )}
        </div>

        {error && <div className="admin-error">{error}</div>}

        {mode && (
          <div className="admin-user-form-wrap">
            <h3>{mode === 'add' ? 'Add New User' : 'Edit User'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={mode === 'edit'}
                    autoComplete="off"
                  />
                </div>
                {mode === 'add' && (
                  <div className="admin-field">
                    <label>Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Min 8 characters"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>

              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-actions">
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : mode === 'add' ? 'Create User' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={close}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || u.id.slice(0, 8) + '…'}</td>
                  <td>
                    <span className={`admin-role-badge admin-role-${u.role}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td className="admin-actions">
                    <button
                      onClick={() => openEdit(u)}
                      className="admin-btn admin-btn-outline admin-btn-sm"
                      disabled={u.id === me?.id}
                      title={u.id === me?.id ? 'Cannot edit your own account' : ''}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="admin-btn admin-btn-danger admin-btn-sm"
                      disabled={u.id === me?.id}
                      title={u.id === me?.id ? 'Cannot remove your own account' : ''}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={4} className="admin-empty">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
