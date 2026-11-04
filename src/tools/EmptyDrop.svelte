<script lang="ts">
  import Icon from '../lib/components/Icon.svelte';
  import Button from '../lib/components/Button.svelte';
  import { t } from '../lib/i18n/index.svelte';
  let { title, hint, onpick, multiple = true }: { title: string; hint: string; onpick: () => void; multiple?: boolean } = $props();
</script>

<div class="empty">
  <div class="art" aria-hidden="true">
    <span class="tile a"></span><span class="tile b"></span><span class="tile c"></span>
    <Icon name="add_photo_alternate" size={36} />
  </div>
  <h2 class="t-title-l">{title}</h2>
  <p class="t-body-m">{hint}</p>
  <Button icon="upload" onclick={onpick}>{multiple ? t('photos.add') : t('photos.addOne')}</Button>
  <p class="t-body-s small">{t('drop.anywhere')}</p>
</div>

<style>
  .empty {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 8px;
    min-height: 100%;
    padding: 32px 16px;
    text-align: center;
    color: var(--md-on-surface-variant);
  }
  h2 {
    margin: 8px 0 0;
    color: var(--md-on-surface);
  }
  p {
    margin: 0 0 8px;
    max-width: 360px;
  }
  .small {
    margin-top: 4px;
  }
  .art {
    position: relative;
    display: grid;
    place-items: center;
    width: 120px;
    height: 100px;
    color: var(--md-on-primary-container);
  }
  .art :global(.icon) {
    position: relative;
    z-index: 1;
  }
  .tile {
    position: absolute;
    border-radius: 18px;
  }
  .a {
    inset: 10px 30px 10px 10px;
    background: var(--md-primary-container);
    rotate: -8deg;
    animation: float 5s ease-in-out infinite;
  }
  .b {
    width: 40px;
    height: 40px;
    right: 6px;
    top: 4px;
    background: var(--md-tertiary-container);
    border-radius: 50%;
    animation: float 6s ease-in-out -2s infinite;
  }
  .c {
    width: 34px;
    height: 34px;
    right: 14px;
    bottom: 2px;
    background: var(--md-secondary-container);
    border-radius: 10px;
    rotate: 12deg;
    animation: float 4.5s ease-in-out -1s infinite;
  }
  @keyframes float {
    50% {
      translate: 0 -6px;
    }
  }
</style>
