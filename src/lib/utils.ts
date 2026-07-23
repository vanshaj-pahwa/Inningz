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
// Verified cricbuzz teamIds for international sides. Used by MatchCard when
// the scraper couldn't populate `teamId` (HTML-scraped live/recent/upcoming
// lists). Domestic teams (counties, Hundred/LPL/IPL franchises) are the long
// tail — their names gracefully render as plain text when unrecognised, so
// there's no broken /team/ link and no regression vs the previous state.
// Threading `teamId` through the DOM scrapers is the durable fix; this map is
// the pragmatic bridge for the international traffic that matters most.
const TEAM_ID_BY_NAME: Record<string, string> = {
  // Full-member internationals
  india: '2', pakistan: '3', australia: '4', 'south africa': '5', 'sri lanka': '6',
  'new zealand': '7', 'west indies': '8', england: '9', zimbabwe: '10', bangladesh: '25',
  ireland: '27', scotland: '30', netherlands: '15', afghanistan: '41',
  // Frequent associates
  usa: '22', 'united states': '22', nepal: '32', 'united arab emirates': '11', uae: '11',
  oman: '31', namibia: '28', canada: '17', kenya: '29', 'papua new guinea': '39',
};

// Team detail page. Accepts a numeric or string id and any team name; slugifies
// the name and produces `/team/{id}/{slug}`. Falls back to a static name→id
// lookup for international sides when the id is missing so callers can pass a
// team name alone and still get a link. Returns null only when neither works.
export function buildTeamHref(teamId?: string | number, teamName?: string): string | null {
  let id = String(teamId ?? '').trim();
  if (!id && teamName) {
    const key = teamName.trim().toLowerCase();
    id = TEAM_ID_BY_NAME[key] || '';
  }
  if (!id) return null;
  const slug = (teamName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
  return `/team/${id}/${slug}`;
}

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

export function buildNewsHref(id: string | undefined, slug?: string): string {
  const storyId = String(id ?? '').trim();
  if (!storyId) return '/news';
  const cleaned = (slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return cleaned ? `/news/${storyId}/${cleaned}` : `/news/${storyId}/story`;
}

// Cricket news photos need smart crops — a single-face crop (`g_face`) cuts
// out the second person from multi-captain photos, drops the ball from action
// shots, and misses the trophy in celebration shots. Cloudinary's `g_auto`
// uses whole-image saliency detection and picks the right subject regardless
// of what's in the frame. Confirmed available on the upstream's Cloudinary
// account.
export function toFaceCroppedThumb(
  url: string | undefined,
  opts: { width?: number; aspect?: string } = {},
): string | undefined {
  if (!url) return undefined;
  const { width = 600, aspect = '4:3' } = opts;
  const transform = `c_fill,g_auto,ar_${aspect},w_${width},q_auto,f_auto`;
  // Raw p.imgci.com asset URL — map to the Cloudinary upload host.
  const rawM = url.match(/^https?:\/\/p\.imgci\.com\/(db\/PICTURES\/[^\s"']+\.jpg)$/i);
  if (rawM) return `https://img1.hscicdn.com/image/upload/${transform}/lsci/${rawM[1]}`;
  // Already-Cloudinary URL — replace whatever transform is in the path with
  // our face-crop one (the transform segment is the path segment right after
  // `/image/upload/`).
  const cloudM = url.match(/^(https?:\/\/img1\.hscicdn\.com\/image\/upload\/)([^/]+)\/(.+)$/i);
  if (cloudM) return `${cloudM[1]}${transform}/${cloudM[3]}`;
  return url;
}

