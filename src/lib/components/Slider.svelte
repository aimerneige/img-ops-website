<script lang="ts">
  interface Props {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    label: string;
    unit?: string;
    disabled?: boolean;
    /** Formats the value shown in the editable chip / bubble. */
    format?: (v: number) => string;
    oncommit?: (v: number) => void;
  }
  let {
    value = $bindable(),
    min = 0,
    max = 100,
    step = 1,
    label,
    unit = '',
    disabled = false,
    format = (v) => String(Math.round(v * 100) / 100),
    oncommit,
  }: Props = $props();

  let track: HTMLDivElement;
  let dragging = $state(false);
  let editing = $state(false);
  let draft = $state('');
  const pct = $derived(((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100);
  const id = `sl-${Math.random().toString(36).slice(2, 8)}`;

  function snap(v: number) {
    const s = Math.round((v - min) / step) * step + min;
    const dec = (String(step).split('.')[1] ?? '').length;
    return Math.min(max, Math.max(min, Number(s.toFixed(dec))));
  }
  function fromPointer(e: PointerEvent) {
    const r = track.getBoundingClientRect();
    const ratio = (e.clientX - r.left) / r.width;
    value = snap(min + Math.min(1, Math.max(0, ratio)) * (max - min));
  }
  function down(e: PointerEvent) {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (track.querySelector('[role=slider]') as HTMLElement)?.focus({ preventScroll: true });
    dragging = true;
    fromPointer(e);
  }
  function move(e: PointerEvent) {
    if (dragging) fromPointer(e);
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    oncommit?.(value);
  }
  function key(e: KeyboardEvent) {
    const big = (max - min) / 10;
    const map: Record<string, number> = {
      ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step,
      PageUp: big, PageDown: -big,
    };
    if (e.key in map) value = snap(value + map[e.key] * (e.shiftKey ? 10 : 1));
    else if (e.key === 'Home') value = min;
    else if (e.key === 'End') value = max;
    else return;
    e.preventDefault();
    oncommit?.(value);
  }
  function startEdit() {
    if (disabled) return;
    draft = format(value);
    editing = true;
  }
  function endEdit(apply: boolean) {
    if (apply) {
      const n = parseFloat(draft.replace(',', '.'));
      if (!Number.isNaN(n)) {
        value = snap(n);
        oncommit?.(value);
      }
    }
    editing = false;
  }
  function autofocus(n: HTMLInputElement) {
    n.focus();
    n.select();
  }
</script>

<div class="slider" class:disabled class:dragging>
  <div class="head">
    <label for={id} class="t-body-m">{label}</label>
    {#if editing}
      <input
        class="chip edit"
        bind:value={draft}
        inputmode="decimal"
        use:autofocus
        onblur={() => endEdit(true)}
        onkeydown={(e) => {
          if (e.key === 'Enter') endEdit(true);
          if (e.key === 'Escape') endEdit(false);
        }}
      />
    {:else}
      <button class="chip" type="button" onclick={startEdit} {disabled} aria-label="{label}: {format(value)}{unit}">
        {format(value)}<span class="unit">{unit}</span>
      </button>
    {/if}
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="track" bind:this={track} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} style:--p="{pct}%">
    <div class="active"></div>
    <div class="inactive"></div>
    <div
      class="handle"
      role="slider"
      {id}
      tabindex={disabled ? -1 : 0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext="{format(value)}{unit}"
      aria-disabled={disabled}
      onkeydown={key}
    >
      <span class="bubble">{format(value)}</span>
    </div>
  </div>
</div>

<style>
  .slider {
    display: grid;
    gap: 2px;
    user-select: none;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: var(--md-on-surface);
  }
  .chip {
    min-width: 48px;
    height: 28px;
    padding: 0 8px;
    border: none;
    border-radius: var(--shape-sm);
    background: var(--md-surface-container-highest);
    color: var(--md-on-surface);
    font: 500 12px/28px var(--mono);
    text-align: center;
    font-variant-numeric: tabular-nums;
    transition: background-color var(--dur-short) linear;
  }
  .chip:hover:not(:disabled) {
    background: color-mix(in srgb, var(--md-primary) 14%, var(--md-surface-container-highest));
  }
  .chip.edit {
    width: 64px;
    outline: 2px solid var(--md-primary);
    outline-offset: -2px;
  }
  .unit {
    opacity: 0.7;
    margin-left: 1px;
  }
  .track {
    --p: 0%;
    position: relative;
    height: 36px;
    touch-action: none;
    cursor: pointer;
  }
  .active,
  .inactive {
    position: absolute;
    top: 50%;
    height: 16px;
    translate: 0 -50%;
    transition: height 200ms var(--ease-standard);
  }
  .active {
    left: 0;
    width: max(0px, calc(var(--p) - 6px));
    background: var(--md-primary);
    border-radius: 8px 2px 2px 8px;
  }
  .inactive {
    right: 0;
    width: max(0px, calc(100% - var(--p) - 6px));
    background: var(--md-secondary-container);
    border-radius: 2px 8px 8px 2px;
  }
  .handle {
    position: absolute;
    top: 50%;
    left: var(--p);
    width: 4px;
    height: 36px;
    translate: -50% -50%;
    border-radius: 2px;
    background: var(--md-primary);
    outline: none;
    transition: width 200ms var(--ease-spring);
  }
  .dragging .handle,
  .handle:focus-visible {
    width: 2px;
  }
  .handle:focus-visible {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--md-secondary) 60%, transparent);
  }
  .bubble {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    translate: -50% 0;
    padding: 6px 12px;
    border-radius: var(--shape-full);
    background: var(--md-inverse-surface);
    color: var(--md-inverse-on-surface);
    font: 500 12px/16px var(--mono);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    scale: 0.6;
    transform-origin: bottom center;
    transition:
      opacity 120ms linear,
      scale 250ms var(--ease-spring);
  }
  .dragging .bubble {
    opacity: 1;
    scale: 1;
  }
  .disabled {
    opacity: 0.38;
    pointer-events: none;
  }
</style>
