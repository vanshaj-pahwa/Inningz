// Shared palette for exported share cards. The cards are rasterised to an image,
// so they can't rely on CSS variables — these hex values mirror the app's design
// tokens (flat surfaces, one gold brand, semantic success/danger, no gradients).

export type ShareMode = 'light' | 'dark';

export const SHARE_PALETTE = {
  dark: {
    bg: '#0A0A0B', footer: '#0A0A0B', border: '#26262A',
    text: '#FAFAFA', muted: '#A1A1A6', faint: '#71717A',
    brand: '#F0C24D', danger: '#FF5A52', success: '#34C77B',
    info: '#5AA2FF', six: '#B79CFF', track: '#1C1C1F', surface: '#141416',
  },
  light: {
    bg: '#F7F7F8', footer: '#FFFFFF', border: '#E6E7E9',
    text: '#17181A', muted: '#5B5D63', faint: '#9A9CA3',
    brand: '#C08A1E', danger: '#E5484D', success: '#1E9E4A',
    info: '#2F80ED', six: '#7C5CE0', track: '#ECEDEF', surface: '#FFFFFF',
  },
} as const;

export type SharePalette = typeof SHARE_PALETTE[keyof typeof SHARE_PALETTE];

export const sharePalette = (mode?: ShareMode): SharePalette =>
  SHARE_PALETTE[mode === 'light' ? 'light' : 'dark'];

/** rgba() from a #rrggbb hex — for theme-aware translucent tints in the cards. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
