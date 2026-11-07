import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const lastScrollY = useRef(0)

  // Scroll effect — show on scroll-up, hide on scroll-down
  useEffect(() => {
    const updateNavState = (y) => {
      setScrolled(y > 80)
      if (mobileOpen || y <= 80) {
        setHidden(false)
      } else if (y > lastScrollY.current) {
        setHidden(true)   // scrolling down
      } else {
        setHidden(false)  // scrolling up
      }
      lastScrollY.current = y
    }

    const handleWindowScroll = () => {
      const y = window.__smoother ? window.__smoother.scrollTop() : window.scrollY
      updateNavState(y)
    }

    const navTrigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => updateNavState(self.scroll()),
    })

    handleWindowScroll()
    window.addEventListener('scroll', handleWindowScroll, { passive: true })

    return () => {
      navTrigger.kill()
      window.removeEventListener('scroll', handleWindowScroll)
    }
  }, [mobileOpen])

  // Active section detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + 120
      const sections = document.querySelectorAll('section[id]')
      sections.forEach((section) => {
        const top = section.offsetTop
        const height = section.offsetHeight
        const id = section.getAttribute('id')
        if (scrollY >= top && scrollY < top + height) {
          setActiveSection(id)
        }
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSmoothScroll = useCallback((e, href) => {
    e.preventDefault()
    const section = document.querySelector(href)
    if (section) {
      const nav = document.getElementById('nav')
      const navOffset = nav ? Math.ceil(nav.getBoundingClientRect().height) + 16 : 80
      // Scroll to the section-label/heading, not the padded section top
      const heading = section.querySelector('.section-label, .section-heading')
      const scrollTarget = heading || section

      if (window.__smoother) {
        const y = scrollTarget.offsetTop - navOffset
        window.__smoother.scrollTo(y, true) // smooth animation
      } else {
        const top = scrollTarget.getBoundingClientRect().top + window.scrollY - navOffset
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }
    setMobileOpen(false)
    document.body.style.overflow = ''
  }, [])

  const toggleMobile = () => {
    setMobileOpen((prev) => {
      document.body.style.overflow = !prev ? 'hidden' : ''
      return !prev
    })
  }

  const navLinks = [
    { href: '#about', label: 'About' },
    { href: '#experience', label: 'Experience' },
    { href: '#projects', label: 'Projects' },
    { href: '#blog', label: 'Blog' },
    { href: '#contact', label: 'Contact' },
  ]

  return (
    <>
      {/* Outside <nav> on purpose: the nav's blur and slide effects would size
          the backdrop to the nav bar, and its stacking would paint the backdrop
          over the menu. As a sibling it covers the screen, under the nav. */}
      {mobileOpen && (
        <div
          className="nav-backdrop"
          onClick={toggleMobile}
          aria-hidden="true"
        />
      )}
      <nav className={`nav${scrolled ? ' scrolled' : ''}${hidden ? ' nav-hidden' : ''}`} id="nav">
        <div className="nav-inner">
          <a
            href="#hero"
            className="nav-logo"
            onClick={(e) => handleSmoothScroll(e, '#hero')}
          >
            AS
          </a>
          <div className={`nav-links${mobileOpen ? ' open' : ''}`}>
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={`nav-link${activeSection === href.slice(1) ? ' active' : ''}`}
                onClick={(e) => handleSmoothScroll(e, href)}
              >
                {label}
              </a>
            ))}
          </div>
          <button
            className={`nav-toggle${mobileOpen ? ' active' : ''}`}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={toggleMobile}
          >
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
    </>
  )
}
