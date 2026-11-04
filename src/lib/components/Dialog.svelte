<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { IconName } from '../icons';
  import Icon from './Icon.svelte';
  import { portal } from '../actions';

  let {
    open = $bindable(),
    title,
    icon,
    children,
    actions,
    wide = false,
    onclose,
  }: {
    open: boolean;
    title: string;
    icon?: IconName;
    children: Snippet;
    actions?: Snippet;
    wide?: boolean;
    onclose?: () => void;
  } = $props();

  let prevFocus: HTMLElement | null = null;

  function close() {
    open = false;
    onclose?.();
  }

  function trap(node: HTMLElement) {
    prevFocus = document.activeElement as HTMLElement;
    requestAnimationFrame(() => {
      (node.querySelector<HTMLElement>('[data-autofocus]') ?? node.querySelector<HTMLElement>('button'))?.focus();
    });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
      if (e.key !== 'Tab') return;
      const f = [...node.querySelectorAll<HTMLElement>('button, [href], input, textarea, [tabindex="0"]')];
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', key);
    return {
      destroy() {
        node.removeEventListener('keydown', key);
        prevFocus?.focus?.({ preventScroll: true });
      },
    };
  }

  const fade = () => ({ duration: 200, css: (t: number) => `opacity:${t}` });
  const rise = () => ({
    duration: 380,
    css: (t: number) => {
      const e = 1 - Math.pow(1 - t, 4);
      return `opacity:${Math.min(1, t * 1.6)};transform:translateY(${(1 - e) * 24}px) scale(${0.94 + 0.06 * e})`;
    },
  });
</script>

{#if open}
  <div class="layer" use:portal>
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div class="scrim" transition:fade onclick={close}></div>
    <div class="dialog" class:wide role="dialog" aria-modal="true" aria-label={title} use:trap transition:rise>
      {#if icon}<span class="hero"><Icon name={icon} /></span>{/if}
      <h2 class="t-headline-s" class:center={!!icon}>{title}</h2>
      <div class="body">{@render children()}</div>
      {#if actions}<div class="actions">{@render actions()}</div>{/if}
    </div>
  </div>
{/if}

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 950;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--md-scrim) 40%, transparent);
  }
  .dialog {
    position: relative;
    width: min(100%, 400px);
    max-height: calc(100vh - 48px);
    overflow: auto;
    padding: 24px;
    border-radius: var(--shape-xl);
    background: var(--md-surface-container-high);
    color: var(--md-on-surface);
    box-shadow: var(--elev-3);
    --panel-bg: var(--md-surface-container-high);
  }
  .wide {
    width: min(100%, 560px);
  }
  .hero {
    display: flex;
    justify-content: center;
    color: var(--md-secondary);
    margin-bottom: 16px;
  }
  h2 {
    margin: 0 0 16px;
    color: var(--md-on-surface);
  }
  h2.center {
    text-align: center;
  }
  .body {
    color: var(--md-on-surface-variant);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
  }
</style>
