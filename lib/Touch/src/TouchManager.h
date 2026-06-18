#pragma once

#include <Arduino.h>
#include <driver/touch_pad.h>
#include <vector>

// Ein einzelner kapazitiver Touch-Pin mit gleitendem Mittelwert + Langzeit-Basislinie.
class Touch {
    public:
        Touch();
        void begin(int pin);
        bool checkValue();
        int getRawValue();
        void setThreshold(uint32_t threshold);
        uint32_t upperThreshold;
        uint32_t threshold;
    private:
        int pin;

        std::vector<uint32_t> values;
        std::vector<uint32_t> longTimeAverageValues;
        uint32_t lowerThreshold;
};

// Ausgabe-Modus des TouchManagers.
//   MODE_SERIAL : pro Pin ein JSON-Event ueber Serial (fuer Web-Serial-Bridge).
//   MODE_KEYBOARD: bei Touch echten Tastendruck via USB-HID (nur ESP32-S2/S3).
enum TouchMode {
    MODE_SERIAL,
    MODE_KEYBOARD
};

// Konfiguration pro Pin.
//   pin      : GPIO mit Touch-Faehigkeit
//   event    : Event-Name fuer den Serial-Modus (JSON "event")
//   keycode  : Taste fuer den Keyboard-Modus (z.B. 'a' oder KEY_RETURN)
//   threshold: Empfindlichkeit
struct TouchConfig {
    int pin;
    const char* event;
    uint8_t keycode;
    uint32_t threshold;
};

// Verwaltet beliebig viele Touch-Pins anhand einer Config-Tabelle.
class TouchManager {
    public:
        // mode bestimmt, ob JSON ueber Serial gesendet oder eine Taste gedrueckt wird.
        void begin(TouchConfig* config, int count, TouchMode mode = MODE_SERIAL);
        // Array-Groesse wird automatisch ermittelt -> begin(config) / begin(config, mode)
        template <int N>
        void begin(TouchConfig (&config)[N], TouchMode mode = MODE_SERIAL) { begin(config, N, mode); }
        void update();
    private:
        void emitSerial(int i, bool touched, int raw);
        void emitKeyboard(int i, bool touched);

        TouchConfig* config;
        int count;
        TouchMode mode;
        std::vector<Touch> touches;
        std::vector<bool> lastTouched;  // fuer Flankenerkennung im Keyboard-Modus
};
