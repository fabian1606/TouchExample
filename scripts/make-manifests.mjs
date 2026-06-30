#!/usr/bin/env node
// Erzeugt aus den gebauten Firmware-Binaries die esp-web-tools-Manifeste
// und eine globale index.json. Erwartet, dass die .factory.bin bereits in
// dist/ liegen (vom CI-Build per esptool merge_bin).
//
// Aufruf: node scripts/make-manifests.mjs <BINARY_BASE_URL>
//   BINARY_BASE_URL = URL der Release-Assets (Binaries), z.B.
//                     https://github.com/<org>/<repo>/releases/download/firmware-latest
//
// Die Manifest-JSONs selbst werden ueber die Website (gleiche Origin) serviert;
// der index.json speichert dafuer einen relativen Pfad (manifests/<slug>.manifest.json).

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const BASE_URL = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE_URL) {
  console.error("Usage: node scripts/make-manifests.mjs <BINARY_BASE_URL>");
  process.exit(1);
}

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
  // Binary-Pfad relativ zum Manifest (liegt in web/public/manifests/), die
  // .bin in web/public/firmware/. esp-web-tools loest das gegen die Manifest-URL
  // auf -> gleiche Origin wie die Website -> kein CORS (Release-Assets haben keins).
  const manifest = {
    name: meta.name,
    version: libVersion,
    builds: [
      {
        chipFamily: meta.chipFamily,
        parts: [{ path: `../firmware/${binName}`, offset: 0 }],
      },
    ],
  };
  const manifestName = `${slug}.manifest.json`;
  writeFileSync(join(DIST, manifestName), JSON.stringify(manifest, null, 2));

  const exampleFolder = meta.exampleFolder || slug;
  const exampleDir = join(ROOT, "lib/Touch/examples", exampleFolder);
  const codeFiles = existsSync(exampleDir)
    ? readdirSync(exampleDir).filter((f) => extname(f) === ".ino")
    : [];

  index.projects.push({
    name: meta.name,
    slug,
    chipFamily: meta.chipFamily,
    mode: meta.mode,
    description: meta.description,
    exampleFolder,
    codeFiles,
    // Relativer Pfad (ohne Domain): die Website loest ihn gegen ihre baseURL
    // auf -> funktioniert lokal (/manifests/...) und deployed (/<repo>/manifests/...).
    manifest: `manifests/${manifestName}`,
  });
  console.log(`+ ${slug} -> ${manifestName} (${codeFiles.length} code files)`);
}

writeFileSync(join(DIST, "index.json"), JSON.stringify(index, null, 2));
console.log(`Wrote dist/index.json (${index.projects.length} Projekte)`);
