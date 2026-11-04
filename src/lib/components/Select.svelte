<script lang="ts" generics="T extends string | number">
  import Icon from './Icon.svelte';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';
  import { ripple } from '../actions';

  let {
    value = $bindable(),
    options,
    label,
    onchange,
  }: { value: T; options: { value: T; label: string; sub?: string }[]; label: string; onchange?: (v: T) => void } = $props();

  let open = $state(false);
  let btn = $state<HTMLButtonElement>();
  const current = $derived(options.find((o) => o.value === value));
</script>

<button
  bind:this={btn}
  type="button"
  class="sel"
  class:open
  aria-haspopup="listbox"
  aria-expanded={open}
  onclick={() => (open = !open)}
  onkeydown={(e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      open = true;
    }
  }}
  use:ripple
>
  <span class="lbl">{label}</span>
  <span class="val">{current?.label ?? ''}</span>
  <span class="arrow"><Icon name="arrow_drop_down" /></span>
</button>
<Menu bind:open anchor={btn} width={btn ? `${btn.offsetWidth}px` : undefined} label={label}>
  {#each options as o (o.value)}
    <MenuItem
      label={o.label}
      trailing={o.sub}
      checked={o.value === value}
      onclick={() => {
        value = o.value;
        onchange?.(o.value);
      }}
    />
  {/each}
</Menu>

<style>
  .sel {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 48px;
    padding: 0 8px 0 14px;
    border: none;
    border-radius: var(--shape-xs);
    outline: 1px solid var(--md-outline);
    outline-offset: -1px;
    background: transparent;
    text-align: start;
    color: var(--md-on-surface);
    font-size: 15px;
  }
  .sel:hover {
    outline-color: var(--md-on-surface);
  }
  .sel.open,
  .sel:focus-visible {
    outline: 2px solid var(--md-primary);
    outline-offset: -2px;
  }
  .lbl {
    position: absolute;
    left: 10px;
    top: 0;
    translate: 0 -50%;
    padding: 0 4px;
    font-size: 12px;
    line-height: 16px;
    color: var(--md-on-surface-variant);
    background: var(--panel-bg, var(--md-surface-container-low));
  }
  .open .lbl {
    color: var(--md-primary);
  }
  .val {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .arrow {
    display: inline-flex;
    color: var(--md-on-surface-variant);
    transition: rotate 300ms var(--ease-spring);
  }
  .open .arrow {
    rotate: 180deg;
  }
</style>
