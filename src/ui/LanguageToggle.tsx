import { loadSave, writeSave } from '../core/save';
import { announceLanguageChange, useLanguage, type Language } from './i18n';

/** A shared, persistent language control for standalone player modes. */
export function LanguageToggle({
  onChange,
}: {
  onChange?: (language: Language) => void;
}) {
  const language = useLanguage();
  return (
    <button
      type="button"
      className="language-toggle"
      aria-label={language === 'zh' ? '切换为 English' : 'Switch to 中文'}
      onClick={() => {
        const next = language === 'zh' ? 'en' : 'zh';
        const save = loadSave();
        save.settings.language = next;
        writeSave(save);
        onChange?.(next);
        announceLanguageChange(next);
      }}
    >
      {language === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
