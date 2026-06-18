<template>
  <div>
    <h1>Serial-Bridge</h1>
    <p>
      Fuer den klassischen ESP32 (ohne natives USB): Die Seite liest die
      JSON-Events ueber Web Serial und kann sie auf Tastendruecke im Browser-Tab
      abbilden. Flashe zuerst die <NuxtLink to="/">Serial-Firmware</NuxtLink>.
    </p>
    <ClientOnly>
      <SerialBridge />
    </ClientOnly>
  </div>
</template>
