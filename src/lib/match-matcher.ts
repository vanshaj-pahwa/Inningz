import type { StreamMatch } from './stream-fetcher';

export interface MatchCandidate {
  streamMatchId: string;
  confidence: number;
  team1: string;
  team2: string;
  playPath: string;
  playSource: StreamMatch['playSource'];
}

// Normalize team names for comparison
const TEAM_ALIASES: Record<string, string> = {
  // International teams - abbreviations
  'ind': 'india', 'aus': 'australia', 'eng': 'england', 'pak': 'pakistan',
  'sa': 'south africa', 'rsa': 'south africa', 'nz': 'new zealand',
  'sl': 'sri lanka', 'ban': 'bangladesh', 'wi': 'west indies',
  'zim': 'zimbabwe', 'afg': 'afghanistan', 'ire': 'ireland',
  'sco': 'scotland', 'ned': 'netherlands', 'nam': 'namibia',
  'usa': 'united states', 'uae': 'united arab emirates', 'nep': 'nepal',
  'oman': 'oman', 'png': 'papua new guinea', 'uga': 'uganda',

  // IPL franchises
  'csk': 'chennai super kings', 'mi': 'mumbai indians',
  'rcb': 'royal challengers bengaluru', 'dc': 'delhi capitals',
  'kkr': 'kolkata knight riders', 'srh': 'sunrisers hyderabad',
  'rr': 'rajasthan royals', 'pbks': 'punjab kings',
  'lsg': 'lucknow super giants', 'gt': 'gujarat titans',

  // BBL
  'stars': 'melbourne stars', 'sixers': 'sydney sixers',
  'scorchers': 'perth scorchers', 'heat': 'brisbane heat',
  'thunder': 'sydney thunder', 'renegades': 'melbourne renegades',
  'strikers': 'adelaide strikers', 'hurricanes': 'hobart hurricanes',

  // PSL
  'iu': 'islamabad united', 'kk': 'karachi kings',
  'lq': 'lahore qalandars', 'ms': 'multan sultans',
  'pz': 'peshawar zalmi', 'qg': 'quetta gladiators',

  // Common alternate names
  'windies': 'west indies', 'proteas': 'south africa',
  'kiwis': 'new zealand', 'black caps': 'new zealand',
  'tigers': 'bangladesh', 'lions': 'sri lanka',
};

function normalize(name: string): string {
  let n = name.toLowerCase().trim();
  // Remove common suffixes
  n = n.replace(/\s*(cricket|team|national|men'?s?|women'?s?)\s*/gi, ' ').trim();
  // Check aliases
  return TEAM_ALIASES[n] || n;
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  // Exact match
  if (na === nb) return 1.0;

  // One contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Word overlap
  const wordsA = na.split(/\s+/);
  const wordsB = nb.split(/\s+/);
  const common = wordsA.filter(w => wordsB.includes(w));
  if (common.length > 0) {
    return 0.7 * (common.length / Math.max(wordsA.length, wordsB.length));
  }

  return 0;
}

export function findBestStreamMatch(
  cricbuzzTitle: string,
  teams: { name: string }[],
  streamMatches: StreamMatch[]
): MatchCandidate | null {
  // Extract team names from Cricbuzz title (format: "Team A vs Team B, Match Description")
  const titleParts = cricbuzzTitle.split(',')[0]; // "Team A vs Team B"
  const titleTeams = titleParts.split(/\s+vs\s+/i).map(t => t.trim());

  // Build list of known team names from Cricbuzz data
  const cricbuzzTeams = [
    ...titleTeams,
    ...teams.map(t => t.name),
  ].filter(Boolean);

  let bestMatch: MatchCandidate | null = null;
  let bestScore = 0;

  for (const stream of streamMatches) {
    // Only match live or about-to-start matches
    if (stream.status !== 'MatchIng' && stream.status !== 'MatchNotStart') continue;

    const streamTeams = [stream.team1.name, stream.team2.name];

    // Try all combinations of team matching
    let team1Score = 0;
    let team2Score = 0;

    for (const ct of cricbuzzTeams) {
      const s1 = similarity(ct, streamTeams[0]);
      const s2 = similarity(ct, streamTeams[1]);
      team1Score = Math.max(team1Score, s1);
      team2Score = Math.max(team2Score, s2);
    }

    // Both teams should match
    const confidence = Math.min(team1Score, team2Score);

    if (confidence > bestScore) {
      bestScore = confidence;
      bestMatch = {
        streamMatchId: stream.id,
        confidence,
        team1: stream.team1.name,
        team2: stream.team2.name,
        playPath: stream.playPath,
        playSource: stream.playSource,
      };
    }
  }

  // Only return if confidence is above threshold
  if (bestMatch && bestScore >= 0.6) {
    console.log('[MatchMatcher] Best match:', bestMatch.team1, 'vs', bestMatch.team2, 'confidence:', bestScore);
    return bestMatch;
  }

  console.log('[MatchMatcher] No confident match found for:', cricbuzzTitle);
  return null;
}
