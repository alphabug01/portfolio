import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCardReveal } from '../hooks/useCardReveal'
import { getProjects } from '../lib/api'
import ProjectLivePreview from './ProjectLivePreview'
import { ProjectCardSkeleton } from './SkeletonCard'

// Deterministic warm-neutral gradient per project slug (M2)
const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg, oklch(0.88 0.04 60) 0%, oklch(0.82 0.05 30) 100%)',   // warm amber
  'linear-gradient(135deg, oklch(0.84 0.04 200) 0%, oklch(0.78 0.05 225) 100%)', // muted teal
  'linear-gradient(135deg, oklch(0.86 0.03 280) 0%, oklch(0.80 0.04 310) 100%)', // dusty mauve
  'linear-gradient(135deg, oklch(0.85 0.04 140) 0%, oklch(0.79 0.05 160) 100%)', // sage
  'linear-gradient(135deg, oklch(0.87 0.03 0) 0%, oklch(0.82 0.04 340) 100%)',   // rose blush
]

function slugGradient(slug) {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = ((hash * 31) + slug.charCodeAt(i)) >>> 0
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length]
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const gridRef = useRef(null)
  useCardReveal(gridRef, !loading)

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) => console.error('[Projects] Failed to load projects:', err))
      .finally(() => setLoading(false))
  }, [])

  // Show only top 3 on homepage
  const featured = projects.slice(0, 3)

  return (
    <section className="section projects" id="projects">
      <div className="container">
        <div className="section-label reveal">03 — Projects</div>
        <h2 className="section-heading reveal">Things I've built.</h2>
        <p className="section-subtext reveal">Selected work — more coming soon.</p>
        <div className="projects-grid projects-grid--home" ref={gridRef}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <ProjectCardSkeleton key={i} />)
            : featured.map((project) => (
                <Link
                  key={project.slug}
                  to={`/projects/${project.slug}`}
                  state={{ from: 'home' }}
                  className="project-card card-item"
                >
                  <article>
                    <div
                      className="project-image placeholder-img"
                      style={{ background: slugGradient(project.slug) }}
                    >
                      {project.links?.preview ? (
                        <ProjectLivePreview src={project.links.preview} title={project.title} />
                      ) : (
                        <div className="placeholder-content">
                          <span>{project.title}</span>
                        </div>
                      )}
                    </div>
                    <div className="project-info">
                      <h3 className="project-title">{project.title}</h3>
                      <p className="project-desc">{project.desc}</p>
                      <div className="project-tags">
                        {project.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
        </div>
        {!loading && projects.length > 3 && (
          <div className="section-view-all reveal">
            <Link to="/projects" className="view-all-link">
              View all projects &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
