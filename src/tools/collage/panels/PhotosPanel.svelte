<script lang="ts">
  import { collage } from '../store.svelte';
  import { photoDrag } from '../drag.svelte';
  import { t } from '../../../lib/i18n/index.svelte';
  import { pickFiles } from '../../../lib/images.svelte';
  import Button from '../../../lib/components/Button.svelte';
  import Icon from '../../../lib/components/Icon.svelte';
  import { ripple, tooltip } from '../../../lib/actions';

  const used = $derived.by(() => {
    void collage.doc.slots;
    return collage.usedImages();
  });
  const unused = $derived(collage.images.filter((i) => !used.has(i.id)));

  async function add() {
    collage.addFiles(await pickFiles(true));
  }
  function placeUnused() {
    collage.place(unused.map((i) => i.id));
  }
  function tap(id: string) {
    const s = collage.selection;
    const target = s?.type === 'cell' ? s.id : collage.cellIds.find((c) => !collage.doc.slots[c]?.img);
    if (target) {
      collage.setSlotImage(target, id);
      collage.selection = { type: 'cell', id: target };
      collage.commit(true);
    } else collage.place([id]);
  }
</script>

<section class="panel">
  <div class="actions">
    <Button icon="add_photo_alternate" onclick={add}>{t('photos.add')}</Button>
    {#if unused.length}
      <Button variant="tonal" icon="auto_awesome_mosaic" onclick={placeUnused}>{t('photos.placeAll', { n: unused.length })}</Button>
    {/if}
  </div>

  {#if collage.images.length === 0}
    <button class="empty" onclick={add} use:ripple>
      <Icon name="photo_library" size={40} />
      <span class="t-title-s">{t('photos.emptyTitle')}</span>
      <span class="t-body-s">{t('photos.emptyHint')}</span>
    </button>
  {:else}
    <p class="caption t-body-s">{t('photos.dragHint')}</p>
    <ul class="tray">
      {#each collage.images as img (img.id)}
        <li class:used={used.has(img.id)} class:dragging={photoDrag.img === img.id && !photoDrag.from}>
          <button
            class="ph"
            aria-label={img.name}
            onpointerdown={(e) => e.button === 0 && photoDrag.start(e, img.id)}
            onclick={() => !photoDrag.justEnded && tap(img.id)}
            use:tooltip={`${img.name} · ${img.w}×${img.h}`}
          >
            <img src={img.thumb} alt="" draggable="false" />
          </button>
          {#if used.has(img.id)}<span class="badge" aria-label={t('photos.inUse')}><Icon name="check" size={14} /></span>{/if}
          <button class="rm" aria-label={t('photos.remove')} onclick={() => collage.removeImage(img.id)} use:tooltip={t('photos.remove')}>
            <Icon name="close" size={14} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .panel {
    display: grid;
    gap: 12px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .caption {
    margin: 0;
    color: var(--md-on-surface-variant);
  }
  .empty {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 28px 16px;
    border: 2px dashed var(--md-outline-variant);
    border-radius: var(--shape-lg);
    background: transparent;
    color: var(--md-on-surface-variant);
    text-align: center;
    transition: border-radius 350ms var(--ease-spring);
  }
  .empty:active {
    border-radius: var(--shape-xl);
  }
  .empty :global(.icon) {
    color: var(--md-primary);
  }
  .tray {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    position: relative;
    aspect-ratio: 1;
    animation: in 300ms var(--ease-spring) backwards;
  }
  @keyframes in {
    from {
      opacity: 0;
      scale: 0.7;
    }
  }
  .ph {
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: var(--shape-md);
    overflow: hidden;
    background: var(--md-surface-container-highest);
    cursor: grab;
    touch-action: none;
    transition:
      border-radius 350ms var(--ease-spring),
      scale 350ms var(--ease-spring);
  }
  .ph:active {
    border-radius: var(--shape-xl);
    scale: 0.95;
  }
  .ph img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }
  .used .ph img {
    opacity: 0.6;
  }
  .dragging {
    opacity: 0.4;
  }
  .badge {
    position: absolute;
    left: 4px;
    bottom: 4px;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--md-primary);
    color: var(--md-on-primary);
    pointer-events: none;
  }
  .rm {
    position: absolute;
    top: 4px;
    right: 4px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: color-mix(in srgb, var(--md-inverse-surface) 80%, transparent);
    color: var(--md-inverse-on-surface);
    opacity: 0;
    transition: opacity 150ms linear;
  }
  li:hover .rm,
  .rm:focus-visible {
    opacity: 1;
  }
  @media (hover: none) {
    .rm {
      opacity: 0.9;
    }
  }
</style>
