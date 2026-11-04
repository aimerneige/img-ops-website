<script lang="ts">
  import { collage, type Tool } from './store.svelte';
  import Stage from './Stage.svelte';
  import ExportControls from './ExportControls.svelte';
  import LayoutPanel from './panels/LayoutPanel.svelte';
  import PhotosPanel from './panels/PhotosPanel.svelte';
  import CanvasPanel from './panels/CanvasPanel.svelte';
  import StylePanel from './panels/StylePanel.svelte';
  import WatermarkPanel from './panels/WatermarkPanel.svelte';
  import Tabs from '../../lib/components/Tabs.svelte';
  import IconButton from '../../lib/components/IconButton.svelte';
  import Icon from '../../lib/components/Icon.svelte';
  import Dialog from '../../lib/components/Dialog.svelte';
  import Button from '../../lib/components/Button.svelte';
  import { t } from '../../lib/i18n/index.svelte';
  import { confirmer } from '../../lib/feedback.svelte';
  import { filesFromClipboard, isImageFile } from '../../lib/images.svelte';
  import { ripple } from '../../lib/actions';
  import type { IconName } from '../../lib/icons';
  import { emptySlot } from './model';

  let { width }: { width: number } = $props();

  type Panel = 'layout' | 'photos' | 'canvas' | 'style' | 'watermark';
  const PANELS: { value: Panel; icon: IconName }[] = [
    { value: 'layout', icon: 'auto_awesome_mosaic' },
    { value: 'photos', icon: 'photo_library' },
    { value: 'canvas', icon: 'aspect_ratio' },
    { value: 'style', icon: 'rounded_corner' },
    { value: 'watermark', icon: 'branding_watermark' },
  ];
  const tabsFor = (list: Panel[]) =>
    PANELS.filter((p) => list.includes(p.value)).map((p) => ({ ...p, label: t(`panel.${p.value}`) }));

  const mode = $derived(width >= 1280 ? 'wide' : width >= 840 ? 'medium' : 'compact');
  let left = $state<Panel>('layout');
  let right = $state<Panel>('canvas');
  let all = $state<Panel>('layout');
  let sheet = $state<Panel | null>(null);

  // When photos arrive for the first time, surface the photo panel's state.
  let shortcutsOpen = $state(false);
  let exporter = $state<ExportControls>();

  const TOOLS: { value: Tool; icon: IconName; key: string }[] = [
    { value: 'select', icon: 'arrow_selector_tool', key: 'V' },
    { value: 'text', icon: 'text_fields', key: 'T' },
    { value: 'arrow', icon: 'north_east', key: 'A' },
    { value: 'rect', icon: 'rectangle', key: 'R' },
    { value: 'ellipse', icon: 'circle', key: 'E' },
  ];

  async function clearAll() {
    const ok = await confirmer.ask({
      title: t('clear.title'),
      message: t('clear.message'),
      confirm: t('clear.confirm'),
      cancel: t('common.cancel'),
      icon: 'delete_sweep',
      danger: true,
    });
    if (ok) collage.clearAll();
  }

  /* ───────── Keyboard ───────── */
  function typing(e: Event) {
    const el = e.target as HTMLElement;
    return el.closest('input, textarea, [contenteditable=true]') !== null;
  }
  function onKey(e: KeyboardEvent) {
    if (typing(e) || document.querySelector('[aria-modal=true]')) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    const sel = collage.selection;
    if (mod && k === 'z') {
      e.preventDefault();
      e.shiftKey ? collage.redo() : collage.undo();
      return;
    }
    if (mod && k === 'y') {
      e.preventDefault();
      collage.redo();
      return;
    }
    if (mod && k === 's') {
      e.preventDefault();
      exporter?.download();
      return;
    }
    if (mod && e.shiftKey && k === 'c') {
      e.preventDefault();
      exporter?.copy();
      return;
    }
    if (mod && k === 'd' && sel?.type === 'annot') {
      e.preventDefault();
      collage.duplicateAnnot(sel.id);
      return;
    }
    if (mod || e.altKey) return;
    if (e.key === '?') {
      shortcutsOpen = true;
      return;
    }
    const tool = TOOLS.find((x) => x.key.toLowerCase() === k);
    if (tool) {
      collage.tool = tool.value;
      return;
    }
    if (e.key === 'Escape') {
      if (collage.tool !== 'select') collage.tool = 'select';
      else collage.selection = null;
      return;
    }
    if (!sel) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (sel.type === 'annot') collage.removeAnnot(sel.id);
      else if (collage.doc.slots[sel.id]?.img) {
        collage.doc.slots[sel.id] = emptySlot();
        collage.commit(true);
      }
      return;
    }
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key]) {
      e.preventDefault();
      const [dx, dy] = arrows[e.key];
      if (sel.type === 'cell') {
        const s = collage.doc.slots[sel.id];
        if (!s?.img) return;
        const step = e.shiftKey ? 0.2 : 0.04;
        s.ox = Math.max(-1, Math.min(1, s.ox + dx * step));
        s.oy = Math.max(-1, Math.min(1, s.oy + dy * step));
      } else {
        const a = collage.annot(sel.id);
        if (!a) return;
        const step = e.shiftKey ? 0.02 : 0.003;
        if (a.kind === 'arrow') {
          a.x1 += dx * step; a.x2 += dx * step; a.y1 += dy * step; a.y2 += dy * step;
        } else {
          a.x += dx * step;
          a.y += dy * step;
        }
      }
      collage.commit();
      return;
    }
    if (sel.type === 'cell' && (e.key === '+' || e.key === '=' || e.key === '-')) {
      const s = collage.doc.slots[sel.id];
      if (!s?.img) return;
      s.zoom = Math.max(1, Math.min(6, s.zoom * (e.key === '-' ? 1 / 1.15 : 1.15)));
      collage.commit();
    }
  }

  function onPaste(e: ClipboardEvent) {
    if (typing(e)) return;
    const files = filesFromClipboard(e);
    if (!files.length) return;
    e.preventDefault();
    const sel = collage.selection;
    collage.addFiles(files, sel?.type === 'cell' ? sel.id : undefined);
  }

  /* ───────── Drop anywhere ───────── */
  let fileDepth = $state(0);
  const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  function dragEnter(e: DragEvent) {
    if (hasFiles(e)) fileDepth++;
  }
  function dragLeave(e: DragEvent) {
    if (hasFiles(e)) fileDepth = Math.max(0, fileDepth - 1);
  }
  function dragOver(e: DragEvent) {
    if (hasFiles(e)) e.preventDefault();
  }
  function drop(e: DragEvent) {
    fileDepth = 0;
    if (!hasFiles(e)) return;
    e.preventDefault();
    collage.addFiles([...(e.dataTransfer?.files ?? [])].filter(isImageFile));
  }
  $effect(() => {
    const reset = () => (fileDepth = 0);
    window.addEventListener('drop', reset, true);
    return () => window.removeEventListener('drop', reset, true);
  });

  const hint = $derived.by(() => {
    if (collage.tool !== 'select') return t(`hint.draw.${collage.tool}`);
    const s = collage.selection;
    if (s?.type === 'cell') return collage.doc.slots[s.id]?.img ? t('hint.cellFilled') : t('hint.cellEmpty');
    if (s?.type === 'annot') return t('hint.annot');
    return collage.images.length ? t('hint.idle') : t('hint.start');
  });
</script>

<svelte:window onkeydown={onKey} onpaste={onPaste} ondragenter={dragEnter} ondragleave={dragLeave} ondragover={dragOver} ondrop={drop} />

{#snippet panel(p: Panel)}
  {#if p === 'layout'}<LayoutPanel />
  {:else if p === 'photos'}<PhotosPanel />
  {:else if p === 'canvas'}<CanvasPanel />
  {:else if p === 'style'}<StylePanel />
  {:else}<WatermarkPanel />{/if}
{/snippet}

<div class="collage {mode}">
  {#if mode === 'wide'}
    <aside class="pane">
      <Tabs label={t('panel.label')} bind:value={left} tabs={tabsFor(['layout', 'photos'])} />
      <div class="pane-body">{@render panel(left)}</div>
    </aside>
  {/if}

  <main class="work">
    <div class="toolbar" role="toolbar" aria-label={t('toolbar.label')}>
      <div class="group">
        <IconButton icon="undo" size="sm" label="{t('toolbar.undo')} (Ctrl+Z)" disabled={!collage.past.length} onclick={() => collage.undo()} />
        <IconButton icon="redo" size="sm" label="{t('toolbar.redo')} (Ctrl+Shift+Z)" disabled={!collage.future.length} onclick={() => collage.redo()} />
      </div>
      <div class="tools" role="radiogroup" aria-label={t('toolbar.tools')}>
        {#each TOOLS as tool (tool.value)}
          <IconButton
            icon={tool.icon}
            size="sm"
            label="{t(`tool.${tool.value}`)} ({tool.key})"
            selected={collage.tool === tool.value}
            onclick={() => (collage.tool = collage.tool === tool.value ? 'select' : tool.value)}
          />
        {/each}
      </div>
      <div class="group">
        <IconButton icon="shuffle" size="sm" label={t('toolbar.shuffle')} disabled={collage.filledCount < 2} onclick={() => collage.shuffle()} />
        <IconButton icon="delete_sweep" size="sm" label={t('toolbar.clear')} disabled={!collage.filledCount && !collage.doc.annots.length} onclick={clearAll} />
        {#if mode !== 'compact'}
          <IconButton icon="keyboard_alt" size="sm" label={t('shortcuts.title')} onclick={() => (shortcutsOpen = true)} />
        {/if}
      </div>
      <span class="spacer"></span>
      <ExportControls bind:this={exporter} compact={mode === 'compact'} />
    </div>

    <div class="stage-wrap">
      <Stage />
      {#if fileDepth > 0}
        <div class="drop-hint" aria-hidden="true">
          <Icon name="upload" size={32} />
          <span class="t-title-m">{t('drop.title')}</span>
          <span class="t-body-s">{t('drop.hint')}</span>
        </div>
      {/if}
      {#key hint}
        <p class="hint t-body-s" aria-live="polite">{hint}</p>
      {/key}
    </div>

    {#if mode === 'compact'}
      {#if sheet}
        <div class="sheet" role="region" aria-label={t(`panel.${sheet}`)}>
          <div class="sheet-head">
            <span class="handle-bar"></span>
            <span class="t-title-m">{t(`panel.${sheet}`)}</span>
            <IconButton icon="close" size="sm" label={t('common.close')} onclick={() => (sheet = null)} />
          </div>
          <div class="sheet-body">{@render panel(sheet)}</div>
        </div>
      {/if}
      <nav class="navbar" aria-label={t('panel.label')}>
        {#each PANELS as p (p.value)}
          <button class:on={sheet === p.value} aria-pressed={sheet === p.value} onclick={() => (sheet = sheet === p.value ? null : p.value)}>
            <span class="ind" use:ripple><Icon name={p.icon} /></span>
            <span class="t-label-m">{t(`panel.${p.value}`)}</span>
          </button>
        {/each}
      </nav>
    {/if}
  </main>

  {#if mode === 'wide'}
    <aside class="pane">
      <Tabs label={t('panel.label')} bind:value={right} tabs={tabsFor(['canvas', 'style', 'watermark'])} />
      <div class="pane-body">{@render panel(right)}</div>
    </aside>
  {:else if mode === 'medium'}
    <aside class="pane">
      <Tabs label={t('panel.label')} bind:value={all} tabs={tabsFor(['layout', 'photos', 'canvas', 'style', 'watermark']).map((x) => ({ ...x, label: x.label }))} />
      <div class="pane-body">{@render panel(all)}</div>
    </aside>
  {/if}
</div>

<Dialog bind:open={shortcutsOpen} title={t('shortcuts.title')} icon="keyboard_alt" wide>
  <dl class="keys">
    {#each [
      ['Ctrl Z', 'toolbar.undo'], ['Ctrl Shift Z', 'toolbar.redo'], ['Ctrl V', 'shortcuts.paste'],
      ['Ctrl S', 'export.download'], ['Ctrl Shift C', 'export.copy'], ['V T A R E', 'shortcuts.tools'],
      ['← ↑ → ↓', 'shortcuts.nudge'], ['+ −', 'shortcuts.zoom'], ['Del', 'common.delete'],
      ['Ctrl D', 'annot.duplicate'], ['Esc', 'shortcuts.escape'], ['?', 'shortcuts.title'],
    ] as [k, label] (k)}
      <dt>{#each k.split(' ') as part, i (i)}<kbd>{part}</kbd>{/each}</dt>
      <dd>{t(label as Parameters<typeof t>[0])}</dd>
    {/each}
  </dl>
  <p class="t-body-s mouse">{t('shortcuts.mouse')}</p>
  {#snippet actions()}
    <Button variant="text" onclick={() => (shortcutsOpen = false)}>{t('common.close')}</Button>
  {/snippet}
</Dialog>

<style>
  .collage {
    display: flex;
    height: 100%;
    min-height: 0;
    gap: 0;
  }
  .pane {
    width: 320px;
    flex: none;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--md-surface-container-low);
    --panel-bg: var(--md-surface-container-low);
  }
  .wide .pane:first-child {
    width: 300px;
    border-right: 1px solid var(--md-outline-variant);
  }
  .wide .pane:last-child,
  .medium .pane {
    border-left: 1px solid var(--md-outline-variant);
  }
  .medium .pane {
    width: 340px;
  }
  .pane-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    overscroll-behavior: contain;
  }
  .work {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--md-surface);
    border-bottom: 1px solid var(--md-outline-variant);
    overflow-x: auto;
    scrollbar-width: none;
    flex: none;
  }
  .group,
  .tools {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .tools {
    padding: 2px;
    border-radius: 20px;
    background: var(--md-surface-container-high);
  }
  .group + .tools,
  .tools + .group {
    margin-left: 6px;
  }
  .spacer {
    flex: 1;
    min-width: 8px;
  }
  .stage-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .hint {
    position: absolute;
    left: 50%;
    bottom: 10px;
    translate: -50% 0;
    max-width: calc(100% - 32px);
    margin: 0;
    padding: 4px 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--md-surface-container-high) 92%, transparent);
    color: var(--md-on-surface-variant);
    text-align: center;
    pointer-events: none;
    backdrop-filter: blur(6px);
    animation: hint-in 300ms var(--ease-emph-decel);
  }
  @keyframes hint-in {
    from {
      opacity: 0;
      translate: -50% 6px;
    }
  }
  .compact .hint {
    display: none;
  }
  .drop-hint {
    position: absolute;
    inset: 12px;
    z-index: 30;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 6px;
    border: 3px dashed var(--md-primary);
    border-radius: var(--shape-xl);
    background: color-mix(in srgb, var(--md-primary-container) 55%, transparent);
    color: var(--md-on-primary-container);
    pointer-events: none;
    animation: hint-in 200ms var(--ease-emph-decel);
  }
  /* Compact: bottom navigation + sheet */
  .navbar {
    display: flex;
    flex: none;
    height: 72px;
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--md-surface-container);
  }
  .navbar button {
    flex: 1;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 4px;
    border: none;
    background: transparent;
    color: var(--md-on-surface-variant);
    min-width: 0;
  }
  .navbar .t-label-m {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ind {
    display: grid;
    place-items: center;
    width: 56px;
    height: 32px;
    border-radius: 16px;
    transition:
      background-color 200ms linear,
      width 350ms var(--ease-spring);
  }
  .navbar .on {
    color: var(--md-on-surface);
  }
  .navbar .on .ind {
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
  }
  .navbar button:not(.on) .ind {
    width: 32px;
  }
  .sheet {
    flex: none;
    max-height: 48vh;
    display: flex;
    flex-direction: column;
    border-radius: var(--shape-xl) var(--shape-xl) 0 0;
    background: var(--md-surface-container-low);
    box-shadow: 0 -2px 12px rgb(0 0 0 / 0.12);
    animation: sheet-in 380ms var(--ease-emph-decel);
    --panel-bg: var(--md-surface-container-low);
  }
  @keyframes sheet-in {
    from {
      transform: translateY(40%);
      opacity: 0;
    }
  }
  .sheet-head {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 8px 4px 20px;
  }
  .handle-bar {
    position: absolute;
    top: 6px;
    left: 50%;
    width: 32px;
    height: 4px;
    translate: -50% 0;
    border-radius: 2px;
    background: var(--md-outline-variant);
  }
  .sheet-body {
    overflow-y: auto;
    padding: 8px 16px 16px;
    overscroll-behavior: contain;
  }
  .keys {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 20px;
    margin: 0;
    align-items: center;
  }
  dt {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  dd {
    margin: 0;
    color: var(--md-on-surface);
  }
  kbd {
    min-width: 26px;
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--md-surface-container-highest);
    box-shadow: inset 0 -2px 0 var(--md-outline-variant);
    font: 500 12px/20px var(--mono);
    text-align: center;
    color: var(--md-on-surface);
  }
  .mouse {
    margin: 16px 0 0;
  }
</style>
