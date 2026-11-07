# Ashwani Senapati — Portfolio

A minimal, UX-first portfolio website built with **React** and **Vite**.

## Preview

> Live demo coming soon.

## Tech Stack

- **React 18** — Component-based UI
- **Vite** — Fast dev server and optimized builds
- **CSS** — Custom properties, responsive design, animations
- **Google Fonts** — Inter + Playfair Display

## Features

- Scroll-reveal animations via Intersection Observer
- Responsive mobile navigation with smooth scrolling
- Active section highlighting in navbar
- Subtle cursor glow effect (desktop)
- Contact form with submit state feedback
- Fully responsive across all breakpoints

## Project Structure

```
src/
├── components/
│   ├── Navbar.jsx
│   ├── Hero.jsx
│   ├── About.jsx
│   ├── Skills.jsx
│   ├── Experience.jsx
│   ├── Projects.jsx
│   ├── Blog.jsx
│   ├── Contact.jsx
│   └── Footer.jsx
├── hooks/
│   ├── useScrollReveal.js
│   └── useCursorGlow.js
├── App.jsx
├── main.jsx
└── styles.css
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

MIT
