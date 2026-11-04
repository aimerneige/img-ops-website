<script lang="ts">
  import { snackbar, confirmer } from '../feedback.svelte';
  import Dialog from './Dialog.svelte';
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import Icon from './Icon.svelte';
  import { t } from '../i18n/index.svelte';

  let timers = new Map<number, number>();
  $effect(() => {
    for (const s of snackbar.queue) {
      if (!timers.has(s.id)) timers.set(s.id, window.setTimeout(() => snackbar.dismiss(s.id), s.duration));
    }
  });

  let confirmOpen = $state(false);
  $effect(() => {
    confirmOpen = !!confirmer.current;
  });

  const slide = (_n: Element) => ({
    duration: 320,
    css: (t: number) => {
      const e = 1 - Math.pow(1 - t, 3);
      return `opacity:${t};transform:translateY(${(1 - e) * 24}px) scale(${0.96 + 0.04 * e})`;
    },
  });
</script>

<div class="snack-host" aria-live="polite">
  {#each snackbar.queue as s (s.id)}
    <div class="snack" class:error={s.error} transition:slide>
      {#if s.icon}<Icon name={s.icon} size={20} />{/if}
      <span class="msg">{s.message}</span>
      {#if s.action}
        <button
          class="act"
          onclick={() => {
            s.onAction?.();
            snackbar.dismiss(s.id);
          }}>{s.action}</button
        >
      {/if}
      <IconButton icon="close" size="xs" label={t('common.dismiss')} tipless onclick={() => snackbar.dismiss(s.id)} />
    </div>
  {/each}
</div>

{#if confirmer.current}
  {@const c = confirmer.current}
  <Dialog bind:open={confirmOpen} title={c.title} icon={c.icon} onclose={() => confirmer.answer(false)}>
    <p style="margin:0">{c.message}</p>
    {#snippet actions()}
      <Button variant="text" onclick={() => confirmer.answer(false)}>{c.cancel}</Button>
      <Button variant={c.danger ? 'danger' : 'filled'} onclick={() => confirmer.answer(true)}>{c.confirm}</Button>
    {/snippet}
  </Dialog>
{/if}

<style>
  .snack-host {
    position: fixed;
    left: 50%;
    bottom: calc(24px + var(--snack-offset, 0px));
    translate: -50% 0;
    z-index: 980;
    display: grid;
    gap: 8px;
    width: max-content;
    max-width: calc(100vw - 32px);
  }
  .snack {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 4px 4px 4px 16px;
    border-radius: var(--shape-sm);
    background: var(--md-inverse-surface);
    color: var(--md-inverse-on-surface);
    box-shadow: var(--elev-3);
  }
  .snack :global(.ib) {
    color: var(--md-inverse-on-surface);
  }
  .snack.error {
    background: var(--md-error-container);
    color: var(--md-on-error-container);
  }
  .snack.error :global(.ib) {
    color: var(--md-on-error-container);
  }
  .msg {
    flex: 1;
    padding: 6px 0;
  }
  .act {
    height: 36px;
    padding: 0 12px;
    border: none;
    border-radius: 18px;
    background: transparent;
    color: var(--md-inverse-primary);
    font-weight: 500;
  }
  .act:hover {
    background: color-mix(in srgb, var(--md-inverse-primary) 12%, transparent);
  }
</style>
