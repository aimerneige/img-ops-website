export type Format = 'png' | 'jpeg' | 'webp';

export const MIME: Record<Format, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

export function canvasToBlob(canvas: HTMLCanvasElement, format: Format, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), MIME[format], quality),
  );
}

export function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const canCopyImage = () => typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

/** Clipboard only reliably accepts PNG. Pass a promise so Safari keeps the user gesture. */
export async function copyPng(blob: Promise<Blob>) {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

/** Browsers cap canvas size; keep exports within a safe area. */
export const MAX_SIDE = 16384;
export const MAX_AREA = 120_000_000;
export function fitCanvas(w: number, h: number) {
  let s = Math.min(1, MAX_SIDE / Math.max(w, h));
  if (w * h * s * s > MAX_AREA) s = Math.sqrt(MAX_AREA / (w * h));
  return { w: Math.max(1, Math.floor(w * s)), h: Math.max(1, Math.floor(h * s)), scaled: s < 1 };
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
