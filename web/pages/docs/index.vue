<script setup lang="ts">
// Listet alle Doku-Seiten aus content/docs/ (nach Dateinamen-Praefix sortiert).
const { data: pages } = await useAsyncData("docs-nav", () =>
  queryContent("/docs").only(["_path", "title", "description"]).find()
);
</script>

<template>
  <div>
    <h1>Dokumentation</h1>
    <div v-for="p in pages" :key="p._path" class="card">
      <h3 style="margin:0 0 0.25rem">
        <NuxtLink :to="p._path">{{ p.title }}</NuxtLink>
      </h3>
      <p style="margin:0;color:var(--muted)">{{ p.description }}</p>
    </div>
  </div>
</template>
