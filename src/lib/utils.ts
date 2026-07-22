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

// Localized start time for an upcoming match, e.g. "Today, 3:30 PM" / "Tomorrow, 7:15 PM" / "Sat, Jul 26, 3:00 PM".
export function formatStartTime(startDate?: number): string | null {
  if (!startDate) return null;
  const ms = startDate < 10_000_000_000 ? startDate * 1000 : startDate;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (sameDay) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${dateStr}, ${time}`;
}

// Build the internal venue-page href from a scraped venue URL
// (e.g. "/cricket-series/11284/t20-blast-2026/venues/20/edgbaston" -> "/venue/cricket-series/.../edgbaston").
export function buildVenueHref(venueUrl?: string): string | null {
  if (!venueUrl) return null;
  const path = venueUrl.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
  if (!path.includes('/venues/')) return null;
  return `/venue/${path}`;
}

// Derive the match format (for the card badge) from the title/series text,
// e.g. "England vs India, 3rd ODI" -> "ODI", "Final • T20 Blast" -> "T20".
export function deriveMatchFormat(...parts: (string | undefined)[]): string | null {
  const s = ` ${parts.filter(Boolean).join(' ')} `.toLowerCase();
  if (/the hundred|\bhundred men|\bhundred women/.test(s)) return '100';
  if (/\bt20i\b/.test(s)) return 'T20I';
  if (/\bt20\b|twenty ?20|blast|premier league|major league/.test(s)) return 'T20';
  if (/\bt10\b/.test(s)) return 'T10';
  if (/\bodi\b|one[- ]day international/.test(s)) return 'ODI';
  if (/\btest\b/.test(s)) return 'TEST';
  if (/one[- ]day cup|list ?a\b/.test(s)) return 'List A';
  return null;
}

// Normalize a raw upstream `matchFormat` tag for display
// (e.g. "HUN" -> "100" for The Hundred). Unknown tags pass through so they
// still render instead of dropping to muted grey.
export function displayMatchFormat(raw?: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  if (t === 'HUN' || t === '100-BALL' || t === 'HUNDRED') return '100';
  if (t === 'LA' || t === 'LIST-A' || t === 'LIST_A' || t === 'LISTA') return 'List A';
  return t;
}

// Build the internal series-page href from a source series URL + name.
// e.g. "/cricket-series/10532/india-tour-of-england-2026/matches" -> "/series/10532/india-tour-of-england-2026"
export function buildSeriesHref(seriesName?: string, seriesUrl?: string): string | null {
  const id = seriesUrl?.match(/\/cricket-series\/(\d+)\b/)?.[1];
  if (!id) return null;
  const slug = (seriesName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `/series/${id}/${slug}`;
}

// Slug-friendly match URL. Uses only the match title (e.g. "england-vs-india-1st-t20i")
// so URLs stay short and readable. Falls back to /match/${id} when no title
// is available. A rewrite in next.config.js accepts the optional slug segment
// and forwards to the base route, so no data-fetching path changes.
export function buildMatchHref(
  matchId: string | number | undefined,
  title?: string,
): string {
  const id = String(matchId ?? '').trim();
  if (!id) return '/';
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return slug ? `/match/${id}/${slug}` : `/match/${id}`;
}
