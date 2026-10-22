// Unit test for src/v2/png.ts (run with node --experimental-strip-types).
import * as zlib from "zlib";
import { decodePng, shrinkPng } from "../src/v2/png.ts";

const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

// Build a 200x100 16-bit RGBA PNG: left half opaque red, right half fully transparent, with a
// gradient in green so neighbouring bytes differ. Rows cycle through PNG filter types 0-4.
function make16() {
  const w = 200, h = 100, bpp = 8, stride = w * bpp, rows = [];
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const raw = Buffer.alloc(stride);
    for (let x = 0; x < w; x++) {
      const o = x * bpp;
      if (x < w / 2) { raw.writeUInt16BE(65535, o); raw.writeUInt16BE((x * 300 + y * 7) & 0xff00, o + 2); raw.writeUInt16BE(0, o + 4); raw.writeUInt16BE(65535, o + 6); }
    }
    const f = y % 5, row = Buffer.alloc(1 + stride);
    row[0] = f;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? raw[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][f];
      row[1 + i] = (raw[i] - pred) & 0xff;
    }
    rows.push(row);
    prev = raw;
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 16; ihdr[9] = 6;
  const chunk = (t, b) => { const l = Buffer.alloc(4); l.writeUInt32BE(b.length); return Buffer.concat([l, Buffer.from(t), b, Buffer.alloc(4)]); };
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}

let fail = 0;
const check = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) fail++; };
const src = make16();
const { png, width, height } = shrinkPng(src, 50, [0, 0, 255]);
check("downscaled to 50x25", width === 50 && height === 25);
const back = decodePng(png);
const px = (x, y) => [...back.data.subarray((y * back.width + x) * 3, (y * back.width + x) * 3 + 3)];
const full = decodePng(src);
const fpx = (x, y) => [...full.data.subarray((y * 200 + x) * 3, (y * 200 + x) * 3 + 3)];
let rowsOk = true;
for (let y = 0; y < 100; y++) { const g = ((30 * 300 + y * 7) & 0xff00) >> 8; if (JSON.stringify(fpx(30, y)) !== JSON.stringify([255, g, 0])) rowsOk = false; }
check("all 5 filter types decode exactly", rowsOk);
check("left half red", px(5, 10)[0] === 255 && px(5, 10)[2] === 0);
check("transparent half composited over bg", JSON.stringify(px(45, 10)) === JSON.stringify([0, 0, 255]));
process.exit(fail ? 1 : 0);
