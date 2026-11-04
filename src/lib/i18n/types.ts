import type enMessages from './en-messages';

export type Messages = { [K in keyof typeof enMessages]: string };
export type MessageKey = keyof Messages;

export interface LocaleMeta {
  /** BCP-47 tag, e.g. "zh-CN". */
  code: string;
  /** Name in its own language, shown in the language menu. */
  name: string;
  /** Prefixes of navigator.language that map to this locale. */
  match: string[];
  /** Sort order in the menu. */
  order: number;
  dir?: 'ltr' | 'rtl';
}

export interface LocaleModule {
  meta: LocaleMeta;
  messages: Partial<Messages>;
}

export function defineLocale(meta: LocaleMeta, messages: Partial<Messages>): LocaleModule {
  return { meta, messages };
}
