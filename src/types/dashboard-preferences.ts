export type TabView = 'home' | 'live' | 'recent' | 'upcoming' | 'series';

export interface FavoriteItem {
  id: string;
  type: 'series';
  name: string;
  subtitle?: string;
  addedAt: number;
}

export interface DashboardPreferences {
  favorites: FavoriteItem[];
  version: number;
}

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  favorites: [],
  version: 1,
};

export const MAX_FAVORITES = 10;
