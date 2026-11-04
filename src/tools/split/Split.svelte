<script lang="ts">
  import { zipSync } from 'fflate';
  import ToolShell from '../ToolShell.svelte';
  import EmptyDrop from '../EmptyDrop.svelte';
  import Section from '../collage/panels/Section.svelte';
  import Segmented from '../../lib/components/Segmented.svelte';
  import Slider from '../../lib/components/Slider.svelte';
  import Switch from '../../lib/components/Switch.svelte';
  import Chip from '../../lib/components/Chip.svelte';
  import Button from '../../lib/components/Button.svelte';
  import IconButton from '../../lib/components/IconButton.svelte';
  import { t, i18n } from '../../lib/i18n/index.svelte';
  import { snackbar } from '../../lib/feedback.svelte';
  import { decodeFiles, filesFromClipboard, isImageFile, pickFiles, releaseImg, type Img } from '../../lib/images.svelte';
  import { canvasToBlob, downloadBlob, formatBytes, stamp, type Format } from '../../lib/export';
  import { tooltip } from '../../lib/actions';

  let { width }: { width: number } = $props();

  let img = $state.raw<Img | null>(null);
  let rows = $state(3);
  let cols = $state(3);
  let square = $state(false);
  let format = $state<Format>('jpeg');
  let busy = $state(false);

  const PRESETS: [number, number][] = [[1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [3, 3], [2, 3], [4, 4]];

  async function load(files: File[]) {
    const { ok } = await decodeFiles(files.slice(0, 1));
    if (!ok.length) {
      if (files.length) snackbar.show(t('photos.failed', { n: 1 }), { error: true });
      return;
    }
    if (img) releaseImg(img);
    img = ok[0];
  }
  const pick = async () => load(await pickFiles(false));

  /** Source crop (centered) so tiles can be square. */
  const crop = $derived.by(() => {
    if (!img) return { x: 0, y: 0, w: 0, h: 0 };
    if (!square) return { x: 0, y: 0, w: img.w, h: img.h };
    const target = cols / rows;
    const r = img.w / img.h;
    if (r > target) {
      const w = img.h * target;
      return { x: (img.w - w) / 2, y: 0, w, h: img.h };
    }
    const h = img.w / target;
    return { x: 0, y: (img.h - h) / 2, w: img.w, h };
  });
  const tileW = $derived(Math.floor(crop.w / cols));
  const tileH = $derived(Math.floor(crop.h / rows));

  async function tileBlob(r: number, c: number) {
    const cv = document.createElement('canvas');
    cv.width = tileW;
    cv.height = tileH;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#fff';
    if (format === 'jpeg') ctx.fillRect(0, 0, tileW, tileH);
    ctx.drawImage(img!.full, crop.x + c * tileW, crop.y + r * tileH, tileW, tileH, 0, 0, tileW, tileH);
    const b = await canvasToBlob(cv, format, 0.92);
    cv.width = cv.height = 0;
    return b;
  }
  const ext = $derived(format === 'jpeg' ? 'jpg' : format);
  const base = $derived((img?.name ?? 'image').replace(/\.[^.]+$/, ''));

  async function downloadTile(r: number, c: number) {
    const b = await tileBlob(r, c);
    downloadBlob(b, `${base}-${r * cols + c + 1}.${ext}`);
  }
  async function downloadZip() {
    if (!img || busy) return;
    busy = true;
    try {
      const files: Record<string, Uint8Array> = {};
      let total = 0;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const b = await tileBlob(r, c);
          total += b.size;
          files[`${base}-${String(r * cols + c + 1).padStart(2, '0')}.${ext}`] = new Uint8Array(await b.arrayBuffer());
        }
      const zip = zipSync(files, { level: 0 });
      downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `tessera-split-${stamp()}.zip`);
      snackbar.show(t('split.saved', { n: rows * cols, size: formatBytes(total) }), { icon: 'check_circle' });
    } catch {
      snackbar.show(t('export.failed'), { error: true });
    } finally {
      busy = false;
    }
  }

  const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  let stageW = $state(0);
  let stageH = $state(0);
  const view = $derived.by(() => {
    if (!img) return { w: 0, h: 0 };
    const k = Math.min((stageW - 48) / crop.w, (stageH - 48) / crop.h, 1);
    return { w: crop.w * k, h: crop.h * k };
  });
</script>

<svelte:window
  onpaste={(e) => {
    const f = filesFromClipboard(e);
    if (f.length) load(f);
  }}
  ondragover={(e) => hasFiles(e) && e.preventDefault()}
  ondrop={(e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    load([...(e.dataTransfer?.files ?? [])].filter(isImageFile));
  }}
/>

<ToolShell {width} sideLabel={t('tool.split.name')}>
  {#snippet side()}
    <Section title={t('split.grid')}>
      <div class="chips">
        {#each PRESETS as [r, c] (`${r}x${c}`)}
          <Chip selected={rows === r && cols === c} onclick={() => ((rows = r), (cols = c))}>{r} × {c}</Chip>
        {/each}
      </div>
      <Slider label={t('split.rows')} bind:value={rows} min={1} max={10} />
      <Slider label={t('split.cols')} bind:value={cols} min={1} max={10} />
      <Switch label={t('split.square')} bind:checked={square} />
    </Section>
    <Section title={t('export.format')}>
      <Segmented label={t('export.format')} bind:value={format} options={[{ value: 'jpeg' as Format, label: 'JPG' }, { value: 'png' as Format, label: 'PNG' }, { value: 'webp' as Format, label: 'WebP' }]} />
      {#if img}<p class="t-body-s dim">{t('split.tileSize', { w: i18n.n(tileW), h: i18n.n(tileH), n: rows * cols })}</p>{/if}
    </Section>
  {/snippet}

  {#snippet toolbar()}
    <span class="t-title-s">{t('tool.split.name')}</span>
    {#if img}<span class="t-body-s dim name">{img.name}</span>{/if}
    <span style="flex:1"></span>
    {#if img}<IconButton icon="image" size="sm" label={t('split.change')} onclick={pick} />{/if}
    <Button icon="folder_zip" loading={busy} disabled={!img} onclick={downloadZip}>{width < 600 ? '' : t('split.zip')}</Button>
  {/snippet}

  {#snippet stage()}
    <div class="stage" bind:clientWidth={stageW} bind:clientHeight={stageH}>
      {#if img}
        <div class="pic" style:width="{view.w}px" style:height="{view.h}px">
          <img
            src={img.url}
            alt=""
            style:width="{(img.w / crop.w) * 100}%"
            style:left="{(-crop.x / crop.w) * 100}%"
            style:top="{(-crop.y / crop.h) * 100}%"
          />
          <div class="grid" style:grid-template-columns="repeat({cols}, 1fr)" style:grid-template-rows="repeat({rows}, 1fr)">
            {#each Array(rows * cols) as _, i (i)}
              <button class="tile" onclick={() => downloadTile(Math.floor(i / cols), i % cols)} use:tooltip={t('split.tileDownload')} aria-label="{t('split.tileDownload')} {i + 1}">
                <span>{i + 1}</span>
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <EmptyDrop title={t('split.emptyTitle')} hint={t('split.emptyHint')} onpick={pick} multiple={false} />
      {/if}
    </div>
  {/snippet}
</ToolShell>

<style>
  .stage {
    height: 100%;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .pic {
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.08), 0 12px 40px -8px rgb(0 0 0 / 0.2);
    transition: width 300ms var(--ease-standard), height 300ms var(--ease-standard);
  }
  .pic img {
    position: absolute;
    max-width: none;
    display: block;
  }
  .grid {
    position: absolute;
    inset: 0;
    display: grid;
  }
  .tile {
    position: relative;
    border: none;
    padding: 0;
    background: transparent;
    outline: 1px solid rgb(255 255 255 / 0.85);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.25);
    display: grid;
    place-items: center;
    transition: background-color 150ms linear;
  }
  .tile span {
    min-width: 28px;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.5);
    color: #fff;
    font: 500 12px/20px var(--mono);
    opacity: 0.8;
    transition: scale 300ms var(--ease-spring);
  }
  .tile:hover {
    background: color-mix(in srgb, var(--md-primary) 25%, transparent);
  }
  .tile:hover span {
    scale: 1.15;
  }
  .tile:active span {
    scale: 0.9;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .dim {
    color: var(--md-on-surface-variant);
    margin: 0;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 30vw;
  }
</style>
