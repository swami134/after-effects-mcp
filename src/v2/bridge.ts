// Queue client for the v2 bridge protocol.
// Each request is written to <bridge>/queue/cmd_<id>.json; the After Effects
// panel claims it (renames to run_<id>.json), runs it and writes
// <bridge>/results/res_<id>.json. Ids sort by creation time.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface BridgeResult {
  ok: boolean;
  id?: string;
  command?: string;
  result?: any;
  error?: string;
  line?: number;
  pending?: boolean;
}

export function bridgeDir(): string {
  const dir = path.join(os.homedir(), "Documents", "ae-mcp-bridge");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function subDir(name: string): string {
  const dir = path.join(bridgeDir(), name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

let counter = 0;
function newId(): string {
  const t = Date.now().toString(36).padStart(9, "0");
  const c = (counter++ % 1679616).toString(36).padStart(4, "0");
  return `${t}_${c}_${Math.random().toString(36).slice(2, 6)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callBridge(
  command: string,
  args: Record<string, unknown> = {},
  opts: { timeoutMs?: number; wait?: boolean } = {}
): Promise<BridgeResult> {
  const id = newId();
  const queue = subDir("queue");
  subDir("results");
  const tmp = path.join(queue, `cmd_${id}.json.tmp`);
  const target = path.join(queue, `cmd_${id}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ id, command, args, created: new Date().toISOString() }), "utf8");
  fs.renameSync(tmp, target);
  if (opts.wait === false) {
    return { ok: true, pending: true, id, command };
  }
  return waitForResult(id, opts.timeoutMs ?? 30000, command);
}

export async function waitForResult(id: string, timeoutMs: number, command?: string): Promise<BridgeResult> {
  const resPath = path.join(subDir("results"), `res_${id}.json`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(resPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(resPath, "utf8")) as BridgeResult;
        fs.rmSync(resPath, { force: true });
        return parsed;
      } catch {
        // The panel writes a .tmp file and renames it, so a parse failure is transient.
      }
    }
    await sleep(100);
  }
  const queued = path.join(subDir("queue"), `cmd_${id}.json`);
  if (fs.existsSync(queued)) {
    fs.rmSync(queued, { force: true });
    return {
      ok: false,
      id,
      command,
      error:
        "After Effects did not pick up the command. Open Window > mcp-bridge-auto.jsx and make sure 'Auto-run commands' is ticked.",
    };
  }
  return {
    ok: false,
    pending: true,
    id,
    command,
    error: `Still running after ${Math.round(timeoutMs / 1000)} s. Call ae_result with id "${id}" to collect the result.`,
  };
}

// Waits until a file exists and its size has stopped changing (saveFrameToPng can finish asynchronously).
export async function waitForStableFile(file: string, timeoutMs = 60000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let last = -1;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) {
      const size = fs.statSync(file).size;
      if (size > 0 && size === last) return true;
      last = size;
    }
    await sleep(150);
  }
  return false;
}

// Drops results and frames older than a day so the bridge folder does not grow forever.
export function cleanupOld(maxAgeMs = 24 * 3600 * 1000): void {
  for (const name of ["results", "frames"]) {
    const dir = subDir(name);
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      try {
        if (Date.now() - fs.statSync(p).mtimeMs > maxAgeMs) fs.rmSync(p, { force: true });
      } catch {
        // ignore files that disappear while scanning
      }
    }
  }
}

// Resolves a path inside one of the bridge's writable folders, refusing anything that escapes it.
export function sandboxPath(rel: string): string {
  const clean = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  const top = clean.split("/")[0];
  const base = top === "scripts" || top === "assets" ? bridgeDir() : subDir("assets");
  const full = path.resolve(base, clean);
  const allowed = [path.resolve(bridgeDir(), "scripts"), path.resolve(bridgeDir(), "assets")];
  if (!allowed.some((a) => full === a || full.startsWith(a + path.sep))) {
    throw new Error(`Path must stay inside ${allowed.join(" or ")}`);
  }
  return full;
}
