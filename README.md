# 🎬 After Effects MCP Server

![Node.js](https://img.shields.io/badge/node-%3E=14.x-brightgreen.svg)
![Build](https://img.shields.io/badge/build-passing-success)
![License](https://img.shields.io/github/license/Dakkshin/after-effects-mcp)
![Platform](https://img.shields.io/badge/platform-after%20effects-blue)

✨ A Model Context Protocol (MCP) server for Adobe After Effects that enables AI assistants and other applications to control After Effects through a standardized protocol.

> **Fork note (swami134):** This fork adds the **v2 `ae_*` tools** (see [v2 tools](#-v2-tools)): results come back directly, frames come back as images, any property/effect/keyframe/expression is reachable by path, plus nulls, parenting, precompose, import, shape building, camera depth of field, save and render.

<a href="https://glama.ai/mcp/servers/@Dakkshin/after-effects-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Dakkshin/after-effects-mcp/badge" alt="mcp-after-effects MCP server" />
</a>

## Table of Contents
- [Features](#features)
  - [Core Composition Features](#core-composition-features)
  - [Layer Management](#layer-management)
  - [Animation Capabilities](#animation-capabilities)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Update MCP Config](#Update-MCP-Config)
  - [Running the Server](#running-the-server)
- [Usage Guide](#usage-guide)
  - [Creating Compositions](#creating-compositions)
  - [Working with Layers](#working-with-layers)
  - [Animation](#animation)
- [Available MCP Tools](#available-mcp-tools)
- [For Developers](#for-developers)
  - [Project Structure](#project-structure)
  - [Building the Project](#building-the-project)
  - [Contributing](#contributing)
- [License](#license)

## 📦 Features

### 🎥 Core Composition Features
- **Create compositions** with custom settings (size, frame rate, duration, background color)
- **List all compositions** in a project
- **Get project information** such as frame rate, dimensions, and duration

### 🧱 Layer Management
- **Create text layers** with customizable properties (font, size, color, position)
- **Create shape layers** (rectangle, ellipse, polygon, star) with colors and strokes
- **Create solid/adjustment layers** for backgrounds and effects
- **Create camera layers** with configurable zoom and position
- **Create null objects** for animation control
- **Modify layer properties** like position, scale, rotation, opacity, timing
- **Toggle 2D/3D mode** for layers
- **Set blend modes** (normal, multiply, screen, etc.)
- **Track matte** support (alpha, luma, inverted)
- **Duplicate layers** with optional rename
- **Delete layers** from composition
- **Create/modify masks** with feather, expansion, and opacity

### 🌀 Animation Capabilities
- **Set keyframes** for layer properties (Position, Scale, Rotation, Opacity, etc.)
- **Apply expressions** to layer properties for dynamic animations
- **Batch set properties** across multiple layers at once

## ⚙️ Setup Instructions

### 🛠 Prerequisites
- Adobe After Effects (2022 or later)
- Node.js (v14 or later)
- npm or yarn package manager

### 📥 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dakkshin/after-effects-mcp.git
   cd after-effects-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Build the project**
   ```bash
   npm run build
   # or
   yarn build
   ```

4. **Install the After Effects panel**
   ```bash
   npm run install-bridge
   # or
   yarn install-bridge
   ```
   This will copy the necessary scripts to your After Effects installation.

### 🔧 Update MCP Config

#### Option 1: Using .mcp.json (Recommended for Claude Code)
The repository includes a `.mcp.json` file for easy configuration. Copy or reference it in your MCP settings:

```json
{
  "mcpServers": {
    "AfterEffectsMCP": {
      "command": "node",
      "args": ["PATH/TO/after-effects-mcp/build/index.js"]
    }
  }
}
```

#### Option 2: Manual Configuration
Go to your client (e.g., Claude or Cursor) and update your config file:

```json
{
  "mcpServers": {
    "AfterEffectsMCP": {
      "command": "node",
      "args": ["C:\\Users\\Dakkshin\\after-effects-mcp\\build\\index.js"]
    }
  }
}
```

### ▶️ Running the Server

1. **Start the MCP server**
   ```bash
   npm start
   # or
   yarn start
   ```

2. **Open After Effects**

3. **Open the MCP Bridge Auto panel**
   - In After Effects, go to Window > mcp-bridge-auto.jsx
   - The panel will automatically check for commands every few seconds
   - Make sure the "Auto-run commands" checkbox is enabled

## 🚀 Usage Guide

Once you have the server running and the MCP Bridge panel open in After Effects, you can control After Effects through the MCP protocol. This allows AI assistants or custom applications to send commands to After Effects.

### 📘 Creating Compositions

You can create new compositions with custom settings:
- Name
- Width and height (in pixels)
- Frame rate
- Duration
- Background color

Example MCP tool usage (for developers):
```javascript
mcp_aftereffects_create_composition({
  name: "My Composition", 
  width: 1920, 
  height: 1080, 
  frameRate: 30,
  duration: 10
});
```

### ✍️ Working with Layers

You can create and modify different types of layers:

**Text layers:**
- Set text content, font, size, and color
- Position text anywhere in the composition
- Adjust timing and opacity

**Shape layers:**
- Create rectangles, ellipses, polygons, and stars
- Set fill and stroke colors
- Customize size and position

**Solid layers:**
- Create background colors
- Make adjustment layers for effects

### 🕹 Animation

You can animate layers with:

**Keyframes:**
- Set property values at specific times
- Create motion, scaling, rotation, and opacity changes
- Control the timing of animations

**Expressions:**
- Apply JavaScript expressions to properties
- Create dynamic, procedural animations
- Connect property values to each other

## 🛠 Available MCP Tools

| Command                     | Description                            |
|-----------------------------|----------------------------------------|
| `create-composition`        | Create a new composition               |
| `run-script`                | Run a JS script inside AE              |
| `get-results`               | Get script results                     |
| `get-help`                  | Help for available commands            |
| `setLayerKeyframe`          | Add keyframe to layer property         |
| `setLayerExpression`        | Add/remove expressions from properties|
| `setLayerProperties`        | Set layer properties (position, scale, rotation, opacity, blendMode, threeDLayer, trackMatteType, enabled, etc.) |
| `batchSetLayerProperties`  | Apply properties to multiple layers   |
| `getLayerInfo`              | Get layer info (position, 3D status)  |
| `createCamera`              | Create camera layer                   |
| `createNullObject`          | Create null object for animation      |
| `duplicateLayer`            | Duplicate a layer                     |
| `deleteLayer`               | Delete a layer                        |
| `setLayerMask`              | Create/modify layer masks             |

## 🧰 v2 tools

The `ae_*` tools use a per-command queue (`Documents/ae-mcp-bridge/queue` → `results`), so each tool **waits for After Effects and returns its own result**. There's no `get-results` step and no risk of reading another command's output. Every command is one undo step. The old tools above still work unchanged.

| Tool | What it does |
|---|---|
| `ae_ping` | Bridge/AE version, open project, active comp, raw-script switch |
| `ae_project` | `info` (list items), `new`, `open`, `save` (or save-as with `path`), `close` |
| `ae_comp_create` / `ae_comp_set` | Create or change a comp: size, fps, duration, bg color, work area, **motion blur**, shutter, **renderer** (classic / cinema4d / advanced), resolution, time |
| `ae_comp_tree` | Every layer with id, type, 3D, parent, timing, switches, effects (optionally transform values and expressions) |
| `ae_layer_create` | `null`, `solid`, `adjustment`, `shape`, `text` (incl. box text and style), `camera`, `light`, `item` (footage or comp as a layer), and settings in the same call |
| `ae_layer_set` | Any switch on one or many layers: 3D, **auto-orient**, **parent**, motion blur, **collapse transformations**, blend mode, track matte, quality, timing, full transform incl. X/Y rotation and orientation, stacking order |
| `ae_layer_duplicate` / `ae_layer_delete` | Duplicate N times with per-copy names and settings / delete several |
| `ae_precompose` | Precompose layers |
| `ae_import` | Import images, layered PSD/AI (as comps), video, audio, sequences, `.aep`; optionally add to a comp |
| `ae_write_asset` | Write a file (base64 or text) into `Documents/ae-mcp-bridge/assets` or `scripts`, ready to import or run |
| `ae_prop_get` / `ae_prop_set` | Read or write **any property by path**, e.g. `"Effects/CC Particle World/Producer/Position X"`, mask paths, shape paths, text, camera/light options |
| `ae_prop_tree` | Dump a layer's property tree (names, match names, values, dropdown options) to discover paths |
| `ae_keyframes` | Keyframes on any property with linear/bezier/hold, Easy Ease, auto-bezier, custom speed/influence, spatial tangents, roving |
| `ae_expression` | Set expressions on any property for many layers at once; returns each expression error |
| `ae_effect_add` / `ae_effect_set` / `ae_effects_list` | Add effects with **nested settings and layer references**, edit/reorder/remove, list installed effects with match names |
| `ae_shape_build` | Vector artwork from JSON: bezier paths, rect/ellipse/star, fill, stroke, gradient, trim, repeater, offset, round corners, wiggle, zig-zag, pucker, twist, merge, nested groups with transforms |
| `ae_mask` | Bezier/rect/ellipse masks with mode, inverted, feather, opacity, expansion |
| `ae_camera_set` | Zoom, **depth of field**, focus distance, aperture, blur level, keep-a-layer-in-focus |
| `ae_render_frame` | Render frames to PNG and **return them as images** (for visual checks) |
| `ae_render_queue` | Add to the render queue (H.264 template if available), list templates, start, clear, send to Media Encoder |
| `ae_result` | Collect the result of a long command started with `wait:false` |
| `ae_run_jsx` | Run ExtendScript inline or from `Documents/ae-mcp-bridge/scripts`. **Off by default:** tick *Allow raw scripts* in the panel |
| `ae_undo` | Undo the last command(s) |
| `ae_batch` | Many commands in one call and one undo step |

**Security:** `ae_run_jsx` can do anything a script can do on your machine. It only works while *Allow raw scripts* is ticked in the bridge panel (the setting is remembered). Leave it off unless you need it, and never expose the MCP server to people you don't trust.

### Testing without After Effects

`npm run build && npm test` starts the real server, connects an MCP client, and runs the panel's v2 code against a mock of the After Effects object model (`test/mock-ae.mjs`). It catches script and protocol errors, not After Effects behaviour.

## 👨‍💻 For Developers

### 🧩 Project Structure

- `src/index.ts`: MCP server implementation (original tools)
- `src/v2/bridge.ts`, `src/v2/tools.ts`: v2 queue client and `ae_*` tools
- `src/scripts/mcp-bridge-auto.jsx`: Main After Effects panel script (v2 handlers between the `MCP V2 BEGIN/END` markers)
- `test/`: end-to-end test with a mocked After Effects
- `install-bridge.js`: Script to install the panel in After Effects

### 📦 Building the Project

```bash
npm run build
# or
yarn build
```

**Note:** This project uses esbuild for fast builds, replacing the previous TypeScript compiler approach that could run out of memory on larger codebases.

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Dakkshin/after-effects-mcp&type=date&legend=top-left)](https://www.star-history.com/#Dakkshin/after-effects-mcp&type=date&legend=top-left)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
