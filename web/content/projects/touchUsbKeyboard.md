---
title: Touch → Tastatur (ESP32-S3)
---

## Was macht dieses Beispiel?

Der ESP32-S3 erscheint am Rechner als echte USB-Tastatur. Sobald ein Touch-Pin
berührt wird, drückt der ESP die konfigurierte Taste — genau wie eine normale
Taste auf der Tastatur.

Das funktioniert in **jedem Programm** auf dem Rechner: Spiele, Präsentationen,
Browser, Video-Schnitt. Kein Browser-Tab muss offen bleiben.

## Konfiguration anpassen

Öffne `lib/Touch/examples/usbKeyboard/usbKeyboard.ino` (oder lade den Code oben runter).
Ändere die Config-Tabelle:

```cpp
TouchConfig config[] = {
  // { Pin, Event-Name, Taste, Threshold }
  {1, "links",  'a',        3000},
  {2, "rechts", 'd',        3000},
  {3, "enter",  KEY_RETURN, 2500},
};
```

- **Pin**: GPIO-Nummer des Touch-Pads (1–14 auf dem ESP32-S3).
- **Taste**: ein Zeichen (`'a'`, `' '`) oder eine Sondertaste (`KEY_RETURN`,
  `KEY_UP_ARROW`, `KEY_F1`, …). Vollständige Liste im
  [Arduino-HID-Keyboard-Header](https://github.com/espressif/arduino-esp32/blob/master/libraries/USB/src/USBHIDKeyboard.h).
- **Threshold**: Empfindlichkeit. Kleiner = empfindlicher. Richtwert: 2000–4000.

## Board in den Flash-Modus bringen

Falls der ESP nicht automatisch erkannt wird:

1. **BOOT**-Taste gedrückt halten
2. Kurz **RESET** drücken (oder USB ab- und anstecken)
3. BOOT loslassen
4. Dann in der Browser-Seite auf „Verbinden & Flashen" klicken

## Warum ESP32-S3?

Nur der **ESP32-S2 und S3** haben natives USB. Beim klassischen ESP32 gibt es keinen
USB-Controller im Chip — dort braucht man einen externen CH340/CP2102-Chip nur
für die Kommunikation, und echter USB-HID-Betrieb ist nicht möglich.
