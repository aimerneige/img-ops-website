<script lang="ts">
  import { flip } from 'svelte/animate';
  import ToolShell from '../ToolShell.svelte';
  import EmptyDrop from '../EmptyDrop.svelte';
  import Section from '../collage/panels/Section.svelte';
  import Segmented from '../../lib/components/Segmented.svelte';
  import Slider from '../../lib/components/Slider.svelte';
  import ColorField from '../../lib/components/ColorField.svelte';
  import Button from '../../lib/components/Button.svelte';
  import IconButton from '../../lib/components/IconButton.svelte';
  import Icon from '../../lib/components/Icon.svelte';
  import Select from '../../lib/components/Select.svelte';
  import { t, i18n } from '../../lib/i18n/index.svelte';
  import { snackbar } from '../../lib/feedback.svelte';
  import { decodeFiles, filesFromClipboard, isImageFile, pickFiles, releaseImg, type Img } from '../../lib/images.svelte';
  import { canvasToBlob, downloadBlob, fitCanvas, formatBytes, stamp, type Format } from '../../lib/export';
  import { roundRect } from '../collage/render';
  import { storage } from '../../lib/storage';

  let { width }: { width: number } = $props();

  type Dir = 'vertical' | 'horizontal';
  type Align = 'min' | 'max' | 'first';
  let images = $state.raw<Img[]>([]);
  const saved = storage.get('stitch', { dir: 'vertical' as Dir, align: 'max' as Align, gap: 0, padding: 0, radius: 0, bg: '#FFFFFF', format: 'jpeg' as Format });
  let dir = $state<Dir>(saved.dir);
  let align = $state<Align>(saved.align);
  let gap = $state(saved.gap);
  let padding = $state(saved.padding);
  let radius = $state(saved.radius);
  let bg = $state(saved.bg);
  let format = $state<Format>(saved.format);
  let busy = $state(false);

  $effect(() => storage.set('stitch', { dir, align, gap, padding, radius, bg, format }));

  async function add(files: File[]) {
    const { ok, failed } = await decodeFiles(files);
    if (failed) snackbar.show(t('photos.failed', { n: failed }), { error: true });
    images = [...images, ...ok];
  }
  const pick = async () => add(await pickFiles(true));
  function remove(id: string) {
    const img = images.find((i) => i.id === id);
    images = images.filter((i) => i.id !== id);
    if (img) setTimeout(() => releaseImg(img), 1000);
  }
  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    images = next;
  }

  /** Layout in output pixels; `src` picks full or preview pixels. */
  function plan(full: boolean) {
    if (!images.length) return null;
    const v = dir === 'vertical';
    const sides = images.map((i) => (v ? i.w : i.h));
    const target = Math.min(8192, align === 'min' ? Math.min(...sides) : align === 'max' ? Math.max(...sides) : sides[0]);
    const u = target / 1000;
    const g = gap * u;
    const p = padding * u;
    const items = images.map((img) => {
      const k = target / (v ? img.w : img.h);
      return { img, w: img.w * k, h: img.h * k };
    });
    const along = items.reduce((s, it) => s + (v ? it.h : it.w), 0) + g * (items.length - 1);
    const W0 = v ? target + 2 * p : along + 2 * p;
    const H0 = v ? along + 2 * p : target + 2 * p;
    const fit = full ? fitCanvas(W0, H0) : { w: W0, h: H0, scaled: false };
    return { items, W0, H0, fit, g, p, v, u };
  }

  function draw(ctx: CanvasRenderingContext2D, scale: number, full: boolean) {
    const pl = plan(full)!;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, pl.W0, pl.H0);
    let cur = pl.p;
    for (const it of pl.items) {
      const x = pl.v ? pl.p : cur;
      const y = pl.v ? cur : pl.p;
      ctx.save();
      roundRect(ctx, x, y, it.w, it.h, radius * pl.u);
      ctx.clip();
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(full ? it.img.full : it.img.preview, x, y, it.w, it.h);
      ctx.restore();
      cur += (pl.v ? it.h : it.w) + pl.g;
    }
    ctx.restore();
  }

  let canvas = $state<HTMLCanvasElement>();
  let stageW = $state(0);
  const info = $derived.by(() => {
    void [images, dir, align, gap, padding];
    const pl = plan(true);
    return pl ? { w: pl.fit.w, h: pl.fit.h, scaled: pl.fit.scaled } : null;
  });

  $effect(() => {
    void [images, dir, align, gap, padding, radius, bg, stageW];
    const c = canvas;
    if (!c || !images.length) return;
    const pl = plan(false)!;
    const maxW = Math.max(100, stageW - 48);
    const css = Math.min(1, maxW / pl.W0, pl.v ? 1 : 1);
    const cssW = pl.W0 * css;
    const cssH = pl.H0 * css;
    const dpr = Math.min(2, devicePixelRatio || 1);
    // Cap preview pixels for very long images.
    const k = Math.min(dpr, 12_000 / Math.max(cssW, cssH));
    c.width = Math.round(cssW * k);
    c.height = Math.round(cssH * k);
    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;
    draw(c.getContext('2d')!, css * k, false);
  });

  async function exportIt() {
    if (!images.length || busy) return;
    busy = true;
    try {
      await new Promise((r) => setTimeout(r, 30));
      const pl = plan(true)!;
      const out = document.createElement('canvas');
      out.width = pl.fit.w;
      out.height = pl.fit.h;
      draw(out.getContext('2d')!, pl.fit.w / pl.W0, true);
      const blob = await canvasToBlob(out, format, 0.92);
      downloadBlob(blob, `tessera-stitch-${stamp()}.${format === 'jpeg' ? 'jpg' : format}`);
      snackbar.show(t('export.saved', { w: out.width, h: out.height, size: formatBytes(blob.size) }), { icon: 'check_circle' });
      out.width = out.height = 0;
    } catch {
      snackbar.show(t('export.failed'), { error: true });
    } finally {
      busy = false;
    }
  }

  /* Pointer reorder */
  let list = $state<HTMLUListElement>();
  let dragging = $state<string | null>(null);
  function startReorder(e: PointerEvent, id: string) {
    e.preventDefault();
    dragging = id;
    const mv = (ev: PointerEvent) => {
      const items = [...list!.querySelectorAll<HTMLElement>('li')];
      const from = images.findIndex((i) => i.id === id);
      let to = items.findIndex((el) => {
        const r = el.getBoundingClientRect();
        return ev.clientY < r.top + r.height / 2;
      });
      if (to < 0) to = items.length - 1;
      else if (to > from) to -= 1;
      if (to !== from && to >= 0) {
        const next = [...images];
        const [it] = next.splice(from, 1);
        next.splice(to, 0, it);
        images = next;
      }
    };
    const up = () => {
      dragging = null;
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
</script>

<svelte:window
  onpaste={(e) => {
    const f = filesFromClipboard(e);
    if (f.length) add(f);
  }}
  ondragover={(e) => hasFiles(e) && e.preventDefault()}
  ondrop={(e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    add([...(e.dataTransfer?.files ?? [])].filter(isImageFile));
  }}
/>

<ToolShell {width} sideLabel={t('tool.stitch.name')}>
  {#snippet side()}
    <Section title={t('stitch.images', { n: images.length })}>
      {#snippet aside()}
        <IconButton icon="add" size="sm" variant="tonal" label={t('photos.add')} onclick={pick} />
      {/snippet}
      {#if images.length}
        <ul class="list" bind:this={list}>
          {#each images as img, i (img.id)}
            <li animate:flip={{ duration: 250 }} class:dragging={dragging === img.id}>
              <button class="grip" aria-label={t('stitch.reorder')} onpointerdown={(e) => startReorder(e, img.id)}>
                <Icon name="drag_indicator" size={20} />
              </button>
              <img src={img.thumb} alt="" />
              <span class="meta">
                <span class="name t-body-m">{img.name}</span>
                <span class="t-body-s dim">{img.w} × {img.h}</span>
              </span>
              <IconButton icon="arrow_upward" size="xs" label={t('stitch.up')} disabled={i === 0} onclick={() => move(i, -1)} />
              <IconButton icon="arrow_downward" size="xs" label={t('stitch.down')} disabled={i === images.length - 1} onclick={() => move(i, 1)} />
              <IconButton icon="close" size="xs" label={t('photos.remove')} onclick={() => remove(img.id)} />
            </li>
          {/each}
        </ul>
      {:else}
        <p class="t-body-s dim">{t('stitch.emptyList')}</p>
      {/if}
    </Section>
    <Section title={t('stitch.direction')}>
      <Segmented
        label={t('stitch.direction')}
        bind:value={dir}
        options={[
          { value: 'vertical' as Dir, label: t('stitch.vertical'), icon: 'view_agenda' },
          { value: 'horizontal' as Dir, label: t('stitch.horizontal'), icon: 'view_column' },
        ]}
      />
      <Select
        label={dir === 'vertical' ? t('stitch.alignWidth') : t('stitch.alignHeight')}
        bind:value={align}
        options={[
          { value: 'max' as Align, label: t('stitch.align.max') },
          { value: 'min' as Align, label: t('stitch.align.min') },
          { value: 'first' as Align, label: t('stitch.align.first') },
        ]}
      />
    </Section>
    <Section title={t('style.look')}>
      <Slider label={t('style.gap')} bind:value={gap} min={0} max={100} />
      <Slider label={t('style.padding')} bind:value={padding} min={0} max={120} />
      <Slider label={t('style.radius')} bind:value={radius} min={0} max={100} />
      <ColorField label={t('canvas.background')} bind:value={bg} />
    </Section>
  {/snippet}

  {#snippet toolbar()}
    <span class="t-title-s">{t('tool.stitch.name')}</span>
    {#if info}<span class="t-body-s dim">{i18n.n(info.w)} × {i18n.n(info.h)}{info.scaled ? ' · ' + t('export.capped') : ''}</span>{/if}
    <span style="flex:1"></span>
    <Segmented label={t('export.format')} bind:value={format} dense options={[{ value: 'jpeg' as Format, label: 'JPG' }, { value: 'png' as Format, label: 'PNG' }, { value: 'webp' as Format, label: 'WebP' }]} />
    <Button icon="download" loading={busy} disabled={!images.length} onclick={exportIt}>{width < 600 ? '' : t('export.download')}</Button>
  {/snippet}

  {#snippet stage()}
    <div class="stage" bind:clientWidth={stageW}>
      {#if images.length}
        <canvas bind:this={canvas}></canvas>
      {:else}
        <EmptyDrop title={t('stitch.emptyTitle')} hint={t('stitch.emptyHint')} onpick={pick} />
      {/if}
    </div>
  {/snippet}
</ToolShell>

<style>
  .stage {
    min-height: 100%;
    display: grid;
    justify-items: center;
    align-content: start;
    padding: 24px;
  }
  canvas {
    display: block;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.08), 0 12px 40px -8px rgb(0 0 0 / 0.2);
  }
  .list {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px 6px 0;
    border-radius: var(--shape-md);
    background: var(--md-surface-container);
    transition: box-shadow 200ms linear, scale 300ms var(--ease-spring);
  }
  li.dragging {
    box-shadow: var(--elev-3);
    scale: 1.02;
    position: relative;
    z-index: 2;
  }
  .grip {
    display: grid;
    place-items: center;
    width: 28px;
    height: 40px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--md-on-surface-variant);
    cursor: grab;
    touch-action: none;
  }
  li img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 8px;
    flex: none;
  }
  .meta {
    flex: 1;
    min-width: 0;
    display: grid;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dim {
    color: var(--md-on-surface-variant);
    margin: 0;
  }
</style>
