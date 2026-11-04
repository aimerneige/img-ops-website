<script lang="ts">
  import { collage } from '../store.svelte';
  import type { Style } from '../model';
  import { t, type MessageKey } from '../../../lib/i18n/index.svelte';
  import Slider from '../../../lib/components/Slider.svelte';
  import Chip from '../../../lib/components/Chip.svelte';
  import Section from './Section.svelte';

  const style = $derived(collage.doc.style);
  const commit = () => collage.commit(true);

  const PRESETS: { key: MessageKey; s: Style }[] = [
    { key: 'style.preset.seamless', s: { padding: 0, gap: 0, radius: 0, shadow: 0 } },
    { key: 'style.preset.thin', s: { padding: 6, gap: 6, radius: 0, shadow: 0 } },
    { key: 'style.preset.classic', s: { padding: 16, gap: 12, radius: 12, shadow: 0 } },
    { key: 'style.preset.soft', s: { padding: 36, gap: 24, radius: 28, shadow: 40 } },
    { key: 'style.preset.gallery', s: { padding: 64, gap: 32, radius: 4, shadow: 24 } },
  ];
  const same = (a: Style, b: Style) => a.padding === b.padding && a.gap === b.gap && a.radius === b.radius && a.shadow === b.shadow;
</script>

<Section title={t('style.presets')}>
  <div class="chips">
    {#each PRESETS as p (p.key)}
      <Chip selected={same(style, p.s)} onclick={() => { Object.assign(style, p.s); commit(); }}>{t(p.key)}</Chip>
    {/each}
  </div>
</Section>

<Section title={t('style.spacing')}>
  <Slider label={t('style.padding')} bind:value={style.padding} min={0} max={120} oncommit={commit} />
  <Slider label={t('style.gap')} bind:value={style.gap} min={0} max={80} oncommit={commit} />
</Section>

<Section title={t('style.look')}>
  <Slider label={t('style.radius')} bind:value={style.radius} min={0} max={120} oncommit={commit} />
  <Slider label={t('style.shadow')} bind:value={style.shadow} min={0} max={100} oncommit={commit} />
</Section>
<p class="t-body-s note">{t('style.unitNote')}</p>

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .note {
    margin: 0;
    color: var(--md-on-surface-variant);
  }
</style>
