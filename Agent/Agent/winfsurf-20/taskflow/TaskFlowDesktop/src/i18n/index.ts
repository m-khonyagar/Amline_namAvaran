import { translations, TranslationKey } from './translations';
import { useLanguageStore } from './language';

export function useTranslation() {
  const { language } = useLanguageStore();
  
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };
  
  return { t, language };
}

export function useDirection() {
  const { direction } = useLanguageStore();
  return direction;
}

export { useLanguageStore };
