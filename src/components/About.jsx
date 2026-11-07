export default function About() {
  return (
    <section className="section about" id="about">
      <div className="container">
        <div className="section-label reveal">01 — About</div>
        <div className="about-grid">
          <div className="about-text">
            <h2 className="section-heading reveal">
              Developer by profession.<br />
              <span className="italic">Designer at heart.</span>
            </h2>
            <p className="about-body reveal">
              With 6 years of experience building full-stack applications, I've learned that the best code serves its
              users — not the other way around. I'm a Manager in IT at IFFCO Tokio, where I build systems
              that real people depend on every day.
            </p>
            <p className="about-body reveal">
              I've always had an inclination toward product design, so design school was on the table — but I chose
              engineering. Now I design and develop end to end, with full control over how an idea looks, feels, and
              works. I care about UX not as a buzzword, but as a responsibility.
            </p>
            <p className="about-body reveal">
              Currently expanding my craft into React, Next.js, and Node.js — because good tools make good design
              possible.
            </p>
          </div>
          <div className="about-details reveal">
            <div className="detail-card">
              <h3 className="detail-label">What I believe</h3>
              <ul className="belief-list">
                <li>Design is how it works, not how it looks</li>
                <li>Complexity is a design failure</li>
                <li>Users don't read — they scan</li>
                <li>Good UX is invisible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
