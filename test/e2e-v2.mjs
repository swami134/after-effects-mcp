// End-to-end test of the v2 tools without After Effects:
// MCP client -> build/index.js (real server) -> queue files -> mock panel running the
// real v2 JSX section -> result files -> client.
// Run: npm run build && npm test

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { loadBridge } from "./mock-ae.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "ae-mcp-test-"));
fs.mkdirSync(path.join(home, "Documents"), { recursive: true });

const ae = loadBridge(home, path.join(root, "src/scripts/mcp-bridge-auto.jsx"));
const panel = setInterval(() => ae.v2ProcessQueue(), 50);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, "build/index.js")],
  env: { ...process.env, HOME: home, USERPROFILE: home },
  stderr: "ignore",
});
const client = new Client({ name: "e2e", version: "1.0.0" });
await client.connect(transport);

let failures = 0;
async function call(name, args, expectOk = true) {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content.find((c) => c.type === "text")?.text ?? "";
  const ok = !r.isError;
  const pass = ok === expectOk;
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${pass ? "" : "\n     " + text.slice(0, 400)}`);
  return { r, data: (() => { try { return JSON.parse(text); } catch { return text; } })() };
}

const tools = (await client.listTools()).tools.map((t) => t.name);
const v2 = tools.filter((t) => t.startsWith("ae_"));
console.log(`${tools.length} tools, ${v2.length} v2 tools`);

await call("ae_ping", {});
await call("ae_comp_create", { name: "MAIN", width: 1920, height: 1080, duration: 15, frameRate: 24, motionBlur: true, renderer: "classic", bgColor: "#05101a" });
await call("ae_layer_create", { comp: "MAIN", type: "null", name: "RIG", set: { threeD: true } });
await call("ae_layer_create", { comp: "MAIN", type: "camera", name: "CAM", set: { parent: "RIG", autoOrient: "camera" } });
await call("ae_layer_create", { comp: "MAIN", type: "solid", name: "BG", color: [0.1, 0.2, 0.3] });
await call("ae_layer_create", { comp: "MAIN", type: "text", name: "TITLE", text: "Hello", textStyle: { fontSize: 80, fillColor: "#ffcc33" } });
await call("ae_shape_build", {
  comp: "MAIN", name: "TREE",
  contents: [{ type: "group", name: "trunk", contents: [
    { type: "path", vertices: [[0, 0], [40, 0], [30, -900], [10, -900]], closed: true },
    { type: "fill", color: "#123238" }, { type: "stroke", color: [0, 0, 0], width: 2 },
    { type: "repeater", copies: 3, transform: { position: [120, 0] } }, { type: "trim", start: 0, end: 100 },
  ], transform: { position: [960, 900] } }],
  set: { threeD: true, collapse: true, motionBlur: true, autoOrient: "camera" },
});
await call("ae_layer_duplicate", { comp: "MAIN", layer: "TREE", count: 3, names: ["T1", "T2", "T3"], sets: [{ transform: { position: [100, 900, 500] } }] });
await call("ae_layer_set", { comp: "MAIN", layers: ["T1", "T2"], set: { blendMode: "screen", trackMatte: { layer: "BG", type: "alpha" }, transform: { yRotation: 20 } } });
await call("ae_effect_add", { comp: "MAIN", layer: "BG", matchName: "CC Particle World", settings: { "Birth Rate": 0.5, "Producer/Position X": 0.2, "Particle/Texture/Texture Layer": { layer: "TITLE" } } });
await call("ae_effect_set", { comp: "MAIN", layer: "BG", effect: 1, settings: { "Physics/Gravity": -0.05 } });
await call("ae_prop_set", { comp: "MAIN", layer: "BG", sets: [{ path: "Transform/Opacity", value: 80 }, { path: ["Effects", 1, "Longevity (sec)"], value: 4 }] });
await call("ae_prop_get", { comp: "MAIN", layer: "BG", path: "Transform/Opacity" });
await call("ae_prop_tree", { comp: "MAIN", layer: "BG", path: "Effects", depth: 3 });
await call("ae_keyframes", { comp: "MAIN", layer: "RIG", path: "Transform/ADBE Rotate Y", ease: "easy", keys: [{ time: 8, value: 0 }, { time: 12, value: 110 }, { time: 15, value: 124, easeIn: [5, 40] }] });
await call("ae_keyframes", { comp: "MAIN", layer: "CAM", path: "Transform/Position", ease: "auto", keys: [{ time: 0, value: [0, 0, -3000] }, { time: 15, value: [0, 0, -1200] }] });
await call("ae_expression", { comp: "MAIN", sets: [{ layers: ["T1", "T2", "T3"], path: "Transform/Rotation", expression: "Math.sin(time)*2" }] });
await call("ae_mask", { comp: "MAIN", layer: "BG", ellipse: { center: [960, 540], size: [1600, 900] }, inverted: true, feather: 300, mode: "add" });
await call("ae_camera_set", { comp: "MAIN", layer: "CAM", zoom: 2400, dof: true, aperture: 40, blurLevel: 80, focusOn: "TITLE" });
await call("ae_precompose", { comp: "MAIN", layers: ["T2", "T3"], name: "TREES" });
await call("ae_comp_tree", { comp: "MAIN", withTransform: true });
await call("ae_effects_list", { query: "wave" });
const asset = await call("ae_write_asset", { path: "forest/leaf.png", content: "iVBORw0KGgo=", encoding: "base64" });
await call("ae_write_asset", { path: "../escape.txt", content: "x" }, false);
await call("ae_import", { asset: "forest/leaf.png", addToComp: "MAIN", set: { threeD: true } });
const frames = await call("ae_render_frame", { comp: "MAIN", times: [2, 6] });
const images = frames.r.content.filter((c) => c.type === "image").length;
console.log(`${images === 2 ? "PASS" : "FAIL"} ae_render_frame returned ${images} images`);
if (images !== 2) failures++;
await call("ae_render_queue", { action: "add", comp: "MAIN", resolution: "half", duration: 6 });
await call("ae_render_queue", { action: "start" });
await call("ae_project", { action: "save", path: path.join(home, "test.aep") });
await call("ae_project", { action: "info" });
await call("ae_run_jsx", { code: "1+1" }, false); // blocked until the panel toggle is on
ae.v2AllowRaw = true;
const raw = await call("ae_run_jsx", { code: "app.project.numItems + MCP_ARGS.add", params: { add: 100 } });
fs.mkdirSync(path.join(home, "Documents/ae-mcp-bridge/scripts"), { recursive: true });
await call("ae_write_asset", { path: "scripts/t.jsx", content: "(function(){ return 'from file ' + MCP_ARGS.x; })();" });
await call("ae_run_jsx", { file: "t.jsx", params: { x: 7 } });
await call("ae_run_jsx", { file: "../../evil.jsx" }, false);
await call("ae_batch", { ops: [{ command: "layer_create", args: { comp: "MAIN", type: "null", name: "B1" } }, { command: "layer_set", args: { comp: "MAIN", layer: "B1", set: { threeD: true } } }] });
await call("ae_batch", { ops: [{ command: "nope" }] }, true); // batch itself succeeds; the op reports ok:false
await call("ae_layer_set", { comp: "MAIN", layer: "MISSING", set: { threeD: true } }, false);
await call("ae_layer_set", { comp: "MAIN", layer: "T1", set: { trackMatte: { type: "none" } } });
await call("ae_undo", { count: 1 });

// Bridge not running: command must time out cleanly and be removed from the queue.
clearInterval(panel);
const t0 = Date.now();
const r = await client.callTool({ name: "ae_ping", arguments: {} });
const queued = fs.readdirSync(path.join(home, "Documents/ae-mcp-bridge/queue"));
const cleanTimeout = r.isError && queued.length === 0;
console.log(`${cleanTimeout ? "PASS" : "FAIL"} timeout without panel (${Date.now() - t0} ms, queue left: ${queued.length})`);
if (!cleanTimeout) failures++;

console.log(raw.data, asset.data);
await client.close();
fs.rmSync(home, { recursive: true, force: true });
console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
