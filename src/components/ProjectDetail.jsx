import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getProjectBySlug } from '../lib/api'
import Breadcrumb from './Breadcrumb'
import ProjectLivePreview from './ProjectLivePreview'
import { ProjectDetailSkeleton } from './SkeletonCard'

// Deterministic warm-neutral gradient per project slug (M2)
const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg, oklch(0.88 0.04 60) 0%, oklch(0.82 0.05 30) 100%)',
  'linear-gradient(135deg, oklch(0.84 0.04 200) 0%, oklch(0.78 0.05 225) 100%)',
  'linear-gradient(135deg, oklch(0.86 0.03 280) 0%, oklch(0.80 0.04 310) 100%)',
  'linear-gradient(135deg, oklch(0.85 0.04 140) 0%, oklch(0.79 0.05 160) 100%)',
  'linear-gradient(135deg, oklch(0.87 0.03 0) 0%, oklch(0.82 0.04 340) 100%)',
]

function slugGradient(slug) {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = ((hash * 31) + slug.charCodeAt(i)) >>> 0
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length]
}

export default function ProjectDetail() {
  const { slug } = useParams()
  const location = useLocation()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  const from = location.state?.from
  const backTo = from === 'home' ? '/#projects' : '/projects'
  const backLabel = from === 'home' ? 'Back to home' : 'Back to projects'

  useEffect(() => {
    getProjectBySlug(slug)
      .then(setProject)
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return <ProjectDetailSkeleton />
  }

  if (!project) {
    return (
      <main className="detail-view">
        <Link to={backTo} className="detail-back">
          &larr; {backLabel}
        </Link>
        <h2 className="detail-title">Project not found</h2>
      </main>
    )
  }

  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Projects', to: '/projects' },
    { label: project.title },
  ]

  return (
    <main className="detail-view">
      <Breadcrumb items={breadcrumbs} />
      <Link to={backTo} className="detail-back">
        &larr; {backLabel}
      </Link>

      <div className="detail-header">
        <span className="detail-label">{project.number}</span>
        <h2 className="detail-title">{project.title}</h2>
        <div className="project-tags project-header-tags">
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>

      <div
        className="detail-hero placeholder-img"
        style={{ background: slugGradient(slug) }}
      >
        {project.links?.preview ? (
          <ProjectLivePreview src={project.links.preview} title={project.title} />
        ) : (
          <div className="placeholder-content">
            <span>{project.title} — Preview</span>
          </div>
        )}
      </div>

      <div className="detail-body">
        <div className="detail-section">
          <h3>Overview</h3>
          <p>{project.desc}</p>
        </div>

        <div className="detail-section">
          <h3>The Problem</h3>
          <p>
            {project.problem ||
              'Detailed problem statement coming soon. This section will describe the challenge that needed to be solved and the context around it.'}
          </p>
        </div>

        <div className="detail-section">
          <h3>The Approach</h3>
          <p>
            {project.approach ||
              'Detailed approach coming soon. This section will walk through the design and development process, key decisions made, and the reasoning behind them.'}
          </p>
        </div>

        <div className="detail-section">
          <h3>The Outcome</h3>
          <p>
            {project.outcome ||
              'Results and impact coming soon. This section will highlight the outcomes, what was learned, and how it informed future work.'}
          </p>
        </div>

        {project.links && (
          <div className="detail-links">
            {project.links.github && (
              <a
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-link-btn"
              >
                View Code &rarr;
              </a>
            )}
            {project.links.live && (
              <a
                href={project.links.live}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-link-btn detail-link-primary"
              >
                Live Demo &rarr;
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
