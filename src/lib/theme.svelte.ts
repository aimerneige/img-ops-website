import {
  argbFromHex,
  hexFromArgb,
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  type DynamicScheme,
} from '@material/material-color-utilities';
import { storage } from './storage';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Seed colors offered in the theme menu. */
export const SEEDS = ['#6750A4', '#0B6E99', '#2E7D32', '#B3261E', '#C26A00', '#7D5260'];

const TOKENS = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'surfaceDim', 'surfaceBright',
  'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
  'surfaceContainerHigh', 'surfaceContainerHighest',
  'inverseSurface', 'inverseOnSurface', 'inversePrimary',
  'outline', 'outlineVariant', 'shadow', 'scrim',
] as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

class Theme {
  mode = $state<ThemeMode>(storage.get('theme.mode', 'system'));
  seed = $state<string>(storage.get('theme.seed', SEEDS[0]));
  private media = window.matchMedia('(prefers-color-scheme: dark)');
  systemDark = $state(this.media.matches);

  constructor() {
    this.media.addEventListener('change', (e) => {
      this.systemDark = e.matches;
      this.apply();
    });
  }

  get dark() {
    return this.mode === 'system' ? this.systemDark : this.mode === 'dark';
  }

  apply() {
    const scheme: DynamicScheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(this.seed)), this.dark, 0);
    const root = document.documentElement;
    for (const name of TOKENS) {
      const color = (MaterialDynamicColors as unknown as Record<string, { getArgb(s: DynamicScheme): number }>)[name];
      root.style.setProperty('--md-' + kebab(name), hexFromArgb(color.getArgb(scheme)));
    }
    root.dataset.theme = this.dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      hexFromArgb(MaterialDynamicColors.surfaceContainer.getArgb(scheme)),
    );
  }

  /** Change theme with a circular reveal starting at (x, y) when supported. */
  set(next: { mode?: ThemeMode; seed?: string }, origin?: { x: number; y: number }) {
    const commit = () => {
      if (next.mode) this.mode = next.mode;
      if (next.seed) this.seed = next.seed;
      storage.set('theme.mode', this.mode);
      storage.set('theme.seed', this.seed);
      this.apply();
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || !origin || reduce) return commit();
    const t = doc.startViewTransition(commit);
    const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${origin.x}px ${origin.y}px)`, `circle(${r}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 550, easing: 'cubic-bezier(0.2, 0, 0, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  }
}

export const theme = new Theme();
