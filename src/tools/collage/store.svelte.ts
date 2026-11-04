import { storage } from '../../lib/storage';
import { decodeFiles, releaseImg, type Img } from '../../lib/images.svelte';
import { snackbar } from '../../lib/feedback.svelte';
import { t } from '../../lib/i18n/index.svelte';
import type { Format } from '../../lib/export';
import {
  leaves, newId, parse, presetsFor, removeCell, signature, splitCell, type Dir, type LayoutNode,
} from './layout';
import {
  DEFAULT_BG, DEFAULT_STYLE, DEFAULT_WM, emptySlot, type Annot, type AnnotKind, type Doc, type Slot,
} from './model';
import type { Resolve } from './render';

export type Selection = { type: 'cell'; id: string } | { type: 'annot'; id: string } | null;
export type Tool = 'select' | AnnotKind;

export interface ExportSettings {
  format: Format;
  quality: number;
  size: number;
}

const HISTORY_LIMIT = 100;

function initialDoc(): Doc {
  const saved = storage.get<Partial<Doc> | null>('collage.doc', null);
  const layout = saved?.layout ?? parse('v(h(x,x),h(x,x))');
  const slots: Record<string, Slot> = {};
  for (const id of leaves(layout)) slots[id] = emptySlot();
  return {
    layout,
    slots,
    ratio: saved?.ratio ?? { w: 1, h: 1 },
    style: { ...DEFAULT_STYLE, ...saved?.style },
    bg: { ...DEFAULT_BG, ...saved?.bg, img: null },
    wm: { ...DEFAULT_WM, ...saved?.wm },
    annots: [],
  };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

class CollageStore {
  doc = $state<Doc>(initialDoc());
  images = $state.raw<Img[]>([]);
  selection = $state<Selection>(null);
  tool = $state<Tool>('select');
  /** Bumped when pixel data changes so the preview re-renders. */
  pixels = $state(0);
  exportSettings = $state<ExportSettings>(storage.get('collage.export', { format: 'jpeg', quality: 0.92, size: 2048 }));
  /** The user picked a layout on purpose; don't auto-switch it on first import. */
  layoutTouched = false;
  /** Count filter shown in the layout panel. */
  layoutCount = $state(4);

  past = $state<string[]>([]);
  future = $state<string[]>([]);
  private last = JSON.stringify(this.doc);
  private timer = 0;

  /* ───────── History ───────── */
  /** Record the current doc as an undo step (debounced unless `now`). */
  commit(now = false) {
    clearTimeout(this.timer);
    if (!now) {
      this.timer = window.setTimeout(() => this.commit(true), 350);
      return;
    }
    const s = JSON.stringify($state.snapshot(this.doc));
    if (s === this.last) return;
    this.past = [...this.past.slice(-HISTORY_LIMIT + 1), this.last];
    this.future = [];
    this.last = s;
    this.persist();
  }
  private restore(s: string) {
    this.last = s;
    this.doc = JSON.parse(s);
    const sel = this.selection;
    if (sel?.type === 'cell' && !this.doc.slots[sel.id]) this.selection = null;
    if (sel?.type === 'annot' && !this.doc.annots.some((a) => a.id === sel.id)) this.selection = null;
    this.persist();
  }
  undo() {
    this.commit(true);
    if (!this.past.length) return;
    this.future = [...this.future, this.last];
    const prev = this.past[this.past.length - 1];
    this.past = this.past.slice(0, -1);
    this.restore(prev);
  }
  redo() {
    if (!this.future.length) return;
    this.past = [...this.past, this.last];
    const next = this.future[this.future.length - 1];
    this.future = this.future.slice(0, -1);
    this.restore(next);
  }
  private persist() {
    const { layout, ratio, style, bg, wm } = $state.snapshot(this.doc);
    storage.set('collage.doc', { layout, ratio, style, bg, wm });
  }
  saveExportSettings() {
    storage.set('collage.export', $state.snapshot(this.exportSettings));
  }

  /* ───────── Images ───────── */
  img(id: string | null) {
    return id ? this.images.find((i) => i.id === id) : undefined;
  }
  resolvePreview: Resolve = (id) => {
    const i = this.img(id);
    return i ? { src: i.preview, w: i.pw, h: i.ph } : null;
  };
  resolveFull: Resolve = (id) => {
    const i = this.img(id);
    return i ? { src: i.full, w: i.w, h: i.h } : null;
  };

  get cellIds() {
    return leaves(this.doc.layout);
  }
  get filledCount() {
    return this.cellIds.filter((id) => this.doc.slots[id]?.img).length;
  }
  usedImages() {
    return new Set(Object.values(this.doc.slots).map((s) => s.img).filter(Boolean) as string[]);
  }

  /**
   * Import files. Photos go into empty cells starting at `startCell`; if there
   * aren't enough cells the layout grows to fit (with an undo snackbar).
   */
  async addFiles(files: File[], startCell?: string) {
    if (!files.length) return;
    const { ok, failed } = await decodeFiles(files);
    if (failed) snackbar.show(t('photos.failed', { n: failed }), { error: true, icon: 'info' });
    if (!ok.length) return;
    this.images = [...this.images, ...ok];
    this.place(ok.map((i) => i.id), startCell);
    this.pixels++;
  }

  place(ids: string[], startCell?: string) {
    const doc = this.doc;
    const wasEmpty = this.filledCount === 0;
    const order = this.cellIds;

    // A single photo dropped on a specific cell replaces it.
    if (startCell && ids.length === 1) {
      this.setSlotImage(startCell, ids[0]);
      this.commit(true);
      return;
    }

    const empties = () => {
      const all = this.cellIds;
      const from = startCell ? Math.max(0, all.indexOf(startCell)) : 0;
      return [...all.slice(from), ...all.slice(0, from)].filter((id) => !doc.slots[id]?.img);
    };

    const total = this.filledCount + ids.length;
    const grow = ids.length > empties().length && total <= 16;
    const fit = wasEmpty && !this.layoutTouched && total !== order.length && total <= 16;
    if (grow || fit) {
      this.applyPreset(presetsFor(total)[0], false, false);
      this.layoutCount = total;
      if (grow && !wasEmpty) {
        snackbar.show(t('layout.grew', { n: total }), {
          action: t('common.undo'),
          onAction: () => this.undo(),
          icon: 'auto_awesome_mosaic',
        });
      }
    }
    const free = empties();
    ids.forEach((id, i) => free[i] && this.setSlotImage(free[i], id));
    const leftover = ids.length - free.length;
    if (leftover > 0) snackbar.show(t('photos.leftover', { n: leftover }));
    this.commit(true);
  }

  setSlotImage(cell: string, img: string | null) {
    this.doc.slots[cell] = { ...emptySlot(), img };
  }

  removeImage(id: string) {
    const img = this.img(id);
    if (!img) return;
    for (const s of Object.values(this.doc.slots)) if (s.img === id) Object.assign(s, emptySlot());
    if (this.doc.bg.img === id) this.doc.bg.img = null;
    this.images = this.images.filter((i) => i.id !== id);
    this.commit(true);
    this.pixels++;
    let restored = false;
    snackbar.show(t('photos.removed'), {
      action: t('common.undo'),
      onAction: () => {
        restored = true;
        this.images = [...this.images, img];
        this.undo();
        this.pixels++;
      },
    });
    setTimeout(() => !restored && releaseImg(img), 30_000);
  }

  /* ───────── Layout ───────── */
  applyPreset(src: string, touched = true, record = true) {
    const old = this.cellIds.map((id) => this.doc.slots[id]).filter((s) => s?.img);
    const layout = parse(src);
    const slots: Record<string, Slot> = {};
    leaves(layout).forEach((id, i) => (slots[id] = old[i] ? { ...old[i] } : emptySlot()));
    this.doc.layout = layout;
    this.doc.slots = slots;
    if (touched) this.layoutTouched = true;
    if (this.selection?.type === 'cell') this.selection = null;
    if (record) this.commit(true);
  }

  get layoutSignature() {
    return signature(this.doc.layout);
  }

  split(cell: string, d: Dir) {
    const { root, added } = splitCell(this.doc.layout, cell, d);
    this.doc.layout = root as LayoutNode;
    this.doc.slots[added] = emptySlot();
    this.layoutTouched = true;
    this.commit(true);
  }
  removeCell(cell: string) {
    if (this.cellIds.length <= 1) return;
    this.doc.layout = removeCell(this.doc.layout, cell);
    delete this.doc.slots[cell];
    this.selection = null;
    this.layoutTouched = true;
    this.commit(true);
  }

  swap(a: string, b: string) {
    if (a === b) return;
    const s = this.doc.slots;
    [s[a], s[b]] = [s[b], s[a]];
    this.commit(true);
  }

  shuffle() {
    const ids = this.cellIds.filter((id) => this.doc.slots[id]?.img);
    const contents = ids.map((id) => this.doc.slots[id]);
    let tries = 0;
    do {
      for (let i = contents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [contents[i], contents[j]] = [contents[j], contents[i]];
      }
    } while (contents.length > 1 && ids.every((id, i) => this.doc.slots[id] === contents[i]) && ++tries < 8);
    ids.forEach((id, i) => (this.doc.slots[id] = contents[i]));
    this.commit(true);
  }

  clearAll() {
    for (const id of this.cellIds) this.doc.slots[id] = emptySlot();
    this.doc.annots = [];
    this.doc.bg.img = null;
    this.selection = null;
    this.commit(true);
  }

  /* ───────── Annotations ───────── */
  addAnnot(a: Omit<Annot, 'id'>) {
    const full = { ...a, id: newId() } as Annot;
    this.doc.annots.push(full);
    this.selection = { type: 'annot', id: full.id };
    this.commit(true);
    return full.id;
  }
  annot(id: string) {
    return this.doc.annots.find((a) => a.id === id);
  }
  removeAnnot(id: string) {
    this.doc.annots = this.doc.annots.filter((a) => a.id !== id);
    if (this.selection?.type === 'annot' && this.selection.id === id) this.selection = null;
    this.commit(true);
  }
  duplicateAnnot(id: string) {
    const a = this.annot(id);
    if (!a) return;
    const c = clone($state.snapshot(a)) as Annot;
    c.id = newId();
    if (c.kind === 'arrow') {
      c.x1 += 0.03; c.x2 += 0.03; c.y1 += 0.03; c.y2 += 0.03;
    } else {
      c.x += 0.03;
      c.y += 0.03;
    }
    this.doc.annots.push(c);
    this.selection = { type: 'annot', id: c.id };
    this.commit(true);
  }
  bringToFront(id: string) {
    const i = this.doc.annots.findIndex((a) => a.id === id);
    if (i < 0) return;
    const [a] = this.doc.annots.splice(i, 1);
    this.doc.annots.push(a);
    this.commit(true);
  }
}

export const collage = new CollageStore();
