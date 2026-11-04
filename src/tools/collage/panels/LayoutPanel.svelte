<script lang="ts">
  import { collage } from '../store.svelte';
  import { PRESET_COUNTS, compute, parse, presetsFor, signature } from '../layout';
  import { t } from '../../../lib/i18n/index.svelte';
  import { ripple } from '../../../lib/actions';
  import Icon from '../../../lib/components/Icon.svelte';

  const thumbs = $derived(
    presetsFor(collage.layoutCount).map((src) => {
      const tree = parse(src);
      return { src, sig: signature(tree), cells: compute(tree, { x: 3, y: 3, w: 58, h: 58 }, 3).cells };
    }),
  );
  const current = $derived(collage.layoutSignature);
  const cellCount = $derived(collage.cellIds.length);
</script>

<section class="panel">
  <div class="counts" role="radiogroup" aria-label={t('layout.count')}>
    {#each PRESET_COUNTS as n (n)}
      <button
        role="radio"
        aria-checked={collage.layoutCount === n}
        class:on={collage.layoutCount === n}
        class:here={cellCount === n}
        onclick={() => (collage.layoutCount = n)}
        use:ripple
      >
        {n}
      </button>
    {/each}
  </div>
  <p class="caption t-body-s">{t('layout.countHint', { n: collage.layoutCount })}</p>

  <div class="grid">
    {#each thumbs as th (th.src)}
      <button
        class="thumb"
        class:on={th.sig === current}
        aria-label={t('layout.preset', { n: collage.layoutCount })}
        aria-pressed={th.sig === current}
        onclick={() => collage.applyPreset(th.src)}
        use:ripple
      >
        <svg viewBox="0 0 64 64" aria-hidden="true">
          {#each th.cells as c (c.id)}
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="3" />
          {/each}
        </svg>
      </button>
    {/each}
  </div>

  <div class="tip">
    <Icon name="dashboard_customize" size={20} />
    <p class="t-body-s">{t('layout.customTip')}</p>
  </div>
</section>

<style>
  .panel {
    display: grid;
    gap: 12px;
  }
  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .counts button {
    position: relative;
    width: 40px;
    height: 36px;
    border: none;
    border-radius: 18px;
    background: var(--md-surface-container-highest);
    color: var(--md-on-surface-variant);
    font: 500 14px var(--font);
    font-variant-numeric: tabular-nums;
    transition:
      border-radius 350ms var(--ease-spring),
      background-color 200ms linear;
  }
  .counts button.here::after {
    content: '';
    position: absolute;
    bottom: 4px;
    left: 50%;
    width: 4px;
    height: 4px;
    translate: -50% 0;
    border-radius: 50%;
    background: currentColor;
  }
  .counts button.on {
    background: var(--md-primary);
    color: var(--md-on-primary);
    border-radius: 10px;
  }
  .counts button:active {
    border-radius: 8px;
  }
  .caption {
    margin: -4px 0 0;
    color: var(--md-on-surface-variant);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 8px;
  }
  .thumb {
    aspect-ratio: 1;
    padding: 6px;
    border: none;
    border-radius: var(--shape-md);
    background: var(--md-surface-container-highest);
    color: var(--md-on-surface-variant);
    transition:
      border-radius 350ms var(--ease-spring),
      background-color 200ms linear,
      scale 350ms var(--ease-spring);
  }
  .thumb:active {
    scale: 0.94;
  }
  .thumb.on {
    background: var(--md-primary-container);
    color: var(--md-on-primary-container);
    border-radius: var(--shape-xl);
    outline: 2px solid var(--md-primary);
    outline-offset: -2px;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  rect {
    fill: currentColor;
    opacity: 0.55;
    transition: opacity 200ms linear;
  }
  .thumb:hover rect,
  .thumb.on rect {
    opacity: 0.9;
  }
  .tip {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px;
    border-radius: var(--shape-md);
    background: var(--md-tertiary-container);
    color: var(--md-on-tertiary-container);
  }
  .tip p {
    margin: 0;
  }
</style>
