# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) with `-beta` pre-release tags.

> **Status:** Pre-release. No stable v1.0 has been published yet.

---

## [Unreleased]

### Added

- `src/components/ProjectLivePreview.jsx` — frames a project's live site as its card thumbnail and detail hero, from an optional `links.preview` URL
- `src/components/admin/AdminProjectForm.jsx` — Live Preview URL field

---

## [0.8.0-beta] — 2026-04-04

### Changed

- `src/lib/supabase.js` — Supabase JS client explicitly scoped to `portfolio` schema via `db.schema` option
- `src/lib/api.js` — REST fetch helpers updated with `Accept-Profile` and `Content-Profile: portfolio` headers to match schema restructure
- `src/styles.css` — project card widths made consistent; scroll section fluidity parameters tuned

### Removed

- `src/data/posts.js`, `src/data/projects.js` — static fallback data deleted (all data now sourced from Supabase)
- `src/hooks/useScrollReveal.js` — legacy Intersection Observer scroll hook removed (superseded by `useGsapScrollReveal`)
- `src/context/AuthContext.jsx` — dead code cleaned up

---

## [0.7.0-beta] — 2026-03-26

### Added

- `AUDIT.md` — comprehensive interface quality audit report (23 issues identified and resolved across Critical/High/Medium/Low severity)
- `design-system.md` — full design system documentation covering tokens, typography, motion, components, and layout
- `.github/copilot-instructions.md` — persistent AI design context with brand guidelines, aesthetic direction, and design principles
- `.impeccable.md` — design quality reference for the project

### Changed

- `styles.css` — major overhaul: all hardcoded color values replaced with CSS tokens; `prefers-reduced-motion` support added; `.reveal.visible` dead code removed; easing curves normalised to `cubic-bezier(0.16, 1, 0.3, 1)`; reduced excessive section padding
- `admin.css` — token alignment and consistency pass
- `Contact.jsx` — form replaced with social links only; fake submission handler removed
- `Navbar.jsx` — `aria-expanded` added to mobile menu toggle; mobile nav backdrop implemented
- `Projects.jsx` — homepage grid changed to featured-first asymmetric layout (`3fr 2fr`, first card spans 2 rows); placeholder thumbnails now use deterministic color hash from project slug
- `ProjectsPage.jsx` — listing empty state and filter CSS classes defined
- `ProjectDetail.jsx` — inline styles removed; bare `<p>Loading...</p>` replaced with skeleton; `<main>` landmark added
- `BlogDetail.jsx` — bare loading state replaced with skeleton; `<main>` landmark added
- `BlogPage.jsx`, `Blog.jsx` — aria label verbosity reduced on blog cards
- `SkeletonCard.jsx` — fleshed out with proper accessible markup
- `useCardReveal.js` — filter dependency added to re-trigger reveal on filter change
- `useCursorGlow.js` — persistent `will-change` removed; applied only during active movement
- `useGsapScrollReveal.js` — `will-change` lifecycle managed; `scrollLine` animation easing fixed; reduced-motion respected
- `App.jsx` — minor routing and layout fixes

### Fixed

- All focus indicators now visible (keyboard navigation accessible)
- `--color-available` availability dot migrated from hardcoded `#4ade80` to `oklch(0.62 0.1 145)` (warm muted green, palette-consistent)
- `btn-primary:hover` hardcoded `#333` replaced with design token
- Box-shadow `rgba(0,0,0,0.12)` replaced with token
- `.scroll-line::after` migrated to `transform: translateX()` + `will-change: transform`

---

## [0.6.0-beta] — 2026-03-25

### Added

- Impeccable front-end agent skills system (`.agents/skills/`)
  - 15+ design skills: `adapt`, `animate`, `arrange`, `audit`, `bolder`, `clarify`, `colorize`, `critique`, `delight`, `distill`, `extract`, `frontend-design`, `harden`, `normalize`, `onboard`, `optimize`, `overdrive`, `polish`, `quieter`, `teach-impeccable`, `typeset`
  - Frontend design reference library (`color-and-contrast`, `interaction-design`, `motion-design`, `responsive-design`, `spatial-design`, `typography`, `ux-writing`)
  - `copilot-instructions.md` with full design context and brand guidelines

---

## [0.5.0-beta] — 2026-03-09

### Changed

- Updated `AdminUsers.jsx` with improved user management UI
- Refined styling for the admin forbidden/unauthorized page

---

## [0.4.0-beta] — 2026-02-28

### Added

- Full admin panel with JWT-based authentication (`/admin/*`)
  - Login page with background texture
  - Dashboard with project and blog management
  - CRUD forms for projects and blog posts (`AdminProjectForm`, `AdminBlogForm`)
  - User management and access control (`AdminUsers`, `AdminChangePassword`)
  - Admin layout wrapper with protected routes (`AdminLayout`)
- `AuthContext` for global auth state across admin routes
- Dedicated admin stylesheet (`src/styles/admin.css`)
- Breadcrumb navigation component
- Full listing pages for projects and blog (`ProjectsPage`, `BlogPage`)
- Skeleton loading cards for async content (`SkeletonCard`)
- Favicon (`public/favicon.svg`)

### Changed

- Integrated all new features into `App.jsx` routing and config
- `Projects.jsx` and `Blog.jsx` updated to support pagination and full listing links
- `BlogDetail.jsx` and `ProjectDetail.jsx` updated for API-driven data

---

## [0.3.0-beta] — 2026-02-28

### Added

- Express backend server with REST API (`server/`)
  - Auth routes with bcrypt + JWT (`server/routes/auth.js`)
  - Blog and project CRUD routes
  - Auth middleware (`server/middleware/auth.js`)
  - Static seed data (`server/data/blogs.json`, `server/data/projects.json`)
- Supabase integration and API client (`src/lib/supabase.js`, `src/lib/api.js`)
- Supabase schema definition (`supabase-schema.sql`)
- GSAP smooth scrolling via `ScrollSmoother` (`SmoothScroller` component)
- Scroll-triggered animation hooks (`useGsapScrollReveal`, `useCardReveal`)
- `concurrently` to run frontend and backend together (`npm run dev`)

### Changed

- `vite.config.js` updated to proxy API requests to the Express server

---

## [0.2.0-beta] — 2026-02-28

### Added

- Projects and Blog section components with dynamic rendering
- Dark mode via `[data-theme='dark']` CSS attribute
- Theme keyboard shortcut (`useThemeShortcut` hook) replacing the toggle button
- Cursor glow effect on desktop (`useCursorGlow` hook)

### Changed

- Dark mode toggle removed from UI in favour of keyboard shortcut

---

## [0.1.0-beta] — 2026-02-27

### Added

- Initial React 18 + Vite project scaffold
- Core portfolio sections: Hero, About, Skills, Experience, Projects, Blog, Contact, Footer
- `Navbar` with active-section highlighting and mobile menu
- Scroll-reveal animations via Intersection Observer (`useScrollReveal`)
- Responsive layout with custom CSS properties (no utility framework)
- Typography system: Inter (body) + Playfair Display (editorial accents)
- Warm neutral light-mode token system (`src/styles.css`)
- React Router v6 for page navigation
