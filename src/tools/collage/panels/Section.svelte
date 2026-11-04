<script lang="ts">
  import type { Snippet } from 'svelte';
  let { title, children, aside }: { title: string; children: Snippet; aside?: Snippet } = $props();
</script>

<section>
  <header>
    <h3 class="t-title-s">{title}</h3>
    {#if aside}{@render aside()}{/if}
  </header>
  <div class="body">{@render children()}</div>
</section>

<style>
  section {
    display: grid;
    gap: 12px;
    padding-bottom: 20px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--md-outline-variant);
  }
  section:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 32px;
  }
  h3 {
    margin: 0;
    color: var(--md-on-surface-variant);
  }
  .body {
    display: grid;
    gap: 14px;
  }
</style>
