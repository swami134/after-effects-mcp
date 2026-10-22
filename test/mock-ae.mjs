// Minimal After Effects object-model mock for exercising the v2 bridge code in Node.
// It is permissive: unknown properties are created on first access, so tests catch
// script errors (typos, undefined names, bad control flow) rather than AE semantics.

import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

const ENUM = (names) => Object.fromEntries(names.map((n, i) => [n, 1000 + i]));

export function createAE(homeDir) {
  let nextId = 1;

  const PropertyType = ENUM(["PROPERTY", "INDEXED_GROUP", "NAMED_GROUP"]);
  const PropertyValueType = ENUM(["NO_VALUE", "ThreeD_SPATIAL", "ThreeD", "TwoD_SPATIAL", "TwoD", "OneD", "COLOR", "CUSTOM_VALUE", "MARKER", "LAYER_INDEX", "MASK_INDEX", "SHAPE", "TEXT_DOCUMENT"]);

  class Shape { constructor() { this.vertices = []; this.inTangents = []; this.outTangents = []; this.closed = true; } }
  class TextDocument { constructor(t) { this.text = t || ""; this.font = "Arial"; this.fontSize = 36; this.fillColor = [1, 1, 1]; } }
  class KeyframeEase { constructor(speed, influence) { this.speed = speed; this.influence = influence; } }

  function valueTypeFor(mn) {
    if (/Vector Shape$|Mask Shape/.test(mn)) return PropertyValueType.SHAPE;
    if (/Color/.test(mn)) return PropertyValueType.COLOR;
    if (/Text Document/.test(mn)) return PropertyValueType.TEXT_DOCUMENT;
    if (/Texture Layer/.test(mn)) return PropertyValueType.LAYER_INDEX;
    if (/Position|Anchor/.test(mn)) return PropertyValueType.ThreeD_SPATIAL;
    if (/Scale|Orientation/.test(mn)) return PropertyValueType.ThreeD;
    return PropertyValueType.OneD;
  }

  // Display names AE resolves to the same group as the match name.
  const ALIAS = { Effects: "ADBE Effect Parade", Masks: "ADBE Mask Parade", Contents: "ADBE Root Vectors Group", Transform: "ADBE Transform Group" };

  class Prop {
    constructor(name, parent, index) {
      this.name = name; this.matchName = name; this.parentProperty = parent; this.propertyIndex = index || 1;
      this.children = []; this._value = valueTypeFor(name) === PropertyValueType.TEXT_DOCUMENT ? new TextDocument("") : 0;
      this.keys = []; this.expression = ""; this.expressionError = ""; this.enabled = true;
      this.canSetExpression = true; this.canVaryOverTime = true; this.propertyValueType = valueTypeFor(name);
    }
    get propertyType() { return this.children.length ? PropertyType.NAMED_GROUP : PropertyType.PROPERTY; }
    get numProperties() { return this.children.length; }
    get value() { return this._value; }
    get numKeys() { return this.keys.length; }
    property(ref) {
      if (typeof ref === "number") return this.children[ref - 1] || null;
      ref = ALIAS[ref] || ref;
      let c = this.children.find((x) => x.name === ref || x.matchName === ref);
      if (!c) { c = new Prop(ref, this, this.children.length + 1); this.children.push(c); }
      return c;
    }
    canAddProperty() { return true; }
    addProperty(mn) { const c = new Prop(mn, this, this.children.length + 1); this.children.push(c); return c; }
    setValue(v) { if (this.keys.length) throw new Error("setValue on keyed property"); this._value = v; }
    setValueAtTime(t, v) { this.keys = this.keys.filter((k) => k.t !== t).concat([{ t, v }]).sort((a, b) => a.t - b.t); }
    valueAtTime() { return this._value; }
    removeKey(i) { this.keys.splice(i - 1, 1); }
    keyTime(i) { return this.keys[i - 1].t; }
    keyValue(i) { return this.keys[i - 1].v; }
    nearestKeyIndex(t) { let b = 1, d = 1e9; this.keys.forEach((k, i) => { if (Math.abs(k.t - t) < d) { d = Math.abs(k.t - t); b = i + 1; } }); return b; }
    setInterpolationTypeAtKey() {} setTemporalEaseAtKey(i, a, b) { if (!a.length || !b.length) throw new Error("ease dims"); }
    setTemporalContinuousAtKey() {} setTemporalAutoBezierAtKey() {} setSpatialTangentsAtKey() {} setRovingAtKey() {}
    remove() { const p = this.parentProperty; p.children.splice(p.children.indexOf(this), 1); }
    moveTo() {}
  }

  class Item { constructor(name) { this.name = name; this.id = nextId++; this.parentFolder = null; this.typeName = "Item"; } remove() { project._items.splice(project._items.indexOf(this), 1); } }
  class FolderItem extends Item { constructor(n) { super(n); this.typeName = "Folder"; } }
  class SolidSource {}
  class FootageItem extends Item { constructor(n) { super(n); this.typeName = "Footage"; this.mainSource = {}; this.width = 100; this.height = 100; } }

  class Layer {
    constructor(comp, name) {
      this.containingComp = comp; this.name = name; this.id = nextId++; this.root = new Prop("root");
      const tg = this.root.property("ADBE Transform Group");
      ["ADBE Anchor Point", "ADBE Position", "ADBE Scale", "ADBE Opacity", "ADBE Rotate Z", "ADBE Rotate X", "ADBE Rotate Y", "ADBE Orientation"].forEach((n) => tg.property(n));
      this.root.property("ADBE Effect Parade"); this.root.property("ADBE Mask Parade");
      Object.assign(this, { enabled: true, inPoint: 0, outPoint: comp.duration, startTime: 0, parent: null, threeDLayer: false, autoOrient: 0, motionBlur: false, collapseTransformation: false, nullLayer: false, adjustmentLayer: false, blendingMode: 0 });
    }
    get index() { return this.containingComp._layers.indexOf(this) + 1; }
    property(n) { return n === "Transform" ? this.root.property("ADBE Transform Group") : this.root.property(n); }
    duplicate() { const d = new this.constructor(this.containingComp, this.name); this.containingComp._layers.unshift(d); return d; }
    remove() { const l = this.containingComp._layers; l.splice(l.indexOf(this), 1); }
    moveToBeginning() {} moveToEnd() {} moveBefore() {} moveAfter() {}
    setTrackMatte() {}
  }
  class AVLayer extends Layer {}
  class ShapeLayer extends AVLayer { constructor(c, n) { super(c, n); this.root.property("ADBE Root Vectors Group"); } }
  class TextLayer extends AVLayer { constructor(c, n) { super(c, n); this.root.property("ADBE Text Properties").property("ADBE Text Document"); } }
  class CameraLayer extends Layer { constructor(c, n) { super(c, n); this.root.property("ADBE Camera Options Group"); } }
  class LightLayer extends Layer {}

  class CompItem extends Item {
    constructor(name, w, h, pa, dur, fps) {
      super(name); Object.assign(this, { width: w, height: h, pixelAspect: pa, duration: dur, frameRate: fps, typeName: "Composition", _layers: [], time: 0, motionBlur: false, renderer: "ADBE Advanced 3d", renderers: ["ADBE Advanced 3d", "ADBE Ernst", "ADBE Calder"], shutterAngle: 180 });
      const comp = this;
      const add = (L, n) => { const l = new L(comp, n); comp._layers.unshift(l); return l; };
      this.layers = {
        addNull: () => { const l = add(AVLayer, "Null"); l.nullLayer = true; return l; },
        addSolid: (c, n) => { const l = add(AVLayer, n); l.source = new FootageItem(n); l.source.mainSource = new SolidSource(); return l; },
        addShape: () => add(ShapeLayer, "Shape Layer"),
        addText: (t) => add(TextLayer, t || "Text"),
        addBoxText: (s, t) => add(TextLayer, t || "Text"),
        addCamera: (n) => add(CameraLayer, n),
        addLight: (n) => add(LightLayer, n),
        add: (item) => { const l = add(AVLayer, item.name); l.source = item; return l; },
        precompose: (idx, name) => { const nc = project.items.addComp(name, comp.width, comp.height, 1, comp.duration, comp.frameRate); const l = add(AVLayer, name); l.source = nc; return nc; },
      };
    }
    get numLayers() { return this._layers.length; }
    layer(i) { return this._layers[i - 1]; }
    openInViewer() {}
    saveFrameToPng(t, file) {
      // 1x1 PNG
      fs.writeFileSync(file.fsName, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
    }
  }

  const rqItems = [];
  const RQItemStatus = ENUM(["DONE", "ERR_STOPPED", "NEEDS_OUTPUT", "QUEUED", "RENDERING", "UNQUEUED", "USER_STOPPED", "WILL_CONTINUE"]);
  const project = {
    _items: [], file: null, dirty: false, bitsPerChannel: 16, activeItem: null, rootFolder: {},
    get numItems() { return this._items.length; },
    item(i) { return this._items[i - 1]; },
    save(f) { if (f) this.file = f; this.dirty = false; },
    close() { this._items.length = 0; },
    importFile(io) { const it = new FootageItem(path.basename(io.file.fsName)); this._items.push(it); return it; },
    items: {
      addComp: (n, w, h, pa, d, f) => { const c = new CompItem(n, w, h, pa, d, f); project._items.push(c); project.activeItem = c; return c; },
      addFolder: (n) => { const f = new FolderItem(n); project._items.push(f); return f; },
    },
    renderQueue: {
      get numItems() { return rqItems.length; },
      item: (i) => rqItems[i - 1],
      items: {
        add: (comp) => {
          const om = { file: null, templates: ["H.264 - Match Render Settings - 15 Mbps", "Lossless"], applyTemplate(t) { if (!this.templates.includes(t)) throw new Error("no template"); } };
          const it = { comp, status: RQItemStatus.QUEUED, templates: ["Best Settings", "Draft Settings"], applyTemplate() {}, setSettings() {}, outputModule: () => om, remove() { rqItems.splice(rqItems.indexOf(this), 1); } };
          rqItems.push(it); return it;
        },
      },
      render() { rqItems.forEach((i) => (i.status = RQItemStatus.DONE)); },
      queueInAME() {},
    },
  };

  const settings = {};
  const app = {
    version: "26.5x10", buildName: "mock", project,
    effects: [{ displayName: "Wave Warp", matchName: "ADBE Wave Warp", category: "Distort" }, { displayName: "CC Particle World", matchName: "CC Particle World", category: "Simulation" }],
    settings: { haveSetting: (s, k) => (s + k) in settings, getSetting: (s, k) => settings[s + k], saveSetting: (s, k, v) => { settings[s + k] = v; } },
    beginUndoGroup() {}, endUndoGroup() {}, beginSuppressDialogs() {}, endSuppressDialogs() {},
    executeCommand() {}, newProject() { project._items.length = 0; return project; }, open() {},
  };

  class File {
    constructor(p) { this.fsName = path.resolve(String(p)); this.encoding = "UTF-8"; this._mode = null; this._buf = ""; }
    get name() { return path.basename(this.fsName); }
    get exists() { return fs.existsSync(this.fsName); }
    open(mode) { this._mode = mode; if (mode === "r" && !this.exists) return false; this._buf = mode === "r" ? fs.readFileSync(this.fsName, "utf8") : ""; return true; }
    read() { return this._buf; }
    write(s) { this._buf += s; return true; }
    close() { if (this._mode === "w") fs.writeFileSync(this.fsName, this._buf); this._mode = null; return true; }
    rename(n) { const to = path.join(path.dirname(this.fsName), n); try { fs.renameSync(this.fsName, to); this.fsName = to; return true; } catch { return false; } }
    remove() { fs.rmSync(this.fsName, { force: true }); return true; }
  }
  class Folder {
    constructor(p) { this.fsName = path.resolve(String(p)); }
    get exists() { return fs.existsSync(this.fsName); }
    get name() { return path.basename(this.fsName); }
    create() { fs.mkdirSync(this.fsName, { recursive: true }); return true; }
    getFiles(mask) {
      const re = new RegExp("^" + mask.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
      return fs.readdirSync(this.fsName).filter((f) => re.test(f)).map((f) => new File(path.join(this.fsName, f)));
    }
  }
  Folder.myDocuments = new Folder(path.join(homeDir, "Documents"));

  const ctx = {
    app, File, Folder, Shape, TextDocument, KeyframeEase, CompItem, FolderItem, FootageItem, SolidSource, AVLayer, ShapeLayer, TextLayer, CameraLayer, LightLayer,
    PropertyType, PropertyValueType, RQItemStatus,
    ImportOptions: class { constructor(f) { this.file = f; } canImportAs() { return true; } },
    ImportAsType: ENUM(["FOOTAGE", "COMP", "COMP_CROPPED_LAYERS", "PROJECT"]),
    AutoOrientType: ENUM(["NO_AUTO_ORIENT", "ALONG_PATH", "CAMERA_OR_POINT_OF_INTEREST", "CHARACTERS_TOWARD_CAMERA"]),
    BlendingMode: ENUM(["NORMAL", "ADD", "SCREEN", "MULTIPLY", "OVERLAY", "SOFT_LIGHT"]),
    TrackMatteType: ENUM(["NO_TRACK_MATTE", "ALPHA", "ALPHA_INVERTED", "LUMA", "LUMA_INVERTED"]),
    LayerQuality: ENUM(["BEST", "DRAFT", "WIREFRAME"]),
    LightType: ENUM(["POINT", "SPOT", "PARALLEL", "AMBIENT"]),
    MaskMode: ENUM(["NONE", "ADD", "SUBTRACT", "INTERSECT", "LIGHTEN", "DARKEN", "DIFFERENCE"]),
    KeyframeInterpolationType: ENUM(["LINEAR", "BEZIER", "HOLD"]),
    CloseOptions: ENUM(["DO_NOT_SAVE_CHANGES", "SAVE_CHANGES", "PROMPT_TO_SAVE_CHANGES"]),
    logToPanel: () => {}, statusText: {},
  };
  ctx.$ = { os: "mock", global: ctx, evalFile: (f) => vm.runInContext(fs.readFileSync(f.fsName, "utf8"), ctx) };
  vm.createContext(ctx);
  return ctx;
}

// Loads the v2 section of the bridge panel into a mock context.
export function loadBridge(homeDir, bridgeFile) {
  const src = fs.readFileSync(bridgeFile, "utf8");
  const start = src.indexOf("// ===== MCP V2 BEGIN =====");
  const end = src.indexOf("// ===== MCP V2 END =====");
  if (start < 0 || end < 0) throw new Error("v2 markers not found in " + bridgeFile);
  const ctx = createAE(homeDir);
  vm.runInContext(src.slice(start, end), ctx, { filename: "mcp-bridge-auto.jsx(v2)" });
  return ctx;
}
