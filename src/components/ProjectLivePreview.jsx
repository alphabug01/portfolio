import { useState } from 'react'

// A project's live site framed as its image. It's decorative and takes no pointer
// events, so the card link and smooth scrolling keep working over it. The
// gradient behind it shows until it has loaded, or if it never does.
export default function ProjectLivePreview({ src, title }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <iframe
      className={`project-live-preview${loaded ? ' loaded' : ''}`}
      src={src}
      title={`${title} live preview`}
      loading="lazy"
      sandbox="allow-scripts allow-same-origin"
      tabIndex={-1}
      aria-hidden="true"
      onLoad={() => setLoaded(true)}
    />
  )
}
