#!/usr/bin/env node

import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TARGET = resolve(ROOT, "native-builder/upload-ready");
const SOURCE_PATHS = [
  "index.html",
  "LICENSE",
  "README.md",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "vite-env.d.ts",
  "public",
  "src",
];
const MANIFEST_NAME = "UPLOAD_MANIFEST.json";
const EXPECTED_TOP_LEVEL = new Set([
  ...SOURCE_PATHS.map((sourcePath) => basename(sourcePath)),
  MANIFEST_NAME,
]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function assertBundleShape() {
  const entries = await readdir(TARGET, { withFileTypes: true });
  const actual = new Set(entries.map((entry) => entry.name));
  const missing = [...EXPECTED_TOP_LEVEL].filter((name) => !actual.has(name));
  const unexpected = [...actual].filter((name) => !EXPECTED_TOP_LEVEL.has(name));

  if (missing.length || unexpected.length) {
    throw new Error(
      `Unsafe Native upload bundle shape. Missing: ${missing.join(", ") || "none"}. `
      + `Unexpected: ${unexpected.join(", ") || "none"}.`,
    );
  }
}

async function buildManifest() {
  const files = (await collectFiles(TARGET))
    .filter((file) => relative(TARGET, file) !== MANIFEST_NAME)
    .sort();
  const manifest = [];
  for (const file of files) {
    const bytes = await readFile(file);
    manifest.push({
      path: relative(TARGET, file),
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  return manifest;
}

async function validateBundle() {
  await assertBundleShape();
  const expectedManifest = JSON.parse(
    await readFile(resolve(TARGET, MANIFEST_NAME), "utf8"),
  );
  const actualFiles = await buildManifest();
  const expectedFiles = expectedManifest.files ?? [];

  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(
      "Native upload bundle no longer matches UPLOAD_MANIFEST.json. Regenerate it before upload.",
    );
  }

  return actualFiles;
}

if (process.argv.includes("--check")) {
  const files = await validateBundle();
  console.log(JSON.stringify({ uploadFolder: TARGET, fileCount: files.length, valid: true }, null, 2));
  process.exit(0);
}

await rm(TARGET, { recursive: true, force: true });
await mkdir(TARGET, { recursive: true });
for (const sourcePath of SOURCE_PATHS) {
  await cp(resolve(ROOT, sourcePath), resolve(TARGET, basename(sourcePath)), {
    recursive: true,
    force: true,
  });
}

const manifest = await buildManifest();
await writeFile(
  resolve(TARGET, MANIFEST_NAME),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), fileCount: manifest.length, files: manifest }, null, 2)}\n`,
);
await validateBundle();

console.log(JSON.stringify({
  uploadFolder: TARGET,
  fileCount: manifest.length,
  note: "Open the Native Code panel at project root and choose Upload folder. This generated folder is disposable and is not canonical source.",
}, null, 2));
