<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

type Project = {
  name: string;
  slug: string;
  chipFamily: string;
  mode: string;
  description: string;
  manifest: string;
};
type Index = {
  libraryZip: string;
  libraryVersion: string;
  projects: Project[];
  _dev?: boolean;
};

const config = useRuntimeConfig();
const data = ref<Index | null>(null);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const res = await fetch(config.public.firmwareIndex as string);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.value = await res.json();
  } catch (e: any) {
    error.value = e.message ?? String(e);
  }
});

const isDev = computed(() => data.value?._dev);

function modeLabel(mode: string) {
  return mode === "hid" ? "USB-Tastatur" : "Serial JSON";
}
function modeBadge(mode: string) {
  return mode === "hid" ? "green" : "gray";
}
</script>

<template>
  <div>
    <!-- Hero -->
    <div style="margin-bottom:3rem">
      <h1>Touch Lab</h1>
      <p style="font-size:1.1rem;max-width:540px">
        Fertige Firmware für ESP32-Touch-Projekte — direkt im Browser flashen,
        Arduino-Code runterladen, im Semester sofort loslegen.
      </p>
    </div>

    <!-- Dev-Hinweis wenn Firmware noch nicht gebaut -->
    <div v-if="isDev" class="card" style="border-color:var(--accent-dim);margin-bottom:2rem">
      <p style="color:var(--accent)">
        <strong>Lokal / Dev-Modus:</strong> Die Firmware ist noch nicht gebaut. Push auf main
        und lass die GitHub-Action einmal laufen — dann erscheinen die Projekte hier.
      </p>
    </div>

    <!-- Fehler -->
    <div v-if="error" class="card" style="border-color:#6b2a2a;margin-bottom:2rem">
      <p style="color:#e06c6c">Firmware-Liste konnte nicht geladen werden: <code>{{ error }}</code></p>
    </div>

    <!-- Library-Download -->
    <div v-if="data && !isDev" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:2.5rem;padding-bottom:2rem;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:0.8rem;color:var(--muted);margin-bottom:0.2rem">ARDUINO-LIBRARY</div>
        <div style="font-weight:600">Touch Library <span style="color:var(--muted);font-weight:400">v{{ data.libraryVersion }}</span></div>
        <p style="font-size:0.85rem;margin-top:0.2rem">
          Für die Arduino-IDE: ZIP laden → <em>Sketch › Bibliothek einbinden › .ZIP-Bibliothek</em>
        </p>
      </div>
      <a class="btn ghost" :href="data.libraryZip" download>↓ Library (.zip)</a>
    </div>

    <!-- Projekt-Grid -->
    <div v-if="data && !isDev">
      <h2 style="margin-top:0">Projekte</h2>
      <div class="project-grid">
        <NuxtLink
          v-for="p in data.projects"
          :key="p.slug"
          :to="`/projects/${p.slug}`"
          class="project-card"
        >
          <!-- Bild -->
          <div class="project-image">
            <img
              :src="`/images/${p.slug}.jpg`"
              :alt="p.name"
              @error="($event.target as HTMLImageElement).style.display='none'"
            />
            <div class="project-image-placeholder">
              <span>{{ p.chipFamily }}</span>
            </div>
          </div>

          <!-- Info -->
          <div class="project-info">
            <div style="display:flex;gap:0.4rem;margin-bottom:0.5rem;flex-wrap:wrap">
              <span class="badge">{{ p.chipFamily }}</span>
              <span class="badge" :class="modeBadge(p.mode)">{{ modeLabel(p.mode) }}</span>
            </div>
            <h3 style="margin-bottom:0.35rem;font-size:1.05rem">{{ p.name }}</h3>
            <p style="font-size:0.875rem;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{{ p.description }}</p>
          </div>

          <div class="project-arrow">→</div>
        </NuxtLink>
      </div>
    </div>

    <!-- Ladeindikator -->
    <div v-if="!data && !error" style="color:var(--muted)">Lade …</div>
  </div>
</template>

<style scoped>
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
.project-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
}
.project-card:hover {
  border-color: var(--accent);
  background: var(--card-hover);
}
.project-image {
  width: 100%; aspect-ratio: 16/9;
  background: var(--border);
  position: relative; overflow: hidden;
}
.project-image img {
  width: 100%; height: 100%; object-fit: cover;
  position: absolute; inset: 0;
}
.project-image-placeholder {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; color: var(--muted);
  background: linear-gradient(135deg, #141720 0%, #1e2433 100%);
}
.project-info { padding: 1.1rem 1.1rem 0.75rem; flex: 1; }
.project-arrow {
  padding: 0.75rem 1.1rem;
  color: var(--muted); font-size: 1.1rem;
  text-align: right;
  transition: color 0.15s;
}
.project-card:hover .project-arrow { color: var(--accent); }
</style>
