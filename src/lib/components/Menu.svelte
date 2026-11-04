<script lang="ts">
  import type { Snippet } from 'svelte';
  import Popover from './Popover.svelte';
  import type { Placement } from '../actions';

  let {
    open = $bindable(),
    anchor,
    placement = 'bottom-start',
    label,
    children,
    width,
  }: {
    open: boolean;
    anchor: HTMLElement | undefined;
    placement?: Placement;
    label?: string;
    children: Snippet;
    width?: string;
  } = $props();

  function nav(e: KeyboardEvent) {
    const items = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role^=menuitem]:not([aria-disabled=true])')];
    const i = items.indexOf(document.activeElement as HTMLElement);
    let n = -1;
    if (e.key === 'ArrowDown') n = (i + 1) % items.length;
    else if (e.key === 'ArrowUp') n = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    else if (e.key === 'Tab') open = false;
    if (n >= 0) {
      e.preventDefault();
      items[n].focus();
    }
  }
</script>

<Popover bind:open {anchor} {placement} role="menu" {label} {width}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="menu" onkeydown={nav} onclick={(e) => (e.target as Element).closest('[data-close]') && (open = false)}>
    {@render children()}
  </div>
</Popover>

<style>
  .menu {
    padding: 8px 0;
    display: grid;
  }
</style>
