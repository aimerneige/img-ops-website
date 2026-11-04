<script lang="ts" generics="T extends string | number">
  import type { IconName } from '../icons';
  import Icon from './Icon.svelte';
  import { ripple, tooltip } from '../actions';

  interface Option {
    value: T;
    label?: string;
    icon?: IconName;
    tip?: string;
  }
  let {
    options,
    value = $bindable(),
    label,
    dense = false,
    onchange,
  }: { options: Option[]; value: T; label: string; dense?: boolean; onchange?: (v: T) => void } = $props();
</script>

<div class="seg" class:dense role="radiogroup" aria-label={label}>
  {#each options as o (o.value)}
    {@const on = o.value === value}
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={o.label ?? o.tip}
      class:on
      class:icon-only={!o.label}
      onclick={() => {
        value = o.value;
        onchange?.(o.value);
      }}
      use:ripple
      use:tooltip={o.tip}
    >
      <span class="check" class:show={on && !o.icon && !!o.label}><Icon name="check" size={18} /></span>
      {#if o.icon}<Icon name={o.icon} size={18} />{/if}
      {#if o.label}<span class="lbl">{o.label}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .seg {
    display: flex;
    width: 100%;
    height: 40px;
    border-radius: 20px;
    outline: 1px solid var(--md-outline);
    outline-offset: -1px;
    overflow: hidden;
  }
  .dense {
    height: 36px;
  }
  button {
    flex: 1 1 0;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 10px;
    border: none;
    border-left: 1px solid var(--md-outline);
    background: transparent;
    color: var(--md-on-surface);
    font-size: 13px;
    font-weight: 500;
    transition: background-color 250ms var(--ease-standard);
  }
  button:first-child {
    border-left: none;
  }
  .lbl {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  button.on {
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
  }
  .check {
    display: inline-flex;
    width: 0;
    overflow: hidden;
    margin-right: -6px;
    transition:
      width 300ms var(--ease-spring),
      margin 300ms var(--ease-spring);
  }
  .check.show {
    width: 18px;
    margin-right: 0;
  }
  button :global(.icon) {
    transition: transform 350ms var(--ease-spring);
  }
  button:active :global(.icon) {
    transform: scale(0.85);
  }
</style>
