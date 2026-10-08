import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

interface UiPreferences {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  toggleThemeMode: () => void;
  toggleSidebar: () => void;
}

function modeSysteme(): ThemeMode {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

// Préférences purement visuelles, propres au navigateur : localStorage suffit
// (rien à synchroniser côté Supabase).
export const useUiPreferences = create<UiPreferences>()(
  persist(
    (set) => ({
      themeMode: modeSysteme(),
      sidebarCollapsed: false,
      toggleThemeMode: () => set((s) => ({ themeMode: s.themeMode === 'dark' ? 'light' : 'dark' })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'sim-ui-preferences', storage: createJSONStorage(() => localStorage) },
  ),
);
