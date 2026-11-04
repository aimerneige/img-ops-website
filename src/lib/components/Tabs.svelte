<script lang="ts" generics="T extends string">
  import type { IconName } from '../icons';
  import Icon from './Icon.svelte';
  import { ripple } from '../actions';

  let {
    tabs,
    value = $bindable(),
    label,
  }: { tabs: { value: T; label: string; icon?: IconName }[]; value: T; label: string } = $props();

  let list: HTMLDivElement;
  let ind = $state({ x: 0, w: 0 });

  $effect(() => {
    void value;
    void tabs.map((t) => t.label).join();
    requestAnimationFrame(() => {
      const el = list?.querySelector<HTMLElement>('[aria-selected=true] .lbl');
      if (!el) return;
      const lr = list.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      ind = { x: r.left - lr.left + list.scrollLeft, w: r.width };
      el.closest('button')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  });

  function key(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.value === value);
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
    if (n < 0 || n >= tabs.length) return;
    value = tabs[n].value;
    list.querySelectorAll<HTMLElement>('[role=tab]')[n]?.focus();
  }
</script>

<div class="tabs" role="tablist" aria-label={label} bind:this={list} tabindex="-1" onkeydown={key}>
  {#each tabs as tab (tab.value)}
    <button
      type="button"
      role="tab"
      aria-selected={tab.value === value}
      tabindex={tab.value === value ? 0 : -1}
      onclick={() => (value = tab.value)}
      use:ripple
    >
      <span class="lbl">
        {#if tab.icon}<Icon name={tab.icon} size={20} />{/if}
        <span>{tab.label}</span>
      </span>
    </button>
  {/each}
  <span class="indicator" style:transform="translateX({ind.x}px)" style:width="{ind.w}px"></span>
</div>

<style>
  .tabs {
    position: relative;
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--md-surface-variant);
    outline: none;
  }
  button {
    flex: 1 0 auto;
    height: 48px;
    padding: 0 12px;
    border: none;
    background: transparent;
    color: var(--md-on-surface-variant);
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
  }
  .lbl {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  [aria-selected='true'] {
    color: var(--md-primary);
  }
  .indicator {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: var(--md-primary);
    transition:
      transform 400ms var(--ease-spring),
      width 400ms var(--ease-spring);
  }
</style>
