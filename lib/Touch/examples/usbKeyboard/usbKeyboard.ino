#include <TouchManager.h>
#include <USBHIDKeyboard.h>

// ===== Konfiguration: { Pin, Event-Name, Taste, Threshold } =====
// Taste = ein Zeichen ('a', 'x', ' ') oder eine Sondertaste (KEY_RETURN, ...).
// Beispiel: Touch-Pad an Pin 1 tippt die Taste "a".
TouchConfig config[] = {
  {1, "button_a", 'a',        3000},
  {2, "button_b", 'b',        3000},
  {3, "enter",    KEY_RETURN, 2500},
};
// ================================================================

TouchManager touchManager;

void setup(){
  // Im Keyboard-Modus erscheint der ESP32-S3 am Rechner als echte USB-Tastatur.
  touchManager.begin(config, MODE_KEYBOARD);
}

void loop(){
  touchManager.update();
}
