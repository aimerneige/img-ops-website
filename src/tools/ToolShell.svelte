<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    width,
    side,
    stage,
    toolbar,
    sideLabel,
  }: { width: number; side: Snippet; stage: Snippet; toolbar: Snippet; sideLabel: string } = $props();
  const compact = $derived(width < 840);
</script>

<div class="shell" class:compact>
  <aside class="side" aria-label={sideLabel}>{@render side()}</aside>
  <main class="main">
    <div class="toolbar">{@render toolbar()}</div>
    <div class="stage">{@render stage()}</div>
  </main>
</div>

<style>
  .shell {
    display: flex;
    height: 100%;
    min-height: 0;
  }
  .side {
    width: 340px;
    flex: none;
    overflow-y: auto;
    padding: 16px;
    background: var(--md-surface-container-low);
    border-right: 1px solid var(--md-outline-variant);
    --panel-bg: var(--md-surface-container-low);
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--md-outline-variant);
    flex: none;
    min-height: 57px;
  }
  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: auto;
    background-color: var(--md-surface-container-lowest);
    background-image: radial-gradient(color-mix(in srgb, var(--md-on-surface) 9%, transparent) 1px, transparent 1px);
    background-size: 18px 18px;
  }
  .compact {
    flex-direction: column-reverse;
    overflow-y: auto;
    height: auto;
    min-height: 100%;
  }
  .compact .side {
    width: auto;
    overflow: visible;
    border-right: none;
    border-top: 1px solid var(--md-outline-variant);
  }
  .compact .main {
    height: 62vh;
    flex: none;
  }
</style>
