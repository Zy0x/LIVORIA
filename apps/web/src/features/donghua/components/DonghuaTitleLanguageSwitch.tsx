import TitleLanguageSwitch from '@/components/shared/TitleLanguageSwitch';
import type { TitleLang } from '@/hooks/useTitleLanguage';

interface DonghuaTitleLanguageSwitchProps {
  currentLang: TitleLang;
  onLangChange: (lang: TitleLang) => void;
}

export function DonghuaTitleLanguageSwitch({ currentLang, onLangChange }: DonghuaTitleLanguageSwitchProps) {
  return <TitleLanguageSwitch currentLang={currentLang} onLangChange={onLangChange} />;
}
