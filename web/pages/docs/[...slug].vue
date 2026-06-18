<template>
  <div>
    <NuxtLink to="/docs" class="tag" style="display:inline-block;margin-bottom:1rem">&larr; Doku-Übersicht</NuxtLink>
    <ContentDoc>
      <template #not-found>
        <p>Diese Seite gibt es nicht. <NuxtLink to="/docs">Zur Übersicht</NuxtLink>.</p>
      </template>
    </ContentDoc>
  </div>
</template>
