<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { IconName } from '../icons';
  import Icon from './Icon.svelte';
  import { ripple, tooltip } from '../actions';

  interface Props {
    icon: IconName;
    label: string;
    variant?: 'standard' | 'filled' | 'tonal' | 'outlined';
    /** When defined the button acts as a toggle. */
    selected?: boolean;
    disabled?: boolean;
    size?: 'xs' | 'sm' | 'md';
    href?: string;
    tipless?: boolean;
    onclick?: (e: MouseEvent) => void;
    onpointerdown?: (e: PointerEvent) => void;
    el?: HTMLElement;
    expanded?: boolean;
    custom?: Snippet;
  }
  let {
    icon,
    label,
    variant = 'standard',
    selected,
    disabled = false,
    size = 'md',
    href,
    tipless = false,
    onclick,
    onpointerdown,
    el = $bindable(),
    expanded,
    custom,
  }: Props = $props();
</script>

{#if href}
  <a
    bind:this={el}
    class="ib {variant} {size}"
    {href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    use:ripple={{ center: true }}
    use:tooltip={tipless ? undefined : label}
  >
    {#if custom}{@render custom()}{:else}<Icon name={icon} size={size === 'xs' ? 18 : 24} />{/if}
  </a>
{:else}
  <button
    bind:this={el}
    type="button"
    class="ib {variant} {size}"
    class:selected
    class:toggle={selected !== undefined}
    aria-label={label}
    aria-pressed={selected}
    aria-expanded={expanded}
    {disabled}
    {onclick}
    {onpointerdown}
    use:ripple={{ center: true }}
    use:tooltip={tipless ? undefined : label}
  >
    <Icon name={icon} size={size === 'xs' ? 18 : size === 'sm' ? 20 : 24} />
  </button>
{/if}

<style>
  .ib {
    --s: 40px;
    display: inline-grid;
    place-items: center;
    width: var(--s);
    height: var(--s);
    flex: none;
    border: none;
    border-radius: calc(var(--s) / 2);
    background: transparent;
    color: var(--md-on-surface-variant);
    text-decoration: none;
    transition:
      border-radius 350ms var(--ease-spring),
      background-color var(--dur-short) linear,
      color var(--dur-short) linear;
  }
  .ib :global(.icon) {
    transition: transform 400ms var(--ease-spring);
  }
  .ib:not(:disabled):active {
    border-radius: 10px;
  }
  .ib:not(:disabled):active :global(.icon) {
    transform: scale(0.84);
  }
  .sm {
    --s: 36px;
  }
  .xs {
    --s: 30px;
  }
  .standard.selected {
    color: var(--md-primary);
    background: color-mix(in srgb, var(--md-primary) 12%, transparent);
  }
  .filled {
    background: var(--md-primary);
    color: var(--md-on-primary);
  }
  .filled.toggle:not(.selected) {
    background: var(--md-surface-container-highest);
    color: var(--md-primary);
  }
  .tonal {
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
  }
  .tonal.toggle:not(.selected) {
    background: var(--md-surface-container-highest);
    color: var(--md-on-surface-variant);
  }
  .outlined {
    outline: 1px solid var(--md-outline-variant);
    outline-offset: -1px;
  }
  .outlined.selected {
    background: var(--md-inverse-surface);
    color: var(--md-inverse-on-surface);
    outline: none;
  }
  .toggle.selected {
    border-radius: 12px;
  }
  .ib:disabled {
    color: color-mix(in srgb, var(--md-on-surface) 38%, transparent);
    cursor: default;
  }
  .filled:disabled,
  .tonal:disabled {
    background: color-mix(in srgb, var(--md-on-surface) 10%, transparent);
  }
</style>
