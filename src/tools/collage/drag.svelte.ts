/* Pointer-based photo drag (works for mouse, pen and touch, unlike HTML5 DnD). */
import { collage } from './store.svelte';

class PhotoDrag {
  active = $state(false);
  img = $state<string | null>(null);
  from = $state<string | null>(null);
  x = $state(0);
  y = $state(0);
  over = $state<string | null>(null);
  /** Time the last real drag ended, so the trailing click can be ignored. */
  endedAt = 0;
  get justEnded() {
    return performance.now() - this.endedAt < 350;
  }

  /** Start dragging an image (from the tray) or a cell's photo (from = cell id). */
  start(e: PointerEvent, img: string, from: string | null = null, threshold = 4) {
    const sx = e.clientX;
    const sy = e.clientY;
    let started = false;
    const move = (ev: PointerEvent) => {
      if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) < threshold) return;
      if (!started) {
        started = true;
        this.active = true;
        this.img = img;
        this.from = from;
        document.body.classList.add('dragging-photo');
      }
      ev.preventDefault();
      this.x = ev.clientX;
      this.y = ev.clientY;
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-cell]');
      this.over = el?.dataset.cell ?? null;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      if (started) this.endedAt = performance.now();
      if (started && this.over) {
        if (this.from) collage.swap(this.from, this.over);
        else {
          collage.setSlotImage(this.over, img);
          collage.commit(true);
        }
        collage.selection = { type: 'cell', id: this.over };
      }
      this.reset();
    };
    const cancel = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      this.reset();
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  private reset() {
    this.active = false;
    this.img = null;
    this.from = null;
    this.over = null;
    document.body.classList.remove('dragging-photo');
  }
}

export const photoDrag = new PhotoDrag();
