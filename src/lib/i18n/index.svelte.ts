/**
 * Tiny typed i18n.
 *
 * Adding a language: create `locales/<code>.ts` that default-exports
 * `defineLocale({ code, name, ... }, messages)`. It is picked up automatically.
 * `en` is the source of truth for keys; other locales may omit keys and fall back to English.
 */
import en from './locales/en';
import { storage } from '../storage';
import type { LocaleModule, MessageKey, Messages } from './types';

export type { MessageKey } from './types';

const modules = import.meta.glob<{ default: LocaleModule }>('./locales/*.ts', { eager: true });

export const locales: LocaleModule[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.meta.order - b.meta.order);

const byCode = new Map(locales.map((l) => [l.meta.code, l]));

function detect(): string {
  const saved = storage.get<string | null>('locale', null);
  if (saved && byCode.has(saved)) return saved;
  for (const lang of navigator.languages ?? [navigator.language]) {
    const lower = lang.toLowerCase();
    const exact = locales.find((l) => l.meta.code.toLowerCase() === lower);
    if (exact) return exact.meta.code;
    const base = locales.find((l) => l.meta.match.some((p) => lower.startsWith(p)));
    if (base) return base.meta.code;
  }
  return 'en';
}

class I18n {
  locale = $state(detect());

  get current(): LocaleModule {
    return byCode.get(this.locale) ?? en;
  }

  set(code: string) {
    if (!byCode.has(code)) return;
    this.locale = code;
    storage.set('locale', code);
    this.syncDocument();
  }

  syncDocument() {
    document.documentElement.lang = this.current.meta.code;
    document.documentElement.dir = this.current.meta.dir ?? 'ltr';
    document.title = `${this.t('app.name')} · ${this.t('app.tagline')}`;
  }

  t = (key: MessageKey, params?: Record<string, string | number>): string => {
    const msgs = this.current.messages as Partial<Messages>;
    let s = msgs[key] ?? (en.messages as Messages)[key] ?? key;
    if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
    return s;
  };

  /** Locale-aware number formatting. */
  n = (v: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(this.locale, opts).format(v);
}

export const i18n = new I18n();
export const t = i18n.t;
