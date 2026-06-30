<script setup lang="ts">
// Eigener Flasher auf Basis von esptool-js (statt esp-web-tools).
// Grund: esp-web-tools v10 kapselt Board-Erkennung und Logs komplett in seinem
// eigenen Dialog und gibt nichts nach aussen weiter. Hier machen wir die
// Erkennung selbst, vergleichen mit der erwarteten chipFamily aus dem Manifest
// und zeigen ein vollstaendiges Live-Log waehrend des Flashens.
//
// Web Serial API -> nur Chrome/Edge, nur ueber HTTPS (oder localhost).
import { onMounted, ref, computed, watch } from "vue";

const props = defineProps<{ manifest: string }>();

type LogLevel = "info" | "error" | "ok";
type LogLine = { ts: string; level: LogLevel; text: string };
type Status = "idle" | "connecting" | "connected" | "flashing" | "done" | "error";

const supported = ref(true);
const status = ref<Status>("idle");
const detectedChip = ref<string | null>(null);
const expectedChip = ref<string | null>(null);
const progress = ref<number | null>(null);
const logs = ref<LogLine[]>([]);
const logBody = ref<HTMLElement | null>(null);

// esptool-js Objekte ueber die Verbindung hinweg halten (Erkennung -> Flashen).
let esploader: any = null;
let transport: any = null;
let port: any = null;

const now = () => new Date().toLocaleTimeString(undefined, { hour12: false });

async function log(text: string, level: LogLevel = "info") {
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "" && text.includes("\n")) continue;
    logs.value.push({ ts: now(), level, text: line });
  }
  await Promise.resolve();
  if (logBody.value) logBody.value.scrollTop = logBody.value.scrollHeight;
}

// Chip-Namen vergleichen: Gross-/Kleinschreibung + Leerzeichen egal.
const normChip = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();
const expectedList = computed(() =>
  (expectedChip.value ?? "").split(/,\s*/).map(normChip).filter(Boolean)
);

const chipMismatch = computed(
  () =>
    !!detectedChip.value &&
    expectedList.value.length > 0 &&
    !expectedList.value.includes(normChip(detectedChip.value))
);

const busy = computed(
  () => status.value === "connecting" || status.value === "flashing"
);

// esptool-js schreibt seine internen Meldungen in dieses Terminal-Objekt.
const terminal = {
  clean: () => {},
  writeLine: (data: string) => log(data, "info"),
  write: (data: string) => {
    // write() kommt ohne Zeilenumbruch - an die letzte Zeile anhaengen.
    const last = logs.value[logs.value.length - 1];
    if (last && data.indexOf("\n") === -1) last.text += data;
    else log(data, "info");
  },
};

async function loadExpectedChip() {
  try {
    const res = await fetch(props.manifest);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const families: string[] = (data.builds ?? [])
      .map((b: any) => b.chipFamily)
      .filter(Boolean);
    expectedChip.value = families.join(", ") || null;
  } catch (e: any) {
    log(`Manifest konnte nicht gelesen werden: ${e.message ?? e}`, "error");
  }
}

// ArrayBuffer -> Binaer-String (latin1), wie esptool-js es fuer writeFlash erwartet.
function bufToBinaryString(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as any);
  }
  return out;
}

async function connectAndDetect() {
  if (!supported.value) return;
  logs.value = [];
  progress.value = null;
  detectedChip.value = null;
  status.value = "connecting";
  try {
    const { Transport, ESPLoader } = await import("esptool-js");
    port = await (navigator as any).serial.requestPort();
    transport = new Transport(port, true);
    esploader = new ESPLoader({
      transport,
      baudrate: 115200,
      romBaudrate: 115200,
      terminal,
    });
    await log("Verbinde mit dem Board…", "info");
    await esploader.main();
    detectedChip.value = esploader.chip?.CHIP_NAME ?? "Unbekannt";
    await log(`Angeschlossenes Board: ${detectedChip.value}`, "ok");
    if (chipMismatch.value) {
      await log(
        `Achtung: Firmware ist fuer ${expectedChip.value}, angeschlossen ist ${detectedChip.value}. Das Flashen wuerde fehlschlagen.`,
        "error"
      );
    }
    status.value = "connected";
  } catch (e: any) {
    await log(`Verbindung fehlgeschlagen: ${e?.message ?? e}`, "error");
    status.value = "error";
    await cleanup();
  }
}

async function flash() {
  if (!esploader) return;
  status.value = "flashing";
  progress.value = 0;
  try {
    const res = await fetch(props.manifest);
    if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
    const manifestData = await res.json();
    // Bevorzugt einen Build, der wirklich zum erkannten Chip passt.
    let build = (manifestData.builds ?? []).find(
      (b: any) => normChip(b.chipFamily) === normChip(detectedChip.value)
    );
    if (!build) {
      // Kein passender Build -> nur weil der Nutzer "Trotzdem flashen" gewaehlt hat.
      // Laut warnen, denn ein ESP32-Image auf einem S3 (o.ae.) wird nicht booten.
      build = (manifestData.builds ?? [])[0];
      if (!build) throw new Error("Kein Build im Manifest gefunden.");
      await log(
        `WARNUNG: Kein Build fuer ${detectedChip.value}. Flashe ${build.chipFamily}-Image ` +
          `auf eigenes Risiko - das passt nicht zum angeschlossenen Board.`,
        "error"
      );
    }

    const baseUrl = new URL(props.manifest, window.location.href);
    const fileArray: { data: string; address: number }[] = [];
    for (const part of build.parts) {
      const url = new URL(part.path, baseUrl).href;
      await log(`Lade Firmware: ${url}`, "info");
      const binRes = await fetch(url);
      if (!binRes.ok) throw new Error(`Firmware HTTP ${binRes.status} (${url})`);
      const buf = await binRes.arrayBuffer();
      await log(`Firmware geladen (${buf.byteLength} Bytes), Offset 0x${part.offset.toString(16)}`, "info");
      fileArray.push({ data: bufToBinaryString(buf), address: part.offset });
    }

    await log("Starte Flash-Vorgang…", "info");
    await esploader.writeFlash({
      fileArray,
      flashSize: "keep",
      flashMode: "keep",
      flashFreq: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (_i: number, written: number, total: number) => {
        progress.value = Math.round((written / total) * 100);
      },
    });

    await log("Flash abgeschlossen, starte Board neu…", "info");
    try {
      await esploader.after();
    } catch {
      /* Reset ist best-effort */
    }
    progress.value = 100;
    status.value = "done";
    await log("Fertig! Die Firmware wurde erfolgreich geflasht.", "ok");
  } catch (e: any) {
    await log(`Flashen fehlgeschlagen: ${e?.message ?? e}`, "error");
    status.value = "error";
  } finally {
    await cleanup();
  }
}

async function cleanup() {
  try {
    await transport?.disconnect();
  } catch {
    /* ignore */
  }
  esploader = null;
  transport = null;
  port = null;
}

function reset() {
  status.value = "idle";
  detectedChip.value = null;
  progress.value = null;
  logs.value = [];
}

onMounted(() => {
  supported.value =
    typeof navigator !== "undefined" && "serial" in navigator;
});

// Erwartete chipFamily laden, sobald (und immer wenn) das Manifest verfuegbar ist.
// Nur onMounted reicht nicht: zur Mount-Zeit kann props.manifest noch leer sein,
// dann bliebe expectedChip null und der Mismatch wuerde nie erkannt.
watch(
  () => props.manifest,
  (m) => {
    if (m) loadExpectedChip();
  },
  { immediate: true }
);
</script>

<template>
  <div class="flash-wrap">
    <!-- Aktionen -->
    <div class="flash-actions">
      <button
        v-if="status === 'idle' || status === 'error' || status === 'done'"
        class="btn"
        :disabled="!supported"
        @click="connectAndDetect"
      >
        Board verbinden &amp; prüfen
      </button>

      <button
        v-if="status === 'connecting'"
        class="btn"
        disabled
      >
        Verbinde…
      </button>

      <button
        v-if="status === 'connected'"
        class="btn"
        :class="{ warn: chipMismatch }"
        @click="flash"
      >
        {{ chipMismatch ? 'Trotzdem flashen' : 'Firmware flashen' }}
      </button>

      <button
        v-if="status === 'flashing'"
        class="btn"
        disabled
      >
        Flashe… {{ progress ?? 0 }}%
      </button>

      <button
        v-if="status === 'done' || status === 'error'"
        class="btn ghost"
        @click="reset"
      >
        Zurücksetzen
      </button>
    </div>

    <p v-if="!supported" class="hint err">
      Dein Browser unterstützt kein Web Serial – nutze Chrome oder Edge (über HTTPS).
    </p>

    <!-- Board-Info: sichtbar sobald eine Verbindung versucht wurde -->
    <div v-if="status !== 'idle'" class="chip-info">
      <span class="chip-row">
        <strong>Erwartet:</strong>
        <span class="badge gray">{{ expectedChip ?? "—" }}</span>
      </span>
      <span class="chip-row">
        <strong>Angeschlossen:</strong>
        <span
          class="badge"
          :class="detectedChip ? (chipMismatch ? 'red' : 'green') : 'gray'"
        >
          {{ detectedChip ?? (busy ? "wird erkannt…" : "—") }}
        </span>
      </span>
    </div>

    <p v-if="chipMismatch" class="hint err">
      ⚠️ Das angeschlossene Board ({{ detectedChip }}) passt nicht zur Firmware
      ({{ expectedChip }}). Schließe ein {{ expectedChip }}-Board an oder flashe auf
      eigenes Risiko.
    </p>

    <!-- Fortschritt -->
    <div v-if="status === 'flashing' && progress != null" class="progress">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- Live-Log -->
    <div v-if="logs.length" class="log-panel">
      <div class="log-head">
        <span>
          Flash-Log
          <span v-if="status === 'flashing' || status === 'connecting'" class="status running">läuft…</span>
          <span v-else-if="status === 'error'" class="status err">Fehler</span>
          <span v-else-if="status === 'done'" class="status ok">fertig</span>
        </span>
      </div>
      <pre ref="logBody" class="log-body"><template v-for="(l, i) in logs" :key="i"><span :class="['log-line', l.level]">{{ l.ts }}  {{ l.text }}</span>
</template></pre>
    </div>
  </div>
</template>

<style scoped>
.flash-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.flash-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.btn.warn {
  background: #6b3a1f;
  color: #ffd0a8;
}
.hint {
  font-size: 0.85rem;
  margin: 0;
}
.hint.err {
  color: #ffb4b4;
}
.chip-info {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
}
.chip-row {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.badge.red {
  background: #4a1f1f;
  color: #ff9a9a;
}
.progress {
  height: 8px;
  border-radius: 6px;
  background: var(--border);
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: #8ec07c;
  transition: width 0.15s ease;
}
.log-panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: #0c0e14;
}
.log-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.7rem;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--border);
  background: #11141d;
}
.status {
  margin-left: 0.4rem;
  font-weight: 600;
}
.status.running { color: #f0c674; }
.status.ok { color: #8ec07c; }
.status.err { color: #ff9a9a; }
.log-body {
  margin: 0;
  padding: 0.6rem 0.7rem;
  max-height: 260px;
  overflow: auto;
  font-size: 0.78rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.log-line { display: block; }
.log-line.error { color: #ff9a9a; }
.log-line.ok { color: #8ec07c; }
.log-line.info { color: #c8ccd4; }
</style>
