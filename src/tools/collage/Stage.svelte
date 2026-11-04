<script lang="ts">
  import { collage } from './store.svelte';
  import { photoDrag } from './drag.svelte';
  import { layoutFor, measureText, photoGeom, render, textFont, unitOf, LINE_H } from './render';
  import { at, moveDivider, equalize, newId, type CellRect, type DividerRect, type Split } from './layout';
  import type { Annot, ArrowAnnot, BoxAnnot, TextAnnot } from './model';
  import { theme } from '../../lib/theme.svelte';
  import { t } from '../../lib/i18n/index.svelte';
  import { pickFiles, isImageFile } from '../../lib/images.svelte';
  import Icon from '../../lib/components/Icon.svelte';
  import ContextBar from './ContextBar.svelte';

  let stage: HTMLDivElement;
  let paper = $state<HTMLDivElement>();
  let canvas: HTMLCanvasElement;
  let avail = $state({ w: 0, h: 0 });

  $effect(() => {
    const ro = new ResizeObserver(([e]) => (avail = { w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(stage);
    return () => ro.disconnect();
  });

  const doc = $derived(collage.doc);
  const margin = $derived(avail.w < 600 ? 20 : 56);
  const ratio = $derived(doc.ratio.w / doc.ratio.h);
  const W = $derived(Math.max(40, Math.min(avail.w - margin * 2, (avail.h - margin * 2) * ratio)));
  const H = $derived(W / ratio);
  const u = $derived(unitOf(W, H));
  const geo = $derived(layoutFor(doc, W, H));
  const sel = $derived(collage.selection);

  /* ───────── Canvas preview ───────── */
  let raf = 0;
  let editing = $state<string | null>(null);
  $effect(() => {
    const snap = $state.snapshot(collage.doc);
    void collage.pixels;
    void theme.dark;
    void theme.seed;
    const w = W;
    const h = H;
    const skip = editing ?? undefined;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const cw = Math.round(w * dpr);
      const ch = Math.round(h * dpr);
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      const ph = getComputedStyle(document.documentElement).getPropertyValue('--md-surface-container-highest').trim();
      render(canvas.getContext('2d')!, snap, cw, ch, collage.resolvePreview, { placeholder: ph || '#ddd', skipAnnot: skip });
    });
  });

  /* ───────── Generic pointer tracking ───────── */
  function track(e: PointerEvent, move: (dx: number, dy: number, ev: PointerEvent) => void, end?: () => void) {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const sy = e.clientY;
    const mv = (ev: PointerEvent) => move(ev.clientX - sx, ev.clientY - sy, ev);
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      end?.();
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  function toPaper(ev: { clientX: number; clientY: number }) {
    const r = paper!.getBoundingClientRect();
    return { x: clamp((ev.clientX - r.left) / W, 0, 1), y: clamp((ev.clientY - r.top) / H, 0, 1) };
  }

  /* ───────── Cells: select, pan, pinch, wheel zoom ───────── */
  const pointers = new Map<number, { x: number; y: number }>();
  let gesture: { id: string; ox: number; oy: number; zoom: number; x: number; y: number; dist: number } | null = null;

  function cellDown(e: PointerEvent, c: CellRect) {
    if (e.button !== 0 || collage.tool !== 'select') return;
    collage.selection = { type: 'cell', id: c.id };
    const slot = doc.slots[c.id];
    if (!slot?.img) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()];
    gesture = {
      id: c.id, ox: slot.ox, oy: slot.oy, zoom: slot.zoom,
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
      dist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
    };
  }
  function cellMove(e: PointerEvent, c: CellRect) {
    if (!gesture || gesture.id !== c.id || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const slot = doc.slots[c.id];
    const img = collage.img(slot?.img ?? null);
    if (!slot || !img) return;
    const pts = [...pointers.values()];
    const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    if (pts.length > 1 && gesture.dist) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      slot.zoom = clamp(gesture.zoom * (d / gesture.dist), 1, 6);
    }
    const g = photoGeom(slot, c, img.pw, img.ph);
    slot.ox = g.maxDx ? clamp(gesture.ox + (mx - gesture.x) / g.maxDx, -1, 1) : 0;
    slot.oy = g.maxDy ? clamp(gesture.oy + (my - gesture.y) / g.maxDy, -1, 1) : 0;
  }
  function cellUp(e: PointerEvent) {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size === 0) {
      gesture = null;
      collage.commit(true);
    } else if (gesture) {
      // Re-anchor the remaining finger so the photo doesn't jump.
      const slot = doc.slots[gesture.id];
      const [p] = [...pointers.values()];
      gesture = { ...gesture, ox: slot.ox, oy: slot.oy, zoom: slot.zoom, x: p.x, y: p.y, dist: 0 };
    }
  }
  function wheel(node: HTMLElement, id: string) {
    const h = (e: WheelEvent) => {
      const slot = collage.doc.slots[id];
      const s = collage.selection;
      if (!slot?.img || !(s?.type === 'cell' && s.id === id)) return;
      e.preventDefault();
      slot.zoom = clamp(slot.zoom * Math.exp(-e.deltaY * 0.0018), 1, 6);
      collage.commit();
    };
    node.addEventListener('wheel', h, { passive: false });
    return {
      update(n: string) {
        id = n;
      },
      destroy: () => node.removeEventListener('wheel', h),
    };
  }
  async function addInto(cell: string) {
    const files = await pickFiles(true);
    collage.addFiles(files, cell);
  }

  /* OS file drag onto a specific cell */
  let fileOver = $state<string | null>(null);
  const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  function cellDragOver(e: DragEvent, id: string) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    fileOver = id;
  }
  function cellDrop(e: DragEvent, id: string) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    fileOver = null;
    document.body.classList.remove('file-over');
    collage.addFiles([...(e.dataTransfer?.files ?? [])].filter(isImageFile), id);
  }

  /* ───────── Dividers ───────── */
  let activeDivider = $state<string | null>(null);
  const divKey = (d: DividerRect) => `${d.path.join('.')}:${d.i}`;
  function divDown(e: PointerEvent, d: DividerRect) {
    if (e.button !== 0) return;
    const node = at(collage.doc.layout, d.path) as Split;
    const a0 = node.r[d.i];
    const b0 = node.r[d.i + 1];
    activeDivider = divKey(d);
    track(
      e,
      (dx, dy) => {
        node.r[d.i] = a0;
        node.r[d.i + 1] = b0;
        moveDivider(collage.doc.layout, d.path, d.i, (d.d === 'row' ? dx : dy) / Math.max(1, d.span));
      },
      () => {
        activeDivider = null;
        collage.commit(true);
      },
    );
  }
  function divReset(d: DividerRect) {
    equalize(collage.doc.layout, d.path);
    collage.commit(true);
  }

  /* ───────── Annotations ───────── */
  const mctx = document.createElement('canvas').getContext('2d')!;
  interface Box { x: number; y: number; w: number; h: number }
  function boxOf(a: Annot): Box {
    if (a.kind === 'text') {
      const m = measureText(mctx, a, u);
      return { x: a.x * W - m.w / 2, y: a.y * H - m.h / 2, w: m.w, h: m.h };
    }
    if (a.kind === 'arrow') {
      const x = Math.min(a.x1, a.x2) * W;
      const y = Math.min(a.y1, a.y2) * H;
      return { x, y, w: Math.abs(a.x2 - a.x1) * W, h: Math.abs(a.y2 - a.y1) * H };
    }
    return { x: Math.min(a.x, a.x + a.w) * W, y: Math.min(a.y, a.y + a.h) * H, w: Math.abs(a.w) * W, h: Math.abs(a.h) * H };
  }

  function annotDown(e: PointerEvent, a: Annot) {
    if (e.button !== 0 || collage.tool !== 'select') return;
    collage.selection = { type: 'annot', id: a.id };
    const s = $state.snapshot(a) as Annot;
    let moved = false;
    track(
      e,
      (dx, dy) => {
        moved = true;
        const nx = dx / W;
        const ny = dy / H;
        if (a.kind === 'arrow' && s.kind === 'arrow') {
          a.x1 = s.x1 + nx; a.x2 = s.x2 + nx; a.y1 = s.y1 + ny; a.y2 = s.y2 + ny;
        } else if (a.kind !== 'arrow' && s.kind !== 'arrow') {
          a.x = s.x + nx;
          a.y = s.y + ny;
        }
      },
      () => moved && collage.commit(true),
    );
  }
  function boxHandle(e: PointerEvent, a: BoxAnnot, corner: number) {
    const x0 = Math.min(a.x, a.x + a.w);
    const y0 = Math.min(a.y, a.y + a.h);
    const x1 = Math.max(a.x, a.x + a.w);
    const y1 = Math.max(a.y, a.y + a.h);
    const fx = corner === 0 || corner === 3 ? x1 : x0;
    const fy = corner === 0 || corner === 1 ? y1 : y0;
    track(
      e,
      (_dx, _dy, ev) => {
        const p = toPaper(ev);
        a.x = Math.min(fx, p.x);
        a.y = Math.min(fy, p.y);
        a.w = Math.max(0.01, Math.abs(p.x - fx));
        a.h = Math.max(0.01, Math.abs(p.y - fy));
      },
      () => collage.commit(true),
    );
  }
  function arrowHandle(e: PointerEvent, a: ArrowAnnot, end: 1 | 2) {
    track(
      e,
      (_dx, _dy, ev) => {
        const p = toPaper(ev);
        if (end === 1) {
          a.x1 = p.x;
          a.y1 = p.y;
        } else {
          a.x2 = p.x;
          a.y2 = p.y;
        }
      },
      () => collage.commit(true),
    );
  }
  function textHandle(e: PointerEvent, a: TextAnnot) {
    const r = paper!.getBoundingClientRect();
    const cx = r.left + a.x * W;
    const cy = r.top + a.y * H;
    const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    const s0 = a.size;
    track(
      e,
      (_dx, _dy, ev) => (a.size = clamp(Math.round(s0 * (Math.hypot(ev.clientX - cx, ev.clientY - cy) / d0)), 10, 400)),
      () => collage.commit(true),
    );
  }

  /* Drawing new annotations */
  let lastColor = '#E53935';
  function drawDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const tool = collage.tool;
    const p0 = toPaper(e);
    if (tool === 'select') return;
    if (tool === 'text') {
      e.preventDefault();
      const a: TextAnnot = { id: newId(), kind: 'text', x: p0.x, y: p0.y, text: '', size: 56, bold: true, style: 'outline', color: '#FFFFFF' };
      collage.doc.annots.push(a);
      collage.selection = { type: 'annot', id: a.id };
      collage.tool = 'select';
      editing = a.id;
      return;
    }
    const id = newId();
    const a: Annot =
      tool === 'arrow'
        ? { id, kind: 'arrow', x1: p0.x, y1: p0.y, x2: p0.x, y2: p0.y, stroke: 8, color: lastColor }
        : { id, kind: tool, x: p0.x, y: p0.y, w: 0, h: 0, stroke: 6, fill: false, color: lastColor };
    collage.doc.annots.push(a);
    const live = collage.doc.annots[collage.doc.annots.length - 1];
    collage.selection = { type: 'annot', id };
    let far = false;
    track(
      e,
      (_dx, _dy, ev) => {
        const p = toPaper(ev);
        far ||= Math.hypot((p.x - p0.x) * W, (p.y - p0.y) * H) > 8;
        if (live.kind === 'arrow') {
          live.x2 = p.x;
          live.y2 = p.y;
        } else if (live.kind !== 'text') {
          live.x = Math.min(p0.x, p.x);
          live.y = Math.min(p0.y, p.y);
          live.w = Math.abs(p.x - p0.x);
          live.h = Math.abs(p.y - p0.y);
        }
      },
      () => {
        if (!far) {
          // A click places a default-sized shape.
          if (live.kind === 'arrow') {
            live.x2 = clamp(p0.x + 0.18, 0, 1);
            live.y2 = clamp(p0.y - 0.12, 0, 1);
          } else if (live.kind !== 'text') {
            const w = 0.28;
            const h = (0.28 * W) / H / (live.kind === 'ellipse' ? 1 : 1.4);
            live.x = clamp(p0.x - w / 2, 0, 1 - w);
            live.y = clamp(p0.y - h / 2, 0, Math.max(0, 1 - h));
            live.w = w;
            live.h = h;
          }
        }
        collage.tool = 'select';
        collage.commit(true);
      },
    );
  }

  /* Inline text editing */
  const editAnnot = $derived(editing ? (doc.annots.find((a) => a.id === editing) as TextAnnot | undefined) : undefined);
  export function editText(id: string) {
    editing = id;
  }
  function finishEdit() {
    const a = editAnnot;
    editing = null;
    if (!a) return;
    if (!a.text.trim()) collage.removeAnnot(a.id);
    else collage.commit(true);
  }
  function focusEditor(node: HTMLTextAreaElement) {
    requestAnimationFrame(() => {
      node.focus();
      node.select();
    });
  }
  const editBox = $derived.by(() => {
    if (!editAnnot) return null;
    const m = measureText(mctx, { ...editAnnot, text: editAnnot.text || t('annot.placeholder') }, u);
    return { x: editAnnot.x * W, y: editAnnot.y * H, w: m.w + editAnnot.size * u, h: m.h };
  });

  $effect(() => {
    const s = collage.selection;
    if (s?.type === 'annot') {
      const a = collage.annot(s.id);
      if (a && a.kind !== 'text') lastColor = a.color;
    }
  });

  /* Selected geometry → floating toolbar */
  const selBox = $derived.by(() => {
    if (!sel) return null;
    if (sel.type === 'cell') return geo.cells.find((c) => c.id === sel.id) ?? null;
    const a = doc.annots.find((x) => x.id === sel.id);
    return a ? boxOf(a) : null;
  });

  function bgDown(e: PointerEvent) {
    if (e.target === e.currentTarget && collage.tool === 'select') collage.selection = null;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="stage" bind:this={stage} onpointerdown={bgDown}>
  <div class="paper" bind:this={paper} style:width="{W}px" style:height="{H}px" class:drawing={collage.tool !== 'select'}>
    <canvas bind:this={canvas} aria-label={t('stage.canvasLabel')}></canvas>

    <!-- Cells -->
    {#each geo.cells as c (c.id)}
      {@const slot = doc.slots[c.id]}
      {@const filled = !!slot?.img}
      {@const selected = sel?.type === 'cell' && sel.id === c.id}
      <div
        class="cell"
        class:filled
        class:selected
        class:drop={photoDrag.over === c.id || fileOver === c.id}
        class:source={photoDrag.from === c.id}
        data-cell={c.id}
        style:left="{c.x}px"
        style:top="{c.y}px"
        style:width="{c.w}px"
        style:height="{c.h}px"
        style:border-radius="{Math.min(doc.style.radius * u, c.w / 2, c.h / 2)}px"
        onpointerdown={(e) => cellDown(e, c)}
        onpointermove={(e) => cellMove(e, c)}
        onpointerup={cellUp}
        onpointercancel={cellUp}
        ondblclick={() => {
          if (!slot?.img) return;
          Object.assign(slot, { zoom: 1, ox: 0, oy: 0 });
          collage.commit(true);
        }}
        ondragover={(e) => cellDragOver(e, c.id)}
        ondragleave={() => fileOver === c.id && (fileOver = null)}
        ondrop={(e) => cellDrop(e, c.id)}
        use:wheel={c.id}
        role="button"
        tabindex="-1"
        aria-label={filled ? t('stage.cellFilled') : t('stage.cellEmpty')}
      >
        {#if !filled}
          <button
            class="add"
            class:compact={c.w < 120 || c.h < 90}
            onpointerdown={(e) => e.stopPropagation()}
            onclick={() => {
              collage.selection = { type: 'cell', id: c.id };
              addInto(c.id);
            }}
          >
            <Icon name="add_photo_alternate" size={c.w < 80 ? 20 : 28} />
            {#if c.w >= 120 && c.h >= 90}<span>{t('stage.addPhoto')}</span>{/if}
          </button>
        {:else}
          <button
            class="grip"
            aria-label={t('stage.dragToSwap')}
            onpointerdown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              collage.selection = { type: 'cell', id: c.id };
              photoDrag.start(e, slot.img!, c.id, 0);
            }}
          >
            <Icon name="drag_indicator" size={18} />
          </button>
        {/if}
      </div>
    {/each}

    <!-- Dividers -->
    {#if collage.tool === 'select'}
      {#each geo.dividers as d (divKey(d))}
        {@const hit = Math.max(14, d.d === 'row' ? d.w : d.h)}
        <div
          class="divider {d.d}"
          class:active={activeDivider === divKey(d)}
          style:left="{d.d === 'row' ? d.x + d.w / 2 - hit / 2 : d.x}px"
          style:top="{d.d === 'col' ? d.y + d.h / 2 - hit / 2 : d.y}px"
          style:width="{d.d === 'row' ? hit : d.w}px"
          style:height="{d.d === 'col' ? hit : d.h}px"
          onpointerdown={(e) => divDown(e, d)}
          ondblclick={() => divReset(d)}
          role="separator"
          aria-orientation={d.d === 'row' ? 'vertical' : 'horizontal'}
          aria-label={t('stage.divider')}
        >
          <span class="pill"></span>
        </div>
      {/each}
    {/if}

    <!-- Annotation hit areas -->
    <svg class="annots" width={W} height={H} viewBox="0 0 {W} {H}" aria-hidden="true">
      {#each doc.annots as a (a.id)}
        {#if a.kind === 'text'}
          {@const b = boxOf(a)}
          <rect
            x={b.x} y={b.y} width={b.w} height={b.h}
            fill="transparent" pointer-events="all"
            onpointerdown={(e) => annotDown(e, a)}
            ondblclick={() => (editing = a.id)}
          />
        {:else if a.kind === 'arrow'}
          <line
            x1={a.x1 * W} y1={a.y1 * H} x2={a.x2 * W} y2={a.y2 * H}
            stroke="transparent" stroke-width={Math.max(18, a.stroke * u * 2)} stroke-linecap="round" pointer-events="stroke"
            onpointerdown={(e) => annotDown(e, a)}
          />
        {:else}
          {@const b = boxOf(a)}
          {@const sw = Math.max(16, a.stroke * u * 2)}
          {#if a.kind === 'rect'}
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" stroke="transparent" stroke-width={sw}
              pointer-events={a.fill ? 'all' : 'stroke'} onpointerdown={(e) => annotDown(e, a)} />
          {:else}
            <ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} fill="transparent" stroke="transparent"
              stroke-width={sw} pointer-events={a.fill ? 'all' : 'stroke'} onpointerdown={(e) => annotDown(e, a)} />
          {/if}
        {/if}
      {/each}
    </svg>

    <!-- Selection chrome for annotations -->
    {#if sel?.type === 'annot' && !editing}
      {@const a = doc.annots.find((x) => x.id === sel.id)}
      {#if a}
        {@const b = boxOf(a)}
        {#if a.kind === 'arrow'}
          <div class="sel-line" style:left="{a.x1 * W}px" style:top="{a.y1 * H}px"
            style:width="{Math.hypot((a.x2 - a.x1) * W, (a.y2 - a.y1) * H)}px"
            style:rotate="{Math.atan2((a.y2 - a.y1) * H, (a.x2 - a.x1) * W)}rad"></div>
          <button class="handle" aria-label={t('annot.handle')} style:left="{a.x1 * W}px" style:top="{a.y1 * H}px" onpointerdown={(e) => arrowHandle(e, a, 1)}></button>
          <button class="handle" aria-label={t('annot.handle')} style:left="{a.x2 * W}px" style:top="{a.y2 * H}px" onpointerdown={(e) => arrowHandle(e, a, 2)}></button>
        {:else}
          <div class="sel-box" style:left="{b.x}px" style:top="{b.y}px" style:width="{b.w}px" style:height="{b.h}px"></div>
          {#if a.kind === 'text'}
            <button class="handle scale" aria-label={t('annot.handle')} style:left="{b.x + b.w}px" style:top="{b.y + b.h}px" onpointerdown={(e) => textHandle(e, a)}></button>
          {:else}
            {#each [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]] as [hx, hy], i (i)}
              <button class="handle c{i}" aria-label={t('annot.handle')} style:left="{hx}px" style:top="{hy}px" onpointerdown={(e) => boxHandle(e, a, i)}></button>
            {/each}
          {/if}
        {/if}
      {/if}
    {/if}

    <!-- Draw layer -->
    {#if collage.tool !== 'select'}
      <div class="draw-layer" onpointerdown={drawDown} role="presentation"></div>
    {/if}

    <!-- Inline text editor -->
    {#if editAnnot && editBox}
      <textarea
        class="text-edit {editAnnot.style}"
        style:left="{editBox.x}px"
        style:top="{editBox.y}px"
        style:width="{editBox.w}px"
        style:height="{editBox.h}px"
        style:font={textFont(editAnnot, u)}
        style:line-height={LINE_H}
        style:--c={editAnnot.color}
        placeholder={t('annot.placeholder')}
        bind:value={editAnnot.text}
        use:focusEditor
        onblur={finishEdit}
        onpointerdown={(e) => e.stopPropagation()}
        onkeydown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) (e.currentTarget as HTMLElement).blur();
        }}
      ></textarea>
    {/if}

    {#if sel && selBox && !editing && !photoDrag.active && collage.tool === 'select'}
      <ContextBar box={selBox} paperW={W} paperH={H} onEditText={(id) => (editing = id)} onAddInto={addInto} />
    {/if}
  </div>
</div>

{#if photoDrag.active && photoDrag.img}
  {@const img = collage.img(photoDrag.img)}
  {#if img}
    <div class="ghost" style:transform="translate({photoDrag.x}px, {photoDrag.y}px)">
      <img src={img.thumb} alt="" />
      {#if photoDrag.over}<span class="badge"><Icon name={photoDrag.from ? 'swap_horiz' : 'add'} size={16} /></span>{/if}
    </div>
  {/if}
{/if}

<style>
  .stage {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    background-color: var(--md-surface-container-lowest);
    background-image: radial-gradient(color-mix(in srgb, var(--md-on-surface) 9%, transparent) 1px, transparent 1px);
    background-size: 18px 18px;
    touch-action: none;
  }
  .paper {
    position: relative;
    box-shadow:
      0 2px 6px rgb(0 0 0 / 0.08),
      0 12px 40px -8px rgb(0 0 0 / 0.2);
    transition:
      width 400ms var(--ease-standard),
      height 400ms var(--ease-standard);
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .cell {
    position: absolute;
    display: grid;
    place-items: center;
    outline: 2px solid transparent;
    outline-offset: -2px;
    transition:
      outline-color 150ms linear,
      box-shadow 200ms var(--ease-standard),
      background-color 200ms linear;
    touch-action: none;
  }
  .cell.filled {
    cursor: grab;
  }
  .cell.filled:active {
    cursor: grabbing;
  }
  .cell:hover {
    outline-color: color-mix(in srgb, var(--md-primary) 55%, transparent);
  }
  .cell.selected {
    outline: 3px solid var(--md-primary);
    outline-offset: -3px;
  }
  .cell.drop {
    outline: 3px dashed var(--md-tertiary);
    outline-offset: -3px;
    background: color-mix(in srgb, var(--md-tertiary) 22%, transparent);
  }
  .cell.source {
    opacity: 0.45;
    background: var(--md-surface-container-highest);
  }
  .add {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: calc(100% - 12px);
    height: 44px;
    padding: 0 18px 0 14px;
    border: none;
    border-radius: 22px;
    background: var(--md-primary-container);
    color: var(--md-on-primary-container);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    box-shadow: var(--elev-1);
    transition:
      border-radius 350ms var(--ease-spring),
      scale 350ms var(--ease-spring),
      box-shadow 200ms linear;
  }
  .add.compact {
    width: 40px;
    height: 40px;
    padding: 0;
    justify-content: center;
  }
  .add:hover {
    box-shadow: var(--elev-2);
    scale: 1.04;
  }
  .add:active {
    border-radius: 12px;
    scale: 0.96;
  }
  .grip {
    position: absolute;
    top: 6px;
    left: 6px;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 15px;
    background: color-mix(in srgb, var(--md-surface-container-highest) 88%, transparent);
    color: var(--md-on-surface);
    box-shadow: var(--elev-1);
    cursor: grab;
    opacity: 0;
    scale: 0.7;
    transition:
      opacity 150ms linear,
      scale 300ms var(--ease-spring),
      border-radius 300ms var(--ease-spring);
    touch-action: none;
  }
  .cell:hover .grip,
  .cell.selected .grip {
    opacity: 1;
    scale: 1;
  }
  .grip:active {
    cursor: grabbing;
    border-radius: 9px;
  }
  @media (hover: none) {
    .cell.filled .grip {
      opacity: 0.92;
      scale: 1;
    }
  }
  .divider {
    position: absolute;
    display: grid;
    place-items: center;
    z-index: 2;
    touch-action: none;
  }
  .divider.row {
    cursor: col-resize;
  }
  .divider.col {
    cursor: row-resize;
  }
  .pill {
    border-radius: 4px;
    background: var(--md-primary);
    box-shadow: 0 0 0 2px var(--md-on-primary);
    opacity: 0;
    transition:
      opacity 150ms linear,
      width 300ms var(--ease-spring),
      height 300ms var(--ease-spring);
  }
  .row .pill {
    width: 5px;
    height: 28px;
  }
  .col .pill {
    width: 28px;
    height: 5px;
  }
  .divider:hover .pill,
  .divider.active .pill {
    opacity: 1;
  }
  .row.active .pill {
    height: 44px;
  }
  .col.active .pill {
    width: 44px;
  }
  .annots {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
    overflow: visible;
  }
  .annots :global(*) {
    cursor: move;
  }
  .sel-box,
  .sel-line {
    position: absolute;
    pointer-events: none;
    z-index: 4;
  }
  .sel-box {
    outline: 2px dashed var(--md-primary);
    outline-offset: 4px;
    border-radius: 4px;
  }
  .sel-line {
    height: 0;
    border-top: 2px dashed var(--md-primary);
    transform-origin: 0 0;
  }
  .handle {
    position: absolute;
    z-index: 5;
    width: 18px;
    height: 18px;
    translate: -50% -50%;
    padding: 0;
    border: 3px solid var(--md-primary);
    border-radius: 50%;
    background: var(--md-surface);
    cursor: grab;
    touch-action: none;
    transition: scale 250ms var(--ease-spring);
  }
  .handle:hover,
  .handle:active {
    scale: 1.3;
  }
  .handle.c0,
  .handle.c2 {
    cursor: nwse-resize;
  }
  .handle.c1,
  .handle.c3 {
    cursor: nesw-resize;
  }
  .handle.scale {
    cursor: nwse-resize;
    translate: 2px 2px;
  }
  .draw-layer {
    position: absolute;
    inset: 0;
    z-index: 6;
    cursor: crosshair;
    touch-action: none;
  }
  .text-edit {
    position: absolute;
    z-index: 7;
    translate: -50% -50%;
    min-width: 2ch;
    padding: 0;
    border: none;
    outline: 2px dashed var(--md-primary);
    outline-offset: 6px;
    border-radius: 4px;
    background: transparent;
    color: var(--c);
    text-align: center;
    resize: none;
    overflow: hidden;
    white-space: pre;
  }
  .text-edit.outline {
    -webkit-text-stroke: 0.08em color-mix(in srgb, #000 70%, transparent);
    paint-order: stroke fill;
  }
  .text-edit.pill {
    background: var(--c);
    color: #fff;
    border-radius: 999px;
  }
  .text-edit::placeholder {
    color: color-mix(in srgb, var(--c) 55%, transparent);
  }
  .ghost {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 990;
    pointer-events: none;
  }
  .ghost img {
    display: block;
    width: 96px;
    height: 96px;
    object-fit: cover;
    border-radius: 16px;
    translate: -50% -50%;
    rotate: -4deg;
    box-shadow: var(--elev-3);
    outline: 3px solid var(--md-surface);
    animation: lift 250ms var(--ease-spring);
  }
  .badge {
    position: absolute;
    top: -58px;
    left: 30px;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--md-tertiary);
    color: var(--md-on-tertiary);
    box-shadow: var(--elev-2);
  }
  @keyframes lift {
    from {
      scale: 0.6;
      opacity: 0;
    }
  }
  :global(body.dragging-photo) {
    cursor: grabbing;
    user-select: none;
  }
</style>
