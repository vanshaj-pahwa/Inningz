import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize a cricket score to the standard "runs/wkts" notation (some sources use "runs-wkts").
export function formatScore(score?: string): string {
  if (!score) return score ?? '';
  return score.replace(/(\d+)-(\d+)/, '$1/$2');
}

// Build the internal series-page href from a source series URL + name.
// e.g. "/cricket-series/10532/india-tour-of-england-2026/matches" -> "/series/10532/india-tour-of-england-2026"
export function buildSeriesHref(seriesName?: string, seriesUrl?: string): string | null {
  const id = seriesUrl?.match(/\/cricket-series\/(\d+)\b/)?.[1];
  if (!id) return null;
  const slug = (seriesName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `/series/${id}/${slug}`;
}
