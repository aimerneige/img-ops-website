<script lang="ts">
  import { collage } from './store.svelte';
  import { ANNOT_COLORS, emptySlot, type Annot } from './model';
  import { t } from '../../lib/i18n/index.svelte';
  import IconButton from '../../lib/components/IconButton.svelte';
  import ColorField from '../../lib/components/ColorField.svelte';
  import Menu from '../../lib/components/Menu.svelte';
  import MenuItem from '../../lib/components/MenuItem.svelte';
  import { pickFiles, decodeFiles } from '../../lib/images.svelte';

  let {
    box,
    paperW,
    paperH,
    onEditText,
    onAddInto,
  }: {
    box: { x: number; y: number; w: number; h: number };
    paperW: number;
    paperH: number;
    onEditText: (id: string) => void;
    onAddInto: (cell: string) => void;
  } = $props();

  let bar = $state<HTMLDivElement>();
  let bw = $state(0);
  let bh = $state(48);
  let moreOpen = $state(false);
  let moreBtn = $state<HTMLElement>();

  const sel = $derived(collage.selection);
  const slot = $derived(sel?.type === 'cell' ? collage.doc.slots[sel.id] : undefined);
  const annot = $derived<Annot | undefined>(sel?.type === 'annot' ? collage.annot(sel.id) : undefined);
  const canRemoveCell = $derived(collage.cellIds.length > 1);

  // Above the selection if there's room, otherwise below, otherwise inside.
  const pos = $derived.by(() => {
    const gap = 10;
    let top = box.y - bh - gap;
    if (top < -40) top = box.y + box.h + gap;
    if (top + bh > paperH + 40) top = Math.max(-40, box.y + 8);
    const left = Math.min(Math.max(-24, box.x + box.w / 2 - bw / 2), paperW - bw + 24);
    return { top, left };
  });

  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  function zoom(f: number) {
    if (!slot) return;
    slot.zoom = clamp(slot.zoom * f, 1, 6);
    collage.commit();
  }
  function rotate() {
    if (!slot) return;
    slot.rot = ((slot.rot + 90) % 360) as 0 | 90 | 180 | 270;
    collage.commit(true);
  }
  async function replace() {
    if (sel?.type !== 'cell') return;
    const files = await pickFiles(false);
    if (!files.length) return;
    const { ok } = await decodeFiles(files);
    if (!ok.length) return;
    collage.images = [...collage.images, ...ok];
    collage.setSlotImage(sel.id, ok[0].id);
    collage.pixels++;
    collage.commit(true);
  }
  function setAnnot(patch: Partial<Annot>) {
    if (!annot) return;
    Object.assign(annot, patch);
    collage.commit();
  }
  function resize(step: number) {
    if (!annot) return;
    if (annot.kind === 'text') annot.size = clamp(Math.round(annot.size * (step > 0 ? 1.15 : 1 / 1.15)), 10, 400);
    else annot.stroke = clamp(annot.stroke + step * 2, 2, 40);
    collage.commit();
  }
</script>

<div
  class="bar"
  bind:this={bar}
  bind:clientWidth={bw}
  bind:clientHeight={bh}
  style:left="{pos.left}px"
  style:top="{pos.top}px"
  role="toolbar"
  aria-label={t('ctx.label')}
  onpointerdown={(e) => e.stopPropagation()}
>
  {#if sel?.type === 'cell' && slot}
    {#if slot.img}
      <IconButton icon="add_photo_alternate" size="sm" label={t('ctx.replace')} onclick={replace} />
      <span class="sep"></span>
      <IconButton icon="zoom_out" size="sm" label={t('ctx.zoomOut')} disabled={slot.zoom <= 1} onclick={() => zoom(1 / 1.2)} />
      <span class="zoom">{Math.round(slot.zoom * 100)}%</span>
      <IconButton icon="zoom_in" size="sm" label={t('ctx.zoomIn')} disabled={slot.zoom >= 6} onclick={() => zoom(1.2)} />
      <span class="sep"></span>
      <IconButton icon="rotate_right" size="sm" label={t('ctx.rotate')} onclick={rotate} />
      <IconButton icon="flip" size="sm" label={t('ctx.flip')} selected={slot.flip} onclick={() => { slot.flip = !slot.flip; collage.commit(true); }} />
      <IconButton
        icon={slot.fit === 'cover' ? 'crop' : 'fit_screen'}
        size="sm"
        label={slot.fit === 'cover' ? t('ctx.fitContain') : t('ctx.fitCover')}
        onclick={() => { slot.fit = slot.fit === 'cover' ? 'contain' : 'cover'; slot.ox = slot.oy = 0; collage.commit(true); }}
      />
      <span class="sep"></span>
    {:else}
      <IconButton icon="add_photo_alternate" size="sm" label={t('stage.addPhoto')} onclick={() => sel.type === 'cell' && onAddInto(sel.id)} />
      <span class="sep"></span>
    {/if}
    <IconButton icon="splitscreen_right" size="sm" label={t('ctx.splitH')} onclick={() => sel.type === 'cell' && collage.split(sel.id, 'row')} />
    <IconButton icon="splitscreen_bottom" size="sm" label={t('ctx.splitV')} onclick={() => sel.type === 'cell' && collage.split(sel.id, 'col')} />
    <IconButton icon="more_vert" size="sm" label={t('common.more')} bind:el={moreBtn} expanded={moreOpen} onclick={() => (moreOpen = !moreOpen)} />
    <Menu bind:open={moreOpen} anchor={moreBtn} placement="bottom-end">
      {#if slot.img}
        <MenuItem icon="restart_alt" label={t('ctx.reset')} onclick={() => { Object.assign(slot, { ...emptySlot(), img: slot.img }); collage.commit(true); }} />
        <MenuItem icon="image" label={t('ctx.useAsBg')} onclick={() => { collage.doc.bg.type = 'photo'; collage.doc.bg.img = slot.img; collage.commit(true); }} />
        <MenuItem icon="delete" label={t('ctx.clearPhoto')} onclick={() => sel.type === 'cell' && (collage.setSlotImage(sel.id, null), collage.commit(true))} />
      {/if}
      <MenuItem icon="delete_sweep" label={t('ctx.removeCell')} danger disabled={!canRemoveCell} onclick={() => sel.type === 'cell' && collage.removeCell(sel.id)} />
    </Menu>
  {:else if annot}
    <div class="swatches">
      {#each ANNOT_COLORS.slice(0, 5) as c (c)}
        <button
          class="swatch"
          class:on={annot.color === c}
          style:background={c}
          aria-label={c}
          onclick={() => setAnnot({ color: c })}
        ></button>
      {/each}
      <ColorField compact label={t('annot.color')} bind:value={annot.color} oncommit={() => collage.commit(true)} />
    </div>
    <span class="sep"></span>
    {#if annot.kind === 'text'}
      {@const a = annot}
      <IconButton icon="edit" size="sm" label={t('annot.edit')} onclick={() => onEditText(a.id)} />
      <IconButton icon="format_bold" size="sm" label={t('annot.bold')} selected={a.bold} onclick={() => setAnnot({ bold: !a.bold })} />
      <IconButton
        icon={a.style === 'plain' ? 'text_fields' : a.style === 'outline' ? 'format_size' : 'rounded_corner'}
        size="sm"
        label="{t('annot.style')}: {t(`annot.style.${a.style}`)}"
        onclick={() => setAnnot({ style: a.style === 'plain' ? 'outline' : a.style === 'outline' ? 'pill' : 'plain' })}
      />
    {:else if annot.kind !== 'arrow'}
      {@const a = annot}
      <IconButton icon="water_drop" size="sm" label={t('annot.fill')} selected={a.fill} onclick={() => setAnnot({ fill: !a.fill })} />
    {/if}
    <IconButton icon="remove" size="sm" label={annot.kind === 'text' ? t('annot.smaller') : t('annot.thinner')} onclick={() => resize(-1)} />
    <IconButton icon="add" size="sm" label={annot.kind === 'text' ? t('annot.larger') : t('annot.thicker')} onclick={() => resize(1)} />
    <span class="sep"></span>
    <IconButton icon="more_vert" size="sm" label={t('common.more')} bind:el={moreBtn} expanded={moreOpen} onclick={() => (moreOpen = !moreOpen)} />
    <Menu bind:open={moreOpen} anchor={moreBtn} placement="bottom-end">
      <MenuItem icon="content_copy" label={t('annot.duplicate')} trailing="Ctrl D" onclick={() => annot && collage.duplicateAnnot(annot.id)} />
      <MenuItem icon="layers" label={t('annot.front')} onclick={() => annot && collage.bringToFront(annot.id)} />
      <MenuItem icon="delete" label={t('common.delete')} trailing="Del" danger onclick={() => annot && collage.removeAnnot(annot.id)} />
    </Menu>
  {/if}
</div>

<style>
  .bar {
    position: absolute;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: var(--shape-lg);
    background: var(--md-surface-container-high);
    box-shadow: var(--elev-3);
    white-space: nowrap;
    animation: pop 260ms var(--ease-spring);
    transition:
      left 220ms var(--ease-standard),
      top 220ms var(--ease-standard);
    --panel-bg: var(--md-surface-container-high);
  }
  @keyframes pop {
    from {
      opacity: 0;
      scale: 0.85;
    }
  }
  .sep {
    width: 1px;
    height: 24px;
    margin: 0 4px;
    background: var(--md-outline-variant);
  }
  .zoom {
    min-width: 42px;
    text-align: center;
    font: 500 12px var(--mono);
    color: var(--md-on-surface-variant);
  }
  .swatches {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 2px;
  }
  .swatch {
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-on-surface) 25%, transparent);
    transition:
      scale 250ms var(--ease-spring),
      border-radius 250ms var(--ease-spring);
  }
  .swatch:hover {
    scale: 1.15;
  }
  .swatch.on {
    border-radius: 30%;
    box-shadow:
      0 0 0 2px var(--md-surface-container-high),
      0 0 0 4px var(--md-primary);
  }
  .swatches :global(.field.compact) {
    width: 32px;
    height: 32px;
    background: transparent;
  }
  @media (max-width: 600px) {
    .bar {
      max-width: calc(100vw - 24px);
      overflow-x: auto;
    }
  }
</style>
