#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

interface RuntimeLocation {
  root: string;
  cli: string;
  requirements: string;
  previewWeb: string;
  packaged: boolean;
}

interface ParsedArgs {
  command: string | undefined;
  flags: Record<string, string | boolean>;
}

function printHelp(): void {
  process.stdout.write(`speak-cut

Usage:
  speak-cut < request.json
  speak-cut healthcheck
  speak-cut generate --text "..." [--aspect-ratio 9:16] [--voice-id zh-CN-YunxiNeural] [--export] [--preview]
  speak-cut generate --text-file input.txt --export --preview
  speak-cut inspect --project-file storage/projects/proj_xxx/project.speakcut.json
  speak-cut export --project-file storage/projects/proj_xxx/project.speakcut.json
  speak-cut package-preview --project-file storage/projects/proj_xxx/project.speakcut.json

Agent protocol:
  stdout is JSON/NDJSON from the SpeakCut runtime; logs go to stderr.
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const command = args.shift();
  const flags: Record<string, string | boolean> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      index += 1;
    }
  }
  return { command, flags };
}

function stringFlag(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function boolFlag(flags: Record<string, string | boolean>, key: string): boolean {
  return flags[key] === true;
}

function requestFromArgs(argv: string[]): JsonObject {
  const { command, flags } = parseArgs(argv);
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }
  if (command === "--version" || command === "-v") {
    const pkg = JSON.parse(readFileSync(join(currentDir, "..", "package.json"), "utf8")) as { version: string };
    process.stdout.write(`${pkg.version}\n`);
    process.exit(0);
  }
  if (command === "healthcheck") {
    return { action: "healthcheck" };
  }
  if (command === "generate") {
    if (boolFlag(flags, "offline")) {
      throw new Error("offline mode has been removed; configure online LLM, TTS, and media providers");
    }
    const request: JsonObject = {
      action: "generate",
      aspect_ratio: stringFlag(flags, "aspectRatio") ?? "9:16",
      voice_id: stringFlag(flags, "voiceId") ?? "zh-CN-YunxiNeural",
      export: boolFlag(flags, "export"),
      package_preview: flags.preview === false ? false : Boolean(flags.preview ?? true),
    };
    const text = stringFlag(flags, "text");
    const textFile = stringFlag(flags, "textFile");
    if (text) {
      request.text = text;
    }
    if (textFile) {
      request.text_file = textFile;
    }
    return request;
  }
  if (command === "inspect") {
    return { action: "inspect", project_file: required(stringFlag(flags, "projectFile"), "--project-file") };
  }
  if (command === "export") {
    return { action: "export", project_file: required(stringFlag(flags, "projectFile"), "--project-file") };
  }
  if (command === "package-preview" || command === "package_preview") {
    return { action: "package_preview", project_file: required(stringFlag(flags, "projectFile"), "--project-file") };
  }
  throw new Error(`Unsupported command: ${command}`);
}

function required(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing required ${label}`);
  }
  return value;
}

function readStdinIfPiped(): string {
  if (process.stdin.isTTY) {
    return "";
  }
  return readFileSync(0, "utf8").trim();
}

function findPackagedRuntime(): RuntimeLocation | null {
  const packageRoot = resolve(currentDir, "..");
  const cli = join(packageRoot, "runtime", "api", "scripts", "speakcut.py");
  if (!existsSync(cli)) {
    return null;
  }
  return {
    root: packageRoot,
    cli,
    requirements: join(packageRoot, "runtime", "api", "requirements.txt"),
    previewWeb: join(packageRoot, "assets", "preview-web"),
    packaged: true,
  };
}

function findDevRuntime(): RuntimeLocation {
  const envRoot = process.env.SPEAKCUT_DEV_ROOT;
  if (envRoot) {
    const root = resolve(envRoot);
    if (existsSync(join(root, "apps", "api", "scripts", "speakcut.py"))) {
      return devRuntime(root);
    }
    throw new Error(`Configured SpeakCut dev root is invalid: ${root}`);
  }

  const candidates = [resolve(currentDir, "..", "..", ".."), process.cwd(), ...parentDirs(process.cwd())];
  for (const root of candidates) {
    if (existsSync(join(root, "apps", "api", "scripts", "speakcut.py"))) {
      return devRuntime(root);
    }
  }
  throw new Error("Cannot find SpeakCut runtime. Published packages must include runtime files; development runs require SPEAKCUT_DEV_ROOT or the repo cwd.");
}

function findDevRuntimeOrNull(): RuntimeLocation | null {
  try {
    return findDevRuntime();
  } catch {
    return null;
  }
}

function devRuntime(root: string): RuntimeLocation {
  return {
    root,
    cli: join(root, "apps", "api", "scripts", "speakcut.py"),
    requirements: join(root, "apps", "api", "requirements.txt"),
    previewWeb: join(root, "apps", "web", "dist"),
    packaged: false,
  };
}

function parentDirs(start: string): string[] {
  const dirs: string[] = [];
  let current = resolve(start);
  while (true) {
    const parent = dirname(current);
    if (parent === current) {
      return dirs;
    }
    dirs.push(parent);
    current = parent;
  }
}

async function runPythonRuntime(input: string): Promise<number> {
  const runtime =
    process.env.SPEAKCUT_FORCE_PACKAGED === "1"
      ? (findPackagedRuntime() ?? findDevRuntime())
      : (findDevRuntimeOrNull() ?? findPackagedRuntime() ?? findDevRuntime());
  const dataDir = ensureDirectory(process.env.SPEAKCUT_DATA_DIR || defaultDataDir(), join(process.cwd(), ".speak-cut", "data"));
  const cacheDir = ensureDirectory(process.env.SPEAKCUT_CACHE_DIR || defaultCacheDir(), join(process.cwd(), ".speak-cut", "cache"));
  const venvDir = join(cacheDir, "venv");
  const python = await ensurePython(runtime.requirements, venvDir, runtime.packaged);
  const child = spawn(python, [runtime.cli], {
    cwd: runtime.root,
    env: {
      ...process.env,
      ...(runtime.packaged ? { SPEAKCUT_RUNTIME_VENV: venvDir } : {}),
      SPEAKCUT_PREVIEW_WEB_DIR: runtime.previewWeb,
      STORAGE_ROOT: dataDir,
      DATABASE_URL: `sqlite:///${join(dataDir, "speakcut.db")}`,
    },
    stdio: ["pipe", "pipe", "inherit"],
  });
  child.stdout.pipe(process.stdout);
  child.stdin.end(input);
  return await waitForChild(child);
}

async function ensurePython(requirementsPath: string, venvDir: string, shouldBootstrap: boolean): Promise<string> {
  const python = join(venvDir, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  if (existsSync(python)) {
    return python;
  }
  if (!shouldBootstrap) {
    return process.env.PYTHON || "python3";
  }
  const basePython = process.env.PYTHON || "python3";
  mkdirSync(venvDir, { recursive: true });
  await runChecked(basePython, ["-m", "venv", venvDir], "create Python venv");
  await runChecked(python, ["-m", "pip", "install", "--upgrade", "pip"], "upgrade pip");
  await runChecked(python, ["-m", "pip", "install", "-r", requirementsPath], "install SpeakCut Python dependencies");
  return python;
}

async function runChecked(command: string, args: string[], label: string): Promise<void> {
  const child = spawn(command, args, { stdio: "inherit" });
  const code = await waitForChild(child);
  if (code !== 0) {
    throw new Error(`Failed to ${label}: ${command} ${args.join(" ")}`);
  }
}

async function waitForChild(child: ReturnType<typeof spawn>): Promise<number> {
  return await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function defaultDataDir(): string {
  return process.cwd();
}

function defaultCacheDir(): string {
  return join(process.cwd(), ".speak-cut", "cache");
}

function ensureDirectory(preferred: string, fallback: string): string {
  const preferredPath = resolve(preferred);
  try {
    mkdirSync(preferredPath, { recursive: true });
    return preferredPath;
  } catch {
    const fallbackPath = resolve(fallback);
    mkdirSync(fallbackPath, { recursive: true });
    return fallbackPath;
  }
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const input = argv.length > 0 ? JSON.stringify(requestFromArgs(argv) satisfies JsonValue) : readStdinIfPiped();
  if (!input) {
    printHelp();
    return 0;
  }
  return await runPythonRuntime(input);
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
