<script lang="ts">
  import { collage } from './store.svelte';
  import { outputSize, renderBlob } from './exporter.svelte';
  import { t, i18n } from '../../lib/i18n/index.svelte';
  import { snackbar } from '../../lib/feedback.svelte';
  import { canCopyImage, copyPng, downloadBlob, formatBytes, stamp, type Format } from '../../lib/export';
  import Button from '../../lib/components/Button.svelte';
  import IconButton from '../../lib/components/IconButton.svelte';
  import Popover from '../../lib/components/Popover.svelte';
  import Segmented from '../../lib/components/Segmented.svelte';
  import Slider from '../../lib/components/Slider.svelte';

  let { compact = false }: { compact?: boolean } = $props();

  let busy = $state(false);
  let copying = $state(false);
  let open = $state(false);
  let tuneBtn = $state<HTMLElement>();
  const s = $derived(collage.exportSettings);
  const dims = $derived.by(() => {
    void $state.snapshot(collage.doc);
    void s.size;
    return outputSize(s.size);
  });
  const save = () => collage.saveExportSettings();

  export async function download() {
    if (busy) return;
    if (collage.filledCount === 0) {
      snackbar.show(t('export.nothing'), { icon: 'info' });
      return;
    }
    busy = true;
    try {
      await new Promise((r) => setTimeout(r, 30));
      const { blob, w, h } = await renderBlob();
      const ext = s.format === 'jpeg' ? 'jpg' : s.format;
      downloadBlob(blob, `tessera-${stamp()}.${ext}`);
      snackbar.show(t('export.saved', { w, h, size: formatBytes(blob.size) }), { icon: 'check_circle' });
    } catch {
      snackbar.show(t('export.failed'), { error: true });
    } finally {
      busy = false;
    }
  }
  export async function copy() {
    if (copying) return;
    if (!canCopyImage()) {
      snackbar.show(t('export.copyUnsupported'), { error: true });
      return;
    }
    if (collage.filledCount === 0) {
      snackbar.show(t('export.nothing'), { icon: 'info' });
      return;
    }
    copying = true;
    try {
      await copyPng(renderBlob('png', 1).then((r) => r.blob));
      snackbar.show(t('export.copied'), { icon: 'check_circle' });
    } catch {
      snackbar.show(t('export.copyFailed'), { error: true });
    } finally {
      copying = false;
    }
  }
</script>

<div class="export">
  <IconButton icon="content_copy" variant="tonal" label="{t('export.copy')} (Ctrl+Shift+C)" disabled={copying} onclick={copy} />
  <IconButton icon="tune" variant="tonal" label={t('export.settings')} bind:el={tuneBtn} expanded={open} onclick={() => (open = !open)} />
  <Button icon="download" loading={busy} onclick={download} tip="Ctrl+S">
    {compact ? '' : t('export.download')}
  </Button>
</div>

<Popover bind:open anchor={tuneBtn} placement="bottom-end" label={t('export.settings')} width="320px">
  <div class="pane">
    <h3 class="t-title-m">{t('export.settings')}</h3>
    <div class="field">
      <span class="t-label-m lbl">{t('export.format')}</span>
      <Segmented
        label={t('export.format')}
        bind:value={s.format}
        onchange={save}
        options={[
          { value: 'jpeg' as Format, label: 'JPG' },
          { value: 'png' as Format, label: 'PNG' },
          { value: 'webp' as Format, label: 'WebP' },
        ]}
      />
      <span class="t-body-s hint">{t(`export.formatHint.${s.format}`)}</span>
    </div>
    {#if s.format !== 'png'}
      <Slider label={t('export.quality')} bind:value={s.quality} min={0.5} max={1} step={0.01} format={(v) => String(Math.round(v * 100))} unit="%" oncommit={save} />
    {/if}
    <div class="field">
      <span class="t-label-m lbl">{t('export.size')}</span>
      <Segmented
        label={t('export.size')}
        bind:value={s.size}
        onchange={save}
        dense
        options={[
          { value: 1080, label: '1080' },
          { value: 2048, label: '2K' },
          { value: 4096, label: '4K' },
          { value: 0, label: t('export.native') },
        ]}
      />
      <span class="t-body-s hint">{t('export.output', { w: i18n.n(dims.w), h: i18n.n(dims.h) })}{dims.scaled ? ' · ' + t('export.capped') : ''}</span>
    </div>
  </div>
</Popover>

<style>
  .export {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pane {
    display: grid;
    gap: 18px;
    padding: 20px;
  }
  h3 {
    margin: 0;
  }
  .field {
    display: grid;
    gap: 8px;
  }
  .lbl,
  .hint {
    color: var(--md-on-surface-variant);
  }
</style>
