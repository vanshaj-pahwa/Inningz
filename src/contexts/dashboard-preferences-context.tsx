'use client';

import { createContext, useContext, ReactNode, useCallback, useEffect, useState } from 'react';
import type { DashboardPreferences, FavoriteItem } from '@/types/dashboard-preferences';
import { DEFAULT_PREFERENCES, MAX_FAVORITES } from '@/types/dashboard-preferences';

const STORAGE_KEY = 'inningz-dashboard-preferences';

interface DashboardPreferencesContextType {
  preferences: DashboardPreferences;
  addFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;
}

const DashboardPreferencesContext = createContext<DashboardPreferencesContextType | null>(null);

function getStoredPreferences(): DashboardPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored);
    // Merge with defaults to handle any missing fields
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function savePreferences(prefs: DashboardPreferences) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function DashboardPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setPreferences(getStoredPreferences());
  }, []);

  const addFavorite = useCallback((item: Omit<FavoriteItem, 'addedAt'>) => {
    setPreferences((prev) => {
      // Check if already favorited
      const exists = prev.favorites.some((f) => f.id === item.id);
      if (exists) return prev;

      // Add new favorite at the beginning, limit to MAX_FAVORITES
      const newFavorites = [
        { ...item, addedAt: Date.now() },
        ...prev.favorites,
      ].slice(0, MAX_FAVORITES);

      const newPrefs = { ...prev, favorites: newFavorites };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setPreferences((prev) => {
      const newFavorites = prev.favorites.filter((f) => f.id !== id);
      const newPrefs = { ...prev, favorites: newFavorites };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const isFavorite = useCallback((id: string) => {
    return preferences.favorites.some((f) => f.id === id);
  }, [preferences.favorites]);

  const clearFavorites = useCallback(() => {
    const newPrefs = { ...preferences, favorites: [] };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences]);

  return (
    <DashboardPreferencesContext.Provider
      value={{
        preferences,
        addFavorite,
        removeFavorite,
        isFavorite,
        clearFavorites,
      }}
    >
      {children}
    </DashboardPreferencesContext.Provider>
  );
}

export function useDashboardPreferences() {
  const context = useContext(DashboardPreferencesContext);
  if (!context) {
    throw new Error('useDashboardPreferences must be used within DashboardPreferencesProvider');
  }
  return context;
}
