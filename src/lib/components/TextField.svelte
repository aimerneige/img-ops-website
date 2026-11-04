<script lang="ts">
  let {
    value = $bindable(''),
    label,
    multiline = false,
    suffix,
    inputmode,
    placeholder = ' ',
    oncommit,
    oninput,
    width,
    el = $bindable(),
  }: {
    value?: string;
    label: string;
    multiline?: boolean;
    suffix?: string;
    inputmode?: 'text' | 'numeric' | 'decimal';
    placeholder?: string;
    oncommit?: (v: string) => void;
    oninput?: (v: string) => void;
    width?: string;
    el?: HTMLInputElement | HTMLTextAreaElement;
  } = $props();
  const id = `tf-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="tf" class:multi={multiline} style:width>
  {#if multiline}
    <textarea
      {id}
      bind:this={el}
      bind:value
      rows="2"
      {placeholder}
      oninput={() => oninput?.(value)}
      onchange={() => oncommit?.(value)}
    ></textarea>
  {:else}
    <input
      {id}
      bind:this={el}
      bind:value
      {inputmode}
      {placeholder}
      autocomplete="off"
      spellcheck="false"
      oninput={() => oninput?.(value)}
      onchange={() => oncommit?.(value)}
      onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
    />
  {/if}
  <label for={id}>{label}</label>
  {#if suffix}<span class="suffix">{suffix}</span>{/if}
</div>

<style>
  .tf {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
    border-radius: var(--shape-xs);
    outline: 1px solid var(--md-outline);
    outline-offset: -1px;
    transition: outline-color var(--dur-short) linear;
  }
  .tf:hover {
    outline-color: var(--md-on-surface);
  }
  .tf:focus-within {
    outline: 2px solid var(--md-primary);
    outline-offset: -2px;
  }
  input,
  textarea {
    width: 100%;
    min-width: 0;
    height: 48px;
    padding: 0 14px;
    border: none;
    background: transparent;
    outline: none;
    font-size: 15px;
    color: var(--md-on-surface);
    caret-color: var(--md-primary);
  }
  textarea {
    height: auto;
    padding: 14px;
    resize: vertical;
    min-height: 72px;
    line-height: 22px;
  }
  label {
    position: absolute;
    left: 10px;
    top: 24px;
    padding: 0 4px;
    translate: 0 -50%;
    background: var(--panel-bg, var(--md-surface-container-low));
    color: var(--md-on-surface-variant);
    font-size: 15px;
    pointer-events: none;
    white-space: nowrap;
    transition: all 200ms var(--ease-standard);
  }
  .tf:focus-within label,
  input:not(:placeholder-shown) + label,
  textarea:not(:placeholder-shown) + label {
    top: 0;
    font-size: 12px;
  }
  .tf:focus-within label {
    color: var(--md-primary);
  }
  .suffix {
    padding-right: 12px;
    color: var(--md-on-surface-variant);
    font-size: 13px;
  }
</style>
