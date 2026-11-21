import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCardReveal } from '../hooks/useCardReveal'
import { getBlogs } from '../lib/api'
import { BlogCardSkeleton } from './SkeletonCard'

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const gridRef = useRef(null)
  useCardReveal(gridRef, !loading)

  useEffect(() => {
    getBlogs()
      .then(setPosts)
      .catch((err) => console.error('[Blog] Failed to load posts:', err))
      .finally(() => setLoading(false))
  }, [])

  // Show only top 3 on homepage
  const featured = posts.slice(0, 3)

  return (
    <section className="section blog" id="blog">
      <div className="container">
        <div className="section-label reveal">04 — Blog</div>
        <h2 className="section-heading reveal">Thinking out loud.</h2>
        <p className="section-subtext reveal">
          Notes on design, development, and the messy space in between.
        </p>
        <div className="blog-grid" ref={gridRef}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <BlogCardSkeleton key={i} />)
            : featured.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  state={{ from: 'home' }}
                  className="blog-card card-item"
                  aria-label={post.title}
                >
                  <article>
                    <div className="blog-meta">
                      <span className="blog-date">{post.date}</span>
                      <span className="blog-read">{post.readTime}</span>
                    </div>
                    <h3 className="blog-title">{post.title}</h3>
                    <p className="blog-excerpt">{post.excerpt}</p>
                    <span className="blog-link">
                      Read more &rarr;
                    </span>
                  </article>
                </Link>
              ))}
        </div>
        {!loading && posts.length > 3 && (
          <div className="section-view-all">
            <Link to="/blog" className="view-all-link">
              View all posts &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
