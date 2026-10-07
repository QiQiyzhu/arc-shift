import { useEffect, useState } from 'react';
import { ENGLISH_COPY } from './locale-en';

/** Supported interface languages. Chinese is intentionally the first/default locale. */
export type Language = 'zh' | 'en';

export const DEFAULT_LANGUAGE: Language = 'zh';

export function normalizeLanguage(value: unknown): Language {
  return value === 'en' ? 'en' : DEFAULT_LANGUAGE;
}

/** Small, dependency-free copy helper for the game's hybrid CN/EN interface. */
export function copy(language: Language, zh: string, en: string): string {
  return language === 'en' ? en : zh;
}

/**
 * Language changes are persisted by the settings panel and broadcast to the
 * shell so the HUD/menu updates without reloading the active Phaser scene.
 */
export const LANGUAGE_CHANGE_EVENT = 'arc-language-change';
let sessionLanguage: Language | undefined;

export function announceLanguageChange(language: Language) {
  sessionLanguage = language;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: language }),
    );
  }
}

/** Subscribe to the persisted language while keeping the default SSR-safe. */
export function savedLanguage(): Language {
  if (sessionLanguage) return sessionLanguage;
  if (typeof localStorage === 'undefined') return DEFAULT_LANGUAGE;
  try {
    return normalizeLanguage(
      JSON.parse(localStorage.getItem('arcshift.save.v1') || '{}').settings
        ?.language,
    );
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function useLanguage(initial?: unknown): Language {
  const [language, setLanguage] = useState<Language>(() =>
    initial === undefined ? savedLanguage() : normalizeLanguage(initial),
  );
  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      setLanguage(normalizeLanguage(detail));
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  }, [language]);
  return language;
}

const phrases = Object.keys(ENGLISH_COPY).sort((a, b) => b.length - a.length);
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compositePattern = new RegExp(phrases.map(escaped).join('|'), 'g');

/** Authored presentation copy only. Rules, content IDs and saved names stay stable.
 * Exact messages are preferred; known fragments also compose generated HUD text
 * (for example a protocol name followed by a numeric resource amount).
 * Unknown, user-authored content is preserved rather than silently rewritten.
 */
export function translateCopy(language: Language, value: string): string;
export function translateCopy(
  language: Language,
  value: string | undefined,
): string | undefined;
export function translateCopy(
  language: Language,
  value: string | undefined,
): string | undefined {
  if (language !== 'en' || !value) return value;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (ENGLISH_COPY[normalized]) return ENGLISH_COPY[normalized];
  if (!/[\u3400-\u9fff]/.test(value)) return value;
  const translated = value.replace(
    compositePattern,
    (phrase) => ENGLISH_COPY[phrase],
  );
  // Preserve unknown/custom authored text as a whole, including familiar words.
  return /[\u3400-\u9fff]/.test(translated) ? value : translated;
}

export function useTranslation(initial?: unknown) {
  const language = useLanguage(initial);
  return Object.assign(
    <T extends string | undefined>(value: T): T =>
      translateCopy(language, value) as T,
    { language, copy: (zh: string, en: string) => copy(language, zh, en) },
  );
}
