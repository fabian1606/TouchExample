---
title: Touch → Serial JSON (ESP32)
---

## Was macht dieses Beispiel?

Der ESP32 sendet bei jedem Loop-Durchlauf pro konfiguriertem Touch-Pin eine
JSON-Zeile über die serielle Schnittstelle (115200 Baud):

```json
{"event":"button_a","pin":1,"touched":true,"raw":1234}
```

Felder:
- `event` — der Name aus der Config-Tabelle
- `pin` — GPIO-Nummer
- `touched` — `true` wenn der Pin gerade berührt wird
- `raw` — Rohwert des Touch-Sensors

## Konfiguration anpassen

Öffne `lib/Touch/examples/serial/serial.ino` (oder lade den Code oben runter).

```cpp
TouchConfig config[] = {
  // { Pin, Event-Name, Taste (ungenutzt), Threshold }
  {1, "button_a", 0, 3000},
  {2, "button_b", 0, 3000},
  {3, "slider",   0, 2500},
};
```

Im Serial-Modus wird das Taste-Feld ignoriert — nur `event` und `threshold` zählen.

## Mit der Serial-Bridge nutzen

Die [Serial-Bridge](/bridge) liest diese Events im Browser und kann sie auf
Tastendrücke mappen — sinnvoll für Web-Apps, die du selbst baust.

## Eigenes Web-Frontend bauen

Mit der Web Serial API kannst du die Events direkt in deiner eigenen Seite lesen:

```js
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 115200 });

const reader = port.readable.pipeThrough(new TextDecoderStream()).getReader();
let buffer = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += value;
  for (const line of buffer.split("\n")) {
    try { const ev = JSON.parse(line); handleEvent(ev); }
    catch {}
  }
  buffer = buffer.split("\n").pop() ?? "";
}
```

> **Hinweis:** Web Serial funktioniert nur in Chrome/Edge und nur über HTTPS oder `localhost`.

## Threshold einstellen

Der Threshold bestimmt, wie empfindlich der Pin ist. Zu niedrig → Falschauslösungen,
zu hoch → muss sehr fest gedrückt werden. Starte mit 3000 und justiere, bis sich
die Reaktion natürlich anfühlt.
