<script lang="ts">
  let { size = 32 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" class="logo">
  <rect x="2" y="2" width="16" height="16" rx="5" class="a" />
  <rect x="20" y="2" width="10" height="10" rx="5" class="b" />
  <rect x="2" y="20" width="10" height="10" rx="3" class="c" />
  <rect x="14" y="14" width="16" height="16" rx="8" class="d" />
</svg>

<style>
  .logo rect {
    transition: rx 400ms var(--ease-spring), transform 400ms var(--ease-spring);
    transform-box: fill-box;
    transform-origin: center;
  }
  .a { fill: var(--md-primary); }
  .b { fill: var(--md-tertiary); }
  .c { fill: var(--md-secondary); }
  .d { fill: var(--md-primary-container); stroke: var(--md-primary); stroke-width: 2; }
  :global(a:hover) > .logo .a { rx: 8; }
  :global(a:hover) > .logo .d { rx: 4; transform: rotate(8deg); }
</style>
