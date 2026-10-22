// v2 tools: every tool waits for its own result (no separate get-results call).

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BridgeResult, callBridge, cleanupOld, sandboxPath, waitForResult, waitForStableFile } from "./bridge.js";

const CompRef = z
  .union([z.string(), z.number().int(), z.object({ id: z.number().int() })])
  .optional()
  .describe("Composition: name, 1-based project item index, or {id}. Omit for the active comp.");
const LayerRef = z
  .union([z.string(), z.number().int(), z.object({ id: z.number().int() }), z.object({ name: z.string() })])
  .describe("Layer: name, 1-based index, {id} or {name}.");
const PropPath = z
  .union([z.string(), z.array(z.union([z.string(), z.number().int()]))])
  .describe(
    'Property path from the layer, using display names, match names or 1-based indices, e.g. "Transform/Position", ["Effects","Wave Warp","Wave Height"], "ADBE Camera Options Group/ADBE Camera Aperture".'
  );
const Vec = z.array(z.number());
const Color = z.union([z.string(), Vec]).describe('Color as "#rrggbb" or [r,g,b] in 0-1.');

const LayerSettings = z
  .object({
    name: z.string(),
    enabled: z.boolean(),
    solo: z.boolean(),
    shy: z.boolean(),
    locked: z.boolean(),
    label: z.number().int(),
    comment: z.string(),
    threeD: z.boolean(),
    autoOrient: z.enum(["off", "path", "camera", "characters"]),
    motionBlur: z.boolean(),
    collapse: z.boolean().describe("Collapse transformations / continuous rasterization"),
    effectsActive: z.boolean(),
    adjustment: z.boolean(),
    guide: z.boolean(),
    quality: z.enum(["best", "draft", "wireframe"]),
    blendMode: z.string().describe("normal, add, screen, multiply, overlay, softLight, colorDodge, ..."),
    parent: z.union([LayerRef, z.null()]).describe("Parent layer, or null to unparent"),
    trackMatte: z.object({ layer: LayerRef.optional(), type: z.enum(["alpha", "alphaInverted", "luma", "lumaInverted", "none"]) }),
    startTime: z.number(),
    stretch: z.number(),
    inPoint: z.number(),
    outPoint: z.number(),
    timeRemap: z.boolean(),
    transform: z
      .object({
        anchorPoint: Vec,
        position: Vec,
        scale: Vec,
        opacity: z.number(),
        rotation: z.number(),
        xRotation: z.number(),
        yRotation: z.number(),
        zRotation: z.number(),
        orientation: Vec,
        pointOfInterest: Vec,
      })
      .partial(),
    clearKeys: z.boolean().describe("Remove existing keyframes on transform properties before setting"),
    moveTo: z.union([z.enum(["top", "bottom"]), z.object({ before: LayerRef }), z.object({ after: LayerRef })]),
  })
  .partial();

const ShapeItems = z
  .array(z.record(z.string(), z.unknown()))
  .describe(
    "Shape contents, in stacking order. Items: " +
      "{type:'group', name?, contents:[...], transform?:{anchor,position,scale,rotation,opacity,skew,skewAxis}} | " +
      "{type:'path', vertices:[[x,y]...], inTangents?, outTangents?, closed?} | " +
      "{type:'rect', size, position?, roundness?} | {type:'ellipse', size, position?} | " +
      "{type:'star'|'polygon', points, outerRadius, innerRadius?, outerRoundness?, innerRoundness?, position?, rotation?} | " +
      "{type:'fill', color, opacity?, rule?} | {type:'stroke', color, width, opacity?, lineCap?, lineJoin?} | " +
      "{type:'gradientFill', gradientType:1|2, start, end} | {type:'trim', start, end, offset?} | " +
      "{type:'repeater', copies, offset?, transform?:{position,scale,rotation,startOpacity,endOpacity}} | " +
      "{type:'offset', amount} | {type:'roundCorners', radius} | {type:'wigglePaths', size, detail} | " +
      "{type:'zigzag', size, ridges} | {type:'puckerBloat', amount} | {type:'twist', angle} | {type:'merge', mode}. " +
      "Coordinates are layer space; a new shape layer has layer space == comp space."
  );

type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };

function reply(r: BridgeResult, extra: Content[] = []) {
  const body = r.ok ? r.result : { error: r.error, line: r.line, id: r.id, pending: r.pending };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }, ...extra],
    isError: !r.ok,
  };
}

async function run(command: string, args: Record<string, unknown>, timeoutMs?: number) {
  return reply(await callBridge(command, args, { timeoutMs }));
}

export function registerV2Tools(server: McpServer): void {
  try {
    cleanupOld();
  } catch {
    // cleanup is best effort
  }

  server.tool(
    "ae_ping",
    "Check the v2 bridge: After Effects version, open project, active comp, whether raw scripts are allowed.",
    {},
    async () => run("ping", {}, 8000)
  );

  server.tool(
    "ae_project",
    "Project info and file actions. action: info (list items) | new | open | save | close. new/open with force:true discard unsaved changes.",
    {
      action: z.enum(["info", "new", "open", "save", "close"]).default("info"),
      path: z.string().optional().describe("Absolute .aep path for open, or save-as target"),
      force: z.boolean().optional(),
      save: z.boolean().optional().describe("close: save first"),
      maxItems: z.number().int().optional(),
    },
    async (a) => run("project", a, 60000)
  );

  server.tool(
    "ae_comp_create",
    "Create a composition, optionally with any ae_comp_set setting (motionBlur, renderer, bgColor, ...).",
    {
      name: z.string(),
      width: z.number().int().default(1920),
      height: z.number().int().default(1080),
      duration: z.number().default(10),
      frameRate: z.number().default(24),
      pixelAspect: z.number().optional(),
      folder: z.string().optional(),
      bgColor: Color.optional(),
      motionBlur: z.boolean().optional(),
      shutterAngle: z.number().optional(),
      renderer: z.string().optional().describe("classic | cinema4d | advanced, or a renderer match name"),
      openInViewer: z.boolean().optional(),
    },
    async (a) => run("comp_create", a)
  );

  server.tool(
    "ae_comp_set",
    "Change composition settings.",
    {
      comp: CompRef,
      name: z.string().optional(),
      width: z.number().int().optional(),
      height: z.number().int().optional(),
      pixelAspect: z.number().optional(),
      duration: z.number().optional(),
      frameRate: z.number().optional(),
      bgColor: Color.optional(),
      workAreaStart: z.number().optional(),
      workAreaDuration: z.number().optional(),
      motionBlur: z.boolean().optional(),
      shutterAngle: z.number().optional(),
      shutterPhase: z.number().optional(),
      motionBlurSamplesPerFrame: z.number().int().optional(),
      motionBlurAdaptiveSampleLimit: z.number().int().optional(),
      frameBlending: z.boolean().optional(),
      draft3d: z.boolean().optional(),
      hideShyLayers: z.boolean().optional(),
      resolutionFactor: Vec.optional().describe("[2,2] = half resolution in the viewer"),
      renderer: z.string().optional().describe("classic | cinema4d | advanced"),
      time: z.number().optional().describe("Move the current-time indicator"),
      openInViewer: z.boolean().optional(),
    },
    async (a) => run("comp_set", a)
  );

  server.tool(
    "ae_comp_tree",
    "List a comp's layers with type, ids, 3D, parent, timing, switches and effects. withTransform adds transform values, keyframe counts and expressions.",
    { comp: CompRef, withTransform: z.boolean().optional() },
    async (a) => run("comp_tree", a)
  );

  server.tool(
    "ae_layer_create",
    "Create a layer: null | solid | adjustment | shape | text | camera | light | item (add a project item such as footage or a comp). Optionally apply layer settings (set) and shape contents (shape) in the same call.",
    {
      comp: CompRef,
      type: z.enum(["null", "solid", "adjustment", "shape", "text", "camera", "light", "item"]),
      name: z.string().optional(),
      color: Color.optional().describe("solid color"),
      size: Vec.optional().describe("solid size [w,h]; defaults to comp size"),
      duration: z.number().optional(),
      text: z.string().optional(),
      boxSize: Vec.optional().describe("text: create box (paragraph) text of this size"),
      textStyle: z.record(z.string(), z.unknown()).optional().describe("TextDocument fields: font (PostScript name), fontSize, fillColor, justification, tracking, ..."),
      lightType: z.enum(["point", "spot", "parallel", "ambient"]).optional(),
      item: z.union([z.string(), z.number().int(), z.object({ id: z.number().int() })]).optional().describe("type item: project item name, index or {id}"),
      shape: ShapeItems.optional(),
      set: LayerSettings.optional(),
    },
    async (a) => run("layer_create", a)
  );

  server.tool(
    "ae_layer_set",
    "Change layer switches, transform, parenting, auto-orient, motion blur, blend mode, track matte, timing and stacking order for one or more layers.",
    {
      comp: CompRef,
      layer: LayerRef.optional(),
      layers: z.array(LayerRef).optional().describe("Apply the same settings to several layers"),
      set: LayerSettings,
    },
    async (a) => run("layer_set", a)
  );

  server.tool(
    "ae_layer_duplicate",
    "Duplicate a layer count times (effects, masks and expressions included); names[i] and sets[i] customise each copy.",
    {
      comp: CompRef,
      layer: LayerRef,
      count: z.number().int().min(1).max(200).default(1),
      names: z.array(z.string()).optional(),
      sets: z.array(LayerSettings).optional(),
    },
    async (a) => run("layer_duplicate", a, 60000)
  );

  server.tool(
    "ae_layer_delete",
    "Delete one or more layers.",
    { comp: CompRef, layer: LayerRef.optional(), layers: z.array(LayerRef).optional() },
    async (a) => run("layer_delete", a)
  );

  server.tool(
    "ae_precompose",
    "Precompose layers into a new comp (moveAll true moves attributes into it).",
    { comp: CompRef, layers: z.array(LayerRef), name: z.string(), moveAll: z.boolean().optional() },
    async (a) => run("precompose", a)
  );

  server.tool(
    "ae_import",
    "Import a file (image, PSD/AI as layered comp, video, audio, image sequence, .aep). Use path for an absolute path, or asset for a file previously written with ae_write_asset.",
    {
      path: z.string().optional(),
      asset: z.string().optional().describe("Path relative to the bridge assets/ folder"),
      importAs: z.enum(["footage", "comp", "compCropped", "project"]).optional(),
      sequence: z.boolean().optional(),
      name: z.string().optional(),
      folder: z.string().optional(),
      addToComp: CompRef.describe("Also add the imported item as a layer to this comp"),
      set: LayerSettings.optional(),
    },
    async (a) => run("import_file", a, 120000)
  );

  server.tool(
    "ae_write_asset",
    "Write a file onto the After Effects machine inside Documents/ae-mcp-bridge (assets/ by default, or scripts/). Use it to send PNG/SVG artwork or .jsx scripts, then ae_import or ae_run_jsx them. Does not need After Effects.",
    {
      path: z.string().describe('Relative path, e.g. "forest/tree.png" or "scripts/build.jsx"'),
      content: z.string(),
      encoding: z.enum(["utf8", "base64"]).default("utf8"),
    },
    async ({ path: rel, content, encoding }) => {
      try {
        const full = sandboxPath(rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, Buffer.from(content, encoding));
        return { content: [{ type: "text" as const, text: JSON.stringify({ written: full, bytes: fs.statSync(full).size }) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  server.tool(
    "ae_prop_get",
    "Read any property (value, keyframes, expression and its error) by path. A group path returns its children instead.",
    {
      comp: CompRef,
      layer: LayerRef,
      path: PropPath,
      time: z.number().optional(),
      withKeys: z.boolean().optional(),
      depth: z.number().int().optional(),
      maxNodes: z.number().int().optional(),
    },
    async (a) => run("prop_get", a)
  );

  server.tool(
    "ae_prop_set",
    "Set any property value by path (transform, effect settings at any depth, mask path, shape path, text, camera/light options, material options). Use sets for several at once. Shape values: {vertices,inTangents,outTangents,closed}. Layer-reference values: {layer: ref}.",
    {
      comp: CompRef,
      layer: LayerRef,
      path: PropPath.optional(),
      value: z.unknown().optional(),
      sets: z.array(z.object({ path: PropPath, value: z.unknown(), time: z.number().optional() })).optional(),
      clearKeys: z.boolean().optional(),
    },
    async (a) => run("prop_set", a)
  );

  server.tool(
    "ae_prop_tree",
    "Dump a layer's property tree (names, match names, values, dropdown options, keyframe counts, expressions). Use it to discover exact paths, e.g. path 'Effects/CC Particle World'.",
    { comp: CompRef, layer: LayerRef, path: PropPath.optional(), depth: z.number().int().optional(), maxNodes: z.number().int().optional() },
    async (a) => run("prop_tree", a)
  );

  server.tool(
    "ae_keyframes",
    "Set keyframes on any property path, with interpolation and easing. ease: 'easy' (Easy Ease on every key) or 'auto' (continuous auto-bezier). Per key: interp linear|bezier|hold, easeIn/easeOut [speed, influence%], spatialIn/spatialOut, roving.",
    {
      comp: CompRef,
      layer: LayerRef,
      path: PropPath,
      keys: z.array(
        z.object({
          time: z.number(),
          value: z.unknown(),
          interp: z.enum(["linear", "bezier", "hold"]).optional(),
          easeIn: z.tuple([z.number(), z.number()]).optional(),
          easeOut: z.tuple([z.number(), z.number()]).optional(),
          spatialIn: Vec.optional(),
          spatialOut: Vec.optional(),
          roving: z.boolean().optional(),
          auto: z.boolean().optional(),
        })
      ),
      replace: z.boolean().optional().describe("Remove existing keyframes first"),
      interp: z.enum(["linear", "bezier", "hold"]).optional(),
      ease: z.enum(["easy", "auto", "none"]).optional(),
      easeIn: z.tuple([z.number(), z.number()]).optional(),
      easeOut: z.tuple([z.number(), z.number()]).optional(),
    },
    async (a) => run("keyframes", a)
  );

  server.tool(
    "ae_expression",
    "Set (or clear with an empty string) expressions on any property path, for one layer, several layers, or a list of sets. Returns each expression's error, if any.",
    {
      comp: CompRef,
      layer: LayerRef.optional(),
      path: PropPath.optional(),
      expression: z.string().optional(),
      sets: z
        .array(z.object({ layer: LayerRef.optional(), layers: z.array(LayerRef).optional(), path: PropPath, expression: z.string() }))
        .optional(),
    },
    async (a) => run("expression", a)
  );

  server.tool(
    "ae_effect_add",
    "Add an effect (by match name or display name) to one or more layers and set its parameters. settings keys are paths inside the effect, e.g. {'Birth Rate': 1, 'Producer/Position X': 0.2, 'Particle/Texture/Texture Layer': {layer: 'SPRITE'}}.",
    {
      comp: CompRef,
      layer: LayerRef.optional(),
      layers: z.array(LayerRef).optional(),
      matchName: z.string().optional(),
      name: z.string().optional(),
      rename: z.string().optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    },
    async (a) => run("effect_add", a)
  );

  server.tool(
    "ae_effect_set",
    "Change, enable/disable, reorder or remove an existing effect. effect = its name or 1-based index on the layer.",
    {
      comp: CompRef,
      layer: LayerRef,
      effect: z.union([z.string(), z.number().int()]),
      settings: z.record(z.string(), z.unknown()).optional(),
      enabled: z.boolean().optional(),
      moveTo: z.number().int().optional(),
      remove: z.boolean().optional(),
    },
    async (a) => run("effect_set", a)
  );

  server.tool(
    "ae_effects_list",
    "List installed effects (display name, match name, category), optionally filtered by a search string.",
    { query: z.string().optional(), limit: z.number().int().optional() },
    async (a) => run("effects_list", a)
  );

  server.tool(
    "ae_shape_build",
    "Build vector artwork in a shape layer from a JSON tree (bezier paths, rects, ellipses, stars, fills, strokes, gradients, trim, repeater and other modifiers). Creates a new shape layer unless layer is given.",
    {
      comp: CompRef,
      layer: LayerRef.optional(),
      name: z.string().optional(),
      contents: ShapeItems,
      replace: z.boolean().optional(),
      set: LayerSettings.optional(),
    },
    async (a) => run("shape_build", a)
  );

  server.tool(
    "ae_mask",
    "Add or modify a mask: bezier vertices/tangents, rect [x,y,w,h] or ellipse {center,size}; mode add|subtract|intersect|lighten|darken|difference|none; inverted, feather, opacity, expansion. remove: index to delete.",
    {
      comp: CompRef,
      layer: LayerRef,
      maskIndex: z.number().int().optional(),
      vertices: z.array(Vec).optional(),
      inTangents: z.array(Vec).optional(),
      outTangents: z.array(Vec).optional(),
      closed: z.boolean().optional(),
      rect: Vec.optional(),
      ellipse: z.object({ center: Vec, size: Vec }).optional(),
      mode: z.string().optional(),
      inverted: z.boolean().optional(),
      feather: z.union([z.number(), Vec]).optional(),
      opacity: z.number().optional(),
      expansion: z.number().optional(),
      name: z.string().optional(),
      remove: z.number().int().optional(),
    },
    async (a) => run("mask", a)
  );

  server.tool(
    "ae_camera_set",
    "Camera options: zoom, depth of field, focus distance, aperture, blur level. focusOn keeps a layer in focus with an expression. set applies layer settings (parent, autoOrient, transform).",
    {
      comp: CompRef,
      layer: LayerRef,
      zoom: z.number().optional(),
      dof: z.boolean().optional(),
      focusDistance: z.number().optional(),
      aperture: z.number().optional(),
      blurLevel: z.number().optional(),
      focusOn: z.union([LayerRef, z.object({ layer: LayerRef, point: Vec.optional() })]).optional(),
      set: LayerSettings.optional(),
    },
    async (a) => run("camera_set", a)
  );

  server.tool(
    "ae_render_frame",
    "Render one or more frames of a comp to PNG and return them as images, so the result can be checked visually. maxWidth downsizes large comps (default 1280).",
    {
      comp: CompRef,
      time: z.number().optional(),
      times: z.array(z.number()).max(8).optional(),
      maxWidth: z.number().int().optional(),
      transparent: z.boolean().optional().describe("Keep alpha instead of filling with the comp background colour"),
    },
    async (a) => {
      const r = await callBridge("render_frame", a, { timeoutMs: 120000 });
      if (!r.ok) return reply(r);
      const images: Content[] = [];
      for (const f of r.result.frames as { time: number; file: string }[]) {
        if (await waitForStableFile(f.file, 90000)) {
          images.push({ type: "image", data: fs.readFileSync(f.file).toString("base64"), mimeType: "image/png" });
        } else {
          r.result.missing = (r.result.missing || []).concat(f.file);
        }
      }
      return reply(r, images);
    }
  );

  server.tool(
    "ae_render_queue",
    "Render queue. action add (comp, output path, start, duration, renderTemplate, outputTemplate, resolution) | list | templates | start (renders everything queued; blocks AE) | clear | ame (send to Media Encoder). For long renders pass wait:false and collect with ae_result.",
    {
      action: z.enum(["add", "list", "templates", "start", "clear", "ame"]).default("list"),
      comp: CompRef,
      output: z.string().optional().describe("Absolute output path; defaults to Documents/ae-mcp-bridge/renders/<comp>"),
      start: z.number().optional(),
      duration: z.number().optional(),
      renderTemplate: z.string().optional(),
      outputTemplate: z.string().optional(),
      resolution: z.enum(["full", "half", "third", "quarter"]).optional(),
      onlyDone: z.boolean().optional(),
      startAME: z.boolean().optional(),
      wait: z.boolean().optional(),
      timeoutSeconds: z.number().optional(),
    },
    async (a) => {
      const timeoutMs = (a.timeoutSeconds ?? (a.action === "start" ? 1800 : 60)) * 1000;
      return reply(await callBridge("render_queue", a, { timeoutMs, wait: a.wait }));
    }
  );

  server.tool(
    "ae_result",
    "Collect the result of a command that was started with wait:false or that timed out.",
    { id: z.string(), waitSeconds: z.number().default(30) },
    async ({ id, waitSeconds }) => reply(await waitForResult(id, waitSeconds * 1000))
  );

  server.tool(
    "ae_run_jsx",
    "Run ExtendScript in After Effects: inline code, or a file inside Documents/ae-mcp-bridge (scripts/ or assets/). Disabled unless 'Allow raw scripts' is ticked in the bridge panel. params is available to the script as MCP_ARGS. Returns the last evaluated value.",
    {
      code: z.string().optional(),
      file: z.string().optional(),
      params: z.record(z.string(), z.unknown()).optional(),
      timeoutSeconds: z.number().optional(),
    },
    async (a) => run("run_jsx", a, (a.timeoutSeconds ?? 300) * 1000)
  );

  server.tool(
    "ae_undo",
    "Undo the last action(s) in After Effects. Every v2 command is one undo step.",
    { count: z.number().int().min(1).max(50).default(1) },
    async (a) => run("undo", a)
  );

  server.tool(
    "ae_batch",
    "Run several v2 commands in one round trip and one undo step. ops: [{command, args}] where command is a v2 bridge command name: comp_create, comp_set, layer_create, layer_set, layer_duplicate, layer_delete, precompose, prop_set, keyframes, expression, effect_add, effect_set, shape_build, mask, camera_set, ...",
    {
      ops: z.array(z.object({ command: z.string(), args: z.record(z.string(), z.unknown()).optional() })),
      stopOnError: z.boolean().optional(),
      timeoutSeconds: z.number().optional(),
    },
    async (a) => run("batch", a, (a.timeoutSeconds ?? 120) * 1000)
  );
}
