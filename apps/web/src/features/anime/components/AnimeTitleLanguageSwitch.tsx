import TitleLanguageSwitch from '@/components/shared/TitleLanguageSwitch';
import type { TitleLang } from '@/hooks/useTitleLanguage';

interface AnimeTitleLanguageSwitchProps {
  currentLang: TitleLang;
  onLangChange: (lang: TitleLang) => void;
}

export function AnimeTitleLanguageSwitch({ currentLang, onLangChange }: AnimeTitleLanguageSwitchProps) {
  return <TitleLanguageSwitch currentLang={currentLang} onLangChange={onLangChange} mediaType="anime" />;
}
