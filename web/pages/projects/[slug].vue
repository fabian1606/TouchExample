<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

const route = useRoute();
const slug = route.params.slug as string;
const config = useRuntimeConfig();

type Project = {
  name: string;
  slug: string;
  chipFamily: string;
  mode: string;
  description: string;
  manifest: string;
  exampleFolder?: string;
  codeFiles?: string[];
};
type Index = {
  libraryZip: string;
  libraryVersion: string;
  projects: Project[];
};

const project = ref<Project | null>(null);
const index = ref<Index | null>(null);
const fetchError = ref<string | null>(null);

// Nuxt Content normalisiert Pfade auf Kleinbuchstaben.
const slugLower = slug.toLowerCase();
const [{ data: doc }, { data: docConfig }] = await Promise.all([
  useAsyncData(`project-doc-${slug}`, () =>
    queryContent(`/projects/${slugLower}`).findOne().catch(() => null)
  ),
  useAsyncData(`project-doc-config-${slug}`, () =>
    queryContent(`/projects/${slugLower}-config`).findOne().catch(() => null)
  ),
]);

onMounted(async () => {
  try {
    const res = await fetch(config.public.firmwareIndex as string);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    index.value = await res.json();
    project.value = index.value?.projects.find((p) => p.slug === slug) ?? null;
  } catch (e: any) {
    fetchError.value = e.message ?? String(e);
  }
});

const modeLabel = computed(() =>
  project.value?.mode === "hid" ? "USB-Tastatur" : "Serial JSON"
);

const exampleFolder = computed(() => project.value?.exampleFolder ?? slug);
const codeFiles = computed(() => project.value?.codeFiles ?? []);

const codeDownloadUrl = computed(() => {
  const repoUrl = (config.public.repoUrl as string) || "";
  if (!repoUrl || !codeFiles.value.length) return null;
  const mainFile = codeFiles.value[0];
  return `${repoUrl}/raw/main/lib/Touch/examples/${exampleFolder.value}/${mainFile}`;
});
const codeLocalUrl = computed(() => {
  if (!codeFiles.value.length) return `/code/${exampleFolder.value}.ino`;
  return `/code/${exampleFolder.value}/${codeFiles.value[0]}`;
});

const hasFirmware = computed(() => !!project.value?.manifest && !fetchError.value);

const manifestUrl = computed(() => {
  const m = project.value?.manifest ?? "";
  if (/^https?:\/\//.test(m)) return m;
  const base = (config.app.baseURL as string) || "/";
  return `${base.replace(/\/$/, "")}/${m.replace(/^\//, "")}`;
});

// Aktive Doku-Seite (Anleitung / Konfiguration)
const activeDocTab = ref<"anleitung" | "konfiguration">("anleitung");

// Code-Viewer
const selectedFile = ref<string>("");
const codeContent = ref<string>("");
const codeLoading = ref(false);

watch(
  () => project.value,
  (p) => {
    if (p?.codeFiles?.length) {
      selectedFile.value = p.codeFiles[0];
    }
  }
);

watch(selectedFile, async (file) => {
  if (!file) return;
  codeLoading.value = true;
  codeContent.value = "";
  try {
    const res = await fetch(`/code/${exampleFolder.value}/${file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    codeContent.value = await res.text();
  } catch {
    codeContent.value = "// Datei konnte nicht geladen werden.";
  } finally {
    codeLoading.value = false;
  }
});
</script>

<template>
  <div>
    <NuxtLink to="/" class="badge gray" style="display:inline-block;margin-bottom:1.5rem">← Alle Projekte</NuxtLink>

    <!-- Header -->
    <div class="project-header">
      <div class="project-hero-image">
        <img
          :src="`/images/${slug}.jpg`"
          :alt="slug"
          @error="($event.target as HTMLImageElement).parentElement!.classList.add('no-image')"
        />
        <div class="hero-placeholder">
          <span>{{ project?.chipFamily ?? slug }}</span>
        </div>
      </div>

      <div class="project-header-info">
        <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap">
          <span v-if="project" class="badge">{{ project.chipFamily }}</span>
          <span v-if="project" class="badge" :class="project.mode === 'hid' ? 'green' : 'gray'">{{ modeLabel }}</span>
        </div>

        <h1 style="margin-bottom:0.5rem">{{ project?.name ?? slug }}</h1>
        <p style="font-size:1rem;margin-bottom:1.5rem">{{ project?.description }}</p>

        <div style="display:flex;gap:0.6rem;flex-wrap:wrap">
          <!-- Flash -->
          <ClientOnly>
            <FlashButton v-if="hasFirmware" :manifest="manifestUrl" />
            <p v-else-if="fetchError" style="color:#e06c6c;font-size:0.875rem">
              Firmware nicht verfügbar: {{ fetchError }}
            </p>
          </ClientOnly>

          <!-- Arduino-Code Download -->
          <a v-if="codeDownloadUrl" :href="codeDownloadUrl" class="btn ghost" download>
            ↓ Arduino-Code (.ino)
          </a>
          <a v-else :href="codeLocalUrl" class="btn ghost" download>
            ↓ Arduino-Code (.ino)
          </a>
        </div>

        <!-- Serial-Bridge Hinweis -->
        <p v-if="project?.mode === 'serial'" style="margin-top:1rem;font-size:0.85rem">
          Dieser ESP sendet JSON über Serial.
          <NuxtLink to="/bridge">Zur Serial-Bridge →</NuxtLink>
          um Touch-Events auf Tastendrücke zu mappen.
        </p>
      </div>
    </div>

    <!-- Arduino Code-Viewer -->
    <div v-if="codeFiles.length" style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--border)">
      <h2 style="margin-bottom:1rem;font-size:1.1rem">Arduino Code</h2>

      <!-- Tab-Leiste (nur bei mehreren Dateien) -->
      <div v-if="codeFiles.length > 1" class="code-tabs">
        <button
          v-for="file in codeFiles"
          :key="file"
          class="code-tab"
          :class="{ active: selectedFile === file }"
          @click="selectedFile = file"
        >
          {{ file }}
        </button>
      </div>
      <div v-else class="code-filename">{{ codeFiles[0] }}</div>

      <pre class="code-block"><code>{{ codeLoading ? "Laden…" : codeContent }}</code></pre>
    </div>

    <!-- Doku aus Nuxt Content -->
    <div v-if="doc || docConfig" style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--border)">

      <!-- Tab-Leiste Anleitung / Konfiguration -->
      <div v-if="docConfig" class="doc-tabs">
        <button
          class="doc-tab"
          :class="{ active: activeDocTab === 'anleitung' }"
          @click="activeDocTab = 'anleitung'"
        >Anleitung</button>
        <button
          class="doc-tab"
          :class="{ active: activeDocTab === 'konfiguration' }"
          @click="activeDocTab = 'konfiguration'"
        >Konfiguration</button>
      </div>

      <div class="prose">
        <ContentRenderer v-if="activeDocTab === 'anleitung' && doc" :value="doc" />
        <ContentRenderer v-if="activeDocTab === 'konfiguration' && docConfig" :value="docConfig" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
  align-items: start;
}
@media (max-width: 680px) {
  .project-header { grid-template-columns: 1fr; }
}
.project-hero-image {
  aspect-ratio: 4/3;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--border);
  position: relative;
}
.project-hero-image img {
  width: 100%; height: 100%; object-fit: cover;
  position: absolute; inset: 0;
}
.project-hero-image.no-image img { display: none; }
.hero-placeholder {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; color: var(--muted);
  background: linear-gradient(135deg, #141720 0%, #1e2433 100%);
}

/* Code-Viewer */
.code-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0;
  border-bottom: 1px solid var(--border);
}
.code-tab {
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  font-family: var(--font-mono, monospace);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}
.code-tab:hover { color: var(--fg); }
.code-tab.active {
  color: var(--fg);
  border-bottom-color: var(--accent, #7aa2f7);
}
.code-filename {
  font-size: 0.8rem;
  font-family: var(--font-mono, monospace);
  color: var(--muted);
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0;
}
.code-block {
  background: #0d1117;
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 var(--radius) var(--radius);
  padding: 1.25rem 1.5rem;
  overflow-x: auto;
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.6;
  color: #e6edf3;
  font-family: var(--font-mono, ui-monospace, monospace);
  white-space: pre;
}

/* Doku-Tabs */
.doc-tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2rem;
}
.doc-tab {
  padding: 0.5rem 1.1rem;
  font-size: 0.9rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
  font-weight: 500;
}
.doc-tab:hover { color: var(--fg); }
.doc-tab.active {
  color: var(--fg);
  border-bottom-color: var(--accent, #7aa2f7);
}
</style>
