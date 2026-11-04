import { collage } from './store.svelte';
import { layoutFor, photoGeom, render } from './render';
import { canvasToBlob, fitCanvas, type Format } from '../../lib/export';

/** Long edge that keeps every photo at (roughly) its native resolution. */
export function nativeLongEdge() {
  const doc = $state.snapshot(collage.doc);
  const r = doc.ratio.w / doc.ratio.h;
  const W0 = r >= 1 ? 1000 : 1000 * r;
  const H0 = r >= 1 ? 1000 / r : 1000;
  let best = 0;
  for (const c of layoutFor(doc, W0, H0).cells) {
    const slot = doc.slots[c.id];
    const img = collage.img(slot?.img ?? null);
    if (!slot || !img) continue;
    const g = photoGeom(slot, c, img.w, img.h);
    best = Math.max(best, 1000 / g.s);
  }
  return Math.round(Math.min(8192, Math.max(1080, best || 2048)));
}

export function outputSize(size = collage.exportSettings.size) {
  const long = size || nativeLongEdge();
  const { w, h } = collage.doc.ratio;
  const W = w >= h ? long : Math.round((long * w) / h);
  const H = w >= h ? Math.round((long * h) / w) : long;
  return fitCanvas(W, H);
}

export async function renderBlob(format: Format = collage.exportSettings.format, quality = collage.exportSettings.quality) {
  const { w, h } = outputSize();
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  render(ctx, $state.snapshot(collage.doc), w, h, collage.resolveFull);
  const blob = await canvasToBlob(canvas, format, quality);
  canvas.width = canvas.height = 0;
  return { blob, w, h };
}
