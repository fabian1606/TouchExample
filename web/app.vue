<template>
  <div>
    <header class="topbar">
      <div class="topbar-inner">
        <NuxtLink to="/" class="brand">Touch Lab</NuxtLink>
        <nav>
          <NuxtLink to="/">Projekte</NuxtLink>
          <NuxtLink to="/bridge">Serial-Bridge</NuxtLink>
          <NuxtLink to="/docs">Doku</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="page">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
:root {
  --bg: #0c0e13;
  --card: #141720;
  --card-hover: #1a1e28;
  --fg: #e8eaf0;
  --muted: #8890a0;
  --accent: #5b9cf6;
  --accent-dim: #2a3d6b;
  --border: #232737;
  --radius: 14px;
  --topbar-h: 56px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--fg);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.topbar {
  position: sticky; top: 0; z-index: 100;
  background: #0c0e13cc;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  height: var(--topbar-h);
}
.topbar-inner {
  max-width: 1100px; margin: 0 auto;
  padding: 0 1.5rem;
  height: 100%;
  display: flex; align-items: center; justify-content: space-between;
}
.brand {
  font-size: 1.05rem; font-weight: 700; letter-spacing: -0.01em;
  color: var(--fg); text-decoration: none;
}
.topbar nav { display: flex; gap: 1.5rem; }
.topbar a {
  color: var(--muted); text-decoration: none; font-size: 0.9rem;
  transition: color 0.15s;
}
.topbar a:hover, .topbar a.router-link-active { color: var(--fg); }
.page { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }

/* Cards */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  background: var(--accent); color: #fff;
  padding: 0.55rem 1.1rem; border-radius: 8px;
  text-decoration: none; border: none; cursor: pointer;
  font-size: 0.9rem; font-weight: 500;
  transition: opacity 0.15s;
}
.btn:hover { opacity: 0.85; }
.btn.ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--fg);
}
.btn.ghost:hover { border-color: var(--accent); color: var(--accent); }

/* Badges */
.badge {
  font-size: 0.72rem; padding: 0.2rem 0.55rem; border-radius: 20px;
  background: var(--accent-dim); color: var(--accent);
  font-weight: 600; letter-spacing: 0.02em;
}
.badge.green { background: #1a3a2a; color: #6fcf97; }
.badge.gray  { background: var(--border); color: var(--muted); }

/* Typography */
h1 { font-size: 2rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.4rem; }
h2 { font-size: 1.3rem; font-weight: 600; margin: 2rem 0 0.75rem; }
h3 { font-size: 1rem; font-weight: 600; }
p  { color: var(--muted); }
a  { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Code */
code {
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 0.85em;
  background: #00000055; padding: 0.15rem 0.4rem; border-radius: 5px;
}
pre {
  background: #0a0c10; border: 1px solid var(--border);
  border-radius: 10px; padding: 1.25rem;
  overflow: auto; font-size: 0.85rem; line-height: 1.7;
}
pre code { background: none; padding: 0; }

/* Prose (Nuxt Content) */
.prose h1 { margin-bottom: 1rem; }
.prose h2 { margin-top: 2.5rem; margin-bottom: 0.75rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }
.prose h3 { margin-top: 1.5rem; margin-bottom: 0.5rem; }
.prose p  { margin-bottom: 1rem; }
.prose ul, .prose ol { padding-left: 1.5rem; margin-bottom: 1rem; color: var(--muted); }
.prose li { margin-bottom: 0.25rem; }
.prose table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.9rem; }
.prose th { background: var(--border); padding: 0.6rem 1rem; text-align: left; color: var(--fg); }
.prose td { padding: 0.6rem 1rem; border-bottom: 1px solid var(--border); color: var(--muted); }
.prose pre { margin: 1.25rem 0; }
.prose blockquote {
  border-left: 3px solid var(--accent-dim); padding-left: 1rem;
  margin: 1rem 0; color: var(--muted); font-style: italic;
}
</style>
