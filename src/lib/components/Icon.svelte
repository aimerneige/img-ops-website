<script lang="ts">
  import { icons, type IconName } from '../icons';
  let { name, size = 24, class: cls = '' }: { name: IconName; size?: number; class?: string } = $props();
</script>

<span class="icon {cls}" style:--s="{size}px" aria-hidden="true">{@html icons[name]}</span>

<style>
  .icon {
    display: inline-flex;
    width: var(--s);
    height: var(--s);
    flex: none;
    line-height: 0;
  }
  .icon :global(svg) {
    width: 100%;
    height: 100%;
    fill: currentColor;
  }
</style>
