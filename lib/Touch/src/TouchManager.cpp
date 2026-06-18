#include "TouchManager.h"

// USB-HID-Keyboard ist nur auf Chips mit nativem USB (ESP32-S2/S3) verfuegbar.
#if defined(CONFIG_TINYUSB_HID_ENABLED) || defined(ARDUINO_USB_MODE)
  #include <USB.h>
  #include <USBHIDKeyboard.h>
  static USBHIDKeyboard Keyboard;
  #define TOUCH_HAS_KEYBOARD 1
#endif

Touch::Touch()
{
}

void Touch::begin(int pin)
{
    lowerThreshold = UINT16_MAX;
    upperThreshold = 0;
    threshold = 300;
    this->pin = pin;
}

void Touch::setThreshold(uint32_t threshold)
{
    this->threshold = threshold;
}

bool Touch::checkValue()
{
    uint32_t touch_value = touchRead(this->pin);

    values.push_back(touch_value);
    longTimeAverageValues.push_back(touch_value);
    if(values.size() > 200){
        values.erase(values.begin());
    }

    if(longTimeAverageValues.size() > 2000){
        longTimeAverageValues.erase(longTimeAverageValues.begin());
    }

    uint32_t sum = 0;
    for(int i = 0; i<values.size(); i++){
        sum += values[i];
    }
    uint32_t average = sum/values.size();

    uint32_t longTimeSum = 0;
    for(int i = 0; i<longTimeAverageValues.size(); i++){
        longTimeSum += longTimeAverageValues[i];
    }
    uint32_t longTimeAverage = longTimeSum/longTimeAverageValues.size();

    return average > longTimeAverage + threshold;
}

int Touch::getRawValue()
{
    return touchRead(this->pin);
}

void TouchManager::begin(TouchConfig* config, int count, TouchMode mode)
{
    this->config = config;
    this->count = count;
    this->mode = mode;
    touches.resize(count);
    lastTouched.assign(count, false);
    for(int i = 0; i < count; i++){
        touches[i].begin(config[i].pin);
        touches[i].setThreshold(config[i].threshold);
    }

#ifdef TOUCH_HAS_KEYBOARD
    if(mode == MODE_KEYBOARD){
        Keyboard.begin();
        USB.begin();
    }
#endif
}

void TouchManager::update()
{
    for(int i = 0; i < count; i++){
        bool touched = touches[i].checkValue();
        if(mode == MODE_KEYBOARD){
            emitKeyboard(i, touched);
        } else {
            emitSerial(i, touched, touches[i].getRawValue());
        }
    }
}

void TouchManager::emitSerial(int i, bool touched, int raw)
{
    Serial.print("{\"event\":\"");
    Serial.print(config[i].event);
    Serial.print("\",\"pin\":");
    Serial.print(config[i].pin);
    Serial.print(",\"touched\":");
    Serial.print(touched ? "true" : "false");
    Serial.print(",\"raw\":");
    Serial.print(raw);
    Serial.println("}");
}

void TouchManager::emitKeyboard(int i, bool touched)
{
#ifdef TOUCH_HAS_KEYBOARD
    // Nur auf Flankenwechsel reagieren: druecken bei Beruehrung, loslassen beim Ende.
    if(touched && !lastTouched[i]){
        Keyboard.press(config[i].keycode);
    } else if(!touched && lastTouched[i]){
        Keyboard.release(config[i].keycode);
    }
#endif
    lastTouched[i] = touched;
}
