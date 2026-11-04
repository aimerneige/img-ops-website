<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { IconName } from '../icons';
  import Icon from './Icon.svelte';
  import { ripple, tooltip } from '../actions';

  let {
    selected = false,
    icon,
    tip,
    onclick,
    children,
    sub,
  }: {
    selected?: boolean;
    icon?: IconName;
    tip?: string;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
    sub?: string;
  } = $props();
</script>

<button type="button" class="chip" class:selected aria-pressed={selected} {onclick} use:ripple use:tooltip={tip}>
  <span class="lead" class:show={selected || icon}>
    <Icon name={selected ? 'check' : (icon ?? 'check')} size={18} />
  </span>
  <span class="txt">{@render children()}</span>
  {#if sub}<span class="sub">{sub}</span>{/if}
</button>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 14px 0 10px;
    border: none;
    outline: 1px solid var(--md-outline-variant);
    outline-offset: -1px;
    border-radius: var(--shape-sm);
    background: transparent;
    color: var(--md-on-surface-variant);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    transition:
      background-color 200ms linear,
      border-radius 350ms var(--ease-spring),
      padding 300ms var(--ease-spring);
  }
  .chip:active {
    border-radius: 16px;
  }
  .lead {
    display: inline-flex;
    width: 0;
    margin-right: -6px;
    overflow: hidden;
    transition:
      width 300ms var(--ease-spring),
      margin 300ms var(--ease-spring);
  }
  .lead.show {
    width: 18px;
    margin-right: 0;
  }
  .chip:not(:has(.lead.show)) {
    padding-left: 14px;
  }
  .selected {
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
    outline-color: transparent;
  }
  .sub {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.72;
  }
</style>
