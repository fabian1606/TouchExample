<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

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
};
type Index = {
  libraryZip: string;
  libraryVersion: string;
  projects: Project[];
};

const project = ref<Project | null>(null);
const index = ref<Index | null>(null);
const fetchError = ref<string | null>(null);

// Nuxt Content fuer die Doku-Seite dieses Projekts (optional).
const { data: doc } = await useAsyncData(`project-doc-${slug}`, () =>
  queryContent(`/projects/${slug}`).findOne().catch(() => null)
);

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
const codeDownloadUrl = computed(() => {
  const folder = project.value?.exampleFolder ?? slug;
  const repoUrl = (config.public.repoUrl as string) || "";
  if (!repoUrl) return null;
  return `${repoUrl}/raw/main/lib/Touch/examples/${folder}/${folder}.ino`;
});
const codeLocalUrl = computed(() => {
  const folder = project.value?.exampleFolder ?? slug;
  return `/code/${folder}.ino`;
});
const hasFirmware = computed(() => !!project.value?.manifest && !fetchError.value);
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
            <FlashButton v-if="hasFirmware" :manifest="project!.manifest" />
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

    <!-- Doku aus Nuxt Content -->
    <div v-if="doc" class="prose" style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--border)">
      <ContentRenderer :value="doc" />
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
</style>
