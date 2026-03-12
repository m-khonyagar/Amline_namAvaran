import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'fa';
type Direction = 'ltr' | 'rtl';

interface LanguageState {
  language: Language;
  direction: Direction;
  setLanguage: (language: Language) => void;
  setDirection: (direction: Direction) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      direction: 'ltr',
      setLanguage: (language: Language) => {
        const direction = language === 'fa' ? 'rtl' : 'ltr';
        set({ language, direction });
        // Update document direction
        if (typeof document !== 'undefined') {
          document.documentElement.dir = direction;
          document.documentElement.lang = language;
        }
      },
      setDirection: (direction: Direction) => set({ direction }),
    }),
    {
      name: 'agent-windsurf-amline-language',
    }
  )
);

// Initialize document direction
if (typeof document !== 'undefined') {
  const { language, direction } = useLanguageStore.getState();
  document.documentElement.dir = direction;
  document.documentElement.lang = language;
}
