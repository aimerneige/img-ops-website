<script lang="ts">
  import Icon from './Icon.svelte';
  let {
    checked = $bindable(false),
    label,
    disabled = false,
    onchange,
  }: { checked?: boolean; label: string; disabled?: boolean; onchange?: (v: boolean) => void } = $props();
</script>

<label class="row" class:disabled>
  <span class="t-body-m">{label}</span>
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    class="sw"
    class:on={checked}
    {disabled}
    onclick={() => {
      checked = !checked;
      onchange?.(checked);
    }}
  >
    <span class="thumb"><span class="ic"><Icon name={checked ? 'check' : 'close'} size={16} /></span></span>
  </button>
</label>

<style>
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 40px;
    cursor: pointer;
  }
  .sw {
    position: relative;
    width: 52px;
    height: 32px;
    flex: none;
    padding: 0;
    border-radius: 16px;
    border: 2px solid var(--md-outline);
    background: var(--md-surface-container-highest);
    transition:
      background-color var(--dur-medium) linear,
      border-color var(--dur-medium) linear;
  }
  .thumb {
    position: absolute;
    top: 50%;
    left: 14px;
    width: 16px;
    height: 16px;
    translate: -50% -50%;
    border-radius: 50%;
    background: var(--md-outline);
    color: var(--md-surface-container-highest);
    display: grid;
    place-items: center;
    transition:
      left 350ms var(--ease-spring),
      width 250ms var(--ease-standard),
      height 250ms var(--ease-standard),
      background-color var(--dur-medium) linear;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--md-on-surface) 8%, transparent);
  }
  .thumb .ic {
    opacity: 0;
    scale: 0.5;
    transition: all 250ms var(--ease-spring);
    display: grid;
  }
  .sw:hover .thumb {
    box-shadow: 0 0 0 8px color-mix(in srgb, var(--md-on-surface) 8%, transparent);
  }
  .sw:active .thumb {
    width: 28px;
    height: 28px;
  }
  .on {
    background: var(--md-primary);
    border-color: var(--md-primary);
  }
  .on .thumb {
    left: 34px;
    width: 24px;
    height: 24px;
    background: var(--md-on-primary);
    color: var(--md-on-primary-container);
  }
  .on .thumb .ic {
    opacity: 1;
    scale: 1;
  }
  .disabled {
    opacity: 0.38;
    pointer-events: none;
  }
</style>
