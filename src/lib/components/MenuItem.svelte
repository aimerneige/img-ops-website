<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { IconName } from '../icons';
  import Icon from './Icon.svelte';
  import { ripple } from '../actions';

  let {
    icon,
    label,
    trailing,
    checked,
    disabled = false,
    keepOpen = false,
    danger = false,
    onclick,
    lead,
  }: {
    icon?: IconName;
    label: string;
    trailing?: string;
    /** Radio-style item when defined. */
    checked?: boolean;
    disabled?: boolean;
    keepOpen?: boolean;
    danger?: boolean;
    onclick?: (e: MouseEvent) => void;
    lead?: Snippet;
  } = $props();
</script>

<button
  type="button"
  role={checked === undefined ? 'menuitem' : 'menuitemradio'}
  aria-checked={checked}
  aria-disabled={disabled}
  tabindex="-1"
  class="mi"
  class:danger
  class:on={checked}
  data-close={keepOpen ? undefined : ''}
  onclick={(e) => !disabled && onclick?.(e)}
  use:ripple
>
  {#if lead}{@render lead()}{:else if icon}<Icon name={icon} size={20} />{/if}
  <span class="lbl">{label}</span>
  {#if trailing}<span class="trail">{trailing}</span>{/if}
  {#if checked}<Icon name="check" size={20} class="chk" />{/if}
</button>

<style>
  .mi {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 44px;
    padding: 0 16px 0 14px;
    border: none;
    background: transparent;
    color: var(--md-on-surface);
    text-align: start;
    font-size: 14px;
    outline: none;
  }
  .mi:focus-visible::before {
    opacity: 0.12 !important;
  }
  .mi :global(.icon) {
    color: var(--md-on-surface-variant);
  }
  .lbl {
    flex: 1;
    white-space: nowrap;
  }
  .trail {
    color: var(--md-on-surface-variant);
    font-size: 12px;
    font-family: var(--mono);
  }
  .on {
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
  }
  .on :global(.chk) {
    color: var(--md-on-secondary-container);
  }
  .danger,
  .danger :global(.icon) {
    color: var(--md-error);
  }
  [aria-disabled='true'] {
    opacity: 0.38;
    cursor: default;
  }
</style>
