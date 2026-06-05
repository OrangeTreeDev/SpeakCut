#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "..", "..");
const runtimeRoot = join(packageRoot, "runtime");
const runtimeApi = join(runtimeRoot, "api");
const previewAssets = join(packageRoot, "assets", "preview-web");

function copyDir(source, target) {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, {
    recursive: true,
    filter: (path) =>
      !path.includes("__pycache__") &&
      !path.includes(".pytest_cache") &&
      !path.endsWith(".pyc") &&
      !path.endsWith("narraclip.db"),
  });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

copyDir(join(repoRoot, "apps", "api", "app"), join(runtimeApi, "app"));
copyDir(join(repoRoot, "apps", "api", "scripts"), join(runtimeApi, "scripts"));
cpSync(join(repoRoot, "apps", "api", "requirements.txt"), join(runtimeApi, "requirements.txt"));

if (!existsSync(join(repoRoot, "apps", "web", "dist", "index.html"))) {
  run("npm", ["run", "build:web"], repoRoot);
}
copyDir(join(repoRoot, "apps", "web", "dist"), previewAssets);

console.log(`Built speak-cut runtime at ${runtimeRoot}`);
