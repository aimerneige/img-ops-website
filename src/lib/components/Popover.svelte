<script lang="ts">
  import type { Snippet } from 'svelte';
  import { portal, place, type Placement } from '../actions';

  interface Props {
    open: boolean;
    anchor: HTMLElement | undefined;
    placement?: Placement;
    role?: string;
    label?: string;
    width?: string;
    class?: string;
    /** Move focus into the surface when it opens. */
    autofocus?: boolean;
    children: Snippet;
    onclose?: () => void;
    el?: HTMLDivElement;
  }
  let {
    open = $bindable(),
    anchor,
    placement = 'bottom-start',
    role = 'dialog',
    label,
    width,
    class: cls = '',
    autofocus = true,
    children,
    onclose,
    el = $bindable(),
  }: Props = $props();

  function close(returnFocus = true) {
    open = false;
    onclose?.();
    if (returnFocus) anchor?.focus({ preventScroll: true });
  }

  function surface(node: HTMLDivElement) {
    const reposition = () => anchor && place(anchor.getBoundingClientRect(), node, placement);
    reposition();
    const ro = new ResizeObserver(reposition);
    ro.observe(node);
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (node.contains(t) || anchor?.contains(t)) return;
      // Nested popovers (e.g. a menu inside a popover) live in their own portals.
      if ((t as Element).closest?.('.md-popover') && (t as Element).closest('.md-popover') !== node) return;
      close(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    setTimeout(() => window.addEventListener('pointerdown', outside, true));
    node.addEventListener('keydown', key);
    if (autofocus) {
      requestAnimationFrame(() => {
        const f = node.querySelector<HTMLElement>('[data-autofocus], [role=menuitemradio][aria-checked=true], [role=menuitem], button, input, [tabindex="0"]');
        f?.focus({ preventScroll: true });
      });
    }
    return {
      destroy() {
        ro.disconnect();
        window.removeEventListener('resize', reposition);
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('pointerdown', outside, true);
      },
    };
  }

  function pop(node: HTMLElement) {
    return {
      duration: 260,
      css: (t: number) => {
        const e = 1 - Math.pow(1 - t, 3);
        return `opacity:${Math.min(1, t * 2)};transform:scaleY(${0.6 + 0.4 * e}) scaleX(${0.92 + 0.08 * e});`;
      },
    };
  }
</script>

{#if open}
  <div
    bind:this={el}
    class="md-popover {cls}"
    {role}
    aria-label={label}
    style:width
    use:portal
    use:surface
    transition:pop
  >
    {@render children()}
  </div>
{/if}

<style>
  .md-popover {
    position: fixed;
    z-index: 900;
    min-width: 112px;
    overflow: auto;
    border-radius: var(--shape-md);
    background: var(--md-surface-container);
    color: var(--md-on-surface);
    box-shadow: var(--elev-2);
    --panel-bg: var(--md-surface-container);
  }
</style>
