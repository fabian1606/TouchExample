<script setup lang="ts">
// Laedt esp-web-tools clientseitig und rendert den Install-Button.
// esp-web-tools nutzt die Web Serial API (nur Chrome/Edge).
import { onMounted } from "vue";

defineProps<{ manifest: string }>();

onMounted(async () => {
  await import("esp-web-tools");
});
</script>

<template>
  <esp-web-install-button :manifest="manifest">
    <button slot="activate" class="btn">Verbinden &amp; Flashen</button>
    <span slot="unsupported">Dein Browser unterstuetzt kein Web Serial - nutze Chrome oder Edge.</span>
    <span slot="not-allowed">Web Serial ist hier nicht erlaubt (nur ueber HTTPS).</span>
  </esp-web-install-button>
</template>
