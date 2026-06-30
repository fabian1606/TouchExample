#include <TouchManager.h>

// ===== Konfiguration: { Pin, Event-Name, Taste(ungenutzt), Threshold } =====
// Im Serial-Modus zaehlt nur der Event-Name; pro Pin wird eine JSON-Zeile
// ueber Serial gesendet, z.B. {"event":"button_a","pin":1,"touched":true,"raw":1234}
TouchConfig config[] = {
  {1, "button_a", 0, 3000},
  {2, "button_b", 0, 3000},
  {3, "slider",   0, 2500},
};
// ===========================================================================

TouchManager touchManager;

void setup(){
  Serial.begin(115200);
  touchManager.begin(config, MODE_SERIAL);
}

void loop(){
  touchManager.update();
}
