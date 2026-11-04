<script lang="ts">
  import { untrack } from 'svelte';
  import Popover from './Popover.svelte';
  import Icon from './Icon.svelte';
  import IconButton from './IconButton.svelte';
  import { hexToHsv, hsvToHex, normalizeHex, type HSV } from '../color';
  import { ripple } from '../actions';
  import { t } from '../i18n/index.svelte';

  const PRESETS = [
    '#FFFFFF', '#F5F1EA', '#E8E8E8', '#9E9E9E', '#424242', '#111111',
    '#FCE4EC', '#F48FB1', '#E53935', '#FFB74D', '#FFF59D', '#C5E1A5',
    '#43A047', '#80DEEA', '#1E88E5', '#3949AB', '#B39DDB', '#6D4C41',
  ];

  let {
    value = $bindable(),
    label,
    compact = false,
    oncommit,
  }: { value: string; label: string; compact?: boolean; oncommit?: (v: string) => void } = $props();

  let open = $state(false);
  let anchor = $state<HTMLButtonElement>();
  let hsv = $state<HSV>(hexToHsv(value));
  let hexDraft = $state(value);
  let sv: HTMLDivElement;
  let hue: HTMLDivElement;

  // Keep the picker in sync with outside changes (without clobbering hue on greys).
  $effect(() => {
    const v = value;
    untrack(() => {
      if (normalizeHex(v) !== hsvToHex(hsv)) {
        const n = hexToHsv(v);
        hsv = n.s === 0 ? { ...n, h: hsv.h } : n;
      }
      hexDraft = v;
    });
  });

  function setHsv(next: HSV) {
    hsv = next;
    value = hsvToHex(next);
  }
  function drag(kind: 'sv' | 'hue') {
    return (e: PointerEvent) => {
      const el = kind === 'sv' ? sv : hue;
      el.setPointerCapture(e.pointerId);
      const apply = (ev: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        const y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
        if (kind === 'sv') setHsv({ ...hsv, s: x, v: 1 - y });
        else setHsv({ ...hsv, h: x * 360 });
      };
      apply(e);
      const up = () => {
        el.removeEventListener('pointermove', apply);
        oncommit?.(value);
      };
      el.addEventListener('pointermove', apply);
      el.addEventListener('pointerup', up, { once: true });
      el.addEventListener('pointercancel', up, { once: true });
    };
  }
  function keySv(e: KeyboardEvent) {
    const d = e.shiftKey ? 0.1 : 0.02;
    const m: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    if (!m[e.key]) return;
    e.preventDefault();
    setHsv({ ...hsv, s: Math.min(1, Math.max(0, hsv.s + m[e.key][0])), v: Math.min(1, Math.max(0, hsv.v + m[e.key][1])) });
  }
  function keyHue(e: KeyboardEvent) {
    const d = (e.shiftKey ? 30 : 5) * (e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0);
    if (!d) return;
    e.preventDefault();
    setHsv({ ...hsv, h: (hsv.h + d + 360) % 360 });
  }
  function pick(hex: string) {
    value = hex;
    oncommit?.(hex);
  }
  async function eyedrop() {
    const ED = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!ED) return;
    try {
      const r = await new ED().open();
      const hex = normalizeHex(r.sRGBHex);
      if (hex) pick(hex);
    } catch {
      /* cancelled */
    }
  }
  const hasEyedropper = 'EyeDropper' in window;
</script>

<button
  bind:this={anchor}
  type="button"
  class="field"
  class:compact
  aria-label="{label}: {value}"
  aria-expanded={open}
  onclick={() => (open = !open)}
  use:ripple
>
  <span class="sw" style:background={value}></span>
  {#if !compact}
    <span class="txt">
      <span class="lbl">{label}</span>
      <span class="hex">{value}</span>
    </span>
    <Icon name="palette" size={20} />
  {/if}
</button>

<Popover bind:open {anchor} placement="bottom-start" label={label} width="280px" class="cp" onclose={() => oncommit?.(value)}>
  <div class="picker">
    <div
      class="sv"
      bind:this={sv}
      style:--hue="hsl({hsv.h} 100% 50%)"
      onpointerdown={drag('sv')}
      role="slider"
      tabindex="0"
      aria-label={t('color.saturation')}
      aria-valuenow={Math.round(hsv.s * 100)}
      onkeydown={keySv}
    >
      <span class="dot" style:left="{hsv.s * 100}%" style:top="{(1 - hsv.v) * 100}%" style:background={value}></span>
    </div>
    <div
      class="hue"
      bind:this={hue}
      onpointerdown={drag('hue')}
      role="slider"
      tabindex="0"
      aria-label={t('color.hue')}
      aria-valuenow={Math.round(hsv.h)}
      onkeydown={keyHue}
    >
      <span class="knob" style:left="{(hsv.h / 360) * 100}%" style:background="hsl({hsv.h} 100% 50%)"></span>
    </div>
    <div class="row">
      <span class="preview" style:background={value}></span>
      <input
        class="hexin"
        bind:value={hexDraft}
        aria-label="HEX"
        spellcheck="false"
        maxlength="7"
        onchange={() => {
          const h = normalizeHex(hexDraft);
          if (h) pick(h);
          else hexDraft = value;
        }}
        onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      />
      {#if hasEyedropper}
        <IconButton icon="colorize" size="sm" label={t('color.eyedropper')} onclick={eyedrop} />
      {/if}
    </div>
    <div class="presets" role="listbox" aria-label={t('color.presets')}>
      {#each PRESETS as p (p)}
        <button
          type="button"
          role="option"
          aria-selected={p === value}
          aria-label={p}
          class="preset"
          class:on={p === value}
          style:background={p}
          onclick={() => pick(p)}
        ></button>
      {/each}
    </div>
  </div>
</Popover>

<style>
  .field {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    height: 56px;
    padding: 0 12px 0 8px;
    border: none;
    border-radius: var(--shape-md);
    background: var(--md-surface-container-highest);
    color: var(--md-on-surface-variant);
    text-align: start;
    transition: border-radius 300ms var(--ease-spring);
  }
  .field:active {
    border-radius: var(--shape-lg);
  }
  .compact {
    width: 40px;
    height: 40px;
    padding: 0;
    justify-content: center;
    border-radius: 20px;
  }
  .sw {
    width: 40px;
    height: 40px;
    border-radius: var(--shape-sm);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-on-surface) 18%, transparent);
    flex: none;
    transition: border-radius 300ms var(--ease-spring);
  }
  .compact .sw {
    width: 26px;
    height: 26px;
    border-radius: 50%;
  }
  .txt {
    flex: 1;
    display: grid;
    line-height: 18px;
  }
  .lbl {
    font-size: 12px;
  }
  .hex {
    font: 500 14px var(--mono);
    color: var(--md-on-surface);
  }
  .picker {
    display: grid;
    gap: 14px;
    padding: 16px;
  }
  .sv {
    position: relative;
    height: 160px;
    border-radius: var(--shape-md);
    background:
      linear-gradient(to top, #000, transparent),
      linear-gradient(to right, #fff, var(--hue));
    touch-action: none;
    cursor: crosshair;
  }
  .dot,
  .knob {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    translate: -50% -50%;
    border: 3px solid #fff;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.45);
    pointer-events: none;
  }
  .hue {
    position: relative;
    height: 14px;
    border-radius: 7px;
    background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
    touch-action: none;
    cursor: pointer;
  }
  .knob {
    top: 50%;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .preview {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex: none;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-on-surface) 18%, transparent);
  }
  .hexin {
    flex: 1;
    min-width: 0;
    height: 40px;
    padding: 0 12px;
    border: none;
    border-radius: var(--shape-sm);
    background: var(--md-surface-container-highest);
    font: 500 14px var(--mono);
    text-transform: uppercase;
    outline: none;
  }
  .hexin:focus {
    outline: 2px solid var(--md-primary);
    outline-offset: -2px;
  }
  .presets {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }
  .preset {
    aspect-ratio: 1;
    border: none;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-on-surface) 18%, transparent);
    transition:
      border-radius 300ms var(--ease-spring),
      scale 300ms var(--ease-spring);
  }
  .preset:hover {
    scale: 1.1;
  }
  .preset.on {
    border-radius: 30%;
    box-shadow:
      0 0 0 2px var(--md-surface-container),
      0 0 0 4px var(--md-primary);
  }
</style>
