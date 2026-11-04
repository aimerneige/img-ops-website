/* Decoded image library. Pixel data lives outside reactive state; only metadata is reactive. */

export interface Img {
  id: string;
  name: string;
  w: number;
  h: number;
  /** Full-resolution source, used for export. */
  full: HTMLImageElement;
  /** Down-scaled copy (≤ PREVIEW_MAX), used for fast on-screen rendering. */
  preview: CanvasImageSource;
  pw: number;
  ph: number;
  /** Small thumbnail URL for lists. */
  thumb: string;
  url: string;
}

const PREVIEW_MAX = 2048;
const THUMB_MAX = 240;
let seq = 0;

function downscale(img: HTMLImageElement, max: number): HTMLCanvasElement | HTMLImageElement {
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  if (s >= 1) return img;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export async function decodeFile(file: Blob, name = 'image'): Promise<Img> {
  const url = URL.createObjectURL(file);
  const el = new Image();
  el.decoding = 'async';
  el.src = url;
  try {
    await el.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('decode');
  }
  const preview = downscale(el, PREVIEW_MAX);
  const t = downscale(el, THUMB_MAX);
  let thumb = url;
  if (t instanceof HTMLCanvasElement) thumb = t.toDataURL('image/jpeg', 0.8);
  return {
    id: `img${Date.now().toString(36)}${(seq++).toString(36)}`,
    name,
    w: el.naturalWidth,
    h: el.naturalHeight,
    full: el,
    preview,
    pw: preview instanceof HTMLCanvasElement ? preview.width : el.naturalWidth,
    ph: preview instanceof HTMLCanvasElement ? preview.height : el.naturalHeight,
    thumb,
    url,
  };
}

export const isImageFile = (f: File) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(f.name);

/** Decode many files; returns successes and the number of failures. */
export async function decodeFiles(files: File[]): Promise<{ ok: Img[]; failed: number }> {
  const list = files.filter(isImageFile);
  const results = await Promise.allSettled(list.map((f) => decodeFile(f, f.name)));
  const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  return { ok, failed: files.length - ok.length };
}

/** Collect image files from a clipboard event. */
export function filesFromClipboard(e: ClipboardEvent): File[] {
  return [...(e.clipboardData?.items ?? [])]
    .filter((i) => i.kind === 'file')
    .map((i) => i.getAsFile())
    .filter((f): f is File => !!f && isImageFile(f));
}

/** Open the OS file picker (the only native surface we can't replace). */
export function pickFiles(multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.onchange = () => resolve([...(input.files ?? [])]);
    input.oncancel = () => resolve([]);
    input.click();
  });
}

export function releaseImg(img: Img) {
  URL.revokeObjectURL(img.url);
}
