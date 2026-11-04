<script lang="ts">
  import { collage } from '../store.svelte';
  import type { WmPos } from '../model';
  import { t } from '../../../lib/i18n/index.svelte';
  import Slider from '../../../lib/components/Slider.svelte';
  import Switch from '../../../lib/components/Switch.svelte';
  import TextField from '../../../lib/components/TextField.svelte';
  import Segmented from '../../../lib/components/Segmented.svelte';
  import ColorField from '../../../lib/components/ColorField.svelte';
  import Section from './Section.svelte';
  import { ripple } from '../../../lib/actions';

  const wm = $derived(collage.doc.wm);
  const commit = () => collage.commit(true);
  const POS: WmPos[] = ['tl', 'tc', 'tr', 'ml', 'c', 'mr', 'bl', 'bc', 'br'];
</script>

<Section title={t('wm.title')}>
  <Switch label={t('wm.enable')} bind:checked={wm.on} onchange={(v) => { if (v && !wm.text) wm.text = '© Tessera'; commit(); }} />
  <div class="body" class:off={!wm.on} inert={!wm.on}>
    <TextField label={t('wm.text')} bind:value={wm.text} oninput={() => collage.commit()} />
    <ColorField label={t('wm.color')} bind:value={wm.color} oncommit={commit} />
    <Segmented
      label={t('wm.mode')}
      bind:value={wm.mode}
      onchange={commit}
      options={[
        { value: 'tile' as const, label: t('wm.mode.tile'), icon: 'grid_on' },
        { value: 'single' as const, label: t('wm.mode.single'), icon: 'branding_watermark' },
      ]}
    />
    {#if wm.mode === 'tile'}
      <Segmented
        label={t('wm.density')}
        bind:value={wm.density}
        onchange={commit}
        options={[
          { value: 'sparse' as const, label: t('wm.density.sparse') },
          { value: 'medium' as const, label: t('wm.density.medium') },
          { value: 'dense' as const, label: t('wm.density.dense') },
        ]}
      />
    {:else}
      <div class="posrow">
        <span class="t-body-m">{t('wm.position')}</span>
        <div class="pos" role="radiogroup" aria-label={t('wm.position')}>
          {#each POS as p (p)}
            <button role="radio" aria-checked={wm.pos === p} aria-label={t(`wm.pos.${p}`)} class:on={wm.pos === p}
              onclick={() => { wm.pos = p; commit(); }} use:ripple><span></span></button>
          {/each}
        </div>
      </div>
    {/if}
    <Slider label={t('wm.size')} bind:value={wm.size} min={8} max={160} oncommit={commit} />
    <Slider label={t('wm.opacity')} bind:value={wm.opacity} min={0.05} max={1} step={0.05} format={(v) => String(Math.round(v * 100))} unit="%" oncommit={commit} />
    <Slider label={t('wm.rotation')} bind:value={wm.rotation} min={-90} max={90} step={5} unit="°" oncommit={commit} />
  </div>
</Section>

<style>
  .body {
    display: grid;
    gap: 14px;
    transition: opacity 200ms linear;
  }
  .off {
    opacity: 0.4;
  }
  .posrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pos {
    display: grid;
    grid-template-columns: repeat(3, 32px);
    gap: 4px;
    padding: 6px;
    border-radius: var(--shape-md);
    background: var(--md-surface-container-highest);
  }
  .pos button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
  }
  .pos span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--md-outline);
    transition: all 300ms var(--ease-spring);
  }
  .pos .on span {
    width: 18px;
    border-radius: 4px;
    background: var(--md-primary);
  }
</style>
