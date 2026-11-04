<script lang="ts">
  import { router, ROUTES, type Route } from './lib/router.svelte';
  import { i18n, locales, t } from './lib/i18n/index.svelte';
  import { theme, SEEDS, type ThemeMode } from './lib/theme.svelte';
  import { ripple } from './lib/actions';
  import type { IconName } from './lib/icons';
  import Icon from './lib/components/Icon.svelte';
  import IconButton from './lib/components/IconButton.svelte';
  import Menu from './lib/components/Menu.svelte';
  import MenuItem from './lib/components/MenuItem.svelte';
  import Logo from './lib/components/Logo.svelte';
  import GithubMark from './lib/components/GithubMark.svelte';
  import FeedbackHost from './lib/components/FeedbackHost.svelte';
  import Collage from './tools/collage/Collage.svelte';
  import Stitch from './tools/stitch/Stitch.svelte';
  import Split from './tools/split/Split.svelte';

  const REPO = 'https://github.com/aimerneige/img-ops-website';
  const TOOL_ICONS: Record<Route, IconName> = { collage: 'auto_awesome_mosaic', stitch: 'view_agenda', split: 'grid_view' };

  let width = $state(innerWidth);
  const compact = $derived(width < 840);
  let drawer = $state(false);

  let langOpen = $state(false);
  let langBtn = $state<HTMLElement>();
  let themeOpen = $state(false);
  let themeBtn = $state<HTMLElement>();

  const themeIcon = $derived<IconName>(theme.mode === 'system' ? 'brightness_auto' : theme.mode === 'dark' ? 'dark_mode' : 'light_mode');
  const MODES: { value: ThemeMode; icon: IconName }[] = [
    { value: 'light', icon: 'light_mode' },
    { value: 'dark', icon: 'dark_mode' },
    { value: 'system', icon: 'brightness_auto' },
  ];

  function origin(e: MouseEvent) {
    const r = themeBtn?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: e.clientX, y: e.clientY };
  }

  $effect(() => {
    void i18n.locale;
    i18n.syncDocument();
  });

  function go(r: Route) {
    router.go(r);
    drawer = false;
  }
</script>

<svelte:window onresize={() => (width = innerWidth)} />

{#snippet navItems(rail: boolean)}
  {#each ROUTES as r (r)}
    <a
      href="#/{r}"
      class="nav-item"
      class:rail
      class:on={router.route === r}
      aria-current={router.route === r ? 'page' : undefined}
      onclick={(e) => {
        e.preventDefault();
        go(r);
      }}
    >
      <span class="ind" use:ripple><Icon name={TOOL_ICONS[r]} /></span>
      <span class="lbl">{t(`tool.${r}.name`)}</span>
      {#if !rail}<span class="desc t-body-s">{t(`tool.${r}.desc`)}</span>{/if}
    </a>
  {/each}
{/snippet}

<div class="app" class:compact>
  <header class="topbar">
    {#if compact}
      <IconButton icon="menu" label={t('nav.open')} onclick={() => (drawer = true)} />
    {/if}
    <a class="brand" href="#/collage" aria-label={t('app.name')}>
      <Logo />
      <span class="name">{t('app.name')}</span>
      {#if !compact}<span class="tag t-body-s">{t('app.tagline')}</span>{/if}
    </a>
    <span class="flex"></span>
    {#if width >= 600}
      <span class="privacy t-label-m"><Icon name="check_circle" size={16} />{t('app.privacy')}</span>
    {/if}
    <IconButton icon="language" label={t('nav.language')} bind:el={langBtn} expanded={langOpen} onclick={() => (langOpen = !langOpen)} />
    <IconButton icon={themeIcon} label={t('nav.theme')} bind:el={themeBtn} expanded={themeOpen} onclick={() => (themeOpen = !themeOpen)} />
    <IconButton icon="help" label={t('nav.github')} href={REPO}>
      {#snippet custom()}<GithubMark />{/snippet}
    </IconButton>
  </header>

  <Menu bind:open={langOpen} anchor={langBtn} placement="bottom-end" label={t('nav.language')}>
    {#each locales as l (l.meta.code)}
      <MenuItem label={l.meta.name} trailing={l.meta.code} checked={i18n.locale === l.meta.code} onclick={() => i18n.set(l.meta.code)} />
    {/each}
  </Menu>

  <Menu bind:open={themeOpen} anchor={themeBtn} placement="bottom-end" label={t('nav.theme')} width="240px">
    {#each MODES as m (m.value)}
      <MenuItem icon={m.icon} label={t(`theme.${m.value}`)} checked={theme.mode === m.value} onclick={(e) => theme.set({ mode: m.value }, origin(e))} />
    {/each}
    <div class="seed-head t-label-m">{t('theme.accent')}</div>
    <div class="seeds">
      {#each SEEDS as s (s)}
        <button
          class="seed"
          class:on={theme.seed === s}
          style:--c={s}
          aria-label="{t('theme.accent')} {s}"
          aria-pressed={theme.seed === s}
          onclick={(e) => theme.set({ seed: s }, origin(e))}
        >
          {#if theme.seed === s}<Icon name="check" size={16} />{/if}
        </button>
      {/each}
    </div>
  </Menu>

  <div class="body">
    {#if !compact}
      <nav class="rail" aria-label={t('nav.tools')}>
        {@render navItems(true)}
      </nav>
    {/if}
    <div class="content">
      {#key router.route}
        <div class="page">
          {#if router.route === 'collage'}
            <Collage width={compact ? width : width - 88} />
          {:else if router.route === 'stitch'}
            <Stitch width={compact ? width : width - 88} />
          {:else}
            <Split width={compact ? width : width - 88} />
          {/if}
        </div>
      {/key}
    </div>
  </div>
</div>

{#if compact && drawer}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="drawer-scrim" onclick={() => (drawer = false)}></div>
  <nav class="drawer" aria-label={t('nav.tools')}>
    <div class="drawer-head">
      <Logo />
      <span class="t-title-m">{t('app.name')}</span>
    </div>
    <span class="t-title-s section">{t('nav.tools')}</span>
    {@render navItems(false)}
    <a class="repo t-body-m" href={REPO} target="_blank" rel="noopener noreferrer" use:ripple>
      <GithubMark />{t('nav.source')}
    </a>
  </nav>
{/if}

<FeedbackHost />

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    height: 100dvh;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 64px;
    padding: 0 8px 0 16px;
    background: var(--md-surface-container);
    flex: none;
  }
  .compact .topbar {
    padding-left: 4px;
    height: 56px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--md-on-surface);
    text-decoration: none;
    min-width: 0;
  }
  .name {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .tag {
    color: var(--md-on-surface-variant);
    padding-left: 12px;
    margin-left: 2px;
    border-left: 1px solid var(--md-outline-variant);
    white-space: nowrap;
  }
  .flex {
    flex: 1;
  }
  .privacy {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    margin-right: 8px;
    border-radius: 16px;
    background: var(--md-tertiary-container);
    color: var(--md-on-tertiary-container);
    white-space: nowrap;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .rail {
    width: 88px;
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-top: 12px;
    background: var(--md-surface-container);
  }
  .content {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: grid;
    background: var(--md-surface);
    border-top-left-radius: var(--shape-xl);
    overflow: hidden;
  }
  .compact .content {
    border-radius: 0;
    overflow: auto;
  }
  .page {
    grid-area: 1 / 1;
    min-height: 0;
    min-width: 0;
    animation: page-in 380ms var(--ease-emph-decel);
  }
  @keyframes page-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }
  .nav-item {
    display: grid;
    justify-items: center;
    gap: 4px;
    color: var(--md-on-surface-variant);
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    outline-offset: 4px;
  }
  .nav-item .ind {
    display: grid;
    place-items: center;
    width: 56px;
    height: 32px;
    border-radius: 16px;
    transition:
      background-color 200ms linear,
      width 400ms var(--ease-spring),
      border-radius 400ms var(--ease-spring);
  }
  .nav-item:not(.on) .ind {
    width: 40px;
  }
  .nav-item:active .ind {
    border-radius: 10px;
  }
  .nav-item.on {
    color: var(--md-on-surface);
  }
  .nav-item.on .ind {
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
  }
  .nav-item .lbl {
    text-align: center;
  }
  /* Drawer variant */
  .nav-item:not(.rail) {
    grid-template-columns: auto 1fr;
    justify-items: start;
    align-items: center;
    column-gap: 12px;
    padding: 8px 12px;
    border-radius: 28px;
    font-size: 14px;
  }
  .nav-item:not(.rail) .ind {
    grid-row: span 2;
    width: 40px;
    background: transparent;
  }
  .nav-item:not(.rail).on {
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
  }
  .nav-item:not(.rail) .desc {
    grid-column: 2;
    color: var(--md-on-surface-variant);
    font-weight: 400;
  }
  .drawer-scrim {
    position: fixed;
    inset: 0;
    z-index: 800;
    background: color-mix(in srgb, var(--md-scrim) 40%, transparent);
    animation: fade 250ms linear;
  }
  .drawer {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 801;
    width: min(320px, 86vw);
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 12px;
    border-radius: 0 var(--shape-lg) var(--shape-lg) 0;
    background: var(--md-surface-container-low);
    animation: drawer-in 380ms var(--ease-emph-decel);
  }
  .drawer-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px 16px;
  }
  .section {
    padding: 8px 16px;
    color: var(--md-on-surface-variant);
  }
  .repo {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 28px;
    color: var(--md-on-surface-variant);
    text-decoration: none;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes drawer-in {
    from {
      transform: translateX(-100%);
    }
  }
  .seed-head {
    padding: 12px 16px 4px;
    color: var(--md-on-surface-variant);
    border-top: 1px solid var(--md-outline-variant);
    margin-top: 8px;
  }
  .seeds {
    display: flex;
    gap: 8px;
    padding: 8px 16px 8px;
  }
  .seed {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--c);
    color: #fff;
    transition:
      border-radius 350ms var(--ease-spring),
      scale 350ms var(--ease-spring);
  }
  .seed:hover {
    scale: 1.12;
  }
  .seed:active {
    scale: 0.9;
  }
  .seed.on {
    border-radius: 9px;
  }
</style>
