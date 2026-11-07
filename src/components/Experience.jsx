export default function Experience() {
  return (
    <section className="section experience" id="experience">
      <div className="container">
        <div className="section-label reveal">02 — Experience</div>
        <h2 className="section-heading reveal">Where I've been.</h2>
        <div className="timeline">
          <div className="timeline-item reveal">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <h3 className="timeline-role">Manager — IT</h3>
                <span className="timeline-period">Apr 2026 — Present</span>
              </div>
              <p className="timeline-company">IFFCO Tokio General Insurance</p>
              <p className="timeline-desc">
                Full stack development across enterprise applications. Building systems that serve both internal teams
                and customers — with a focus on usability, maintainability, and thoughtful design decisions.
              </p>
              <div className="timeline-tags">
                <span>Spring Boot</span>
                <span>Angular</span>
                <span>Spring JPA</span>
                <span>REST APIs</span>
              </div>
            </div>
          </div>
          <div className="timeline-item reveal">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <h3 className="timeline-role">Assistant Manager — IT</h3>
                <span className="timeline-period">Apr 2023 — Apr 2026</span>
              </div>
              <p className="timeline-company">IFFCO Tokio General Insurance</p>
            </div>
          </div>
          <div className="timeline-item reveal">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <h3 className="timeline-role">Senior Executive — IT</h3>
                <span className="timeline-period">Nov 2020 — Apr 2023</span>
              </div>
              <p className="timeline-company">IFFCO Tokio General Insurance</p>
            </div>
          </div>
        </div>
        <div className="education reveal">
          <div className="education-card">
            <div className="education-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
              </svg>
            </div>
            <div>
              <h3 className="education-degree">B.E. in Electronics &amp; Communication Engineering</h3>
              <p className="education-school">Netaji Subhas Institute of Technology (NSIT), Delhi University</p>
              <p className="education-year">Batch of 2020</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
