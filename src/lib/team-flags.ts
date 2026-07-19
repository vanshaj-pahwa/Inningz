// Live match detail pages don't always carry team flags (the batting side's flag
// isn't in the live feed). The list cards do have them, so when a user opens a
// match from a card we stash that match's team flags in localStorage, keyed by
// matchId, and the detail page reads them back (surviving a refresh).

export interface StoredTeam {
  name: string;
  flagUrl: string;
}

const key = (matchId: string) => `inningz:matchflags:${matchId}`;

export function rememberMatchFlags(matchId: string, teams: { name?: string; flagUrl?: string }[]) {
  if (typeof window === 'undefined' || !matchId) return;
  const withFlags = teams
    .filter((t): t is { name: string; flagUrl: string } => !!t.name && !!t.flagUrl)
    .map((t) => ({ name: t.name, flagUrl: t.flagUrl }));
  if (withFlags.length === 0) return;
  try {
    localStorage.setItem(key(matchId), JSON.stringify(withFlags));
  } catch {
    // localStorage can be unavailable (private mode / quota); flags are a nicety.
  }
}

// Cricbuzz-style team (jersey) colours. Flag extraction alone misses these — a
// team's identity colour isn't always its flag's dominant colour (India's flag
// is green/orange, but the side plays in blue). Keyed by short code and full name.
const TEAM_COLORS: Record<string, string> = {
  india: '#2F80ED', ind: '#2F80ED',
  england: '#E4433B', eng: '#E4433B',
  australia: '#F2B807', aus: '#F2B807',
  pakistan: '#0E8A4F', pak: '#0E8A4F',
  'south africa': '#157A50', sa: '#157A50', rsa: '#157A50',
  'new zealand': '#6B7480', nz: '#6B7480',
  'sri lanka': '#1C5FC5', sl: '#1C5FC5',
  bangladesh: '#0C6E4E', ban: '#0C6E4E', bd: '#0C6E4E',
  'west indies': '#8E1B2B', wi: '#8E1B2B',
  afghanistan: '#1E8FD5', afg: '#1E8FD5',
  zimbabwe: '#C4152F', zim: '#C4152F',
  ireland: '#159B5F', ire: '#159B5F',
};

// Resolve a side's identity colour from its score short code (e.g. "IND") or any
// of its full names. Returns null when unknown so callers can fall back to flag
// extraction.
export function teamColorFor(shortCode: string | undefined, teamNames: (string | undefined)[] | null): string | null {
  const s = shortCode?.toLowerCase().replace(/[^a-z]/g, '');
  if (s && TEAM_COLORS[s]) return TEAM_COLORS[s];
  for (const name of teamNames ?? []) {
    const n = name?.toLowerCase().trim();
    if (n && TEAM_COLORS[n]) return TEAM_COLORS[n];
  }
  return null;
}

function hexToSl(hex: string): { s: number; l: number } {
  const m = hex.replace('#', '');
  if (m.length < 6) return { s: 0, l: 0.5 };
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  }
  return { s, l };
}

// Extracted flag colours are ordered by prominence, so a white-dominant flag
// (England) yields white first, which reads as no colour. Pick the most vivid
// colour instead: the first mid-lightness, saturated one; failing that, the most
// saturated non-white; failing that, the first colour.
export function pickVibrant(colors: string[] | null | undefined): string | null {
  if (!colors || colors.length === 0) return null;
  const scored = colors.map((c) => ({ c, ...hexToSl(c) }));
  const vivid = scored.find((x) => x.l > 0.18 && x.l < 0.82 && x.s > 0.35);
  if (vivid) return vivid.c;
  const nonWhite = scored.filter((x) => x.l < 0.88).sort((a, b) => b.s - a.s);
  if (nonWhite.length) return nonWhite[0].c;
  return colors[0];
}

export function getMatchFlags(matchId: string): StoredTeam[] | null {
  if (typeof window === 'undefined' || !matchId) return null;
  try {
    const raw = localStorage.getItem(key(matchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
