/**
 * One renderer for both the on-screen preview and the exported file, so what
 * you see is exactly what you get. All sizes are expressed in "units" where
 * 1 unit = long edge / 1000, which keeps the look identical at any resolution.
 */
import { compute, leaves, type CellRect } from './layout';
import type { Annot, Bg, Doc, Slot, TextAnnot, Watermark } from './model';

export interface Source {
  src: CanvasImageSource;
  w: number;
  h: number;
}
export type Resolve = (id: string) => Source | null;

export const FONT = `'Roboto Flex', Roboto, 'Segoe UI', system-ui, 'PingFang SC', 'Hiragino Sans', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif`;

export const unitOf = (W: number, H: number) => Math.max(W, H) / 1000;

export function layoutFor(doc: Doc, W: number, H: number) {
  const u = unitOf(W, H);
  const p = doc.style.padding * u;
  return compute(doc.layout, { x: p, y: p, w: W - 2 * p, h: H - 2 * p }, doc.style.gap * u);
}

/** Geometry of a photo inside its cell. */
export function photoGeom(slot: Slot, cell: { w: number; h: number }, iw: number, ih: number) {
  const turned = slot.rot % 180 !== 0;
  const ew = turned ? ih : iw;
  const eh = turned ? iw : ih;
  const base = slot.fit === 'cover' ? Math.max(cell.w / ew, cell.h / eh) : Math.min(cell.w / ew, cell.h / eh);
  const s = base * slot.zoom;
  const maxDx = Math.max(0, (ew * s - cell.w) / 2);
  const maxDy = Math.max(0, (eh * s - cell.h) / 2);
  return { s, maxDx, maxDy, dx: slot.ox * maxDx, dy: slot.oy * maxDy };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rr);
}

function drawCover(ctx: CanvasRenderingContext2D, s: Source, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / s.w, h / s.h);
  const dw = s.w * k;
  const dh = s.h * k;
  ctx.drawImage(s.src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Blur by down-sampling: portable (no ctx.filter) and fast. */
function drawBlurred(ctx: CanvasRenderingContext2D, s: Source, W: number, H: number, amount: number) {
  if (amount <= 0) return drawCover(ctx, s, 0, 0, W, H);
  const factor = 1 + amount / 3;
  const tw = Math.max(2, Math.round(W / factor));
  const th = Math.max(2, Math.round(H / factor));
  const tmp = document.createElement('canvas');
  tmp.width = tw;
  tmp.height = th;
  const t = tmp.getContext('2d')!;
  t.imageSmoothingQuality = 'high';
  drawCover(t, s, 0, 0, tw, th);
  // Two passes for a smoother result.
  const tmp2 = document.createElement('canvas');
  tmp2.width = Math.max(2, Math.round(tw / 2));
  tmp2.height = Math.max(2, Math.round(th / 2));
  const t2 = tmp2.getContext('2d')!;
  t2.imageSmoothingQuality = 'high';
  t2.drawImage(tmp, 0, 0, tmp2.width, tmp2.height);
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  // Overscan slightly so blurred edges don't fade to transparent.
  ctx.drawImage(tmp2, -W * 0.03, -H * 0.03, W * 1.06, H * 1.06);
  ctx.restore();
}

function firstPhoto(doc: Doc): string | null {
  for (const id of leaves(doc.layout)) if (doc.slots[id]?.img) return doc.slots[id].img;
  return null;
}

function drawBg(ctx: CanvasRenderingContext2D, bg: Bg, doc: Doc, W: number, H: number, resolve: Resolve) {
  ctx.fillStyle = bg.color;
  ctx.fillRect(0, 0, W, H);
  if (bg.type === 'gradient') {
    const a = ((bg.angle - 90) * Math.PI) / 180;
    const len = Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a));
    const cx = W / 2;
    const cy = H / 2;
    const g = ctx.createLinearGradient(
      cx - (Math.cos(a) * len) / 2, cy - (Math.sin(a) * len) / 2,
      cx + (Math.cos(a) * len) / 2, cy + (Math.sin(a) * len) / 2,
    );
    g.addColorStop(0, bg.color);
    g.addColorStop(1, bg.color2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (bg.type === 'photo') {
    const id = bg.img ?? firstPhoto(doc);
    const s = id ? resolve(id) : null;
    if (s) drawBlurred(ctx, s, W, H, bg.blur);
    if (bg.dim) {
      ctx.fillStyle = `rgba(0,0,0,${bg.dim / 100})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

function drawCell(ctx: CanvasRenderingContext2D, cell: CellRect, slot: Slot | undefined, doc: Doc, u: number, resolve: Resolve, placeholder?: string) {
  const r = doc.style.radius * u;
  const src = slot?.img ? resolve(slot.img) : null;
  if (!src || !slot) {
    if (placeholder) {
      ctx.fillStyle = placeholder;
      roundRect(ctx, cell.x, cell.y, cell.w, cell.h, r);
      ctx.fill();
    }
    return;
  }
  const g = photoGeom(slot, cell, src.w, src.h);
  if (doc.style.shadow > 0 && slot.fit === 'cover') {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.12 + doc.style.shadow / 250})`;
    ctx.shadowBlur = doc.style.shadow * u * 0.6;
    ctx.shadowOffsetY = doc.style.shadow * u * 0.15;
    ctx.fillStyle = '#000';
    roundRect(ctx, cell.x, cell.y, cell.w, cell.h, r);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  roundRect(ctx, cell.x, cell.y, cell.w, cell.h, r);
  ctx.clip();
  ctx.translate(cell.x + cell.w / 2 + g.dx, cell.y + cell.h / 2 + g.dy);
  ctx.rotate((slot.rot * Math.PI) / 180);
  if (slot.flip) ctx.scale(-1, 1);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src.src, (-src.w * g.s) / 2, (-src.h * g.s) / 2, src.w * g.s, src.h * g.s);
  ctx.restore();
}

/* ───────── Annotations ───────── */
export const textFont = (a: TextAnnot, u: number) => `${a.bold ? 700 : 500} ${a.size * u}px ${FONT}`;
export const LINE_H = 1.25;

export function measureText(ctx: CanvasRenderingContext2D, a: TextAnnot, u: number) {
  ctx.save();
  ctx.font = textFont(a, u);
  const lines = (a.text || ' ').split('\n');
  const w = Math.max(...lines.map((l) => ctx.measureText(l || ' ').width));
  ctx.restore();
  const lh = a.size * u * LINE_H;
  const pad = a.style === 'pill' ? a.size * u * 0.5 : a.size * u * 0.15;
  return { w: w + pad * 2, h: lh * lines.length + pad * (a.style === 'pill' ? 1 : 2), lines, lh };
}

function contrast(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? '#111111' : '#FFFFFF';
}

export function drawAnnot(ctx: CanvasRenderingContext2D, a: Annot, W: number, H: number, u: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (a.kind === 'text') {
    const m = measureText(ctx, a, u);
    const cx = a.x * W;
    const cy = a.y * H;
    ctx.font = textFont(a, u);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (a.style === 'pill') {
      ctx.fillStyle = a.color;
      roundRect(ctx, cx - m.w / 2, cy - m.h / 2, m.w, m.h, Math.min(m.h / 2, a.size * u));
      ctx.fill();
    }
    const top = cy - (m.lh * m.lines.length) / 2 + m.lh / 2;
    m.lines.forEach((line, i) => {
      const y = top + i * m.lh;
      if (a.style === 'outline') {
        ctx.strokeStyle = contrast(a.color);
        ctx.lineWidth = a.size * u * 0.16;
        ctx.strokeText(line, cx, y);
      } else if (a.style === 'plain') {
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = a.size * u * 0.25;
        ctx.shadowOffsetY = a.size * u * 0.04;
      }
      ctx.fillStyle = a.style === 'pill' ? contrast(a.color) : a.color;
      ctx.fillText(line, cx, y);
    });
  } else if (a.kind === 'arrow') {
    const x1 = a.x1 * W;
    const y1 = a.y1 * H;
    const x2 = a.x2 * W;
    const y2 = a.y2 * H;
    const sw = a.stroke * u;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = Math.max(sw * 3.6, 10 * u);
    ctx.strokeStyle = a.color;
    ctx.fillStyle = a.color;
    ctx.lineWidth = sw;
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = sw;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(ang) * head * 0.7, y2 - Math.sin(ang) * head * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
    ctx.closePath();
    ctx.fill();
  } else {
    const x = a.x * W;
    const y = a.y * H;
    const w = a.w * W;
    const h = a.h * H;
    ctx.lineWidth = a.stroke * u;
    ctx.strokeStyle = a.color;
    ctx.beginPath();
    if (a.kind === 'rect') ctx.roundRect(x, y, w, h, Math.min(a.stroke * u * 1.5, Math.abs(w) / 2, Math.abs(h) / 2));
    else ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    if (a.fill) {
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* ───────── Watermark ───────── */
function drawWatermark(ctx: CanvasRenderingContext2D, wm: Watermark, W: number, H: number, u: number) {
  if (!wm.on || !wm.text.trim()) return;
  const size = wm.size * u;
  ctx.save();
  ctx.globalAlpha = wm.opacity;
  ctx.fillStyle = wm.color;
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = size * 0.15;
  const tw = ctx.measureText(wm.text).width;
  const rad = (wm.rotation * Math.PI) / 180;
  if (wm.mode === 'tile') {
    const k = { sparse: [5, 7], medium: [2.8, 4.2], dense: [1.4, 2.4] }[wm.density];
    const sx = tw + size * k[0];
    const sy = size * k[1];
    const diag = Math.hypot(W, H);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rad);
    let row = 0;
    for (let y = -diag / 2; y <= diag / 2; y += sy, row++) {
      const shift = row % 2 ? sx / 2 : 0;
      for (let x = -diag / 2 - sx; x <= diag / 2 + sx; x += sx) ctx.fillText(wm.text, x + shift, y);
    }
  } else {
    const m = 28 * u;
    const col = wm.pos.endsWith('l') ? 0 : wm.pos.endsWith('r') ? 2 : 1;
    const row = wm.pos.startsWith('t') ? 0 : wm.pos.startsWith('b') ? 2 : 1;
    // Rotated bounding box so corners never clip.
    const bw = Math.abs(tw * Math.cos(rad)) + Math.abs(size * Math.sin(rad));
    const bh = Math.abs(tw * Math.sin(rad)) + Math.abs(size * Math.cos(rad));
    const x = [m + bw / 2, W / 2, W - m - bw / 2][col];
    const y = [m + bh / 2, H / 2, H - m - bh / 2][row];
    ctx.translate(x, y);
    ctx.rotate(rad);
    ctx.fillText(wm.text, 0, 0);
  }
  ctx.restore();
}

export interface RenderOpts {
  /** Fill colour for empty cells (preview only). */
  placeholder?: string;
  /** Skip an annotation (e.g. while it is being edited inline). */
  skipAnnot?: string;
}

export function render(ctx: CanvasRenderingContext2D, doc: Doc, W: number, H: number, resolve: Resolve, opts: RenderOpts = {}) {
  const u = unitOf(W, H);
  ctx.clearRect(0, 0, W, H);
  drawBg(ctx, doc.bg, doc, W, H, resolve);
  const { cells } = layoutFor(doc, W, H);
  for (const c of cells) drawCell(ctx, c, doc.slots[c.id], doc, u, resolve, opts.placeholder);
  for (const a of doc.annots) if (a.id !== opts.skipAnnot) drawAnnot(ctx, a, W, H, u);
  drawWatermark(ctx, doc.wm, W, H, u);
}
