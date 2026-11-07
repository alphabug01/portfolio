import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createProject, getProjectBySlug, updateProject } from '../../lib/api'

export default function AdminProjectForm() {
  const { slug } = useParams()
  const isEdit = Boolean(slug)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    slug: '',
    number: '',
    title: '',
    desc: '',
    tags: [],
    problem: '',
    approach: '',
    outcome: '',
    links: { github: '', live: '' },
  })
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) {
      getProjectBySlug(slug)
        .then((data) => {
          if (!data) {
            setError('Project not found')
          } else {
            setForm(data)
            setTagsInput(data.tags?.join(', ') || '')
          }
        })
        .catch(() => setError('Failed to load project'))
    }
  }, [slug, isEdit])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleLinkChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      links: { ...prev.links, [name]: value },
    }))
  }

  function handleTagsChange(e) {
    setTagsInput(e.target.value)
    const tags = e.target.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    setForm((prev) => ({ ...prev, tags }))
  }

  function handleSlugify() {
    if (!isEdit && form.title && !form.slug) {
      const generated = form.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setForm((prev) => ({ ...prev, slug: generated }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (isEdit) {
        await updateProject(slug, form)
      } else {
        await createProject(form)
      }
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-form-page">
      <h2>{isEdit ? 'Edit Project' : 'New Project'}</h2>
      {error && <div className="admin-error">{error}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-row">
          <div className="admin-field">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              onBlur={handleSlugify}
              required
            />
          </div>
          <div className="admin-field">
            <label htmlFor="slug">Slug *</label>
            <input
              id="slug"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              required
              disabled={isEdit}
              placeholder="auto-generated-from-title"
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-field">
            <label htmlFor="number">Number</label>
            <input
              id="number"
              name="number"
              value={form.number}
              onChange={handleChange}
              placeholder="e.g. 01 (auto-generated if empty)"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              id="tags"
              value={tagsInput}
              onChange={handleTagsChange}
              placeholder="e.g. React, Node.js, TypeScript"
            />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="desc">Short Description</label>
          <textarea
            id="desc"
            name="desc"
            value={form.desc}
            onChange={handleChange}
            rows={3}
            placeholder="A brief description shown on the portfolio page..."
          />
        </div>

        <div className="admin-field">
          <label htmlFor="problem">The Problem</label>
          <textarea
            id="problem"
            name="problem"
            value={form.problem}
            onChange={handleChange}
            rows={4}
            placeholder="What challenge needed to be solved?"
          />
        </div>

        <div className="admin-field">
          <label htmlFor="approach">The Approach</label>
          <textarea
            id="approach"
            name="approach"
            value={form.approach}
            onChange={handleChange}
            rows={4}
            placeholder="How did you design and develop the solution?"
          />
        </div>

        <div className="admin-field">
          <label htmlFor="outcome">The Outcome</label>
          <textarea
            id="outcome"
            name="outcome"
            value={form.outcome}
            onChange={handleChange}
            rows={4}
            placeholder="What were the results and lessons learned?"
          />
        </div>

        <div className="admin-form-row">
          <div className="admin-field">
            <label htmlFor="github">GitHub Link</label>
            <input
              id="github"
              name="github"
              value={form.links?.github || ''}
              onChange={handleLinkChange}
              placeholder="https://github.com/..."
            />
          </div>
          <div className="admin-field">
            <label htmlFor="live">Live Demo Link</label>
            <input
              id="live"
              name="live"
              value={form.links?.live || ''}
              onChange={handleLinkChange}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="preview">Live Preview URL</label>
          <input
            id="preview"
            name="preview"
            value={form.links?.preview || ''}
            onChange={handleLinkChange}
            placeholder="A page to frame as the project image (optional)"
          />
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
          </button>
          <button type="button" className="admin-btn admin-btn-outline" onClick={() => navigate('/admin/dashboard')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
