// Minimal PNG decode / downscale / encode with Node's zlib only.
// After Effects writes full-size (often 16-bit) PNGs; this shrinks them to a size that
// can be returned to the MCP client, compositing any alpha over a background colour.

import * as zlib from "zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };

export interface RGBImage {
  width: number;
  height: number;
  data: Buffer; // 8-bit RGB, row-major
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

// Decodes a non-interlaced 8/16-bit grey, grey+alpha, RGB or RGBA PNG to 8-bit RGB over bg.
export function decodePng(buf: Buffer, bg: [number, number, number] = [0, 0, 0]): RGBImage {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("Not a PNG file");
  let pos = 8, width = 0, height = 0, depth = 0, colorType = 0, interlace = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  const channels = CHANNELS[colorType];
  if (!channels || (depth !== 8 && depth !== 16) || interlace !== 0) {
    throw new Error(`Unsupported PNG (colorType ${colorType}, depth ${depth}, interlace ${interlace})`);
  }
  const bytesPer = depth / 8;
  const bpp = channels * bytesPer;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const cur = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);
  const out = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    for (let x = 0; x < stride; x++) {
      const v = raw[rowStart + 1 + x];
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let r: number;
      switch (filter) {
        case 0: r = v; break;
        case 1: r = v + a; break;
        case 2: r = v + b; break;
        case 3: r = v + ((a + b) >> 1); break;
        case 4: r = v + paeth(a, b, c); break;
        default: throw new Error(`Bad PNG filter ${filter}`);
      }
      cur[x] = r & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const p = x * bpp;
      // High byte of each sample is enough for an 8-bit preview.
      const s = (i: number) => cur[p + i * bytesPer];
      let r: number, g: number, bl: number, al = 255;
      if (channels === 1 || channels === 2) {
        r = g = bl = s(0);
        if (channels === 2) al = s(1);
      } else {
        r = s(0); g = s(1); bl = s(2);
        if (channels === 4) al = s(3);
      }
      const o = (y * width + x) * 3;
      out[o] = (r * al + bg[0] * (255 - al)) / 255;
      out[o + 1] = (g * al + bg[1] * (255 - al)) / 255;
      out[o + 2] = (bl * al + bg[2] * (255 - al)) / 255;
    }
    cur.copy(prev);
  }
  return { width, height, data: out };
}

// Area-average downscale to maxWidth (aspect preserved). Returns the input if already small enough.
export function downscale(img: RGBImage, maxWidth: number): RGBImage {
  if (img.width <= maxWidth) return img;
  const w = maxWidth;
  const h = Math.max(1, Math.round((img.height * maxWidth) / img.width));
  const sx = img.width / w, sy = img.height / h;
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        let i = (yy * img.width + x0) * 3;
        for (let xx = x0; xx < x1; xx++, i += 3) {
          r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++;
        }
      }
      const o = (y * w + x) * 3;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
    }
  }
  return { width: w, height: h, data: out };
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const tb = Buffer.concat([Buffer.from(type, "ascii"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tb));
  return Buffer.concat([len, tb, crc]);
}

export function encodePng(img: RGBImage): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const stride = img.width * 3;
  const raw = Buffer.alloc((stride + 1) * img.height);
  for (let y = 0; y < img.height; y++) {
    raw[y * (stride + 1)] = 0;
    img.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Convenience: full-size PNG file contents -> small 8-bit PNG.
export function shrinkPng(buf: Buffer, maxWidth: number, bg: [number, number, number]): { png: Buffer; width: number; height: number } {
  const img = downscale(decodePng(buf, bg), maxWidth);
  return { png: encodePng(img), width: img.width, height: img.height };
}
