<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { IconName } from '../icons';
  import Icon from './Icon.svelte';
  import { ripple, tooltip } from '../actions';

  interface Props {
    variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated' | 'danger';
    icon?: IconName;
    trailingIcon?: IconName;
    disabled?: boolean;
    loading?: boolean;
    size?: 'sm' | 'md';
    full?: boolean;
    tip?: string;
    type?: 'button' | 'submit';
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    el?: HTMLButtonElement;
  }
  let {
    variant = 'filled',
    icon,
    trailingIcon,
    disabled = false,
    loading = false,
    size = 'md',
    full = false,
    tip,
    type = 'button',
    onclick,
    children,
    el = $bindable(),
  }: Props = $props();
</script>

<button
  bind:this={el}
  {type}
  class="btn {variant} {size}"
  class:full
  class:has-icon={icon || loading}
  disabled={disabled || loading}
  aria-busy={loading}
  {onclick}
  use:ripple
  use:tooltip={tip}
>
  {#if loading}
    <span class="spinner" aria-hidden="true"></span>
  {:else if icon}
    <Icon name={icon} size={18} />
  {/if}
  <span class="label">{@render children?.()}</span>
  {#if trailingIcon}<Icon name={trailingIcon} size={18} />{/if}
</button>

<style>
  .btn {
    --h: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: var(--h);
    padding: 0 24px;
    border: none;
    border-radius: calc(var(--h) / 2);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap;
    user-select: none;
    transition:
      border-radius 350ms var(--ease-spring),
      box-shadow var(--dur-short) linear,
      background-color var(--dur-short) linear,
      transform 350ms var(--ease-spring);
  }
  .btn.sm {
    --h: 32px;
    padding: 0 16px;
    font-size: 13px;
  }
  .btn.has-icon {
    padding-left: 16px;
  }
  .btn.sm.has-icon {
    padding-left: 12px;
  }
  .full {
    width: 100%;
  }
  /* MD3 expressive: shape morphs toward a squircle while pressed */
  .btn:not(:disabled):active {
    border-radius: 10px;
    transform: scale(0.97);
  }
  .filled {
    background: var(--md-primary);
    color: var(--md-on-primary);
  }
  .filled:not(:disabled):hover {
    box-shadow: var(--elev-1);
  }
  .danger {
    background: var(--md-error);
    color: var(--md-on-error);
  }
  .tonal {
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
  }
  .elevated {
    background: var(--md-surface-container-low);
    color: var(--md-primary);
    box-shadow: var(--elev-1);
  }
  .outlined {
    background: transparent;
    color: var(--md-on-surface-variant);
    outline: 1px solid var(--md-outline-variant);
    outline-offset: -1px;
  }
  .text {
    background: transparent;
    color: var(--md-primary);
    padding: 0 12px;
  }
  .btn:disabled {
    background: color-mix(in srgb, var(--md-on-surface) 10%, transparent);
    color: color-mix(in srgb, var(--md-on-surface) 38%, transparent);
    box-shadow: none;
    cursor: default;
  }
  .text:disabled,
  .outlined:disabled {
    background: transparent;
  }
  .btn[aria-busy='true'] {
    background: var(--md-primary);
    color: var(--md-on-primary);
    opacity: 0.85;
  }
  .label:empty {
    display: none;
  }
  .spinner {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2.5px solid currentColor;
    border-right-color: transparent;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(1turn);
    }
  }
</style>
