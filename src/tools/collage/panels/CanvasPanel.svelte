<script lang="ts">
  import { collage } from '../store.svelte';
  import { RATIOS, type BgType } from '../model';
  import { t, type MessageKey } from '../../../lib/i18n/index.svelte';
  import Chip from '../../../lib/components/Chip.svelte';
  import Segmented from '../../../lib/components/Segmented.svelte';
  import ColorField from '../../../lib/components/ColorField.svelte';
  import Slider from '../../../lib/components/Slider.svelte';
  import TextField from '../../../lib/components/TextField.svelte';
  import IconButton from '../../../lib/components/IconButton.svelte';
  import Section from './Section.svelte';
  import { ripple, tooltip } from '../../../lib/actions';

  const doc = $derived(collage.doc);
  const bg = $derived(collage.doc.bg);

  const GRADIENTS: [string, string, number][] = [
    ['#FFDEE9', '#B5FFFC', 135], ['#FBC2EB', '#A6C1EE', 135], ['#FDFCFB', '#E2D1C3', 180],
    ['#F6D365', '#FDA085', 120], ['#84FAB0', '#8FD3F4', 120], ['#232526', '#414345', 160],
    ['#0F2027', '#2C5364', 135], ['#667EEA', '#764BA2', 135],
  ];

  let cw = $state(String(collage.doc.ratio.w));
  let ch = $state(String(collage.doc.ratio.h));
  $effect(() => {
    cw = String(collage.doc.ratio.w);
    ch = String(collage.doc.ratio.h);
  });

  const isRatio = (w: number, h: number) => doc.ratio.w === w && doc.ratio.h === h;
  function setRatio(w: number, h: number) {
    doc.ratio = { w, h };
    collage.commit(true);
  }
  function commitCustom() {
    const w = parseFloat(cw);
    const h = parseFloat(ch);
    if (w > 0 && h > 0 && w / h < 20 && h / w < 20) setRatio(w, h);
    else {
      cw = String(doc.ratio.w);
      ch = String(doc.ratio.h);
    }
  }
  const groups = ['screen', 'social', 'print'] as const;
</script>

<Section title={t('canvas.ratio')}>
  {#each groups as g (g)}
    <div class="group">
      <span class="t-label-m glabel">{t(`canvas.group.${g}`)}</span>
      <div class="chips">
        {#each RATIOS.filter((r) => r.group === g) as r (`${r.w}:${r.h}:${r.hint}`)}
          <Chip selected={isRatio(r.w, r.h)} sub={r.hint ? t(r.hint as MessageKey) : undefined} onclick={() => setRatio(r.w, r.h)}>
            {r.w > 100 ? 'A4' : `${r.w}:${r.h}`}
          </Chip>
        {/each}
      </div>
    </div>
  {/each}
  <div class="custom">
    <TextField label={t('canvas.width')} bind:value={cw} inputmode="decimal" oncommit={commitCustom} />
    <IconButton icon="swap_horiz" label={t('canvas.swap')} onclick={() => setRatio(doc.ratio.h, doc.ratio.w)} />
    <TextField label={t('canvas.height')} bind:value={ch} inputmode="decimal" oncommit={commitCustom} />
  </div>
</Section>

<Section title={t('canvas.background')}>
  <Segmented
    label={t('canvas.background')}
    bind:value={bg.type}
    onchange={() => collage.commit(true)}
    options={[
      { value: 'color' as BgType, label: t('canvas.bg.color'), icon: 'palette' },
      { value: 'gradient' as BgType, label: t('canvas.bg.gradient'), icon: 'gradient' },
      { value: 'photo' as BgType, label: t('canvas.bg.photo'), icon: 'blur_on' },
    ]}
  />
  {#if bg.type === 'color'}
    <ColorField label={t('canvas.bg.color')} bind:value={bg.color} oncommit={() => collage.commit(true)} />
  {:else if bg.type === 'gradient'}
    <div class="grads">
      {#each GRADIENTS as [a, b, ang] (a + b)}
        <button
          class="grad"
          class:on={bg.color === a && bg.color2 === b}
          style:background="linear-gradient({ang}deg, {a}, {b})"
          aria-label="{a} → {b}"
          onclick={() => {
            Object.assign(bg, { color: a, color2: b, angle: ang });
            collage.commit(true);
          }}
          use:ripple
        ></button>
      {/each}
    </div>
    <div class="two">
      <ColorField label={t('canvas.bg.from')} bind:value={bg.color} oncommit={() => collage.commit(true)} />
      <ColorField label={t('canvas.bg.to')} bind:value={bg.color2} oncommit={() => collage.commit(true)} />
    </div>
    <Slider label={t('canvas.bg.angle')} bind:value={bg.angle} min={0} max={360} step={5} unit="°" oncommit={() => collage.commit(true)} />
  {:else}
    <div class="sources" role="radiogroup" aria-label={t('canvas.bg.source')}>
      <button role="radio" aria-checked={bg.img === null} class="src auto" class:on={bg.img === null}
        onclick={() => { bg.img = null; collage.commit(true); }} use:ripple use:tooltip={t('canvas.bg.auto')}>
        {t('canvas.bg.autoShort')}
      </button>
      {#each collage.images as img (img.id)}
        <button role="radio" aria-checked={bg.img === img.id} class="src" class:on={bg.img === img.id} aria-label={img.name}
          onclick={() => { bg.img = img.id; collage.commit(true); }} use:ripple>
          <img src={img.thumb} alt="" />
        </button>
      {/each}
    </div>
    {#if !collage.images.length}<p class="t-body-s hint">{t('canvas.bg.noPhotos')}</p>{/if}
    <Slider label={t('canvas.bg.blur')} bind:value={bg.blur} min={0} max={100} oncommit={() => collage.commit(true)} />
    <Slider label={t('canvas.bg.dim')} bind:value={bg.dim} min={0} max={80} unit="%" oncommit={() => collage.commit(true)} />
    <ColorField label={t('canvas.bg.fallback')} bind:value={bg.color} oncommit={() => collage.commit(true)} />
  {/if}
</Section>

<style>
  .group {
    display: grid;
    gap: 8px;
  }
  .glabel {
    color: var(--md-on-surface-variant);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .custom {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 4px;
  }
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .grads {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .grad {
    aspect-ratio: 1.6;
    border: none;
    border-radius: var(--shape-md);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-on-surface) 12%, transparent);
    transition:
      border-radius 350ms var(--ease-spring),
      scale 350ms var(--ease-spring);
  }
  .grad:active {
    scale: 0.92;
  }
  .grad.on {
    border-radius: var(--shape-xl);
    outline: 3px solid var(--md-primary);
    outline-offset: 2px;
  }
  .sources {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 2px 6px;
  }
  .src {
    flex: none;
    width: 56px;
    height: 56px;
    padding: 0;
    border: none;
    border-radius: var(--shape-md);
    overflow: hidden;
    background: var(--md-surface-container-highest);
    color: var(--md-on-surface-variant);
    font-size: 12px;
    font-weight: 500;
    transition: border-radius 350ms var(--ease-spring);
  }
  .src img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .src.on {
    border-radius: var(--shape-xl);
    outline: 3px solid var(--md-primary);
    outline-offset: 2px;
  }
  .src.auto.on {
    background: var(--md-primary-container);
    color: var(--md-on-primary-container);
  }
  .hint {
    margin: 0;
    color: var(--md-on-surface-variant);
  }
</style>
