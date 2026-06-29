#!/usr/bin/env node
// Erzeugt aus den gebauten Firmware-Binaries die esp-web-tools-Manifeste
// und eine globale index.json. Erwartet, dass die .factory.bin bereits in
// dist/ liegen (vom CI-Build per esptool merge_bin).
//
// Aufruf: node scripts/make-manifests.mjs <BINARY_BASE_URL> [MANIFEST_BASE_URL]
//   BINARY_BASE_URL  = URL der Release-Assets (Binaries), z.B.
//                      https://github.com/<org>/<repo>/releases/download/firmware-latest
//   MANIFEST_BASE_URL = URL, unter der die Manifest-JSONs serviert werden.
//                       Faellt auf BINARY_BASE_URL zurueck wenn nicht angegeben.
//                       Idealerweise gleiche Origin wie die Website (kein CORS).

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BINARY_BASE_URL = (process.argv[2] || "").replace(/\/$/, "");
if (!BINARY_BASE_URL) {
  console.error("Usage: node scripts/make-manifests.mjs <BINARY_BASE_URL> [MANIFEST_BASE_URL]");
  process.exit(1);
}
const MANIFEST_BASE_URL = (process.argv[3] || BINARY_BASE_URL).replace(/\/$/, "");
const BASE_URL = BINARY_BASE_URL;

const ROOT = process.cwd();
const FIRMWARE_DIR = join(ROOT, "firmware");
const DIST = join(ROOT, "dist");

// Version = library.properties version (faellt auf "dev" zurueck).
let libVersion = "dev";
try {
  const props = readFileSync(join(ROOT, "lib/Touch/library.properties"), "utf8");
  const m = props.match(/^version=(.+)$/m);
  if (m) libVersion = m[1].trim();
} catch {}

const projects = readdirSync(FIRMWARE_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .filter((d) => existsSync(join(FIRMWARE_DIR, d.name, "project.json")));

const index = {
  generatedAt: new Date().toISOString(),
  libraryZip: `${BASE_URL}/Touch.zip`,
  libraryVersion: libVersion,
  projects: [],
};

for (const dir of projects) {
  const meta = JSON.parse(
    readFileSync(join(FIRMWARE_DIR, dir.name, "project.json"), "utf8")
  );
  const slug = meta.slug || dir.name;
  const binName = `${slug}.factory.bin`;

  if (!existsSync(join(DIST, binName))) {
    console.warn(`! ${binName} fehlt in dist/ - ueberspringe ${slug}`);
    continue;
  }

  // esp-web-tools-Manifest pro Projekt.
  const manifest = {
    name: meta.name,
    version: libVersion,
    builds: [
      {
        chipFamily: meta.chipFamily,
        parts: [{ path: `${BASE_URL}/${binName}`, offset: 0 }],
      },
    ],
  };
  const manifestName = `${slug}.manifest.json`;
  writeFileSync(join(DIST, manifestName), JSON.stringify(manifest, null, 2));

  index.projects.push({
    name: meta.name,
    slug,
    chipFamily: meta.chipFamily,
    mode: meta.mode,
    description: meta.description,
    manifest: `${MANIFEST_BASE_URL}/${manifestName}`,
  });
  console.log(`+ ${slug} -> ${manifestName}`);
}

writeFileSync(join(DIST, "index.json"), JSON.stringify(index, null, 2));
console.log(`Wrote dist/index.json (${index.projects.length} Projekte)`);
