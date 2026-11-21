import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteBlog, deleteProject, getBlogs, getProjects } from '../../lib/api'

export default function AdminDashboard() {
  const [blogs, setBlogs] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getBlogs(), getProjects()])
      .then(([b, p]) => {
        setBlogs(b)
        setProjects(p)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleDeleteBlog(slug) {
    if (!confirm('Delete this blog post?')) return
    await deleteBlog(slug)
    setBlogs((prev) => prev.filter((b) => b.slug !== slug))
  }

  async function handleDeleteProject(slug) {
    if (!confirm('Delete this project?')) return
    await deleteProject(slug)
    setProjects((prev) => prev.filter((p) => p.slug !== slug))
  }

  if (loading) return <p className="admin-loading-text">Loading...</p>

  return (
    <div className="admin-dashboard">
      {/* Blogs Section */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Blog Posts ({blogs.length})</h2>
          <Link to="/admin/blogs/new" className="admin-btn admin-btn-primary admin-btn-sm">
            + New Post
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((blog) => (
                <tr key={blog.slug}>
                  <td className="admin-card-title">{blog.title}</td>
                  <td data-label="Slug"><code>{blog.slug}</code></td>
                  <td data-label="Date">{blog.date}</td>
                  <td className="admin-actions">
                    <Link
                      to={`/admin/blogs/${blog.slug}/edit`}
                      className="admin-btn admin-btn-outline admin-btn-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteBlog(blog.slug)}
                      className="admin-btn admin-btn-danger admin-btn-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {blogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="admin-empty">No blog posts yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Projects Section */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Projects ({projects.length})</h2>
          <Link to="/admin/projects/new" className="admin-btn admin-btn-primary admin-btn-sm">
            + New Project
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Slug</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.slug}>
                  <td data-label="#">{project.number}</td>
                  <td className="admin-card-title">{project.title}</td>
                  <td data-label="Slug"><code>{project.slug}</code></td>
                  <td data-label="Tags">{project.tags?.join(', ')}</td>
                  <td className="admin-actions">
                    <Link
                      to={`/admin/projects/${project.slug}/edit`}
                      className="admin-btn admin-btn-outline admin-btn-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteProject(project.slug)}
                      className="admin-btn admin-btn-danger admin-btn-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-empty">No projects yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
