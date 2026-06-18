<script setup lang="ts">
import { ref, reactive, onUnmounted } from "vue";

type Event = { event: string; pin: number; touched: boolean; raw: number };

const supported = "serial" in navigator;
const connected = ref(false);
const log = ref<Event[]>([]);
const lastByEvent = reactive<Record<string, boolean>>({});

// Mapping Event-Name -> Taste, die im Browser ausgeloest wird.
// Kann frei angepasst werden; standardmaessig leer.
const mapping = reactive<Record<string, string>>({
  button_a: "a",
  button_b: "b",
});

let port: any = null;
let reader: ReadableStreamDefaultReader<string> | null = null;
let keepReading = false;

// Eine Zeile JSON verarbeiten.
function handleLine(line: string) {
  line = line.trim();
  if (!line.startsWith("{")) return;
  let ev: Event;
  try {
    ev = JSON.parse(line);
  } catch {
    return;
  }
  log.value.unshift(ev);
  if (log.value.length > 50) log.value.pop();

  // Flanke erkennen und ggf. Tastendruck im Browser dispatchen.
  const was = lastByEvent[ev.event] ?? false;
  if (ev.touched !== was) {
    const key = mapping[ev.event];
    if (key) dispatchKey(key, ev.touched ? "keydown" : "keyup");
  }
  lastByEvent[ev.event] = ev.touched;
}

function dispatchKey(key: string, type: "keydown" | "keyup") {
  // Hinweis: dispatcht ein KeyboardEvent im Browser-Tab (fuer Web-Apps/Spiele,
  // die du selbst baust). Kein systemweiter Tastendruck - dafuer den S3 mit
  // USB-HID-Firmware nutzen.
  const e = new KeyboardEvent(type, { key, bubbles: true });
  document.dispatchEvent(e);
}

async function connect() {
  try {
    port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 115200 });
    connected.value = true;
    keepReading = true;

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    reader = decoder.readable.getReader();

    let buffer = "";
    while (keepReading) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const l of lines) handleLine(l);
    }
  } catch (e) {
    console.error(e);
    connected.value = false;
  }
}

async function disconnect() {
  keepReading = false;
  try {
    await reader?.cancel();
  } catch {}
  try {
    await port?.close();
  } catch {}
  connected.value = false;
}

onUnmounted(disconnect);
</script>

<template>
  <div>
    <p v-if="!supported" class="card">
      ⚠️ Web Serial wird nicht unterstuetzt - bitte Chrome oder Edge nutzen.
    </p>

    <div class="card">
      <button v-if="!connected" class="btn" @click="connect">ESP verbinden</button>
      <button v-else class="btn secondary" @click="disconnect">Trennen</button>
      <span v-if="connected" style="margin-left:0.75rem;color:#7fd17f">● verbunden</span>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Tasten-Mapping</h3>
      <p style="color:var(--muted);font-size:0.9rem">
        Event-Name &rarr; Taste, die im Browser-Tab ausgeloest wird (fuer eigene
        Web-Apps). Fuer systemweite Tastendruecke den ESP32-S3 mit der
        <NuxtLink to="/">USB-Tastatur-Firmware</NuxtLink> flashen.
      </p>
      <div v-for="(key, ev) in mapping" :key="ev" style="margin-bottom:0.4rem">
        <code>{{ ev }}</code> &rarr;
        <input v-model="mapping[ev]" style="width:4rem" />
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Live-Events</h3>
      <p v-if="!log.length" style="color:var(--muted)">Noch keine Events …</p>
      <pre v-else style="max-height:300px">{{ log.map(e => JSON.stringify(e)).join("\n") }}</pre>
    </div>
  </div>
</template>
