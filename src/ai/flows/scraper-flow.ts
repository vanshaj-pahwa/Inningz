

'use server';

import { z } from 'zod';
import * as cheerio from 'cheerio';
import { decodeHtmlEntities } from '@/lib/html-entities';
import { UPSTREAM_BASE_URL, UPSTREAM_STATIC_URL, UPSTREAM_IMG_URL, NEWS_FEED_URL, NEWS_ARTICLE_BASE_URLS, upstreamUrl, playerFaceImageUrl, teamFlagImageUrl } from '@/lib/upstream';

const CommentarySchema = z.object({
  type: z.enum(['live', 'user', 'stat', 'snippet']),
  text: z.string(),
  author: z.string().optional(),
  event: z.string().optional(),
  runs: z.number().optional(),
  milestone: z.string().optional(),
  overSummary: z.string().optional(),
  overRuns: z.number().optional(),
  overNumber: z.number().optional(),
  teamShortName: z.string().optional(),
  teamScore: z.number().optional(),
  teamWickets: z.number().optional(),
  headline: z.string().optional(),
  snippetType: z.string().optional(),
  overBatsmen: z.array(z.object({ name: z.string(), score: z.string() })).optional(),
  overBowler: z.object({ name: z.string(), figures: z.string() }).optional(),
});

const AwardPlayerSchema = z.object({
  name: z.string(),
  profileId: z.string().optional(),
  imageUrl: z.string().optional(),
});

const ScrapeCricbuzzUrlOutputSchema = z.object({
  title: z.string().describe('The title of the match.'),
  status: z.string().describe('The current status of the match.'),
  score: z.string().describe('The current score of the match.'),
  batsmen: z.array(z.object({
    name: z.string(),
    runs: z.string(),
    balls: z.string(),
    onStrike: z.boolean(),
    strikeRate: z.string(),
    fours: z.string(),
    sixes: z.string(),
    profileId: z.string().optional(),
    highlightsUrl: z.string().optional(),
  })).describe('The current batsmen.'),
  bowlers: z.array(z.object({
    name: z.string(),
    overs: z.string(),
    maidens: z.string(),
    runs: z.string(),
    wickets: z.string(),
    economy: z.string(),
    onStrike: z.boolean(),
    profileId: z.string().optional(),
    highlightsUrl: z.string().optional(),
  })).describe('The current bowlers.'),
  commentary: z.array(CommentarySchema).describe('The latest commentary, including live and user comments.'),
  previousInnings: z.array(z.object({
    teamName: z.string(),
    teamShortName: z.string().optional(),
    teamFlagUrl: z.string().optional(),
    score: z.string(),
  })).describe('The scores of the previous innings.'),
  currentRunRate: z.string(),
  requiredRunRate: z.string().optional(),
  partnership: z.string(),
  lastWicket: z.string(),
  recentOvers: z.string(),
  toss: z.string(),
  venue: z.string().optional(),
  venueUrl: z.string().optional(),
  date: z.string().optional(),
  oldestCommentaryTimestamp: z.number().optional(),
  matchStartTimestamp: z.number().optional(),
  currentInningsId: z.number().optional(),
  seriesName: z.string().optional(),
  seriesId: z.string().optional(),
  matchFormat: z.string().optional(),
  playerOfTheMatch: AwardPlayerSchema.optional(),
  playerOfTheSeries: AwardPlayerSchema.optional(),
  winProbability: z.object({
    team1: z.object({
      name: z.string(),
      probability: z.number(),
    }),
    team2: z.object({
      name: z.string(),
      probability: z.number(),
    }),
  }).optional(),
  hasPointsTable: z.boolean().optional(),
});

const LiveMatchSchema = z.object({
  title: z.string(),
  url: z.string(),
  matchId: z.string(),
  teams: z.array(z.object({
    name: z.string(),
    score: z.string().optional(),
    flagUrl: z.string().optional(),
    // Optional cricbuzz team id — populated by scrapers that have JSON access
    // to the match info (series, team schedule). Enables clicking a team name
    // in a match card to reach the team detail page.
    teamId: z.union([z.string(), z.number()]).optional(),
  })),
  status: z.string(),
  matchType: z.enum(['International', 'League', 'Domestic', 'Women']).optional(),
  matchFormat: z.string().optional(),
  seriesName: z.string().optional(),
  seriesUrl: z.string().optional(),
  venue: z.string().optional(),
  venueUrl: z.string().optional(),
  startDate: z.number().optional(),
  winProbability: z.object({
    team1: z.object({
      name: z.string(),
      probability: z.number(),
    }),
    team2: z.object({
      name: z.string(),
      probability: z.number(),
    }),
  }).optional(),
});

const FullScorecardBatsmanSchema = z.object({
  name: z.string(),
  dismissal: z.string(),
  runs: z.string(),
  balls: z.string(),
  fours: z.string(),
  sixes: z.string(),
  strikeRate: z.string(),
  profileId: z.string().optional(),
});

const FullScorecardBowlerSchema = z.object({
  name: z.string(),
  overs: z.string(),
  maidens: z.string(),
  runs: z.string(),
  wickets: z.string(),
  noBalls: z.string(),
  wides: z.string(),
  economy: z.string(),
  profileId: z.string().optional(),
});

const FullScorecardFowSchema = z.object({
  score: z.string(),
  player: z.string(),
  over: z.string(),
});

const PartnershipSchema = z.object({
  bat1Name: z.string(),
  bat1Runs: z.string(),
  bat1Balls: z.string(),
  bat2Name: z.string(),
  bat2Runs: z.string(),
  bat2Balls: z.string(),
  totalRuns: z.string(),
  totalBalls: z.string(),
});

const MatchInfoSchema = z.object({
  matchFormat: z.string().optional(),
  venue: z.string().optional(),
  tossResults: z.string().optional(),
  umpires: z.string().optional(),
  thirdUmpire: z.string().optional(),
  referee: z.string().optional(),
  seriesName: z.string().optional(),
  playerOfTheMatch: AwardPlayerSchema.optional(),
  playerOfTheSeries: AwardPlayerSchema.optional(),
});

const FullScorecardInningsSchema = z.object({
  name: z.string(),
  score: z.string(),
  battingTeamName: z.string(),
  bowlingTeamName: z.string(),
  batsmen: z.array(FullScorecardBatsmanSchema),
  bowlers: z.array(FullScorecardBowlerSchema),
  extras: z.string(),
  total: z.string(),
  yetToBat: z.array(z.string()),
  fallOfWickets: z.array(FullScorecardFowSchema),
  partnerships: z.array(PartnershipSchema),
});


const FullScorecardSchema = z.object({
  title: z.string(),
  status: z.string(),
  innings: z.array(FullScorecardInningsSchema),
  matchInfo: MatchInfoSchema.optional(),
});

const PlayerProfileInfoSchema = z.object({
  name: z.string(),
  country: z.string(),
  imageUrl: z.string().url().or(z.literal('')),
  personal: z.object({
    born: z.string(),
    birthPlace: z.string(),
    height: z.string(),
    role: z.string(),
    battingStyle: z.string(),
    bowlingStyle: z.string(),
  }),
  teams: z.string(),
});

const PlayerRankingSchema = z.object({
  test: z.string(),
  testBest: z.string().optional(),
  odi: z.string(),
  odiBest: z.string().optional(),
  t20: z.string(),
  t20Best: z.string().optional(),
});

// New format: stats organized by stat type (row) with format values (columns)
const BattingCareerSummarySchema = z.object({
  test: z.string(),
  odi: z.string(),
  t20: z.string(),
  ipl: z.string(),
});

const BattingStatsRowSchema = z.object({
  stat: z.string(),
  values: BattingCareerSummarySchema,
});

const BowlingCareerSummarySchema = z.object({
  test: z.string(),
  odi: z.string(),
  t20: z.string(),
  ipl: z.string(),
});

const BowlingStatsRowSchema = z.object({
  stat: z.string(),
  values: BowlingCareerSummarySchema,
});

// Keep old schemas for backward compatibility
const PlayerStatsSchema = z.object({
  format: z.string(),
  matches: z.string(),
  innings: z.string(),
  runs: z.string(),
  ballsFaced: z.string(),
  highest: z.string(),
  average: z.string(),
  strikeRate: z.string(),
  notOuts: z.string(),
  fours: z.string(),
  sixes: z.string(),
  fifties: z.string(),
  hundreds: z.string(),
  doubleHundreds: z.string(),
});

const PlayerBowlingStatsSchema = z.object({
  format: z.string(),
  matches: z.string(),
  innings: z.string(),
  balls: z.string(),
  runs: z.string(),
  wickets: z.string(),
  average: z.string(),
  economy: z.string(),
  strikeRate: z.string(),
  bbi: z.string(),
  bbm: z.string(),
  fiveWickets: z.string(),
  tenWickets: z.string(),
});

const RecentBattingFormSchema = z.object({
  opponent: z.string(),
  score: z.string(),
  format: z.string(),
  date: z.string(),
  matchUrl: z.string().optional(),
});

const RecentBowlingFormSchema = z.object({
  opponent: z.string(),
  wickets: z.string(),
  format: z.string(),
  date: z.string(),
  matchUrl: z.string().optional(),
});


const PlayerProfileSchema = z.object({
  info: PlayerProfileInfoSchema,
  bio: z.string(),
  rankings: z.object({
    batting: PlayerRankingSchema,
    bowling: PlayerRankingSchema,
    allRounder: PlayerRankingSchema.optional(),
  }),
  battingStats: z.array(PlayerStatsSchema),
  bowlingStats: z.array(PlayerBowlingStatsSchema),
  battingCareerSummary: z.array(BattingStatsRowSchema).optional(),
  bowlingCareerSummary: z.array(BowlingStatsRowSchema).optional(),
  recentForm: z.object({
    batting: z.array(RecentBattingFormSchema),
    bowling: z.array(RecentBowlingFormSchema),
  }).optional(),
});

const MatchStatsSchema = z.object({
  matchId: z.string(),
  title: z.string(),
  venue: z.string(),
  date: z.string(),
  toss: z.string(),
  result: z.string(),
  playerOfTheMatch: z.string().optional(),
  umpires: z.array(z.string()),
  referee: z.string().optional(),
  weather: z.string().optional(),
  pitchReport: z.string().optional(),
});

const SquadPlayerSchema = z.object({
  name: z.string(),
  role: z.string(),
  profileId: z.string().optional(),
  imageUrl: z.string().optional(),
  isCaptain: z.boolean().optional(),
  isWicketKeeper: z.boolean().optional(),
  isOverseas: z.boolean().optional(),
  isIn: z.boolean().optional(),
  isOut: z.boolean().optional(),
});

const TeamSquadSchema = z.object({
  teamName: z.string(),
  teamShortName: z.string(),
  teamFlagUrl: z.string().optional(),
  playingXI: z.array(SquadPlayerSchema),
  bench: z.array(SquadPlayerSchema),
});

const MatchSquadsSchema = z.object({
  team1: TeamSquadSchema,
  team2: TeamSquadSchema,
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
export type FullScorecard = z.infer<typeof FullScorecardSchema>;
export type LiveMatch = z.infer<typeof LiveMatchSchema>;
export type MatchStats = z.infer<typeof MatchStatsSchema>;
export type MatchSquads = z.infer<typeof MatchSquadsSchema>;
export type SquadPlayer = z.infer<typeof SquadPlayerSchema>;
export type AwardPlayer = z.infer<typeof AwardPlayerSchema>;

export type ScrapeCricbuzzUrlOutput = z.infer<
  typeof ScrapeCricbuzzUrlOutputSchema
>;
export type Commentary = z.infer<typeof CommentarySchema>;

export type PlayerHighlights = {
  playerName: string;
  playerScore: string;
  highlights: { over: string; text: string }[];
};

export type SeriesMatch = {
  title: string;
  matchUrl: string;
  matchId: string;
  status: string;
  isLive: boolean;
};

export type CricketSeries = {
  name: string;
  dateRange: string;
  seriesUrl: string;
  seriesId: string;
  category: 'international' | 'league' | 'domestic' | 'women';
};

export type SeriesSchedule = {
  months: {
    name: string;
    series: CricketSeries[];
  }[];
};

export type SeriesStatEntry = {
  playerId: string;
  playerName: string;
  values: Record<string, string>;
};

export type SeriesStatCategory = {
  key: string;
  name: string;
  category: 'Batting' | 'Bowling';
  headers: string[];
  entries: SeriesStatEntry[];
};

export type SeriesStatsType = {
  statsTypes: { value?: string; header: string; category?: string }[];
  formats: { matchTypeId: string; matchTypeDesc: string }[];
};

export type PointsTableMatch = {
  matchId: number;
  matchName: string;
  opponent: string;
  opponentShortName: string;
  result: string;
  date: string;
  won: boolean;
};

export type PointsTableTeam = {
  teamFullName: string;
  teamName: string;
  teamId: number;
  teamImageId?: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesTied: number;
  noRes: number;
  matchesDrawn: number;
  nrr: string;
  points: number;
  form: string[];
  teamQualifyStatus: string;
  matches: PointsTableMatch[];
};

export type PointsTableGroup = {
  groupName: string;
  teams: PointsTableTeam[];
};

export type PointsTableData = {
  seriesName: string;
  matchType: string;
  groups: PointsTableGroup[];
} | null;

export type OverData = {
  overNumber: number;
  runs: number;
  wickets: number;
  cumulativeScore: number;
  cumulativeWickets: number;
  overSummary: string;
};

export type InningsOverData = {
  inningsId: number;
  teamName: string;
  overs: OverData[];
};

export type PartnershipEntry = {
  bat1Name: string;
  bat2Name: string;
  bat1Runs: number;
  bat2Runs: number;
  bat1Balls: number;
  bat2Balls: number;
  bat1ImageId: number;
  bat2ImageId: number;
  totalRuns: number;
  totalBalls: number;
};

export type PartnershipInnings = {
  inningsId: number;
  teamName: string;
  teamShortName: string;
  partnerships: PartnershipEntry[];
};

export type BallMapBall = {
  overNum: number;
  ballLabel: string;
  runs: number;
  event: string;
  batsmanId: number;
  bowlerId: number;
};

export type BallMapBatter = {
  batId: number;
  batName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
};

export type BallMapBowler = {
  bowlerId: number;
  bowlName: string;
  overs: number;
  runs: number;
  wickets: number;
  economy: number;
};

export type BallMapData = {
  inningsId: number;
  balls: BallMapBall[];
  batters: BallMapBatter[];
  bowlers: BallMapBowler[];
  scoreDetails: {
    runs: number;
    wickets: number;
    overs: number;
  };
};

export type WinProbPoint = {
  over: number;
  innings: number;
  team1Name: string;
  team1Prob: number;
  team2Name: string;
  team2Prob: number;
  // Test-match draw/tie probability (the source emits a `draw` field per point).
  // 0 (or absent) for limited-overs formats where a draw isn't possible.
  drawProb?: number;
  isTeam1Wicket: boolean;
  isTeam2Wicket: boolean;
  wicketCommentary?: string;
};

export type WinProbHistory = {
  team1Name: string;
  team2Name: string;
  team1Color: string;
  team2Color: string;
  points: WinProbPoint[];
};

function extractMatchId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/live-cricket-scores\/(\d+)/);
  if (match) return match[1];

  const matchScorecard = url.match(/\/cricket-scores\/(\d+)/);
  return matchScorecard ? matchScorecard[1] : null;
}

function extractProfileId(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/profiles\/(\d+)/);
  return match ? match[1] : undefined;
}


export async function getPlayerProfile(profileId: string, playerName?: string): Promise<PlayerProfile> {
  // Build URL with player name slug if provided
  let url = `${UPSTREAM_BASE_URL}/profiles/${profileId}`;
  if (playerName) {
    const slug = playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    url = `${UPSTREAM_BASE_URL}/profiles/${profileId}/${slug}`;
  }

  // Helper function to create a minimal profile with just the name
  const createMinimalProfile = (name: string): PlayerProfile => ({
    info: {
      name: name,
      country: '',
      imageUrl: playerFaceImageUrl(profileId),
      personal: {
        born: '--',
        birthPlace: '--',
        height: '--',
        role: '--',
        battingStyle: '--',
        bowlingStyle: '--',
      },
      teams: '--',
    },
    bio: '',
    rankings: {
      batting: { test: '--', testBest: '--', odi: '--', odiBest: '--', t20: '--', t20Best: '--' },
      bowling: { test: '--', testBest: '--', odi: '--', odiBest: '--', t20: '--', t20Best: '--' },
      allRounder: { test: '--', testBest: '--', odi: '--', odiBest: '--', t20: '--', t20Best: '--' },
    },
    battingStats: [],
    bowlingStats: [],
  });

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    // If fetch fails but we have a player name, return minimal profile
    if (playerName) {
      console.log('[Player Profile] Fetch failed, returning minimal profile for:', playerName);
      return createMinimalProfile(playerName);
    }
    throw new Error(`Failed to fetch player profile: ${response.statusText}`);
  }

  const html = await response.text();

  // Check if player was not found
  if (html.includes('Player Not Found') || html.includes('player you&#x27;re looking for')) {
    if (playerName) {
      console.log('[Player Profile] Player not found on Cricbuzz, returning minimal profile for:', playerName);
      return createMinimalProfile(playerName);
    }
    throw new Error('Player not found');
  }

  // Try to extract JSON data from Next.js page
  try {
    // Try multiple patterns to find the player data
    let scriptMatch = html.match(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g);

    if (!scriptMatch) {
      // Try alternative pattern
      scriptMatch = html.match(/17:\["[^"]*",\s*"div"[^]+?playerBattingStats[^]+?playerBowlingStats[^]+?\]\)/);
    }

    if (scriptMatch) {
      // Combine all script matches and look for player data
      const combinedScript = Array.isArray(scriptMatch) ? scriptMatch.join('') : scriptMatch[0];

      // Extract the JSON string from within the script
      const jsonStrMatch = combinedScript.match(/\{\\?"playerData\\?":\{[^]+?playerBowlingStats\\?":\{[^]+?\}\}/);

      if (jsonStrMatch) {
        // Clean up the escaped JSON
        let jsonStr = jsonStrMatch[0]
          .replace(/\\"/g, '"')
          .replace(/\\\\"/g, '\\"')
          .replace(/\\u003c/g, '<')
          .replace(/\\u003e/g, '>')
          .replace(/\\u0026/g, '&');

        const data = JSON.parse(jsonStr);
        const playerData = data.playerData || {};

        const name = playerData.name || '';
        const country = playerData.intlTeam || '';
        const imageUrl = playerData.image || (playerData.faceImageId ? `${UPSTREAM_IMG_URL}/c-img/faceImages/${playerData.faceImageId}.jpg` : '');

        const personal = {
          born: playerData.DoB || playerData.DoBFormat || '--',
          birthPlace: playerData.birthPlace || '--',
          height: '--',
          role: playerData.role || '--',
          battingStyle: playerData.bat || '--',
          bowlingStyle: playerData.bowl || '--',
        };

        const teams = playerData.teams || '--';

        const rankings = {
          batting: {
            test: playerData.rankings?.bat?.testRank || '--',
            testBest: playerData.rankings?.bat?.testBestRank || '--',
            odi: playerData.rankings?.bat?.odiRank || '--',
            odiBest: playerData.rankings?.bat?.odiBestRank || '--',
            t20: playerData.rankings?.bat?.t20Rank || '--',
            t20Best: playerData.rankings?.bat?.t20BestRank || '--',
          },
          bowling: {
            test: playerData.rankings?.bowl?.testRank || '--',
            testBest: playerData.rankings?.bowl?.testBestRank || '--',
            odi: playerData.rankings?.bowl?.odiRank || '--',
            odiBest: playerData.rankings?.bowl?.odiBestRank || '--',
            t20: playerData.rankings?.bowl?.t20Rank || '--',
            t20Best: playerData.rankings?.bowl?.t20BestRank || '--',
          },
          allRounder: {
            test: playerData.rankings?.all?.testRank || '--',
            testBest: playerData.rankings?.all?.testBestRank || '--',
            odi: playerData.rankings?.all?.odiRank || '--',
            odiBest: playerData.rankings?.all?.odiBestRank || '--',
            t20: playerData.rankings?.all?.t20Rank || '--',
            t20Best: playerData.rankings?.all?.t20BestRank || '--',
          },
        };

        const bio = playerData.bio || '';

        // Batting stats
        const battingStats: z.infer<typeof PlayerStatsSchema>[] = [];
        const battingData = data.playerBattingStats;
        if (battingData && battingData.values) {
          const formats = ['Test', 'ODI', 'T20', 'IPL'];
          const getStatValue = (label: string, formatIndex: number) => {
            const row = battingData.values.find((r: any) => r.values[0] === label);
            return row ? row.values[formatIndex + 1] : '0';
          };

          formats.forEach((format, idx) => {
            const matches = getStatValue('Matches', idx);
            if (matches !== '0') {
              battingStats.push({
                format,
                matches,
                innings: getStatValue('Innings', idx),
                runs: getStatValue('Runs', idx),
                ballsFaced: getStatValue('Balls', idx),
                highest: getStatValue('Highest', idx),
                average: getStatValue('Average', idx),
                strikeRate: getStatValue('SR', idx),
                notOuts: getStatValue('Not Out', idx),
                fours: getStatValue('Fours', idx),
                sixes: getStatValue('Sixes', idx),
                fifties: getStatValue('50s', idx),
                hundreds: getStatValue('100s', idx),
                doubleHundreds: getStatValue('200s', idx),
              });
            }
          });
        }

        // Bowling stats
        const bowlingStats: z.infer<typeof PlayerBowlingStatsSchema>[] = [];
        const bowlingData = data.playerBowlingStats;
        if (bowlingData && bowlingData.values) {
          const formats = ['Test', 'ODI', 'T20', 'IPL'];
          const getStatValue = (label: string, formatIndex: number) => {
            const row = bowlingData.values.find((r: any) => r.values[0] === label);
            return row ? row.values[formatIndex + 1] : '0';
          };

          formats.forEach((format, idx) => {
            const matches = getStatValue('Matches', idx);
            if (matches !== '0') {
              bowlingStats.push({
                format,
                matches,
                innings: getStatValue('Innings', idx),
                balls: getStatValue('Balls', idx),
                runs: getStatValue('Runs', idx),
                wickets: getStatValue('Wickets', idx),
                average: getStatValue('Avg', idx),
                economy: getStatValue('Eco', idx),
                strikeRate: getStatValue('SR', idx),
                bbi: getStatValue('BBI', idx),
                bbm: getStatValue('BBM', idx),
                fiveWickets: getStatValue('5w', idx),
                tenWickets: getStatValue('10w', idx),
              });
            }
          });
        }


        console.log('[Player Profile] Extracted from JSON:', {
          name,
          country,
          bioLength: bio.length,
          battingStatsCount: battingStats.length,
          bowlingStatsCount: bowlingStats.length,
        });

        return PlayerProfileSchema.parse({
          info: { name, country, imageUrl, personal, teams },
          bio,
          rankings,
          battingStats,
          bowlingStats,
        });
      }
    }
  } catch (jsonError) {
    console.log('[Player Profile] JSON extraction failed, falling back to HTML scraping', jsonError);
  }

  // Fallback to HTML scraping
  const $ = cheerio.load(html);

  // Extract player name from the new header structure
  // New format: <span class="text-xl font-bold text-[#000000DE]">Zak Crawley</span>
  let name = $('span.text-xl.font-bold').first().text().trim();
  if (!name) {
    // Try old selectors
    name = $('span.tb\\:font-bold.wb\\:text-xl.wb\\:mt-1').first().text().trim();
  }
  if (!name) {
    name = $('h1').first().text().trim();
  }
  // Use playerName as final fallback
  if (!name && playerName) {
    name = playerName;
  }

  // Extract country from the new structure
  // New format: <div class="inline-flex items-center"><span class="text-base text-gray-800">England</span></div>
  let country = $('.inline-flex.items-center').first().find('.text-base.text-gray-800, .text-base').first().text().trim();
  if (!country) {
    // Try old selectors
    country = $('.flex.items-center.w-full.justify-center').first().find('.text-xs.text-cbItmBkgDark, .wb\\:text-base').first().text().trim();
  }
  if (!country) {
    country = $('h3.cb-font-18.text-gray').first().text().trim();
  }

  // Extract image URL from the new structure
  // New format: <img srcset="https://static.the source.com/a/img/v1/i1/c717783/zak-crawley.jpg...">
  let imageUrl = '';
  // Try new structure first - look for player image in the header card
  const headerImg = $('.rounded-lg.overflow-hidden img, .w-16.h-16 img').first();
  let imgSrc = headerImg.attr('src') || headerImg.attr('srcset')?.split(' ')[0];

  if (!imgSrc) {
    // Try old selectors
    imgSrc = $('.h-avatarLarge.w-avatarLarge img, .wb\\:rounded-full').attr('src') || $('.h-avatarLarge.w-avatarLarge img, .wb\\:rounded-full').attr('srcset')?.split(' ')[0];
  }

  if (imgSrc) {
    if (imgSrc.startsWith('http')) {
      imageUrl = imgSrc;
    } else if (imgSrc.startsWith('//')) {
      imageUrl = `https:${imgSrc}`;
    } else {
      imageUrl = `${UPSTREAM_BASE_URL}${imgSrc}`;
    }
  }

  // If still no image, construct from profile ID
  if (!imageUrl && profileId) {
    imageUrl = playerFaceImageUrl(profileId);
  }

  // Extract personal information from the new structure
  const getPersonalInfo = (label: string): string => {
    let value = '';

    // Try new structure with flex layout (the source's current HTML)
    // Each row has: label div (w-1/3) and value div (w-2/3 flex-grow)
    $('div.flex.gap-4').each((_, row) => {
      const $row = $(row);
      const $children = $row.children('div');
      if ($children.length >= 2) {
        const labelText = $children.first().text().trim();
        if (labelText.toLowerCase() === label.toLowerCase()) {
          value = $children.last().text().trim();
          return false; // break
        }
      }
    });

    // Fallback to old structure
    if (!value) {
      const text = $(`.cb-col-40:contains("${label}")`).next().text().trim();
      value = text || '--';
    }

    return value || '--';
  };

  const personal = {
    born: getPersonalInfo('Born'),
    birthPlace: getPersonalInfo('Birth Place'),
    height: getPersonalInfo('Height') || '--',
    role: getPersonalInfo('Role'),
    battingStyle: getPersonalInfo('Batting Style'),
    bowlingStyle: getPersonalInfo('Bowling Style') || '--',
  };

  // Extract teams
  let teams = getPersonalInfo('Teams');
  if (teams === '--') {
    teams = $('.w-full.tb\\:flex-col.hidden.tb\\:flex .tb\\:font-bold').text().trim() || '--';
  }

  // Extract ICC Rankings from embedded Next.js JSON data
  // Rankings are in the self.__next_f.push scripts under playerData.rankings
  const emptyRanking = (): z.infer<typeof PlayerRankingSchema> => ({
    test: '--', testBest: '--', odi: '--', odiBest: '--', t20: '--', t20Best: '--'
  });
  let battingRankings = emptyRanking();
  let bowlingRankings = emptyRanking();
  let allRounderRankings = emptyRanking();

  try {
    // Extract inner content from self.__next_f.push calls and unescape
    const innerParts: string[] = [];
    for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
      innerParts.push(m[1]);
    }
    const unescaped = innerParts.join('')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    // Find the rankings JSON object inside playerData
    const rankingsKey = '"rankings":{"bat"';
    const rIdx = unescaped.indexOf(rankingsKey);
    if (rIdx >= 0) {
      const objStart = rIdx + '"rankings":'.length;
      // Balance braces to extract the full rankings object
      let depth = 0, end = 0;
      for (let i = objStart; i < unescaped.length; i++) {
        if (unescaped[i] === '{') depth++;
        else if (unescaped[i] === '}') depth--;
        if (depth === 0 && i > objStart) { end = i + 1; break; }
      }
      const rankingsData = JSON.parse(unescaped.substring(objStart, end));

      battingRankings = {
        test: rankingsData.bat?.testRank || '--',
        testBest: rankingsData.bat?.testBestRank || '--',
        odi: rankingsData.bat?.odiRank || '--',
        odiBest: rankingsData.bat?.odiBestRank || '--',
        t20: rankingsData.bat?.t20Rank || '--',
        t20Best: rankingsData.bat?.t20BestRank || '--',
      };
      bowlingRankings = {
        test: rankingsData.bowl?.testRank || '--',
        testBest: rankingsData.bowl?.testBestRank || '--',
        odi: rankingsData.bowl?.odiRank || '--',
        odiBest: rankingsData.bowl?.odiBestRank || '--',
        t20: rankingsData.bowl?.t20Rank || '--',
        t20Best: rankingsData.bowl?.t20BestRank || '--',
      };
      allRounderRankings = {
        test: rankingsData.all?.testRank || '--',
        testBest: rankingsData.all?.testBestRank || '--',
        odi: rankingsData.all?.odiRank || '--',
        odiBest: rankingsData.all?.odiBestRank || '--',
        t20: rankingsData.all?.t20Rank || '--',
        t20Best: rankingsData.all?.t20BestRank || '--',
      };
    }
  } catch (rankErr) {
    console.log('[Player Profile] Rankings extraction from JSON failed, trying HTML', rankErr);
  }

  // Fallback: try to get batting rankings from HTML table if JSON extraction missed them
  if (battingRankings.test === '--' && battingRankings.odi === '--' && battingRankings.t20 === '--') {
    $('table').each((_, table) => {
      const $table = $(table);
      const headers = $table.find('thead th').map((_, th) => $(th).text().trim().toUpperCase()).get();
      if (headers.includes('FORMAT') && headers.includes('CURRENT RANK') && headers.includes('BEST RANK')) {
        $table.find('tbody tr').each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            const format = cells.eq(0).text().trim().toLowerCase();
            const currentRank = cells.eq(1).find('span').first().text().trim() || cells.eq(1).text().trim();
            const bestRank = cells.eq(2).text().trim();
            if (format === 'test') { battingRankings.test = currentRank || '--'; battingRankings.testBest = bestRank || '--'; }
            else if (format === 'odi') { battingRankings.odi = currentRank || '--'; battingRankings.odiBest = bestRank || '--'; }
            else if (format === 't20i') { battingRankings.t20 = currentRank || '--'; battingRankings.t20Best = bestRank || '--'; }
          }
        });
        return false;
      }
    });
  }

  // Get bio from the Overview section - try multiple selectors
  let bio = '';
  
  // Try the new structure first - section#player-bio
  const playerBioSection = $('#player-bio div.px-4').html();
  if (playerBioSection && playerBioSection.length > 50) {
    bio = playerBioSection;
  }
  
  // Try other selectors if not found
  if (!bio) {
    const bioSelectors = [
      '.cb-player-description',
      '.cb-col-100.cb-col.cb-player-bio',
      '[class*="player-bio"]',
      'section[id*="bio"] div',
      'div.text-sm.leading-relaxed',
      'p.text-gray-700'
    ];
    
    for (const selector of bioSelectors) {
      const content = $(selector).html();
      if (content && content.length > 50) {
        bio = content;
        break;
      }
    }
  }

  // If still no bio, try to extract from script data
  if (!bio) {
    const scriptContent = $('script').text();
    const bioMatch = scriptContent.match(/"bio":"([^"]+)"/);
    if (bioMatch && bioMatch[1]) {
      bio = bioMatch[1]
        .replace(/\\n/g, '<br>')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
    }
  }

  const battingStats: z.infer<typeof PlayerStatsSchema>[] = [];
  const battingCareerSummary: z.infer<typeof BattingStatsRowSchema>[] = [];

  // Extract career summary — the source uses a div (not h3) with text "Batting Career Summary"
  // followed by a table with grid-cols-6 layout: [stat(col-span-2), Test, ODI, T20, IPL]
  $('div').filter((_, el) => {
    const text = $(el).text().trim();
    return text === 'Batting Career Summary' && $(el).children().length === 0;
  }).each((_, el) => {
    // Find the closest parent that contains a table
    const $table = $(el).closest('div.wb\\:border, div.flex-col').find('table').first();
    if ($table.length === 0) return;

    const headers = $table.find('thead th').map((_, th) => $(th).text().trim()).get();
    if (headers.includes('Test') && headers.includes('ODI')) {
      $table.find('tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 5) {
          const statName = cells.eq(0).text().trim();
          if (statName && statName !== '') {
            battingCareerSummary.push({
              stat: statName,
              values: {
                test: cells.eq(1).text().trim() || '0',
                odi: cells.eq(2).text().trim() || '0',
                t20: cells.eq(3).text().trim() || '0',
                ipl: cells.eq(4).text().trim() || '0',
              },
            });
          }
        }
      });
      return false;
    }
  });

  // Fallback: find any table preceded by text containing "Batting Career Summary"
  if (battingCareerSummary.length === 0) {
    $('table').each((_, table) => {
      const $table = $(table);
      const headers = $table.find('thead th').map((_, th) => $(th).text().trim()).get();
      if (!headers.includes('Test') || !headers.includes('ODI')) return;

      // Check if a parent/sibling contains "Batting Career Summary"
      const parentText = $table.parent().text().substring(0, 100);
      if (!parentText.includes('Batting Career Summary') && !parentText.includes('Batting')) return;

      $table.find('tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 5) {
          const statName = cells.eq(0).text().trim();
          if (statName && statName !== '') {
            battingCareerSummary.push({
              stat: statName,
              values: {
                test: cells.eq(1).text().trim() || '0',
                odi: cells.eq(2).text().trim() || '0',
                t20: cells.eq(3).text().trim() || '0',
                ipl: cells.eq(4).text().trim() || '0',
              },
            });
          }
        }
      });
      if (battingCareerSummary.length > 0) return false;
    });
  }
  
  // Try to find batting stats table by looking for specific text (old format)
  let battingTable = $('h3:contains("Batting Career Summary"), h3:contains("BATTING CAREER SUMMARY")').next('table');
  
  if (battingTable.length === 0) {
    // Try finding any table with batting-related headers
    $('table').each((_, table) => {
      const $table = $(table);
      const headers = $table.find('thead th, thead td').map((_, th) => $(th).text().trim().toLowerCase()).get();
      
      // Check if this is a batting stats table
      if (headers.includes('m') && headers.includes('runs') && headers.includes('avg')) {
        battingTable = $table;
        return false; // break
      }
    });
  }
  
  if (battingTable.length > 0) {
    battingTable.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      if (cells.length >= 10) {
        const format = cells.eq(0).text().trim();
        if (format && format !== 'Format' && format !== '') {
          battingStats.push({
            format,
            matches: cells.eq(1).text().trim() || '0',
            innings: cells.eq(2).text().trim() || '0',
            notOuts: cells.eq(3).text().trim() || '0',
            runs: cells.eq(4).text().trim() || '0',
            ballsFaced: cells.eq(5).text().trim() || '0',
            highest: cells.eq(6).text().trim() || '0',
            average: cells.eq(7).text().trim() || '0',
            strikeRate: cells.eq(8).text().trim() || '0',
            fours: cells.eq(9).text().trim() || '0',
            sixes: cells.eq(10).text().trim() || '0',
            fifties: cells.eq(11).text().trim() || '0',
            hundreds: cells.eq(12).text().trim() || '0',
            doubleHundreds: cells.eq(13).text().trim() || '0',
          });
        }
      }
    });
  }

  // Fallback to old structure
  if (battingStats.length === 0) {
    const battingTable = $('.cb-plyr-tbl:contains("Batting Career Summary") table');
    battingTable.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const columns = $row.find('td');
      if (columns.length === 14) {
        battingStats.push({
          format: columns.eq(0).text().trim(),
          matches: columns.eq(1).text().trim(),
          innings: columns.eq(2).text().trim(),
          runs: columns.eq(3).text().trim(),
          ballsFaced: columns.eq(4).text().trim(),
          highest: columns.eq(5).text().trim(),
          average: columns.eq(6).text().trim(),
          strikeRate: columns.eq(7).text().trim(),
          notOuts: columns.eq(8).text().trim(),
          fours: columns.eq(9).text().trim(),
          sixes: columns.eq(10).text().trim(),
          fifties: columns.eq(11).text().trim(),
          hundreds: columns.eq(12).text().trim(),
          doubleHundreds: columns.eq(13).text().trim(),
        });
      }
    });
  }

  const bowlingStats: z.infer<typeof PlayerBowlingStatsSchema>[] = [];
  const bowlingCareerSummary: z.infer<typeof BowlingStatsRowSchema>[] = [];

  // Extract bowling career summary — same structure as batting
  $('div').filter((_, el) => {
    const text = $(el).text().trim();
    return text === 'Bowling Career Summary' && $(el).children().length === 0;
  }).each((_, el) => {
    const $table = $(el).closest('div.wb\\:border, div.flex-col').find('table').first();
    if ($table.length === 0) return;

    const headers = $table.find('thead th').map((_, th) => $(th).text().trim()).get();
    if (headers.includes('Test') && headers.includes('ODI')) {
      $table.find('tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 5) {
          const statName = cells.eq(0).text().trim();
          if (statName && statName !== '') {
            bowlingCareerSummary.push({
              stat: statName,
              values: {
                test: cells.eq(1).text().trim() || '0',
                odi: cells.eq(2).text().trim() || '0',
                t20: cells.eq(3).text().trim() || '0',
                ipl: cells.eq(4).text().trim() || '0',
              },
            });
          }
        }
      });
      return false;
    }
  });

  // Fallback: find table near "Bowling Career Summary" text
  if (bowlingCareerSummary.length === 0) {
    $('table').each((_, table) => {
      const $table = $(table);
      const headers = $table.find('thead th').map((_, th) => $(th).text().trim()).get();
      if (!headers.includes('Test') || !headers.includes('ODI')) return;

      const parentText = $table.parent().text().substring(0, 100);
      if (!parentText.includes('Bowling Career Summary') && !parentText.includes('Bowling')) return;

      $table.find('tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 5) {
          const statName = cells.eq(0).text().trim();
          if (statName && statName !== '') {
            bowlingCareerSummary.push({
              stat: statName,
              values: {
                test: cells.eq(1).text().trim() || '0',
                odi: cells.eq(2).text().trim() || '0',
                t20: cells.eq(3).text().trim() || '0',
                ipl: cells.eq(4).text().trim() || '0',
              },
            });
          }
        }
      });
      if (bowlingCareerSummary.length > 0) return false;
    });
  }
  
  // Try to find bowling stats table by looking for specific text (old format)
  let bowlingTable = $('h3:contains("Bowling Career Summary"), h3:contains("BOWLING CAREER SUMMARY")').next('table');
  
  if (bowlingTable.length === 0) {
    // Try finding any table with bowling-related headers
    $('table').each((_, table) => {
      const $table = $(table);
      const headers = $table.find('thead th, thead td').map((_, th) => $(th).text().trim().toLowerCase()).get();
      
      // Check if this is a bowling stats table (and not the batting table we already found)
      if ((headers.includes('wkts') || headers.includes('wickets')) && !headers.includes('runs')) {
        bowlingTable = $table;
        return false; // break
      }
    });
  }
  
  if (bowlingTable.length > 0) {
    bowlingTable.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      if (cells.length >= 10) {
        const format = cells.eq(0).text().trim();
        if (format && format !== 'Format' && format !== '' && !battingStats.find(s => s.format === format)) {
          bowlingStats.push({
            format,
            matches: cells.eq(1).text().trim() || '0',
            innings: cells.eq(2).text().trim() || '0',
            balls: cells.eq(3).text().trim() || '0',
            runs: cells.eq(4).text().trim() || '0',
            wickets: cells.eq(5).text().trim() || '0',
            average: cells.eq(6).text().trim() || '0',
            economy: cells.eq(7).text().trim() || '0',
            strikeRate: cells.eq(8).text().trim() || '0',
            bbi: cells.eq(9).text().trim() || '0',
            bbm: cells.eq(10).text().trim() || '0',
            fiveWickets: cells.eq(11).text().trim() || '0',
            tenWickets: cells.eq(12).text().trim() || '0',
          });
        }
      }
    });
  }

  // Fallback to old structure
  if (bowlingStats.length === 0) {
    const bowlingTable = $('.cb-plyr-tbl:contains("Bowling Career Summary") table');
    bowlingTable.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const columns = $row.find('td');
      if (columns.length === 13) {
        bowlingStats.push({
          format: columns.eq(0).text().trim(),
          matches: columns.eq(1).text().trim(),
          innings: columns.eq(2).text().trim(),
          balls: columns.eq(3).text().trim(),
          runs: columns.eq(4).text().trim(),
          wickets: columns.eq(5).text().trim(),
          average: columns.eq(6).text().trim(),
          economy: columns.eq(7).text().trim(),
          strikeRate: columns.eq(8).text().trim(),
          bbi: columns.eq(9).text().trim(),
          bbm: columns.eq(10).text().trim(),
          fiveWickets: columns.eq(11).text().trim(),
          tenWickets: columns.eq(12).text().trim(),
        });
      }
    });
  }

  // Extract Recent Form
  const recentBattingForm: z.infer<typeof RecentBattingFormSchema>[] = [];
  const recentBowlingForm: z.infer<typeof RecentBowlingFormSchema>[] = [];

  // Find Recent Form — the source uses div containers with "Batting Form" / "Bowling Form" headers
  // Each match row is an <a> with flex children in order: Score, OPPN, Format, Date
  $('div').filter((_, el) => {
    const text = $(el).text().trim();
    return text === 'Batting Form' && $(el).children().length === 0;
  }).each((_, el) => {
    const $container = $(el).closest('div.flex-col, div.w-1\\/2');
    if ($container.length === 0) return;

    $container.find('a[href*="/live-cricket-scores/"], a[href*="/cricket-scores/"]').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('> div');
      if (cells.length >= 4) {
        recentBattingForm.push({
          score: cells.eq(0).find('span').text().trim() || cells.eq(0).text().trim(),
          opponent: cells.eq(1).find('span').text().trim() || cells.eq(1).text().trim(),
          format: cells.eq(2).find('span').text().trim() || cells.eq(2).text().trim(),
          date: cells.eq(3).find('span').text().trim() || cells.eq(3).text().trim(),
          matchUrl: $row.attr('href') || undefined,
        });
      }
    });
    return false;
  });

  $('div').filter((_, el) => {
    const text = $(el).text().trim();
    return text === 'Bowling Form' && $(el).children().length === 0;
  }).each((_, el) => {
    const $container = $(el).closest('div.flex-col, div.w-1\\/2');
    if ($container.length === 0) return;

    $container.find('a[href*="/live-cricket-scores/"], a[href*="/cricket-scores/"]').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('> div');
      if (cells.length >= 4) {
        recentBowlingForm.push({
          wickets: cells.eq(0).find('span').text().trim() || cells.eq(0).text().trim(),
          opponent: cells.eq(1).find('span').text().trim() || cells.eq(1).text().trim(),
          format: cells.eq(2).find('span').text().trim() || cells.eq(2).text().trim(),
          date: cells.eq(3).find('span').text().trim() || cells.eq(3).text().trim(),
          matchUrl: $row.attr('href') || undefined,
        });
      }
    });
    return false;
  });

  console.log('[Player Profile] Extracted from HTML:', {
    name,
    country,
    bioLength: bio.length,
    battingStatsCount: battingStats.length,
    bowlingStatsCount: bowlingStats.length,
    recentBattingFormCount: recentBattingForm.length,
    recentBowlingFormCount: recentBowlingForm.length,
  });

  return PlayerProfileSchema.parse({
    info: { name, country, imageUrl, personal, teams },
    bio,
    rankings: {
      batting: battingRankings,
      bowling: bowlingRankings,
      allRounder: allRounderRankings
    },
    battingStats,
    bowlingStats,
    battingCareerSummary: battingCareerSummary.length > 0 ? battingCareerSummary : undefined,
    bowlingCareerSummary: bowlingCareerSummary.length > 0 ? bowlingCareerSummary : undefined,
    recentForm: recentBattingForm.length > 0 || recentBowlingForm.length > 0 ? {
      batting: recentBattingForm,
      bowling: recentBowlingForm,
    } : undefined,
  });
}


export async function getFullScorecard(matchId: string): Promise<FullScorecard> {
  // Use the scorecard API endpoint
  const url = `${UPSTREAM_BASE_URL}/api/mcenter/scorecard/${matchId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch scorecard: ${response.statusText}`);
  }

  const data = await response.json();

  const matchHeader = data.matchHeader;
  const title = matchHeader ? `${matchHeader.team1.name} vs ${matchHeader.team2.name}` : 'Match';
  const status = data.status || matchHeader?.status || '';
  const innings: FullScorecard['innings'] = [];

  // Parse match info from matchHeader
  const matchInfo: z.infer<typeof MatchInfoSchema> = {};
  if (matchHeader) {
    matchInfo.matchFormat = matchHeader.matchFormat;
    matchInfo.seriesName = matchHeader.seriesName;

    // Build toss results string
    if (matchHeader.tossResults) {
      const tossWinner = matchHeader.tossResults.tossWinnerName;
      const decision = matchHeader.tossResults.decision;
      matchInfo.tossResults = `${tossWinner} won the toss and chose to ${decision.toLowerCase()}`;
    }
    matchInfo.playerOfTheMatch = extractAwardPlayer(matchHeader.playersOfTheMatch);
    matchInfo.playerOfTheSeries = extractAwardPlayer(matchHeader.playersOfTheSeries);
  }

  // Try to get venue info from a separate API call
  try {
    const venueUrl = `${UPSTREAM_BASE_URL}/api/mcenter/venue/${matchId}`;
    const venueResponse = await fetch(venueUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    if (venueResponse.ok) {
      const venueData = await venueResponse.json();
      if (venueData.venue) {
        matchInfo.venue = venueData.venue.name;
      }
      if (venueData.umpire1 && venueData.umpire2) {
        matchInfo.umpires = `${venueData.umpire1}, ${venueData.umpire2}`;
      }
      if (venueData.umpire3) {
        matchInfo.thirdUmpire = venueData.umpire3;
      }
      if (venueData.referee) {
        matchInfo.referee = venueData.referee;
      }
    }
  } catch (error) {
  }

  // Process each innings
  if (data.scoreCard && Array.isArray(data.scoreCard)) {
    for (const inning of data.scoreCard) {
      const batTeam = inning.batTeamDetails;
      const bowlTeam = inning.bowlTeamDetails;

      if (!batTeam) continue;

      const battingTeamName = batTeam.batTeamName || '';
      const bowlingTeamName = bowlTeam?.bowlTeamName || '';
      const score = `${inning.scoreDetails?.runs || 0}-${inning.scoreDetails?.wickets || 0} (${inning.scoreDetails?.overs || 0} Ov)`;

      // Parse batsmen
      const batsmen: z.infer<typeof FullScorecardBatsmanSchema>[] = [];
      if (batTeam.batsmenData) {
        for (const key of Object.keys(batTeam.batsmenData)) {
          const bat = batTeam.batsmenData[key];
          if (bat.batName && (bat.runs > 0 || bat.balls > 0 || bat.outDesc === 'batting')) {
            batsmen.push({
              name: bat.batName,
              dismissal: bat.outDesc || '',
              runs: String(bat.runs || 0),
              balls: String(bat.balls || 0),
              fours: String(bat.fours || 0),
              sixes: String(bat.sixes || 0),
              strikeRate: String(bat.strikeRate || 0),
              profileId: bat.batId ? String(bat.batId) : undefined,
            });
          }
        }
      }

      // Parse bowlers
      const bowlers: z.infer<typeof FullScorecardBowlerSchema>[] = [];
      if (bowlTeam?.bowlersData) {
        for (const key of Object.keys(bowlTeam.bowlersData)) {
          const bowl = bowlTeam.bowlersData[key];
          if (bowl.bowlName && bowl.overs > 0) {
            bowlers.push({
              name: bowl.bowlName,
              overs: String(bowl.overs || 0),
              maidens: String(bowl.maidens || 0),
              runs: String(bowl.runs || 0),
              wickets: String(bowl.wickets || 0),
              noBalls: String(bowl.no_balls || 0),
              wides: String(bowl.wides || 0),
              economy: String(bowl.economy || 0),
              profileId: bowl.bowlerId ? String(bowl.bowlerId) : undefined,
            });
          }
        }
      }

      // Get yet to bat players
      const yetToBat: string[] = [];
      if (batTeam.batsmenData) {
        for (const key of Object.keys(batTeam.batsmenData)) {
          const bat = batTeam.batsmenData[key];
          if (bat.batName && !bat.outDesc && bat.runs === 0 && bat.balls === 0) {
            yetToBat.push(bat.batName);
          }
        }
      }

      const extras = inning.extrasData ?
        `${inning.extrasData.total} (b ${inning.extrasData.byes}, lb ${inning.extrasData.legByes}, w ${inning.extrasData.wides}, nb ${inning.extrasData.noBalls}, p ${inning.extrasData.penalty})` :
        '0';

      // Parse partnerships (API returns as object with keys like pat_1, pat_2, etc.)
      const partnerships: z.infer<typeof PartnershipSchema>[] = [];
      if (inning.partnershipsData && typeof inning.partnershipsData === 'object') {
        for (const key of Object.keys(inning.partnershipsData)) {
          const p = inning.partnershipsData[key];
          if (p.bat1Name && p.bat2Name) {
            partnerships.push({
              bat1Name: p.bat1Name,
              bat1Runs: String(p.bat1Runs || 0),
              bat1Balls: String(p.bat1balls || p.bat1Balls || 0),
              bat2Name: p.bat2Name,
              bat2Runs: String(p.bat2Runs || 0),
              bat2Balls: String(p.bat2balls || p.bat2Balls || 0),
              totalRuns: String(p.totalRuns || 0),
              totalBalls: String(p.totalBalls || 0),
            });
          }
        }
      }

      innings.push({
        name: `${battingTeamName} Innings`,
        score,
        battingTeamName,
        bowlingTeamName,
        batsmen,
        extras,
        total: score,
        yetToBat,
        fallOfWickets: [],
        bowlers,
        partnerships,
      });
    }
  }

  return FullScorecardSchema.parse({ title, status, innings, matchInfo });
}

function getMatchTypeFromNgShow(ngShow: string | undefined): LiveMatch['matchType'] | undefined {
  if (!ngShow) return undefined;
  if (ngShow.includes('international-tab')) return 'International';
  if (ngShow.includes('league-tab')) return 'League';
  if (ngShow.includes('domestic-tab')) return 'Domestic';
  if (ngShow.includes('women-tab')) return 'Women';
  return undefined;
}

// Helper to determine matchType from series name
function getMatchTypeFromSeries(seriesName: string, title: string): 'International' | 'League' | 'Domestic' | 'Women' {
  const combined = `${seriesName} ${title}`.toLowerCase();

  // Check for women's cricket first
  if (combined.includes('women') || combined.includes('wpl') || combined.includes('wbbl')) {
    return 'Women';
  }

  // Check for franchise leagues
  if (combined.includes('ipl') || combined.includes('bbl') || combined.includes('psl') ||
      combined.includes('cpl') || combined.includes('bpl') || combined.includes('sa20') ||
      combined.includes('t20 league') || combined.includes('premier league') ||
      combined.includes('super league') || combined.includes('hundred')) {
    return 'League';
  }

  // Check for international cricket (ICC events, bilateral series between countries)
  if (combined.includes('world cup') || combined.includes('icc') ||
      combined.includes('test') || combined.includes('odi') || combined.includes('t20i') ||
      combined.includes('asia cup') || combined.includes('champions trophy') ||
      combined.includes('tour of') || combined.includes('tri-series') ||
      combined.includes('tri series') || combined.includes('bilateral')) {
    return 'International';
  }

  // Default to domestic
  return 'Domestic';
}

export async function scrapeUpcomingMatches(): Promise<LiveMatch[]> {
  const bust = Math.floor(Date.now() / 60_000);
  const response = await fetch(`${UPSTREAM_BASE_URL}/cricket-match/live-scores/upcoming-matches?_=${bust}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch upcoming matches: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  // Upstream ships every match's full JSON inside its RSC payload alongside
  // the HTML. Build a `matchId → teamName → teamId` lookup once, then use it
  // below to fill in `teamId` on the HTML-parsed rows so team names become
  // clickable (Manchester Super Giants, LPL sides, IPL franchises, …).
  const teamIdLookup = buildTeamIdLookupFromHtml(html);

  const upcomingMatches: LiveMatch[] = [];
  const processedMatchIds = new Set<string>();

  // The visible date span is JS-populated (empty in SSR HTML), but the page ships
  // JSON-LD SportsEvent data with a reliable startDate. Index it by team pair.
  const startTimeByTeams = new Map<string, { startDate: number; status: string }>();
  // SportsEvent entries are nested (WebPage -> mainEntity -> itemListElement), so walk in.
  const collectEvents = (node: any): any[] => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(collectEvents);
    if (node['@type'] === 'SportsEvent') return [node];
    return collectEvents(node.itemListElement ?? node.mainEntity ?? node['@graph'] ?? []);
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const events = collectEvents(JSON.parse($(el).text()));
      for (const ev of events) {
        if (ev.startDate && Array.isArray(ev.competitor)) {
          const teamKey = ev.competitor.map((c: { name?: string }) => (c.name || '').toLowerCase().trim()).sort().join('|');
          const ts = Date.parse(ev.startDate);
          if (teamKey && !isNaN(ts)) {
            startTimeByTeams.set(teamKey, { startDate: Math.floor(ts / 1000), status: typeof ev.eventStatus === 'string' ? ev.eventStatus : '' });
          }
        }
      }
    } catch { /* ignore malformed JSON-LD */ }
  });

  // Use same structure as live matches
  $('.flex.flex-col.gap-2 > div').each((_, seriesBlock) => {
    const $seriesBlock = $(seriesBlock);

    const $seriesLink = $seriesBlock.find('a[href^="/cricket-series/"]').first();
    if ($seriesLink.length === 0) return;

    const seriesName = $seriesLink.attr('title') || $seriesLink.find('span').first().text().trim();
    const seriesUrl = $seriesLink.attr('href') || '';

    if (!seriesName) return;

    const $matchesContainer = $seriesBlock.find('.flex.flex-col.gap-px').first();
    if ($matchesContainer.length === 0) return;

    $matchesContainer.find('> div').each((_, matchContainer) => {
      const $matchContainer = $(matchContainer);
      const $match = $matchContainer.find('a[href^="/live-cricket-scores/"]').first();
      
      if ($match.length === 0) return;
      
      const href = $match.attr('href');
      if (!href) return;

      const matchId = extractMatchId(href);
      if (!matchId || processedMatchIds.has(matchId)) return;
      processedMatchIds.add(matchId);

      const title = $match.attr('title') || 'Untitled Match';
      
      // Extract venue and date/time from the info div below the match link
      const $infoDiv = $matchContainer.find('.gap-9.py-2, .gap-9.py-0\\.5').first();
      let venue = '';
      let venueUrl = '';
      let dateTime = '';

      if ($infoDiv.length > 0) {
        // Extract venue
        const venueLink = $infoDiv.find('a[href*="/venues/"]');
        if (venueLink.length > 0) {
          venue = venueLink.attr('title') || venueLink.text().trim();
          venueUrl = venueLink.attr('href') || '';
        }
        
        // Extract date & time
        $infoDiv.find('div').each((_, div) => {
          const text = $(div).text();
          if (text.includes('Date & Time:')) {
            dateTime = text.replace('Date & Time:', '').trim();
          }
        });
      }
      
      // Fallback to old method if info div not found
      if (!venue) {
        const venueText = $match.find('.text-xs.text-cbTxtSec').first().text().trim();
        venue = venueText.split('•').pop()?.trim() || '';
      }

      const teams: { name: string, score?: string, flagUrl?: string, teamId?: string | number }[] = [];

      $match.find('.flex.items-center.gap-4.justify-between').each((_, teamContainer) => {
        const $team = $(teamContainer);
        const flagRaw = $team.find('img').attr('src') || $team.find('img').attr('srcset')?.split(/\s+/)[0];
        const flagUrl = flagRaw && flagRaw.includes((new URL(UPSTREAM_STATIC_URL)).host) ? flagRaw.replace(/\/\d+x\d+\//, '/72x52/') : undefined;
        const teamName = $team.find('span.text-cbTxtPrim.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtSec.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtPrim.block.wb\\:hidden').text().trim() ||
          $team.find('span.text-cbTxtSec.block.wb\\:hidden').text().trim();
        const teamId = teamName ? teamIdLookup.get(matchId)?.get(teamName.toLowerCase()) : undefined;

        if (teamName) {
          teams.push({
            name: teamName,
            flagUrl,
            teamId,
          });
        }
      });

      let status = $match.find('span.text-cbLive').text().trim() ||
        $match.find('span.text-cbComplete').text().trim() ||
        $match.find('span.text-cbPreview').text().trim();

      if (!status) {
        status = $match.find('span[class*="text-cb"]').last().text().trim();
      }
      
      // Enrich with the reliable start time from JSON-LD, matched by team pair.
      const teamKey = teams.map((t) => t.name.toLowerCase().trim()).sort().join('|');
      const startMeta = startTimeByTeams.get(teamKey);

      // For upcoming matches the start date/time is the most useful "status".
      if (dateTime) {
        status = dateTime;
      } else if (startMeta?.status) {
        status = startMeta.status;
      }

      if (teams.length > 0) {
        upcomingMatches.push({
          title,
          url: href,
          matchId,
          teams,
          status: status || 'Status not available',
          matchType: getMatchTypeFromSeries(seriesName, title),
          seriesName,
          seriesUrl,
          venue: venue || undefined,
          venueUrl: venueUrl || undefined,
          startDate: startMeta?.startDate,
        });
      }
    });
  });

  // Fallback: if CSS parsing returned nothing, try extracting from RSC payload
  let result = upcomingMatches;
  if (upcomingMatches.length === 0) {
    const fallback = extractMatchesFromRSCPayload(html);
    const upcoming = fallback.filter(m => {
      const s = m.status.toLowerCase();
      return !s.includes('won') && !s.includes('drawn') && !s.includes('no result') &&
             !s.includes('abandoned') && !s.includes('tied');
    });
    result = upcoming.length > 0 ? upcoming : fallback;
  }

  // Enrich every match with the reliable start time from JSON-LD (matched by team pair),
  // regardless of which parsing path produced it.
  for (const m of result) {
    if (m.startDate) continue;
    const key = (m.teams || []).map(t => (t.name || '').toLowerCase().trim()).sort().join('|');
    const meta = startTimeByTeams.get(key);
    if (meta) {
      m.startDate = meta.startDate;
      if (!m.status || m.status === 'Status not available') m.status = meta.status;
    }
  }

  return result;
}

export interface VenueFact {
  label: string;
  value: string;
}
export interface VenueMatchRow {
  matchId: string;
  teams: string;
  date?: string;
}
export interface VenueMatchGroup {
  series: string;
  matches: VenueMatchRow[];
}
export interface VenueStatGroup {
  format: string;
  rows: VenueFact[];
}
export interface VenuePageData {
  name: string;
  location?: string;
  imageUrl?: string;
  facts: VenueFact[];
  matchGroups: VenueMatchGroup[];
  statGroups: VenueStatGroup[];
}

// Scrapes a venue page (series-scoped path, e.g. "/cricket-series/11284/t20-blast-2026/venues/20/edgbaston").
export async function scrapeVenue(venuePath: string): Promise<VenuePageData> {
  const path = venuePath.startsWith('/') ? venuePath : `/${venuePath}`;
  const bust = Math.floor(Date.now() / 3_600_000);
  const res = await fetch(`${UPSTREAM_BASE_URL}${path}?_=${bust}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch venue: ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const rawTitle = $('title').text().replace(/\s*details.*$/i, '').replace(/\s*-\s*Cricbuzz.*$/i, '').trim();
  const name = (rawTitle.split(',')[0] || rawTitle).trim();

  // Facts: label/value grid rows (rendered twice for mobile/desktop, so dedupe by label).
  const facts: VenueFact[] = [];
  const factSeen = new Set<string>();
  $('.facts-row-grid').each((_, e) => {
    const d = $(e).children('div');
    const label = $(d[0]).text().trim();
    const value = $(d[1]).text().trim();
    if (!label || !value || factSeen.has(label)) return;
    factSeen.add(label);
    facts.push({ label, value });
  });
  const location = facts.find((f) => f.label.toLowerCase() === 'location')?.value;

  // Hero image lives in an <img srcSet> that references the venue's own slug.
  const venueSlug = path.split('/').filter(Boolean).pop() || '';
  let imageUrl: string | undefined;
  $('img').each((_, e) => {
    const ss = $(e).attr('srcset') || $(e).attr('srcSet') || $(e).attr('src') || '';
    if (ss.includes('/img/v1/i1/c') && venueSlug && ss.includes(venueSlug)) {
      // Bump the thumbnail (540x303) up to a crisp 1080p variant.
      imageUrl = ss.split(/[\s,]/)[0].replace('/img/v1/i1/', '/img/v1/1920x1080/i1/');
      return false;
    }
  });

  // Section headers (`<a title="…">`) each own the rows that follow them.
  const matchGroups: VenueMatchGroup[] = [];
  const statGroups: VenueStatGroup[] = [];
  const groupSeen = new Set<string>();
  $('a[title]').each((_, a) => {
    const title = ($(a).attr('title') || '').trim();
    const section = $(a).parent();

    const matchTitle = title.match(/^(.*?)\s+matches scheduled at this venue$/i)?.[1];
    if (matchTitle) {
      if (groupSeen.has('m:' + matchTitle)) return;
      const matches: VenueMatchRow[] = [];
      const seen = new Set<string>();
      section.find('a[href*="/live-cricket-scores/"], a[href*="/cricket-scores/"]').each((_, m) => {
        const href = $(m).attr('href') || '';
        const id = href.match(/\/(?:live-)?cricket-scores\/(\d+)\//)?.[1];
        if (!id || seen.has(id)) return;
        seen.add(id);
        const teams = $(m).text().replace(/\s+/g, ' ').trim();
        const date = $(m).closest('.flex').children('div').first().text().replace(/\s+/g, ' ').trim();
        matches.push({ matchId: id, teams, date: date || undefined });
      });
      if (matches.length) {
        groupSeen.add('m:' + matchTitle);
        matchGroups.push({ series: matchTitle, matches });
      }
      return;
    }

    const statFormat = title.match(/^STATS\s*-\s*(.+)$/i)?.[1];
    if (statFormat) {
      if (groupSeen.has('s:' + statFormat)) return;
      const rows: VenueFact[] = [];
      section.find('.grid.grid-cols-2').each((_, r) => {
        const d = $(r).children('div');
        const label = $(d[0]).text().trim();
        const value = $(d[1]).text().trim();
        if (label && value) rows.push({ label, value });
      });
      if (rows.length) {
        groupSeen.add('s:' + statFormat);
        statGroups.push({ format: statFormat.trim(), rows });
      }
    }
  });

  return { name, location, imageUrl, facts, matchGroups, statGroups };
}

export async function scrapeRecentMatches(): Promise<LiveMatch[]> {
  const bust = Math.floor(Date.now() / 60_000);
  const response = await fetch(`${UPSTREAM_BASE_URL}/cricket-match/live-scores/recent-matches?_=${bust}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch recent matches: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  // RSC-backed lookup so team names on recent rows can carry teamId.
  const teamIdLookup = buildTeamIdLookupFromHtml(html);

  const recentMatches: LiveMatch[] = [];
  const processedMatchIds = new Set<string>();

  // Use same structure as live matches
  $('.flex.flex-col.gap-2 > div').each((_, seriesBlock) => {
    const $seriesBlock = $(seriesBlock);

    const $seriesLink = $seriesBlock.find('a[href^="/cricket-series/"]').first();
    if ($seriesLink.length === 0) return;

    const seriesName = $seriesLink.attr('title') || $seriesLink.find('span').first().text().trim();
    const seriesUrl = $seriesLink.attr('href') || '';

    if (!seriesName) return;

    const $matchesContainer = $seriesBlock.find('.flex.flex-col.gap-px').first();
    if ($matchesContainer.length === 0) return;

    $matchesContainer.find('> div > a[href^="/live-cricket-scores/"]').each((_, matchElement) => {
      const $match = $(matchElement);
      const href = $match.attr('href');
      if (!href) return;

      let correctedHref = href;
      if (href.startsWith('/live-cricket-scores/')) {
        correctedHref = href.replace('/live-cricket-scores/', '/cricket-scores/');
      }

      const matchId = extractMatchId(correctedHref);
      if (!matchId || processedMatchIds.has(matchId)) return;
      processedMatchIds.add(matchId);

      const title = $match.attr('title') || 'Untitled Match';
      const venueText = $match.find('.text-xs.text-cbTxtSec').first().text().trim();
      const venue = venueText.split('•').pop()?.trim() || '';

      const teams: { name: string, score?: string, flagUrl?: string, teamId?: string | number }[] = [];

      $match.find('.flex.items-center.gap-4.justify-between').each((_, teamContainer) => {
        const $team = $(teamContainer);
        const flagRaw = $team.find('img').attr('src') || $team.find('img').attr('srcset')?.split(/\s+/)[0];
        const flagUrl = flagRaw && flagRaw.includes((new URL(UPSTREAM_STATIC_URL)).host) ? flagRaw.replace(/\/\d+x\d+\//, '/72x52/') : undefined;
        const teamName = $team.find('span.text-cbTxtPrim.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtSec.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtPrim.block.wb\\:hidden').text().trim() ||
          $team.find('span.text-cbTxtSec.block.wb\\:hidden').text().trim();

        const scoreEl = $team.find('span.font-medium.wb\\:font-semibold');
        const score = scoreEl.text().trim();
        const teamId = teamName ? teamIdLookup.get(matchId)?.get(teamName.toLowerCase()) : undefined;

        if (teamName) {
          teams.push({
            name: teamName,
            score: score || undefined,
            flagUrl,
            teamId,
          });
        }
      });

      let status = $match.find('span.text-cbLive').text().trim() ||
        $match.find('span.text-cbComplete').text().trim() ||
        $match.find('span.text-cbPreview').text().trim();

      if (!status) {
        status = $match.find('span[class*="text-cb"]').last().text().trim();
      }

      if (teams.length > 0) {
        recentMatches.push({
          title,
          url: correctedHref,
          matchId,
          teams,
          status: status || 'Status not available',
          matchType: getMatchTypeFromSeries(seriesName, title),
          seriesName,
          seriesUrl,
          venue,
        });
      }
    });
  });

  // Fallback: if CSS parsing returned nothing, try extracting from RSC payload
  if (recentMatches.length === 0) {
    const fallback = extractMatchesFromRSCPayload(html);
    // Filter for completed matches
    const recent = fallback.filter(m => {
      const s = m.status.toLowerCase();
      return s.includes('won') || s.includes('drawn') || s.includes('no result') ||
             s.includes('abandoned') || s.includes('tied');
    });
    return recent.length > 0 ? recent : fallback;
  }

  return recentMatches;
}
function matchInfoToLiveMatch(match: any): LiveMatch | null {
  const matchInfo = match?.matchInfo;
  if (!matchInfo) return null;
  const teams: { name: string; score?: string; flagUrl?: string; teamId?: string | number }[] = [];
  const flagFor = (team: any): string | undefined =>
    team?.imageId
      ? teamFlagImageUrl(team.imageId, String(team.teamSName || 'team').toLowerCase())
      : undefined;
  if (matchInfo.team1) {
    let s = '';
    if (match.matchScore?.team1Score?.inngs1) {
      const i = match.matchScore.team1Score.inngs1;
      s = `${i.runs}${i.wickets !== undefined ? `/${i.wickets}` : ''} (${i.overs})`;
    }
    teams.push({ name: matchInfo.team1.teamName, score: s || undefined, flagUrl: flagFor(matchInfo.team1) });
  }
  if (matchInfo.team2) {
    let s = '';
    if (match.matchScore?.team2Score?.inngs1) {
      const i = match.matchScore.team2Score.inngs1;
      s = `${i.runs}${i.wickets !== undefined ? `/${i.wickets}` : ''} (${i.overs})`;
    }
    teams.push({ name: matchInfo.team2.teamName, score: s || undefined, flagUrl: flagFor(matchInfo.team2) });
  }
  const venue = matchInfo.venueInfo
    ? `${matchInfo.venueInfo.ground}, ${matchInfo.venueInfo.city}`
    : undefined;
  const seriesName = matchInfo.seriesName || '';
  const title = `${matchInfo.team1?.teamName || ''} vs ${matchInfo.team2?.teamName || ''}, ${matchInfo.matchDesc}`;
  return {
    title,
    url: `/live-cricket-scores/${matchInfo.matchId}`,
    matchId: matchInfo.matchId.toString(),
    teams,
    status: matchInfo.status || 'Status not available',
                matchFormat: matchInfo.matchFormat,
    matchType: getMatchTypeFromSeries(seriesName, title),
    seriesName: seriesName || undefined,
    venue,
    startDate: matchInfo.startDate || matchInfo.matchStartTimestamp,
  };
}

function extractArrayAt(html: string, markerIdx: number, markerLen: number): string | null {
  const arrStart = markerIdx + markerLen - 1; // position of '['
  let depth = 0;
  for (let i = arrStart; i < html.length && i < arrStart + 500000; i++) {
    if (html[i] === '[') depth++;
    if (html[i] === ']') depth--;
    if (depth === 0) return html.substring(arrStart, i + 1);
  }
  return null;
}

function extractMatchesFromRSCPayload(html: string): LiveMatch[] {
  const matches: LiveMatch[] = [];

  // NEW format: "matches\":[{\"match\":{\"matchInfo\":...}}]
  const newMarker = '"matches\\":[';
  let searchFrom = 0;
  while (true) {
    const idx = html.indexOf(newMarker, searchFrom);
    if (idx === -1) break;
    const rawArr = extractArrayAt(html, idx, newMarker.length);
    if (!rawArr) break;
    searchFrom = idx + rawArr.length;
    try {
      const rawJson = rawArr.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
      const arr = JSON.parse(rawJson);
      for (const item of arr) {
        const m = matchInfoToLiveMatch(item.match || item);
        if (m) matches.push(m);
      }
    } catch {
      // skip this chunk
    }
  }

  // OLD format fallback: "matchDetails\":[{"matchDetailsMap":{"match":[...]}}]
  if (matches.length === 0) {
    const oldMarker = '"matchDetails\\":[';
    searchFrom = 0;
    while (true) {
      const idx = html.indexOf(oldMarker, searchFrom);
      if (idx === -1) break;
      const rawArr = extractArrayAt(html, idx, oldMarker.length);
      if (!rawArr) break;
      searchFrom = idx + rawArr.length;
      try {
        const rawJson = rawArr.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
        const matchDetails = JSON.parse(rawJson);
        for (const dateGroup of matchDetails) {
          if (dateGroup.matchDetailsMap?.match) {
            for (const match of dateGroup.matchDetailsMap.match) {
              const m = matchInfoToLiveMatch(match);
              if (m) matches.push(m);
            }
          }
        }
      } catch {
        // skip this chunk
      }
    }
  }

  // Deduplicate by matchId
  const seen = new Set<string>();
  return matches.filter(m => {
    if (seen.has(m.matchId)) return false;
    seen.add(m.matchId);
    return true;
  });
}

export async function scrapeLiveMatches(): Promise<LiveMatch[]> {
  const bust = Math.floor(Date.now() / 30_000);
  const response = await fetch(`${UPSTREAM_BASE_URL}/cricket-match/live-scores?_=${bust}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch live matches: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  // RSC-backed lookup so team names on live rows can carry teamId.
  const teamIdLookup = buildTeamIdLookupFromHtml(html);

  const liveMatches: LiveMatch[] = [];

  // New structure: matches are organized by series
  const processedMatchIds = new Set<string>();

  // Find the main container that has all series
  $('.flex.flex-col.gap-2 > div').each((_, seriesBlock) => {
    const $seriesBlock = $(seriesBlock);

    // Find the series link within this block
    const $seriesLink = $seriesBlock.find('a[href^="/cricket-series/"]').first();

    if ($seriesLink.length === 0) return;

    const seriesName = $seriesLink.attr('title') || $seriesLink.find('span').first().text().trim();
    const seriesUrl = $seriesLink.attr('href') || '';

    if (!seriesName) return;

    // Find the matches container within THIS series block only
    // It's a sibling of the series link's parent div
    const $matchesContainer = $seriesBlock.find('.flex.flex-col.gap-px').first();

    if ($matchesContainer.length === 0) return;

    // Find match links ONLY within this specific matches container
    $matchesContainer.find('> div > a[href^="/live-cricket-scores/"]').each((_, matchElement) => {
      const $match = $(matchElement);
      const href = $match.attr('href');

      if (!href) return;

      const matchId = extractMatchId(href);
      if (!matchId || processedMatchIds.has(matchId)) return;

      processedMatchIds.add(matchId);

      // Get title from the title attribute
      const title = $match.attr('title') || 'Untitled Match';

      // Get venue info from the match details text
      const venueText = $match.find('.text-xs.text-cbTxtSec').first().text().trim();
      const venue = venueText.split('•').pop()?.trim() || '';

      // Extract teams and scores
      const teams: { name: string, score?: string, flagUrl?: string, teamId?: string | number }[] = [];

      // Find team containers - they have specific classes for team info
      $match.find('.flex.items-center.gap-4.justify-between').each((_, teamContainer) => {
        const $team = $(teamContainer);
        const flagRaw = $team.find('img').attr('src') || $team.find('img').attr('srcset')?.split(/\s+/)[0];
        const flagUrl = flagRaw && flagRaw.includes((new URL(UPSTREAM_STATIC_URL)).host) ? flagRaw.replace(/\/\d+x\d+\//, '/72x52/') : undefined;

        // Team name - try multiple selectors
        const teamName = $team.find('span.text-cbTxtPrim.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtSec.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtPrim.block.wb\\:hidden').text().trim() ||
          $team.find('span.text-cbTxtSec.block.wb\\:hidden').text().trim();

        // Score is in a span with font-medium class
        const scoreEl = $team.find('span.font-medium.wb\\:font-semibold');
        const score = scoreEl.text().trim();
        const teamId = teamName ? teamIdLookup.get(matchId)?.get(teamName.toLowerCase()) : undefined;

        if (teamName) {
          teams.push({
            name: teamName,
            score: score || undefined,
            flagUrl,
            teamId,
          });
        }
      });

      // Get status - it's in a span with specific status classes
      let status = $match.find('span.text-cbLive').text().trim() ||
        $match.find('span.text-cbComplete').text().trim() ||
        $match.find('span.text-cbPreview').text().trim();

      // If no status found with those classes, try other selectors
      if (!status) {
        status = $match.find('span[class*="text-cb"]').last().text().trim();
      }

      // Extract win probability if available
      // Structure: <div class="w-full flex items-center gap-2 text-xs"> with two team divs containing probabilities
      let winProbability: { team1: { name: string; probability: number }; team2: { name: string; probability: number } } | undefined;
      const $probContainer = $match.find('.w-full.flex.items-center.gap-2.text-xs');
      if ($probContainer.length > 0) {
        const probDivs = $probContainer.find('div[title]').filter((_, el) => {
          const $el = $(el);
          return $el.find('.font-semibold').text().includes('%');
        });

        if (probDivs.length >= 2) {
          const $team1 = $(probDivs[0]);
          const $team2 = $(probDivs[1]);

          const team1Name = $team1.attr('title') || $team1.find('.font-normal').text().trim();
          const team1ProbStr = $team1.find('.font-semibold').text().replace('%', '').trim();
          const team1Prob = parseFloat(team1ProbStr) || 0;

          const team2Name = $team2.attr('title') || $team2.find('.font-normal').text().trim();
          const team2ProbStr = $team2.find('.font-semibold').text().replace('%', '').trim();
          const team2Prob = parseFloat(team2ProbStr) || 0;

          if (team1Name && team2Name && (team1Prob > 0 || team2Prob > 0)) {
            winProbability = {
              team1: { name: team1Name, probability: team1Prob },
              team2: { name: team2Name, probability: team2Prob },
            };
          }
        }
      }

      if (teams.length > 0) {
        liveMatches.push({
          title,
          url: href,
          matchId,
          teams,
          status: status || 'Status not available',
          matchType: getMatchTypeFromSeries(seriesName, title),
          seriesName: seriesName || undefined,
          seriesUrl: seriesUrl || undefined,
          venue: venue || undefined,
          winProbability,
        });
      }
    });
  });

  // Fallback: if CSS parsing returned nothing, try extracting from RSC payload
  if (liveMatches.length === 0) {
    const fallback = extractMatchesFromRSCPayload(html);
    // Filter for live-ish statuses
    const live = fallback.filter(m => {
      const s = m.status.toLowerCase();
      return !s.includes('won') && !s.includes('drawn') && !s.includes('no result') &&
             !s.includes('abandoned') && !s.includes('match starts') && !s.includes('match yet');
    });
    return live.length > 0 ? live : fallback;
  }

  return liveMatches;
}

function formatOvers(overs: number): string {
  if (overs === undefined || overs === null) return '0';
  const wholeOvers = Math.floor(overs);
  const balls = Math.round((overs - wholeOvers) * 10);
  if (balls === 6) {
    return `${wholeOvers + 1}.0`;
  }
  return overs.toFixed(1);
}

async function getScoreFromHtml(matchId: string): Promise<ScrapeCricbuzzUrlOutput> {
  // Try to get the live match page HTML which has miniscore data
  const liveUrl = `${UPSTREAM_BASE_URL}/live-cricket-scores/${matchId}`;

  const response = await fetch(liveUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch match page: ${response.statusText}`);
  }

  const html = await response.text();

  // Try to extract JSON data from __NEXT_DATA__ script tag
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);

  if (nextDataMatch && nextDataMatch[1]) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData?.props?.pageProps;

      // Extract match data from Next.js props
      const matchInfo = pageProps?.matchInfo;
      const miniscore = pageProps?.miniscore;

      if (matchInfo && miniscore) {
        const title = `${matchInfo.team1?.teamName || 'Team 1'} vs ${matchInfo.team2?.teamName || 'Team 2'}, ${matchInfo.matchDesc || ''}`;
        const status = matchInfo.status || 'Match in progress';

        const batTeam = miniscore.batTeamDetails;
        const score = batTeam ? `${batTeam.batTeamShortName} ${batTeam.batTeamScore}/${batTeam.batTeamWkts} (${miniscore.currentOvers || 0} ov)` : 'Score not available';

        const batsmen = [];
        if (miniscore.batsmanStriker) {
          batsmen.push({
            name: miniscore.batsmanStriker.batName || '',
            runs: String(miniscore.batsmanStriker.batRuns || 0),
            balls: String(miniscore.batsmanStriker.batBalls || 0),
            onStrike: true,
            strikeRate: String(miniscore.batsmanStriker.batStrikeRate || 0),
            fours: String(miniscore.batsmanStriker.batFours || 0),
            sixes: String(miniscore.batsmanStriker.batSixes || 0),
          });
        }
        if (miniscore.batsmanNonStriker) {
          batsmen.push({
            name: miniscore.batsmanNonStriker.batName || '',
            runs: String(miniscore.batsmanNonStriker.batRuns || 0),
            balls: String(miniscore.batsmanNonStriker.batBalls || 0),
            onStrike: false,
            strikeRate: String(miniscore.batsmanNonStriker.batStrikeRate || 0),
            fours: String(miniscore.batsmanNonStriker.batFours || 0),
            sixes: String(miniscore.batsmanNonStriker.batSixes || 0),
          });
        }

        const bowlers = [];
        if (miniscore.bowlerStriker) {
          bowlers.push({
            name: miniscore.bowlerStriker.bowlName || '',
            overs: String(miniscore.bowlerStriker.bowlOvs || 0),
            maidens: String(miniscore.bowlerStriker.bowlMaidens || 0),
            runs: String(miniscore.bowlerStriker.bowlRuns || 0),
            wickets: String(miniscore.bowlerStriker.bowlWkts || 0),
            economy: String(miniscore.bowlerStriker.bowlEcon || 0),
            onStrike: true,
          });
        }
        if (miniscore.bowlerNonStriker) {
          bowlers.push({
            name: miniscore.bowlerNonStriker.bowlName || '',
            overs: String(miniscore.bowlerNonStriker.bowlOvs || 0),
            maidens: String(miniscore.bowlerNonStriker.bowlMaidens || 0),
            runs: String(miniscore.bowlerNonStriker.bowlRuns || 0),
            wickets: String(miniscore.bowlerNonStriker.bowlWkts || 0),
            economy: String(miniscore.bowlerNonStriker.bowlEcon || 0),
            onStrike: false,
          });
        }

        const commentary: Commentary[] = [{
          type: 'stat',
          text: 'Live ball-by-ball commentary is not available. Showing current match status.',
        }];

        const previousInnings = [];
        if (miniscore.inningsScoreList) {
          for (const inning of miniscore.inningsScoreList) {
            if (inning.inningsId !== miniscore.currentInningsId) {
              previousInnings.push({
                teamName: inning.batTeamName || '',
                score: `${inning.score}/${inning.wickets} (${inning.overs || 0} ov)`,
              });
            }
          }
        }

        return {
          title,
          status,
          score,
          batsmen,
          bowlers,
          commentary,
          previousInnings,
          currentRunRate: String(miniscore.currentRunRate || 'N/A'),
          partnership: miniscore.partnerShip ? `${miniscore.partnerShip.runs}(${miniscore.partnerShip.balls})` : 'N/A',
          lastWicket: miniscore.lastWicket || 'N/A',
          recentOvers: miniscore.recentOvsStats || 'N/A',
          toss: matchInfo.tossResults ? `${matchInfo.tossResults.tossWinnerName} won the toss and elected to ${matchInfo.tossResults.decision}` : 'N/A',
        };
      }
    } catch (e) {
      console.error('[getScoreFromHtml] Failed to parse __NEXT_DATA__:', e);
    }
  }

  // Fallback if parsing fails
  return {
    title: 'Match',
    status: 'Match data not available',
    score: 'Score not available',
    batsmen: [],
    bowlers: [],
    commentary: [{
      type: 'stat',
      text: 'Unable to load match data. The match may not have started yet or data is temporarily unavailable.',
    }],
    previousInnings: [],
    currentRunRate: 'N/A',
    requiredRunRate: undefined,
    partnership: 'N/A',
    lastWicket: 'N/A',
    recentOvers: 'N/A',
    toss: 'N/A',
    matchStartTimestamp: undefined,
  };
}

function extractAwardPlayer(players: any): z.infer<typeof AwardPlayerSchema> | undefined {
  if (!Array.isArray(players) || players.length === 0) return undefined;
  const p = players[0];
  if (!p || !p.name) return undefined;
  return {
    name: p.fullName || p.name,
    profileId: p.id ? String(p.id) : undefined,
    imageUrl: p.faceImageId ? playerFaceImageUrl(p.faceImageId) : undefined,
  };
}

// Some lightweight score payloads omit venue details. The match page always
// carries a single venue anchor (name + link), so fall back to it when needed.
async function fetchVenueFromMatchPage(
  matchId: string
): Promise<{ venue: string; venueUrl: string } | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${UPSTREAM_BASE_URL}/live-cricket-scores/${matchId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return undefined;
    const html = await res.text();
    const m = html.match(/<a\s+title="([^"]+)"\s+href="(\/cricket-series\/\d+\/[^"]+\/venues\/\d+\/[^"]+)"/i);
    if (!m) return undefined;
    // The title/href are raw HTML attributes, so decode entities (e.g. Lord&#x27;s).
    return { venue: decodeHtmlEntities(m[1]), venueUrl: decodeHtmlEntities(m[2]) };
  } catch {
    return undefined;
  }
}

export async function getScoreForMatchId(
  matchId: string
): Promise<ScrapeCricbuzzUrlOutput> {
  if (!matchId) {
    throw new Error('Could not extract match ID from the URL.');
  }

  // Try multiple API endpoints. Some matches (The Hundred especially) return an
  // empty envelope from `comm` but full data from `hcomm`, so keep both.
  const apiEndpoints = [
    upstreamUrl(`/api/mcenter/comm/${matchId}`),
    upstreamUrl(`/api/mcenter/hcomm/${matchId}`),
    upstreamUrl(`/api/cricket-match/commentary/${matchId}`),
  ];

  let data = null;
  // Track which endpoint variant supplied the data. Matches served via
  // `hcomm` use `hcommentary-pagination` for backfill; regular `comm` matches
  // use `commentary-pagination`. Both endpoint families have the same shape,
  // just different names.
  let paginationVariant: 'commentary-pagination' | 'hcommentary-pagination' = 'commentary-pagination';

  for (const apiUrl of apiEndpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get('content-type');

      // If API returns HTML, try next endpoint
      if (!contentType || !contentType.includes('application/json')) {
        continue;
      }

      const candidate = await response.json();
      // Some endpoints return HTTP 200 with an empty envelope for matches
      // they don't serve. Keep the payload as a fallback but keep probing
      // other endpoints in case one has real data.
      const isEmptyEnvelope = candidate && candidate.matchHeader == null && candidate.miniscore == null;
      if (isEmptyEnvelope) {
        if (!data) data = candidate;
        continue;
      }
      // Record the pagination variant to use for this data source.
      if (apiUrl.includes('/hcomm/')) paginationVariant = 'hcommentary-pagination';
      else paginationVariant = 'commentary-pagination';
      data = candidate;
      break;
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        console.warn(`[getScoreForMatchId] Timeout for endpoint: ${apiUrl}`);
      } else {
        console.error('[getScoreForMatchId] Error with endpoint:', apiUrl, e?.cause?.code || e?.message || e);
      }
    }
  }

  // If all API endpoints failed, fall back to HTML parsing.
  // Also fall back when the API responds but the payload is effectively empty
  // (matchHeader null AND miniscore null): the upstream gates this endpoint
  // for some matches — pre-tournament fixtures, older archives, and every match
  // in The Hundred we tested — and returns a placeholder "Please Update the
  // app to follow match updates" message. The HTML page has the real data
  // in its __NEXT_DATA__ script.
  const looksEmpty = data && data.matchHeader == null && data.miniscore == null;
  if (!data || looksEmpty) {
    try {
      return await getScoreFromHtml(matchId);
    } catch (e) {
      // If HTML fallback also fails, re-throw so upstream error surfaces
      // instead of returning the placeholder shape below.
      if (!data) throw e;
      console.warn('[getScoreForMatchId] HTML fallback failed, returning empty API response:', (e as Error)?.message);
    }
  }

  const { matchHeader, miniscore, commentaryList, matchCommentary } = data;

  // Fetch ball-by-ball commentary from pagination API and merge with main commentaryList
  // The main API commentaryList has the very latest balls, while pagination gives us
  // older commentary with proper overSeparator data
  let commentaryArray: any[] = [];

  // Get the commentaryList from the main API (has most recent balls)
  const mainCommentary: any[] = commentaryList ?? (matchCommentary && typeof matchCommentary === 'object' ? Object.values(matchCommentary) : []);

  if (miniscore?.inningsId) {
    try {
      // Use a very large timestamp to get the newest commentary from pagination.
      // Uses the pagination variant that matches the endpoint that gave us data.
      const paginationUrl = `${UPSTREAM_BASE_URL}/api/mcenter/${paginationVariant}/${matchId}/${miniscore.inningsId}/9999999999999`;
      const paginationResponse = await fetch(paginationUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      const contentType = paginationResponse.headers.get('content-type');
      if (paginationResponse.ok && contentType && contentType.includes('application/json')) {
        const paginationData = await paginationResponse.json();
        if (Array.isArray(paginationData) && paginationData.length > 0) {
          // Merge: use mainCommentary for the latest balls, then add any pagination items
          // that aren't already in mainCommentary (by timestamp)
          const mainTimestamps = new Set(mainCommentary.filter((c: any) => c.timestamp).map((c: any) => c.timestamp));
          const uniquePaginationItems = paginationData.filter((c: any) => !c.timestamp || !mainTimestamps.has(c.timestamp));
          // Merge and sort by timestamp descending (newest first)
          commentaryArray = [...mainCommentary, ...uniquePaginationItems]
            .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
        }
      }
    } catch (e) {
      console.error('[getScoreForMatchId] Failed to fetch pagination commentary:', e);
    }
  }

  // Fallback if pagination failed entirely
  if (commentaryArray.length === 0) {
    commentaryArray = mainCommentary;
  }


  const title = matchHeader ? `${matchHeader.team1.name} vs ${matchHeader.team2.name}, ${matchHeader.matchDescription}` : 'Match';
  const status = matchHeader ? matchHeader.status : 'Status not available';

  const batTeamId = miniscore?.batTeam?.teamId;
  const battingTeam = batTeamId && matchHeader ? (matchHeader.team1.id === batTeamId ? matchHeader.team1 : matchHeader.team2) : null;
  const formattedOvers = formatOvers(miniscore?.overs);
  const score = battingTeam && miniscore ? `${battingTeam?.shortName} ${miniscore.batTeam.teamScore ?? 0}/${miniscore.batTeam.teamWkts ?? 0} (${formattedOvers} ov)` : 'N/A';

  const batsmen: { name: string; runs: string; balls: string, onStrike: boolean, strikeRate: string, fours: string, sixes: string, profileId?: string, highlightsUrl?: string }[] = [];
  const striker = miniscore?.batsmanStriker;
  const nonStriker = miniscore?.batsmanNonStriker;
  // API may return fields as batName/batRuns or name/runs depending on endpoint
  if (striker && (striker.batName || striker.name)) {
    batsmen.push({
      name: striker.batName || striker.name,
      runs: String(striker.batRuns ?? striker.runs ?? 0),
      balls: String(striker.batBalls ?? striker.balls ?? 0),
      onStrike: true,
      strikeRate: String(striker.batStrikeRate ?? striker.strikeRate ?? 0),
      fours: String(striker.batFours ?? striker.fours ?? 0),
      sixes: String(striker.batSixes ?? striker.sixes ?? 0),
      profileId: (striker.batId || striker.id) ? String(striker.batId || striker.id) : undefined,
      highlightsUrl: striker.playerMatchHighlightsUrl || undefined,
    });
  }
  if (nonStriker && (nonStriker.batName || nonStriker.name)) {
    batsmen.push({
      name: nonStriker.batName || nonStriker.name,
      runs: String(nonStriker.batRuns ?? nonStriker.runs ?? 0),
      balls: String(nonStriker.batBalls ?? nonStriker.balls ?? 0),
      onStrike: false,
      strikeRate: String(nonStriker.batStrikeRate ?? nonStriker.strikeRate ?? 0),
      fours: String(nonStriker.batFours ?? nonStriker.fours ?? 0),
      sixes: String(nonStriker.batSixes ?? nonStriker.sixes ?? 0),
      profileId: (nonStriker.batId || nonStriker.id) ? String(nonStriker.batId || nonStriker.id) : undefined,
      highlightsUrl: nonStriker.playerMatchHighlightsUrl || undefined,
    });
  }

  const bowlers: { name: string; overs: string; maidens: string, runs: string, wickets: string, economy: string, onStrike: boolean, profileId?: string, highlightsUrl?: string }[] = [];
  const bowlStriker = miniscore?.bowlerStriker;
  const bowlNonStriker = miniscore?.bowlerNonStriker;
  if (bowlStriker && (bowlStriker.bowlName || bowlStriker.name)) {
    bowlers.push({
      name: bowlStriker.bowlName || bowlStriker.name,
      overs: String(bowlStriker.bowlOvs ?? bowlStriker.overs ?? 0),
      maidens: String(bowlStriker.bowlMaidens ?? bowlStriker.maidens ?? 0),
      runs: String(bowlStriker.bowlRuns ?? bowlStriker.runs ?? 0),
      wickets: String(bowlStriker.bowlWkts ?? bowlStriker.wickets ?? 0),
      economy: String(bowlStriker.bowlEcon ?? bowlStriker.economy ?? 0),
      onStrike: true,
      profileId: (bowlStriker.bowlId || bowlStriker.id) ? String(bowlStriker.bowlId || bowlStriker.id) : undefined,
      highlightsUrl: bowlStriker.playerMatchHighlightsUrl || undefined,
    });
  }
  if (bowlNonStriker && (bowlNonStriker.bowlName || bowlNonStriker.name)) {
    bowlers.push({
      name: bowlNonStriker.bowlName || bowlNonStriker.name,
      overs: String(bowlNonStriker.bowlOvs ?? bowlNonStriker.overs ?? 0),
      maidens: String(bowlNonStriker.bowlMaidens ?? bowlNonStriker.maidens ?? 0),
      runs: String(bowlNonStriker.bowlRuns ?? bowlNonStriker.runs ?? 0),
      wickets: String(bowlNonStriker.bowlWkts ?? bowlNonStriker.wickets ?? 0),
      economy: String(bowlNonStriker.bowlEcon ?? bowlNonStriker.economy ?? 0),
      onStrike: false,
      profileId: (bowlNonStriker.bowlId || bowlNonStriker.id) ? String(bowlNonStriker.bowlId || bowlNonStriker.id) : undefined,
      highlightsUrl: bowlNonStriker.playerMatchHighlightsUrl || undefined,
    });
  }

  const commentary: Commentary[] = commentaryArray
    ?.filter((c: any) => c.commText || c.commType === 'snippet')
    .map((c: any): Commentary => {
      // Handle snippet type (forecasts, insights, etc.)
      if (c.commType === 'snippet') {
        return {
          type: 'snippet',
          text: c.content || '',
          headline: c.headline || '',
          snippetType: c.eventType || '',
        };
      }

      let commText = c.commText.replace(/\\n/g, '<br />');
      let milestone;

      if (/(fifty|50\*)/i.test(commText)) {
        milestone = 'FIFTY';
        commText = commText.replace(/(fifty|50\*)/ig, '');
      } else if (/(hundred|100\*)/i.test(commText)) {
        milestone = 'HUNDRED';
        commText = commText.replace(/(hundred|100\*)/ig, '');
      }

      if (c.commentaryFormats) {
        const { bold, italic } = c.commentaryFormats;
        if (bold && bold.formatId && bold.formatValue) {
          for (let i = 0; i < bold.formatId.length; i++) {
            const placeholder = bold.formatId[i].replace('$', '\\$');
            commText = commText.replace(new RegExp(placeholder, 'g'), `<b>${bold.formatValue[i]}</b>`);
          }
        }
        if (italic && italic.formatId && italic.formatValue) {
          for (let i = 0; i < italic.formatId.length; i++) {
            const placeholder = italic.formatId[i].replace('$', '\\$');
            commText = commText.replace(new RegExp(placeholder, 'g'), `<i>${italic.formatValue[i]}</i>`);
          }
        }
      }

      // Get over number from overNumber (legacy) or ballMetric (new API format)
      let overNumberStr = '';
      if (c.overNumber) {
        overNumberStr = c.overNumber.toString();
      } else if (c.ballMetric) {
        overNumberStr = c.ballMetric.toString();
      }


      // Check if this is a ball-by-ball commentary (has ballNbr > 0 OR has ballMetric)
      if ((c.ballNbr > 0 || c.ballMetric) && overNumberStr) {
        const commentary: Commentary = {
          type: 'live',
          text: `${overNumberStr}: ${commText}`,
          event: Array.isArray(c.event) ? c.event.join(',') : c.event,
          runs: c.runs,
          milestone,
        };

        // Add over summary if this is an over-break (support both old and new API formats)
        if (c.overSeparator) {
          commentary.overSummary = c.overSeparator.o_summary || c.overSeparator.overSummary;
          commentary.overRuns = c.overSeparator.overRuns ?? c.overSeparator.runs;
          commentary.overNumber = c.overSeparator.overNum || c.overSeparator.overNumber;
          commentary.teamShortName = c.overSeparator.batTeamName || c.overSeparator.batTeamObj?.teamName;
          // Parse score from batTeamObj.teamScore if available (format: "ENG 174-6")
          if (c.overSeparator.batTeamObj?.teamScore) {
            const scoreMatch = c.overSeparator.batTeamObj.teamScore.match(/(\d+)-(\d+)/);
            if (scoreMatch) {
              commentary.teamScore = parseInt(scoreMatch[1], 10);
              commentary.teamWickets = parseInt(scoreMatch[2], 10);
            }
          } else {
            commentary.teamScore = c.overSeparator.score;
            commentary.teamWickets = c.overSeparator.wickets;
          }
          // Extract batsmen and bowler info
          const batsmen: { name: string; score: string }[] = [];
          const sep = c.overSeparator;
          if (sep.batStrikerObj?.playerName) {
            batsmen.push({ name: sep.batStrikerObj.playerName, score: sep.batStrikerObj.playerScore || '' });
          }
          if (sep.batNonStrikerObj?.playerName) {
            batsmen.push({ name: sep.batNonStrikerObj.playerName, score: sep.batNonStrikerObj.playerScore || '' });
          }
          if (batsmen.length > 0) commentary.overBatsmen = batsmen;
          if (sep.bowlerObj?.playerName) {
            commentary.overBowler = { name: sep.bowlerObj.playerName, figures: sep.bowlerObj.playerScore || '' };
          }
        }

        return commentary;
      }

      const boldFormat = c.commentaryFormats?.bold;
      if (boldFormat && boldFormat.formatId?.includes('B0$') && boldFormat.formatValue?.length > 0) {
        const author = boldFormat.formatValue[0];
        const isUserComment = commText.includes(`<b>${author}</b>:`);

        if (isUserComment) {
          const text = commText.replace(`<b>${author}</b>:`, '').trim();
          return {
            type: 'user',
            author: author,
            text: text,
          };
        }
      }

      return {
        type: 'stat',
        text: commText,
        milestone,
      };
    }) ?? [];

  const previousInnings = miniscore?.matchScoreDetails?.inningsScoreList
    ?.filter((inn: any) => inn.inningsId !== miniscore.inningsId)
    .map((inn: any) => {
      // Find matching team from matchHeader
      const team = matchHeader?.team1?.shortName === inn.batTeamName ? matchHeader.team1 : 
                   matchHeader?.team2?.shortName === inn.batTeamName ? matchHeader.team2 : null;
      
      // Try multiple flag URL patterns
      let teamFlagUrl: string | undefined;
      if (team?.imageId) {
        teamFlagUrl = teamFlagImageUrl(team.imageId, team.shortName.toLowerCase());
      }
      
      return {
        teamName: inn.batTeamName,
        teamShortName: team?.shortName,
        teamFlagUrl,
        score: `${inn.score}/${inn.wickets} (${inn.overs || 0} ov)`,
      };
    }) ?? [];

  const partnership = miniscore?.partnerShip ? `${miniscore.partnerShip.runs}(${miniscore.partnerShip.balls})` : "N/A";
  const lastWicket = miniscore?.lastWicket ?? "N/A";
  const recentOvers = miniscore?.recentOvsStats ?? "N/A";
  const toss = matchHeader?.tossResults?.tossWinnerName ? `${matchHeader.tossResults.tossWinnerName} won the toss and elected to ${matchHeader.tossResults.decision}` : "N/A";
  
  // Extract venue and date
  let venue = matchHeader?.venueInfo ? `${matchHeader.venueInfo.ground}, ${matchHeader.venueInfo.city}` : undefined;
  // Venue pages are series-scoped but accept placeholder slugs, so the
  // venue id + series id are enough to build a working link.
  let venueUrl = matchHeader?.venueInfo?.id && matchHeader?.seriesId
    ? `/cricket-series/${matchHeader.seriesId}/series/venues/${matchHeader.venueInfo.id}/${String(matchHeader.venueInfo.ground || 'venue').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    : undefined;
  // Lighter payloads sometimes lack venueInfo entirely; recover it from the match page.
  if (!venue) {
    const fromPage = await fetchVenueFromMatchPage(matchId);
    if (fromPage) {
      venue = fromPage.venue;
      venueUrl = fromPage.venueUrl;
    }
  }
  const matchDate = matchHeader?.matchStartTimestamp ? (() => {
    const date = new Date(matchHeader.matchStartTimestamp);
    const formatter = new Intl.DateTimeFormat('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    const formatted = formatter.format(date);
    // Replace GMT+X:XX with cleaner timezone names
    return formatted.replace(/GMT\+5:30/, 'IST').replace(/GMT([+-]\d{1,2}):?(\d{2})?/, 'GMT$1');
  })() : undefined;

  // Get the oldest (minimum) timestamp from commentaryArray for pagination
  let oldestTimestamp: number | undefined;
  if (commentaryArray && commentaryArray.length > 0) {
    const timestamps = commentaryArray.filter((c: any) => c.timestamp).map((c: any) => c.timestamp);
    if (timestamps.length > 0) {
      oldestTimestamp = Math.min(...timestamps);
    }
  }

  // Extract win probability from API response
  let winProbability: { team1: { name: string; probability: number }; team2: { name: string; probability: number } } | undefined;

  // Win probability is at data.winProbability.team1/team2
  const wp = data?.winProbability;
  if (wp?.team1?.percent !== undefined && wp?.team2?.percent !== undefined) {
    winProbability = {
      team1: { name: wp.team1.shortName || wp.team1.name, probability: wp.team1.percent },
      team2: { name: wp.team2.shortName || wp.team2.name, probability: wp.team2.percent },
    };
  }

  // Check if series has points table by querying the points table page
  let hasPointsTable = false;
  if (matchHeader?.seriesId) {
    try {
      const pointsTableUrl = `${UPSTREAM_BASE_URL}/cricket-series/${matchHeader.seriesId}/series/points-table`;
      const ptResponse = await fetch(pointsTableUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      if (ptResponse.ok) {
        const html = await ptResponse.text();
        hasPointsTable = html.includes('pointsTableData');
      }
    } catch (e) {
      console.error('[getScoreForMatchId] Failed to check points table availability:', e);
    }
  }

  const result = {
    title,
    status,
    score,
    batsmen,
    bowlers,
    commentary,
    previousInnings,
    currentRunRate: String(miniscore?.currentRunRate ?? 0),
    requiredRunRate: miniscore?.requiredRunRate ? String(miniscore.requiredRunRate) : undefined,
    partnership,
    lastWicket,
    recentOvers,
    toss,
    venue,
    venueUrl,
    date: matchDate,
    oldestCommentaryTimestamp: oldestTimestamp,
    matchStartTimestamp: matchHeader?.matchStartTimestamp,
    currentInningsId: miniscore?.inningsId,
    seriesName: matchHeader?.seriesName || undefined,
    seriesId: matchHeader?.seriesId ? String(matchHeader.seriesId) : undefined,
    matchFormat: matchHeader?.matchFormat,
    playerOfTheMatch: extractAwardPlayer(matchHeader?.playersOfTheMatch),
    playerOfTheSeries: extractAwardPlayer(matchHeader?.playersOfTheSeries),
    winProbability,
    hasPointsTable,
  };

  const validation = ScrapeCricbuzzUrlOutputSchema.safeParse(result);
  if (!validation.success) {
    console.error(validation.error.issues);
    throw new Error('Scraped data does not match the expected format.');
  }

  return validation.data;
}

export async function getMatchIdFromUrl(url: string) {
  return extractMatchId(url);
}






// Team flag/logo URL from a Cricbuzz team object's imageId.
function teamFlagFromImageId(team: any): string | undefined {
  return team?.imageId
    ? teamFlagImageUrl(team.imageId, String(team.teamSName || 'team').toLowerCase())
    : undefined;
}

export async function scrapeSeriesMatches(seriesId: string): Promise<LiveMatch[]> {
  // seriesId can be either just the ID (9596) or the full path (9596/india-tour-of-australia-2025)
  // Remove '/matches' suffix if present (from URL path)
  const cleanSeriesId = seriesId.replace(/\/matches$/, '');

  // Extract just the numeric ID from the path
  const numericId = cleanSeriesId.split('/')[0];

  // Try the API endpoint first - it returns clean JSON data
  const apiUrl = `${UPSTREAM_BASE_URL}/api/series/${numericId}`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (apiResponse.ok) {
      const text = await apiResponse.text();

      // Check if response is JSON
      if (!text.startsWith('{') && !text.startsWith('[')) {
        throw new Error('Not JSON response');
      }

      const data = JSON.parse(text);

      const matches: LiveMatch[] = [];
      const seriesName = data.seriesName || data.name || '';

      // The API returns matchDetails array with date groups
      if (data.matchDetails && Array.isArray(data.matchDetails)) {
        for (const dateGroup of data.matchDetails) {
          if (dateGroup.matchDetailsMap && dateGroup.matchDetailsMap.match) {
            // Get the date from the group key (format: "Feb 07, 2026" or timestamp)
            const groupDateKey = dateGroup.matchDetailsMap.key;
            let groupStartDate: number | undefined;
            if (groupDateKey) {
              // Try parsing as a date string first
              const parsedDate = Date.parse(groupDateKey);
              if (!isNaN(parsedDate)) {
                groupStartDate = parsedDate;
              }
            }

            for (const match of dateGroup.matchDetailsMap.match) {
              const matchInfo = match.matchInfo;
              if (!matchInfo) continue;

              const teams: { name: string, score?: string, flagUrl?: string, teamId?: string | number }[] = [];

              // Add team 1
              if (matchInfo.team1) {
                let score1 = '';
                if (match.matchScore?.team1Score?.inngs1) {
                  const inngs = match.matchScore.team1Score.inngs1;
                  score1 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                }
                teams.push({
                  name: matchInfo.team1.teamName,
                  score: score1 || undefined,
                  flagUrl: teamFlagFromImageId(matchInfo.team1),
                  teamId: matchInfo.team1.teamId,
                });
              }

              // Add team 2
              if (matchInfo.team2) {
                let score2 = '';
                if (match.matchScore?.team2Score?.inngs1) {
                  const inngs = match.matchScore.team2Score.inngs1;
                  score2 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                }
                teams.push({
                  name: matchInfo.team2.teamName,
                  score: score2 || undefined,
                  flagUrl: teamFlagFromImageId(matchInfo.team2),
                  teamId: matchInfo.team2.teamId,
                });
              }

              const venue = matchInfo.venueInfo ?
                `${matchInfo.venueInfo.ground}, ${matchInfo.venueInfo.city}` : undefined;

              const title = `${matchInfo.team1?.teamName || ''} vs ${matchInfo.team2?.teamName || ''}, ${matchInfo.matchDesc}`;
              matches.push({
                title,
                url: `/live-cricket-scores/${matchInfo.matchId}`,
                matchId: matchInfo.matchId.toString(),
                teams,
                status: matchInfo.status || 'Status not available',
                matchFormat: matchInfo.matchFormat,
                matchType: getMatchTypeFromSeries(seriesName, title),
                seriesName: seriesName || undefined,
                venue,
                startDate: matchInfo.startDate || matchInfo.matchStartTimestamp || groupStartDate,
              });
            }
          }
        }
      }

      if (matches.length > 0) {
        return matches;
      }
    }
  } catch (apiError) {
  }

  // Fallback to HTML scraping - try /matches page first, then base series URL
  const matchesUrl = `${UPSTREAM_BASE_URL}/cricket-series/${cleanSeriesId}/matches`;
  const baseUrl = `${UPSTREAM_BASE_URL}/cricket-series/${cleanSeriesId}`;
  const url = cleanSeriesId.includes('/') ? matchesUrl : baseUrl;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch series matches: ${response.statusText}`);
  }

  const html = await response.text();

  // Try to extract JSON data from the Next.js __NEXT_DATA__ script tag
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);

  if (nextDataMatch && nextDataMatch[1]) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);

      // Navigate through the Next.js data structure
      const pageProps = nextData?.props?.pageProps;
      const matchDetails = pageProps?.matchDetails;
      const seriesName = pageProps?.seriesName || pageProps?.name || '';

      if (matchDetails && Array.isArray(matchDetails)) {
        const matches: LiveMatch[] = [];

        for (const dateGroup of matchDetails) {
          if (dateGroup.matchDetailsMap && dateGroup.matchDetailsMap.match) {
            // Get the date from the group key
            const groupDateKey = dateGroup.matchDetailsMap.key;
            let groupStartDate: number | undefined;
            if (groupDateKey) {
              const parsedDate = Date.parse(groupDateKey);
              if (!isNaN(parsedDate)) {
                groupStartDate = parsedDate;
              }
            }

            for (const match of dateGroup.matchDetailsMap.match) {
              const matchInfo = match.matchInfo;
              if (!matchInfo) continue;

              const teams: { name: string, score?: string, flagUrl?: string, teamId?: string | number }[] = [];

              // Add team 1
              if (matchInfo.team1) {
                let score1 = '';
                if (match.matchScore?.team1Score?.inngs1) {
                  const inngs = match.matchScore.team1Score.inngs1;
                  score1 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                }
                teams.push({
                  name: matchInfo.team1.teamName,
                  score: score1 || undefined,
                  flagUrl: teamFlagFromImageId(matchInfo.team1),
                  teamId: matchInfo.team1.teamId,
                });
              }

              // Add team 2
              if (matchInfo.team2) {
                let score2 = '';
                if (match.matchScore?.team2Score?.inngs1) {
                  const inngs = match.matchScore.team2Score.inngs1;
                  score2 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                }
                teams.push({
                  name: matchInfo.team2.teamName,
                  score: score2 || undefined,
                  flagUrl: teamFlagFromImageId(matchInfo.team2),
                  teamId: matchInfo.team2.teamId,
                });
              }

              const venue = matchInfo.venueInfo ?
                `${matchInfo.venueInfo.ground}, ${matchInfo.venueInfo.city}` : undefined;

              const title = `${matchInfo.team1?.teamName || ''} vs ${matchInfo.team2?.teamName || ''}, ${matchInfo.matchDesc}`;
              matches.push({
                title,
                url: `/live-cricket-scores/${matchInfo.matchId}`,
                matchId: matchInfo.matchId.toString(),
                teams,
                status: matchInfo.status || 'Status not available',
                matchFormat: matchInfo.matchFormat,
                matchType: getMatchTypeFromSeries(seriesName, title),
                seriesName: seriesName || undefined,
                venue,
                startDate: matchInfo.startDate || matchInfo.matchStartTimestamp || groupStartDate,
              });
            }
          }
        }

        if (matches.length > 0) {
          return matches;
        }
      }
    } catch (e) {
      console.error('[scrapeSeriesMatches] Failed to parse __NEXT_DATA__:', e);
    }
  }

  // Extract match data from RSC payload embedded in HTML
  // The data appears as escaped JSON: \"matchDetails\":[{\"matchDetailsMap\":{...}]
  // We unescape the quotes and parse the JSON array directly
  const mdMarker = '"matchDetails\\":[';
  const mdIdx = html.indexOf(mdMarker);
  if (mdIdx > -1) {
    const arrStart = mdIdx + mdMarker.length - 1; // position of '['
    // Find the matching closing bracket for the array
    let depth = 0;
    let end = -1;
    for (let i = arrStart; i < html.length && i < arrStart + 200000; i++) {
      if (html[i] === '[') depth++;
      if (html[i] === ']') depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    if (end > -1) {
      try {
        // Unescape the JSON: \" -> " and \\\\ -> \\
        const rawJson = html.substring(arrStart, end).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const matchDetails = JSON.parse(rawJson);
            const matches: LiveMatch[] = [];
            for (const dateGroup of matchDetails) {
              if (dateGroup.matchDetailsMap?.match) {
                // Get the date from the group key
                const groupDateKey = dateGroup.matchDetailsMap.key;
                let groupStartDate: number | undefined;
                if (groupDateKey) {
                  const parsedDate = Date.parse(groupDateKey);
                  if (!isNaN(parsedDate)) {
                    groupStartDate = parsedDate;
                  }
                }

                for (const match of dateGroup.matchDetailsMap.match) {
                  const matchInfo = match.matchInfo;
                  if (!matchInfo) continue;
                  const teams: { name: string; score?: string; flagUrl?: string; teamId?: string | number }[] = [];
                  if (matchInfo.team1) {
                    let score1 = '';
                    if (match.matchScore?.team1Score?.inngs1) {
                      const inngs = match.matchScore.team1Score.inngs1;
                      score1 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                    }
                    teams.push({ name: matchInfo.team1.teamName, score: score1 || undefined, flagUrl: teamFlagFromImageId(matchInfo.team1) });
                  }
                  if (matchInfo.team2) {
                    let score2 = '';
                    if (match.matchScore?.team2Score?.inngs1) {
                      const inngs = match.matchScore.team2Score.inngs1;
                      score2 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                    }
                    teams.push({ name: matchInfo.team2.teamName, score: score2 || undefined, flagUrl: teamFlagFromImageId(matchInfo.team2) });
                  }
                  const venue = matchInfo.venueInfo
                    ? `${matchInfo.venueInfo.ground}, ${matchInfo.venueInfo.city}`
                    : undefined;

                  // Convert startDate string to number if needed
                  const startDateValue = matchInfo.startDate
                    ? (typeof matchInfo.startDate === 'string' ? parseInt(matchInfo.startDate, 10) : matchInfo.startDate)
                    : (matchInfo.matchStartTimestamp || groupStartDate);

                  matches.push({
                    title: `${matchInfo.team1?.teamName || ''} vs ${matchInfo.team2?.teamName || ''}, ${matchInfo.matchDesc}`,
                    url: `/live-cricket-scores/${matchInfo.matchId}`,
                    matchId: matchInfo.matchId.toString(),
                    teams,
                    status: matchInfo.status || 'Status not available',
                matchFormat: matchInfo.matchFormat,
                    venue,
                    startDate: startDateValue,
                  });
                }
              }
            }
            if (matches.length > 0) {
              return matches;
            }
          } catch (e) {
            console.error('[scrapeSeriesMatches] Failed to parse RSC matchDetails:', e);
          }
        }
      }

  // Try to extract JSON data from inline script tags (older pattern)
  let jsonMatch = html.match(/"matchDetails":\s*(\[[\s\S]*?\])\s*,\s*"landingPosition"/);

  if (jsonMatch && jsonMatch[1]) {
    try {
      const matchDetails = JSON.parse(jsonMatch[1]);
      const matches: LiveMatch[] = [];

      for (const dateGroup of matchDetails) {
        if (dateGroup.matchDetailsMap && dateGroup.matchDetailsMap.match) {
          // Get the date from the group key
          const groupDateKey = dateGroup.matchDetailsMap.key;
          let groupStartDate: number | undefined;
          if (groupDateKey) {
            const parsedDate = Date.parse(groupDateKey);
            if (!isNaN(parsedDate)) {
              groupStartDate = parsedDate;
            }
          }

          for (const match of dateGroup.matchDetailsMap.match) {
            const matchInfo = match.matchInfo;
            if (!matchInfo) continue;

            const teams: { name: string, score?: string, flagUrl?: string, teamId?: string | number }[] = [];

            // Add team 1
            if (matchInfo.team1) {
              let score1 = '';
              if (match.matchScore?.team1Score?.inngs1) {
                const inngs = match.matchScore.team1Score.inngs1;
                score1 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
              }
              teams.push({
                name: matchInfo.team1.teamName,
                score: score1 || undefined,
                flagUrl: teamFlagFromImageId(matchInfo.team1)
              });
            }

            // Add team 2
            if (matchInfo.team2) {
              let score2 = '';
              if (match.matchScore?.team2Score?.inngs1) {
                const inngs = match.matchScore.team2Score.inngs1;
                score2 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
              }
              teams.push({
                name: matchInfo.team2.teamName,
                score: score2 || undefined,
                flagUrl: teamFlagFromImageId(matchInfo.team2)
              });
            }

            const venue = matchInfo.venueInfo ?
              `${matchInfo.venueInfo.ground}, ${matchInfo.venueInfo.city}` : undefined;

            matches.push({
              title: `${matchInfo.team1?.teamName || ''} vs ${matchInfo.team2?.teamName || ''}, ${matchInfo.matchDesc}`,
              url: `/live-cricket-scores/${matchInfo.matchId}`,
              matchId: matchInfo.matchId.toString(),
              teams,
              status: matchInfo.status || 'Status not available',
                matchFormat: matchInfo.matchFormat,
              venue,
              startDate: matchInfo.startDate || matchInfo.matchStartTimestamp || groupStartDate,
            });
          }
        }
      }

      return matches;
    } catch (e) {
      console.error('Failed to parse JSON match data:', e);
      // Fall through to HTML parsing
    }
  }

  // Fallback to HTML parsing if JSON extraction fails
  const $ = cheerio.load(html);
  const matches: LiveMatch[] = [];
  const processedMatchIds = new Set<string>();

  // Find all match links directly - simpler and more reliable
  // Extract series slug from cleanSeriesId to filter matches (e.g., "india-tour-of-australia-2025")
  const seriesSlug = cleanSeriesId.includes('/') ? cleanSeriesId.split('/').pop() : '';

  const allLinks = $('a[href^="/live-cricket-scores/"]');

  let filteredCount = 0;
  allLinks.each((_, matchElement) => {
    const $match = $(matchElement);
    const href = $match.attr('href');

    if (!href) return;

    // Filter to only include matches from this series
    if (seriesSlug && !href.includes(seriesSlug)) return;

    filteredCount++;
    if (filteredCount <= 3) {
    }

    const matchId = extractMatchId(href);
    if (!matchId || processedMatchIds.has(matchId)) return;

    processedMatchIds.add(matchId);

    const title = $match.attr('title') || 'Untitled Match';

    // Extract teams and scores from the match card
    const teams: { name: string, score?: string }[] = [];

    // Find team containers within this match link
    $match.find('.flex.items-center.gap-4.justify-between').each((_, teamContainer) => {
      const $team = $(teamContainer);

      // Team name - try multiple selectors for both full and short names
      let teamName = $team.find('span.text-cbTxtPrim.hidden.wb\\:block').text().trim() ||
        $team.find('span.text-cbTxtSec.hidden.wb\\:block').text().trim() ||
        $team.find('span.text-cbTxtPrim.block.wb\\:hidden').text().trim() ||
        $team.find('span.text-cbTxtSec.block.wb\\:hidden').text().trim();

      // Score
      const score = $team.find('span.font-medium.wb\\:font-semibold').text().trim();

      if (teamName) {
        teams.push({
          name: teamName,
          score: score || undefined
        });
      }
    });

    // If no teams found with new structure, try extracting from title
    if (teams.length === 0) {
      const titleParts = title.split(',')[0].split(' vs ');
      if (titleParts.length === 2) {
        teams.push({ name: titleParts[0].trim() });
        teams.push({ name: titleParts[1].trim() });
      }
    }

    // Extract venue from the match details
    const venueText = $match.find('.text-xs.text-cbTxtSec').first().text().trim();
    const venue = venueText.split('•').pop()?.trim() || undefined;

    // Extract status
    let status = $match.find('.text-cbLive').text().trim() ||
      $match.find('.text-cbComplete').text().trim() ||
      $match.find('.text-cbPreview').text().trim() ||
      'Match scheduled';

    if (teams.length >= 1) {
      matches.push({
        title,
        url: href,
        matchId,
        teams,
        status: status || 'Status not available',
        venue: venue || undefined,
      });
    }
  });

  return matches;
}

const TeamScheduleSchema = z.object({
  teamName: z.string(),
  teamFlagUrl: z.string().optional(),
  live: z.array(LiveMatchSchema),
  upcoming: z.array(LiveMatchSchema),
  recent: z.array(LiveMatchSchema),
});
export type TeamSchedule = z.infer<typeof TeamScheduleSchema>;

// Reconstruct the upstream page's RSC payload — the schedule page ships all
// match data as escaped JSON inside `self.__next_f.push([1, "..."])` calls.
// We concatenate the payloads, then pull matchInfo blocks with a
// brace-balanced regex and JSON.parse each one.
function extractMatchInfosFromHtml(html: string): Array<Record<string, unknown>> {
  const parts: string[] = [];
  const chunkRe = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let cm: RegExpExecArray | null;
  while ((cm = chunkRe.exec(html))) {
    try { parts.push(JSON.parse('"' + cm[1] + '"')); } catch { /* skip bad chunk */ }
  }
  const rsc = parts.join('');
  const infos: Array<Record<string, unknown>> = [];
  // Non-nested matchInfo block; team1/team2 are one nested level deep.
  const blockRe = /"matchInfo":\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(rsc))) {
    try {
      const obj = JSON.parse('{' + bm[0] + '}');
      if (obj?.matchInfo?.matchId) infos.push(obj.matchInfo);
    } catch { /* skip malformed */ }
  }
  return infos;
}

/**
 * Build a lookup map of matchId → {teamName → teamId} from the source's
 * embedded RSC payload. The HTML-scraped live/recent/upcoming rows don't
 * expose team-page anchors, but the same page ships every match's full JSON
 * inside `self.__next_f.push` chunks — this resolver turns that into a cheap
 * post-processing step so domestic teams (Manchester Super Giants, LPL sides,
 * IPL franchises) get a real teamId without touching the DOM parser.
 */
function buildTeamIdLookupFromHtml(html: string): Map<string, Map<string, number>> {
  const lookup = new Map<string, Map<string, number>>();
  const infos = extractMatchInfosFromHtml(html);
  for (const mi of infos) {
    const asObj = mi as unknown as CbMatchInfo;
    if (!asObj.matchId) continue;
    const key = String(asObj.matchId);
    if (lookup.has(key)) continue;
    const inner = new Map<string, number>();
    if (asObj.team1?.teamId && asObj.team1?.teamName) {
      inner.set(asObj.team1.teamName.toLowerCase(), asObj.team1.teamId);
    }
    if (asObj.team2?.teamId && asObj.team2?.teamName) {
      inner.set(asObj.team2.teamName.toLowerCase(), asObj.team2.teamId);
    }
    if (inner.size > 0) lookup.set(key, inner);
  }
  return lookup;
}

type CbTeam = { teamId?: number; teamName?: string; teamSName?: string; imageId?: number };
type CbMatchInfo = {
  matchId: number;
  seriesId?: number;
  seriesName?: string;
  matchDesc?: string;
  matchFormat?: string;
  startDate?: string | number;
  state?: string;
  status?: string;
  team1?: CbTeam;
  team2?: CbTeam;
  venueInfo?: { ground?: string; city?: string };
};

function matchInfoToLive(mi: CbMatchInfo): LiveMatch {
  const teams: LiveMatch['teams'] = [];
  if (mi.team1) teams.push({ name: mi.team1.teamName || '', flagUrl: teamFlagFromImageId(mi.team1), teamId: mi.team1.teamId });
  if (mi.team2) teams.push({ name: mi.team2.teamName || '', flagUrl: teamFlagFromImageId(mi.team2), teamId: mi.team2.teamId });
  const venue = mi.venueInfo ? `${mi.venueInfo.ground || ''}${mi.venueInfo.city ? `, ${mi.venueInfo.city}` : ''}`.trim() : undefined;
  const title = `${mi.team1?.teamName || ''} vs ${mi.team2?.teamName || ''}${mi.matchDesc ? `, ${mi.matchDesc}` : ''}`;
  const startDate = typeof mi.startDate === 'string' ? parseInt(mi.startDate, 10) : mi.startDate;
  return {
    title,
    url: `/live-cricket-scores/${mi.matchId}`,
    matchId: String(mi.matchId),
    teams,
    status: mi.status || 'Status not available',
    matchFormat: mi.matchFormat,
    matchType: getMatchTypeFromSeries(mi.seriesName || '', title),
    seriesName: mi.seriesName || undefined,
    venue: venue || undefined,
    startDate: typeof startDate === 'number' && Number.isFinite(startDate) ? startDate : undefined,
  };
}

/**
 * Scrape a team's schedule page (upcoming, live, recent matches). The page
 * ships all match data as escaped JSON in the RSC payload; we filter to the
 * requested team and classify by `state`.
 */
export async function scrapeTeamSchedule(teamId: string, teamSlug: string): Promise<TeamSchedule> {
  const numericId = Number.parseInt(String(teamId).trim(), 10);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('Invalid team id');
  }
  const slug = (teamSlug || 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
  const url = `${UPSTREAM_BASE_URL}/cricket-team/${slug}/${numericId}/schedule`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch team schedule: ${response.status}`);
  const html = await response.text();

  // Team name from the page <h1>/title as a fallback when the slug is generic.
  const titleMatch = html.match(/<title[^>]*>([^|<]{2,60})/);
  const teamName = (titleMatch?.[1] || '').replace(/Cricket Team.*/i, '').trim() || slug.replace(/-/g, ' ');

  const infos = extractMatchInfosFromHtml(html);
  const seenIds = new Set<number>();
  const teamMatches = infos.filter(mi => {
    const asObj = mi as unknown as CbMatchInfo;
    if (asObj.team1?.teamId !== numericId && asObj.team2?.teamId !== numericId) return false;
    if (seenIds.has(asObj.matchId)) return false;
    seenIds.add(asObj.matchId);
    return true;
  }).map(mi => mi as unknown as CbMatchInfo);

  const live: LiveMatch[] = [];
  const upcoming: LiveMatch[] = [];
  const recent: LiveMatch[] = [];
  let teamFlagUrl: string | undefined;
  let officialTeamName: string | undefined;
  for (const mi of teamMatches) {
    const lm = matchInfoToLive(mi);
    const state = (mi.state || '').toLowerCase();
    if (state === 'in progress' || state === 'toss' || state === 'innings break') live.push(lm);
    else if (state === 'complete' || state === 'result' || state === 'abandoned') recent.push(lm);
    else upcoming.push(lm);
    // Pull the flag + canonical team name from whichever side is this team.
    if (!teamFlagUrl || !officialTeamName) {
      const side = mi.team1?.teamId === numericId ? mi.team1 : mi.team2?.teamId === numericId ? mi.team2 : undefined;
      if (side) {
        officialTeamName ||= side.teamName || undefined;
        teamFlagUrl ||= teamFlagFromImageId(side);
      }
    }
  }
  upcoming.sort((a, b) => (a.startDate || 0) - (b.startDate || 0));
  recent.sort((a, b) => (b.startDate || 0) - (a.startDate || 0));

  return { teamName: officialTeamName || teamName, teamFlagUrl, live, upcoming, recent };
}

export async function scrapeMatchStats(matchId: string): Promise<MatchStats> {
  const url = `${UPSTREAM_BASE_URL}/live-cricket-scores/${matchId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch match stats: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $('.cb-nav-hdr.cb-font-18.line-ht24').text().trim() || 'Match';
  const venue = $('.cb-mtch-info-itm:contains("Venue")').find('span').last().text().trim() || '';
  const date = $('.cb-mtch-info-itm:contains("Date")').find('span').last().text().trim() || '';
  const toss = $('.cb-mtch-info-itm:contains("Toss")').find('span').last().text().trim() || '';
  const result = $('.cb-mtch-info-itm:contains("Result")').find('span').last().text().trim() || '';

  let playerOfTheMatch = '';
  const pomElement = $('.cb-mtch-info-itm:contains("Player of the Match")');
  if (pomElement.length) {
    playerOfTheMatch = pomElement.find('a').text().trim() || pomElement.find('span').last().text().trim();
  }

  const umpires: string[] = [];
  $('.cb-mtch-info-itm:contains("Umpire")').each((_, element) => {
    const umpire = $(element).find('span').last().text().trim();
    if (umpire) umpires.push(umpire);
  });

  const referee = $('.cb-mtch-info-itm:contains("Referee")').find('span').last().text().trim() || undefined;
  const weather = $('.cb-mtch-info-itm:contains("Weather")').find('span').last().text().trim() || undefined;
  const pitchReport = $('.cb-mtch-info-itm:contains("Pitch")').find('span').last().text().trim() || undefined;

  return MatchStatsSchema.parse({
    matchId,
    title,
    venue,
    date,
    toss,
    result,
    playerOfTheMatch: playerOfTheMatch || undefined,
    umpires,
    referee,
    weather,
    pitchReport,
  });
}


export async function getMatchSquads(matchId: string): Promise<MatchSquads> {
  const url = `${UPSTREAM_BASE_URL}/cricket-match-squads/${matchId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch squads: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('[Squad Parser] Fetching squads for match:', matchId);

  // Get team names and flags from the header
  // Structure: <div class="flex justify-between"><div class="flex"><img/><h1 class="font-bold">TEAM1</h1></div><div class="flex"><h1 class="font-bold">TEAM2</h1></div></div>
  const teamData: Array<{ name: string; flagUrl?: string }> = [];
  
  // Find the header with both teams
  $('div.flex.justify-between').each((_, header) => {
    const $header = $(header);
    
    // Find each team container (div.flex inside the header)
    $header.find('> div.flex').each((_, teamDiv) => {
      const $teamDiv = $(teamDiv);
      const name = $teamDiv.find('h1.font-bold').text().trim();
      let flagUrl = $teamDiv.find('img').attr('src') || $teamDiv.find('img').attr('srcset')?.split(' ')[0];
      // Upgrade flag to 72x52 for crisp display
      if (flagUrl && flagUrl.includes((new URL(UPSTREAM_STATIC_URL)).host)) {
        flagUrl = flagUrl.replace(/\/\d+x\d+\//, '/72x52/');
      }

      if (name && name.length > 0 && name.length < 20) {
        teamData.push({ name, flagUrl });
      }
    });
    
    // Stop after finding teams
    if (teamData.length >= 2) {
      return false;
    }
  });

  if (teamData.length < 2) {
    throw new Error(`Could not find both team names. Found: ${teamData.map(t => t.name).join(', ')}`);
  }

  console.log('[Squad Parser] Found teams:', teamData.map(t => t.name).join(' vs '));

  const teams: z.infer<typeof TeamSquadSchema>[] = [
    { teamName: teamData[0].name, teamShortName: teamData[0].name, teamFlagUrl: teamData[0].flagUrl, playingXI: [], bench: [] },
    { teamName: teamData[1].name, teamShortName: teamData[1].name, teamFlagUrl: teamData[1].flagUrl, playingXI: [], bench: [] },
  ];

  // Helper to upgrade player image quality to 225x225
  const upgradePlayerImage = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    // Upgrade static.the source.com URLs (e.g., 50x50 -> 225x225)
    if (url.includes((new URL(UPSTREAM_STATIC_URL)).host)) {
      return url.replace(/\/\d+x\d+\//, '/225x225/');
    }
    // Convert img1.the source.com faceImages to higher res static URL
    const faceMatch = url.match(/c-img\/faceImages\/(\d+)/);
    if (faceMatch) {
      return playerFaceImageUrl(faceMatch[1]);
    }
    return url;
  };

  // Process Playing XI section
  const playingXISections = $('h1:contains("playing XI"), h1:contains("Playing XI")');
  console.log('[Squad Parser] Found Playing XI sections:', playingXISections.length);

  playingXISections.each((_, sectionHeader) => {
    const $section = $(sectionHeader).parent();
    const $squadGrid = $section.find('.w-full.flex');

    // Helper to parse a player anchor element
    const parsePlayer = ($player: ReturnType<typeof $>) => {
      const href = $player.attr('href') || '';
      const profileId = href.match(/\/profiles\/(\d+)\//)?.[1];
      const $nameSpans = $player.find('.flex.flex-row span');
      const name = $nameSpans.filter((_, s) => $(s).text().trim().length > 1).first().text().trim();
      const captainWK = $nameSpans.filter((_, s) => /\(/.test($(s).text())).first().text().trim();
      const role = $player.find('div.text-cbTxtSec.text-xs').text().trim();
      const rawImageUrl = $player.find('img').attr('src') || $player.find('img').attr('srcset')?.split(' ')[0];
      const isIn = $player.find('.cbPlayerIn').length > 0;
      const isOut = $player.find('.cbPlayerOut').length > 0;
      const isOverseas = $player.find('.cbOverseas').length > 0;

      if (!name) return null;
      return {
        name,
        role: role || 'Player',
        profileId,
        imageUrl: upgradePlayerImage(rawImageUrl),
        isCaptain: captainWK.includes('C'),
        isWicketKeeper: captainWK.includes('WK'),
        ...(isOverseas ? { isOverseas: true } : {}),
        ...(isIn ? { isIn: true } : {}),
        ...(isOut ? { isOut: true } : {}),
      };
    };

    // Left column (Team 1)
    $squadGrid.find('.w-1\\/2').first().find('a').each((_, player) => {
      const p = parsePlayer($(player));
      if (p) teams[0].playingXI.push(p);
    });

    // Right column (Team 2)
    $squadGrid.find('.w-1\\/2').last().find('a').each((_, player) => {
      const p = parsePlayer($(player));
      if (p) teams[1].playingXI.push(p);
    });
  });

  // Process Bench section (reuse parsePlayer from Playing XI scope — define a shared version)
  const parseBenchPlayer = ($player: ReturnType<typeof $>) => {
    const href = $player.attr('href') || '';
    const profileId = href.match(/\/profiles\/(\d+)\//)?.[1];
    const name = $player.find('.flex.flex-row span').filter((_, s) => $(s).text().trim().length > 1).first().text().trim();
    const role = $player.find('div.text-cbTxtSec.text-xs').text().trim();
    const rawImageUrl = $player.find('img').attr('src') || $player.find('img').attr('srcset')?.split(' ')[0];
    const isIn = $player.find('.cbPlayerIn').length > 0;
    const isOut = $player.find('.cbPlayerOut').length > 0;
    const isOverseas = $player.find('.cbOverseas').length > 0;

    if (!name) return null;
    return {
      name,
      role: role || 'Player',
      profileId,
      imageUrl: upgradePlayerImage(rawImageUrl),
      ...(isOverseas ? { isOverseas: true } : {}),
      ...(isIn ? { isIn: true } : {}),
      ...(isOut ? { isOut: true } : {}),
    };
  };

  $('h1:contains("bench"), h1:contains("Bench")').each((_, sectionHeader) => {
    const $section = $(sectionHeader).parent();
    const $squadGrid = $section.find('.w-full.flex');

    // Left column (Team 1)
    $squadGrid.find('.w-1\\/2').first().find('a').each((_, player) => {
      const p = parseBenchPlayer($(player));
      if (p) teams[0].bench.push(p);
    });

    // Right column (Team 2)
    $squadGrid.find('.w-1\\/2').last().find('a').each((_, player) => {
      const p = parseBenchPlayer($(player));
      if (p) teams[1].bench.push(p);
    });
  });

  // If no Playing XI found, try to parse squad lists (for upcoming matches)
  if (teams[0].playingXI.length === 0 && teams[1].playingXI.length === 0) {
    console.log('[Squad Parser] No Playing XI found, trying to parse squad lists...');
    
    // New approach: Parse the Squad h1 section with concatenated player data
    const squadH1 = $('h1:contains("Squad")').first();
    if (squadH1.length > 0) {
      const squadContainer = squadH1.next();
      const squadText = squadContainer.text();
      
      console.log('[Squad Parser] Parsing squad text, length:', squadText.length);
      
      // The squad container has both teams' squads side by side in a grid
      // Find all player links and use their parent structure to determine team
      const allPlayerLinks = squadContainer.find('a[href*="/profiles/"]');
      console.log('[Squad Parser] Found total player links:', allPlayerLinks.length);
      
      if (allPlayerLinks.length > 0) {
        // Group players by checking if they're in left or right half of the container
        allPlayerLinks.each((idx, link) => {
          const $link = $(link);
          const href = $link.attr('href') || '';
          const profileId = href.match(/\/profiles\/(\d+)\//)?.[1];
          
          const $nameSpans = $link.find('.flex.flex-row span');
          const name = $nameSpans.filter((_, s) => $(s).text().trim().length > 1).first().text().trim();
          const roleMarker = $nameSpans.filter((_, s) => /\(/.test($(s).text())).first().text().trim();
          const role = $link.find('div.text-xs').text().trim() || 'Player';
          const imageUrl = $link.find('img').attr('src') || $link.find('img').attr('srcset')?.split(' ')[0];
          
          if (name && name.length > 2) {
            // Check if this link's parent has w-1/2 class or similar
            let teamIndex = 0;
            let $parent = $link.parent();
            
            // Traverse up to find the column container
            for (let i = 0; i < 5; i++) {
              const classes = $parent.attr('class') || '';
              // Check if this is the right column (second w-1/2)
              if (classes.includes('w-1/2')) {
                // Check if this is the second occurrence by checking previous siblings
                const prevSiblings = $parent.prevAll('[class*="w-1/2"]');
                if (prevSiblings.length > 0) {
                  teamIndex = 1;
                }
                break;
              }
              $parent = $parent.parent();
              if ($parent.length === 0) break;
            }
            
            const isIn = $link.find('.cbPlayerIn').length > 0;
            const isOut = $link.find('.cbPlayerOut').length > 0;

            teams[teamIndex].playingXI.push({
              name,
              role,
              profileId,
              imageUrl,
              isCaptain: roleMarker.includes('C'),
              isWicketKeeper: roleMarker.includes('WK'),
              ...(isIn ? { isIn: true } : {}),
              ...(isOut ? { isOut: true } : {}),
            });
          }
        });
      }
      
      console.log('[Squad Parser] Parsed players - Team 1:', teams[0].playingXI.length, 'Team 2:', teams[1].playingXI.length);
    }
  }

  console.log('[Squad Parser] Team 1 players:', teams[0].playingXI.length);
  console.log('[Squad Parser] Team 2 players:', teams[1].playingXI.length);

  if (teams[0].playingXI.length === 0 && teams[1].playingXI.length === 0) {
    // Log some HTML snippets for debugging
    console.log('[Squad Parser] Sample HTML snippets:');
    console.log('[Squad Parser] h1 tags:', $('h1').map((_, el) => $(el).text().trim()).get().slice(0, 10));
    
    // Check what's after the "Squad" h1
    const squadH1 = $('h1:contains("Squad")').first();
    if (squadH1.length > 0) {
      console.log('[Squad Parser] Found Squad h1, checking siblings...');
      console.log('[Squad Parser] Next sibling text:', squadH1.next().text().substring(0, 200));
      console.log('[Squad Parser] Parent text:', squadH1.parent().text().substring(0, 300));
    }
    
    throw new Error('Could not find any players in squads. The squads may not be announced yet.');
  }

  return MatchSquadsSchema.parse({
    team1: teams[0],
    team2: teams[1],
  });
}

export async function scrapePlayerHighlights(highlightsUrl: string): Promise<PlayerHighlights> {
  const fullUrl = `${UPSTREAM_BASE_URL}${highlightsUrl}`;
  const response = await fetch(fullUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch highlights: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract player name and score from the header
  // Format: "Abhigyan Kundu 8(11)"
  const headerText = $('div.w-full > div.mx-4.mt-2').first().text().trim()
    || $('div.font-bold.text-base').first().text().trim();

  let playerName = '';
  let playerScore = '';
  if (headerText) {
    // Match pattern like "Player Name 8(11)" or "Player Name 123(95)"
    const scoreMatch = headerText.match(/^(.+?)\s+(\d+\(\d+\))$/);
    if (scoreMatch) {
      playerName = scoreMatch[1].trim();
      playerScore = scoreMatch[2];
    } else {
      playerName = headerText;
    }
  }

  // Extract ball-by-ball highlights
  // the source HTML structure:
  // <div class="flex gap-4 ...">
  //   <div class="flex flex-col ...">           <- first child (contains over + badge)
  //     <div class="font-bold ...">2.3</div>    <- over number
  //     <div class="bg-cbFour ...">4</div>      <- event badge (optional)
  //   </div>
  //   <div>Matt Henry to Samson, FOUR, ...</div> <- commentary (second child)
  // </div>
  const highlights: { over: string; text: string }[] = [];
  const processed = new Set<string>();

  // Find all flex containers with gap-4 or gap-6 that have mx-4 (these are highlight rows)
  $('div.flex').each((_, el) => {
    const $el = $(el);
    const className = $el.attr('class') || '';

    // Skip if it's not a highlight row (should have gap and mx)
    if (!className.includes('gap-4') && !className.includes('gap-6')) return;
    if (!className.includes('mx-4') && !className.includes('mx-2')) return;

    const children = $el.children();
    if (children.length < 2) return;

    const firstChild = $(children[0]);
    const secondChild = $(children[1]);

    // The over number is in the FIRST font-bold div inside the first child
    const overDiv = firstChild.find('div.font-bold').first();
    const overText = overDiv.text().trim();

    // Match over number pattern: X.Y (like 2.3) OR just X (like 1, 2, 3 for complete overs)
    if (!/^\d{1,2}(\.\d)?$/.test(overText)) return;

    // Get the HTML of the second child to preserve bold tags for event detection
    const commentaryHtml = secondChild.html() || '';
    const commentaryText = secondChild.text().trim();

    if (!commentaryText) return;

    // Create unique key to avoid duplicates
    const key = `${overText}:${commentaryText.substring(0, 50)}`;
    if (processed.has(key)) return;
    processed.add(key);

    // Store HTML so the frontend can detect events from bold tags
    highlights.push({ over: overText, text: commentaryHtml });
  });

  // Fallback: if above didn't work, try finding by font-bold pattern directly
  if (highlights.length === 0) {
    $('div.font-bold').each((_, el) => {
      const $el = $(el);
      const overText = $el.text().trim();

      // Match over number pattern
      if (!/^\d{1,2}(\.\d)?$/.test(overText)) return;

      // Navigate up to find the parent row container
      const parentRow = $el.closest('div.flex');
      if (!parentRow.length) return;

      // Find the commentary sibling
      const children = parentRow.children();
      if (children.length < 2) return;

      const commentaryDiv = $(children[1]);
      const commentaryHtml = commentaryDiv.html() || '';
      const commentaryText = commentaryDiv.text().trim();

      if (!commentaryText) return;

      const key = `${overText}:${commentaryText.substring(0, 50)}`;
      if (processed.has(key)) return;
      processed.add(key);

      highlights.push({ over: overText, text: commentaryHtml });
    });
  }

  if (!playerName && highlights.length === 0) {
    throw new Error('Could not parse highlights from the page.');
  }

  return { playerName, playerScore, highlights };
}

function inferCategory(name: string): CricketSeries['category'] {
  const lower = name.toLowerCase();
  // Women detection
  if (/women|wpl|wbbl|wt20/i.test(lower)) return 'women';
  // League detection
  if (/\bipl\b|premier league|big bash|bbl|psl|cpl|sa20|bpl|hundred|mpl|ilt20|lpl|super smash|major league/i.test(lower)) return 'league';
  // International detection
  if (/\btour\b|test |odi |t20i|\bworldcup\b|\bworld cup\b|\bicc\b|trophy|championship|tri.?series|bilateral/i.test(lower)) return 'international';
  // Domestic fallback
  return 'domestic';
}

export async function scrapeSeriesSchedule(): Promise<SeriesSchedule> {
  const response = await fetch(upstreamUrl('/cricket-schedule/series/all'), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch series schedule: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  const months: SeriesSchedule['months'] = [];

  // Desktop schedule inside <main>:
  // Container: div.wb\:flex.hidden.px-5.bg-cbWhite.flex-col
  //   Child 0: header row (Month | Series Name)
  //   Child 1: div.w-full.flex.flex-col containing month rows
  //     Each month row: div.w-full.flex
  //       Left:  div.w-4/12 with month name (e.g. "february 2024")
  //       Right: div.w-full with series blocks containing <a href="/cricket-series/...">

  // Find all actual month rows (those with a w-4/12 month column)
  $('main div.w-full.flex').each((_, row) => {
    const $row = $(row);

    // Only match rows that have the month column (w-4/12)
    const $monthCol = $row.children('div').filter((_, el) => {
      const cls = $(el).attr('class') || '';
      return cls.includes('w-4/12');
    }).first();
    if (!$monthCol.length) return;

    const monthText = $monthCol.text().trim();
    if (!monthText || !/^(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(monthText)) return;

    const monthName = monthText.toUpperCase();

    // Find or create month entry
    let monthEntry = months.find(m => m.name === monthName);
    if (!monthEntry) {
      monthEntry = { name: monthName, series: [] };
      months.push(monthEntry);
    }

    // Series links are in the right column
    $row.find('a[href*="/cricket-series/"]').each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href') || '';
      const idMatch = href.match(/\/cricket-series\/(\d+)/);
      if (!idMatch) return;

      const seriesId = idMatch[1];
      // Skip if already added (dedup)
      if (monthEntry!.series.some(s => s.seriesId === seriesId)) return;

      // The link contains nested divs: first = series name, second = date range
      const $innerDivs = $link.find('div > div');
      let name = '';
      let dateRange = '';
      if ($innerDivs.length >= 2) {
        name = $innerDivs.eq(0).text().trim();
        dateRange = $innerDivs.eq(1).text().trim();
      } else {
        // Fallback: use direct div children
        const $divs = $link.find('div');
        name = $divs.first().text().trim();
        dateRange = $divs.length > 1 ? $divs.eq(1).text().trim() : '';
      }

      if (!name || !seriesId) return;

      monthEntry!.series.push({
        name,
        dateRange,
        seriesUrl: href,
        seriesId,
        category: inferCategory(name),
      });
    });
  });

  // Sort months in ascending order (oldest first)
  const monthOrder = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  months.sort((a, b) => {
    const [aMonth, aYear] = a.name.toLowerCase().split(' ');
    const [bMonth, bYear] = b.name.toLowerCase().split(' ');
    const yearDiff = parseInt(aYear) - parseInt(bYear);
    if (yearDiff !== 0) return yearDiff;
    return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
  });

  return { months };
}

export async function scrapeSeriesStatsTypes(seriesId: string): Promise<SeriesStatsType> {
  // Extract numeric ID from path like "10102/new-zealand-tour-of-india-2026"
  const numericId = seriesId.split('/')[0];
  const slug = seriesId.split('/').slice(1).join('/') || 'series';

  const url = `${UPSTREAM_BASE_URL}/cricket-series/${numericId}/${slug}/stats`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch series stats page: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract RSC payload
  let rscPayload = '';
  $('script').each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('self.__next_f.push')) {
      rscPayload += text;
    }
  });

  // Extract statsTypes
  const statsTypes: { value?: string; header: string; category?: string }[] = [];
  const statsTypesMatch = rscPayload.match(/"statsTypes"\s*:\s*(\{[\s\S]*?"types"\s*:\s*\[[\s\S]*?\]\s*\})/);
  if (statsTypesMatch) {
    try {
      const cleaned = statsTypesMatch[1].replace(/\\"/g, '"');
      const parsed = JSON.parse(cleaned);
      if (parsed.types) {
        for (const t of parsed.types) {
          statsTypes.push({ value: t.value, header: t.header, category: t.category });
        }
      }
    } catch {
      // fallback defaults
    }
  }

  if (statsTypes.length === 0) {
    // Default stat types
    statsTypes.push(
      { header: 'Batting' },
      { value: 'mostRuns', header: 'Most Runs', category: 'Batting' },
      { value: 'highestScore', header: 'Highest Scores', category: 'Batting' },
      { value: 'highestAvg', header: 'Best Batting Average', category: 'Batting' },
      { value: 'highestSr', header: 'Best Batting Strike Rate', category: 'Batting' },
      { value: 'mostHundreds', header: 'Most Hundreds', category: 'Batting' },
      { value: 'mostFifties', header: 'Most Fifties', category: 'Batting' },
      { value: 'mostFours', header: 'Most Fours', category: 'Batting' },
      { value: 'mostSixes', header: 'Most Sixes', category: 'Batting' },
      { header: 'Bowling' },
      { value: 'mostWickets', header: 'Most Wickets', category: 'Bowling' },
      { value: 'lowestAvg', header: 'Best Bowling Average', category: 'Bowling' },
      { value: 'bestBowlingInnings', header: 'Best Bowling', category: 'Bowling' },
      { value: 'mostFiveWickets', header: 'Most 5 Wickets Haul', category: 'Bowling' },
      { value: 'lowestEcon', header: 'Best Economy', category: 'Bowling' },
      { value: 'lowestSr', header: 'Best Bowling Strike Rate', category: 'Bowling' },
    );
  }

  // Extract match formats from filter
  const formats: { matchTypeId: string; matchTypeDesc: string }[] = [];
  const filterMatch = rscPayload.match(/"filter"\s*:\s*\{[\s\S]*?"matchtype"\s*:\s*(\[[\s\S]*?\])/);
  if (filterMatch) {
    try {
      const cleaned = filterMatch[1].replace(/\\"/g, '"');
      const parsed = JSON.parse(cleaned);
      for (const f of parsed) {
        formats.push({ matchTypeId: f.matchTypeId, matchTypeDesc: f.matchTypeDesc });
      }
    } catch {
      // ignore
    }
  }

  return { statsTypes, formats };
}

export async function scrapeSeriesStats(seriesId: string, statsType: string): Promise<SeriesStatCategory> {
  const numericId = seriesId.split('/')[0];

  const url = `${UPSTREAM_BASE_URL}/api/cricket-series/series-stats/${numericId}/${statsType}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch series stats: ${response.statusText}`);
  }

  const data = await response.json();

  // Find the first stats list (e.g., t20StatsList, odiStatsList, testStatsList)
  const statsListKey = Object.keys(data).find(k => k.endsWith('StatsList'));
  if (!statsListKey) {
    return { key: statsType, name: statsType, category: 'Batting', headers: [], entries: [] };
  }

  const statsList = data[statsListKey];
  const headers: string[] = statsList.headers || [];
  const entries: SeriesStatEntry[] = [];

  if (statsList.values && Array.isArray(statsList.values)) {
    for (const row of statsList.values) {
      const vals = row.values || [];
      if (vals.length < 2) continue;

      const playerId = vals[0];
      const playerName = vals[1];
      const valueMap: Record<string, string> = {};
      // Headers: ["PLAYER", "MATCHES", "INNS", "RUNS", ...]
      // Values:  [playerId, playerName, matches, inns, runs, ...]
      // Skip headers[0] ("PLAYER") - map headers[1+] to vals[2+]
      for (let i = 1; i < headers.length; i++) {
        valueMap[headers[i]] = vals[i + 1] ?? '';
      }

      entries.push({ playerId, playerName, values: valueMap });
    }
  }

  return {
    key: statsType,
    name: statsType,
    category: 'Batting',
    headers,
    entries,
  };
}

export async function scrapeSeriesPointsTable(seriesId: string): Promise<PointsTableData> {
  const numericId = seriesId.split('/')[0];
  const slug = seriesId.split('/').slice(1).join('/') || 'series';

  const url = `${UPSTREAM_BASE_URL}/cricket-series/${numericId}/${slug}/points-table`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();

  // Check if points table data exists
  if (!html.includes('pointsTableData')) {
    return null;
  }

  // Collect RSC payload
  const $ = cheerio.load(html);
  let rscPayload = '';
  $('script').each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('self.__next_f.push')) {
      rscPayload += text;
    }
  });

  // Unescape RSC encoding
  const unescaped = rscPayload.replace(/\\"/g, '"');

  // Find pointsTableData JSON
  const marker = '"pointsTableData":';
  const markerIdx = unescaped.indexOf(marker);
  if (markerIdx === -1) {
    return null;
  }

  // Brace-match to extract the JSON object
  const startIdx = markerIdx + marker.length;
  let depth = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < unescaped.length; i++) {
    if (unescaped[i] === '{') depth++;
    else if (unescaped[i] === '}') depth--;
    if (depth === 0) {
      endIdx = i + 1;
      break;
    }
  }

  const jsonStr = unescaped.slice(startIdx, endIdx);

  try {
    const raw = JSON.parse(jsonStr);

    const groups: PointsTableGroup[] = [];
    if (raw.pointsTable && Array.isArray(raw.pointsTable)) {
      for (const group of raw.pointsTable) {
        const teams: PointsTableTeam[] = [];
        if (group.pointsTableInfo && Array.isArray(group.pointsTableInfo)) {
          for (const t of group.pointsTableInfo) {
            teams.push({
              teamFullName: t.teamFullName || '',
              teamName: t.teamName || '',
              teamId: t.teamId || 0,
              teamImageId: t.teamImageId || t.imageId || undefined,
              matchesPlayed: t.matchesPlayed || 0,
              matchesWon: t.matchesWon || 0,
              matchesLost: t.matchesLost || 0,
              matchesTied: t.matchesTied || 0,
              noRes: t.noRes || 0,
              matchesDrawn: t.matchesDrawn || 0,
              nrr: t.nrr || '0.000',
              points: t.points || 0,
              form: Array.isArray(t.form) ? t.form : [],
              teamQualifyStatus: t.teamQualifyStatus || '',
              matches: Array.isArray(t.teamMatches) ? t.teamMatches.map((m: any) => {
                // Format date from epoch timestamp
                let dateStr = '';
                if (m.startdt) {
                  const d = new Date(m.startdt);
                  dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                }
                return {
                  matchId: m.matchId || 0,
                  matchName: m.matchName || '',
                  opponent: m.opponent || '',
                  opponentShortName: m.opponentSName || '',
                  result: m.result || '',
                  date: dateStr,
                  won: m.winner === t.teamId,
                };
              }) : [],
            });
          }
        }
        groups.push({
          groupName: group.groupName || '',
          teams,
        });
      }
    }

    return {
      seriesName: raw.seriesName || '',
      matchType: raw.match_type || '',
      groups,
    };
  } catch {
    return null;
  }
}

export async function getOverByOverData(matchId: string, inningsId: number): Promise<InningsOverData> {
  const overMap = new Map<number, { runs: number; score: number; wickets: number; summary: string }>();
  let timestamp = 9999999999999;
  let teamName = '';
  const MAX_PAGES = 20;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${UPSTREAM_BASE_URL}/api/mcenter/commentary-pagination/${matchId}/${inningsId}/${timestamp}`;
    let response: Response;
    try {
      response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
    } catch {
      break;
    }
    if (!response.ok) break;

    let data: any[];
    try {
      data = await response.json();
    } catch {
      break;
    }
    if (!Array.isArray(data) || data.length === 0) break;

    let foundNew = false;
    for (const item of data) {
      if (item.overSeparator) {
        const sep = item.overSeparator;
        const overNum = sep.overNum || sep.overNumber;
        const sepTeam = sep.batTeamName || sep.batTeamObj?.teamName || '';
        // Set team name from first separator we encounter
        if (!teamName && sepTeam) teamName = sepTeam;
        // Skip separators from a different team (previous innings leaking in)
        if (teamName && sepTeam && sepTeam !== teamName) continue;
        if (overNum != null && !overMap.has(overNum)) {
          foundNew = true;
          let score = sep.score || 0;
          let wkts = sep.wickets || 0;
          if (sep.batTeamObj?.teamScore) {
            const scoreMatch = sep.batTeamObj.teamScore.match(/(\d+)-(\d+)/);
            if (scoreMatch) {
              score = parseInt(scoreMatch[1], 10);
              wkts = parseInt(scoreMatch[2], 10);
            }
          }
          overMap.set(overNum, {
            runs: sep.runs || sep.overRuns || 0,
            score,
            wickets: wkts,
            summary: sep.o_summary || sep.overSummary || '',
          });
        }
      }
    }

    const timestamps = data
      .filter((d: any) => d.timestamp && d.timestamp < timestamp)
      .map((d: any) => d.timestamp);
    if (timestamps.length === 0 || !foundNew) break;
    timestamp = Math.min(...timestamps);
  }

  const sortedOvers = Array.from(overMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([overNumber, d]) => ({ overNumber, ...d }));

  // Parse per-over runs from summary string "(X runs)" since API score field is unreliable
  const overs: OverData[] = [];
  let cumScore = 0;
  let cumWickets = 0;
  for (let i = 0; i < sortedOvers.length; i++) {
    const o = sortedOvers[i];
    // Extract runs from summary like "4 2 6 2 1 4 (19 runs)"
    let runs = 0;
    const runsMatch = o.summary.match(/\((\d+)\s*runs?\)/i);
    if (runsMatch) {
      runs = parseInt(runsMatch[1], 10);
    } else if (o.runs > 0) {
      runs = o.runs;
    }
    cumScore += runs;
    const overWickets = i === 0 ? o.wickets : Math.max(0, o.wickets - sortedOvers[i - 1].wickets);
    cumWickets += overWickets;
    overs.push({
      overNumber: o.overNumber,
      runs,
      wickets: overWickets,
      cumulativeScore: cumScore,
      cumulativeWickets: cumWickets,
      overSummary: o.summary,
    });
  }

  return { inningsId, teamName, overs };
}

export async function fetchPartnershipData(matchId: string): Promise<PartnershipInnings[]> {
  const url = `${UPSTREAM_BASE_URL}/api/mcenter/partnership-graph/${matchId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map((innings: any) => ({
    inningsId: innings.inningsID || innings.inningsId,
    teamName: innings.batTeamName || '',
    teamShortName: innings.batTeamShortName || '',
    partnerships: (innings.partnershipDataDTO || []).map((p: any) => ({
      bat1Name: p.bat1Name || '',
      bat2Name: p.bat2Name || '',
      bat1Runs: p.bat1Runs || 0,
      bat2Runs: p.bat2Runs || 0,
      bat1Balls: p.bat1balls || 0,
      bat2Balls: p.bat2balls || 0,
      bat1ImageId: p.bat1ImageID || 0,
      bat2ImageId: p.bat2ImageID || 0,
      totalRuns: p.totalRuns || 0,
      totalBalls: p.totalBalls || 0,
    })),
  }));
}

export async function fetchBallMapData(matchId: string, inningsId: number): Promise<BallMapData | null> {
  const url = `${UPSTREAM_BASE_URL}/api/mcenter/balls-map/${matchId}/${inningsId}`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data) return null;

  const balls: BallMapBall[] = (data.balls || []).map((b: any) => ({
    overNum: b.overNum,
    ballLabel: b.ballLabel || '',
    runs: b.totalRuns || 0,
    event: b.event || '',
    batsmanId: b.batsmanStrikerId || 0,
    bowlerId: b.bowlerStrikerId || 0,
  }));

  // Sort balls by overNum ascending (API returns descending)
  balls.sort((a, b) => a.overNum - b.overNum);

  const batters: BallMapBatter[] = (data.batters || []).map((b: any) => ({
    batId: b.batId,
    batName: b.batName || '',
    runs: b.runs || 0,
    balls: b.balls || 0,
    fours: b.fours || 0,
    sixes: b.sixes || 0,
    strikeRate: b.strikeRate || 0,
  }));

  const bowlers: BallMapBowler[] = (data.bowlers || []).map((b: any) => ({
    bowlerId: b.bowlerId,
    bowlName: b.bowlName || '',
    overs: b.overs || 0,
    runs: b.runs || 0,
    wickets: b.wickets || 0,
    economy: b.economy || 0,
  }));

  return {
    inningsId,
    balls,
    batters,
    bowlers,
    scoreDetails: {
      runs: data.scoreDetails?.runs || 0,
      wickets: data.scoreDetails?.wickets || 0,
      overs: data.scoreDetails?.overs || 0,
    },
  };
}

export async function scrapeWinProbHistory(matchId: string): Promise<WinProbHistory | null> {
  // The the source graphs page embeds win probability data in Next.js RSC flight payload
  // as winProbabilityChartData and winProbabilityChartLegends in the HTML source
  const url = `${UPSTREAM_BASE_URL}/live-cricket-graphs/${matchId}`;
  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    if (!response.ok) return null;
    html = await response.text();
  } catch {
    return null;
  }

  // Extract team names from winProbabilityChartLegends
  // Pattern: "teamSName\":\"CSK\"" in the legends section
  let team1Name = '';
  let team2Name = '';
  let team1Color = '#E6A937';
  let team2Color = '#0588F0';
  const legendsMatch = html.match(/winProbabilityChartLegends[\\]*":\{([\s\S]*?)(?:winProbabilityHorizontalChartData|runsChartData|$)/);
  if (legendsMatch) {
    const legendStr = legendsMatch[1];
    // Find team1 and team2 short names
    const team1Match = legendStr.match(/team1[\\]*":\{[^}]*teamSName[\\]*":[\\]*"([^"\\]+)/);
    const team2Match = legendStr.match(/team2[\\]*":\{[^}]*teamSName[\\]*":[\\]*"([^"\\]+)/);
    if (team1Match) team1Name = team1Match[1];
    if (team2Match) team2Name = team2Match[1];
    // Extract team colors - pattern: "teamColor\":\"#E6A937|#EBAA33\""
    const color1Match = legendStr.match(/team1[\\]*":\{[^}]*teamColor[\\]*":[\\]*"(#[0-9A-Fa-f]{6})/);
    const color2Match = legendStr.match(/team2[\\]*":\{[^}]*teamColor[\\]*":[\\]*"(#[0-9A-Fa-f]{6})/);
    if (color1Match) team1Color = color1Match[1];
    if (color2Match) team2Color = color2Match[1];
  }

  // Extract win probability data points from winProbabilityChartData
  // Data is in RSC flight format with escaped quotes: \"over\":1,\"team1\":47,\"team2\":53
  const points: WinProbPoint[] = [];

  // Match individual data points - extract each field independently from the JSON object
  // The field order varies between entries so we match the whole object and extract fields
  const objectRegex = /\{[\\]*"over[\\]*":\s*\d+[^}]+\}/g;

  for (const objMatch of html.matchAll(objectRegex)) {
    const obj = objMatch[0];
    // Only process objects that have both team1 prob and innings (win prob data points)
    const overM = obj.match(/[\\]*"over[\\]*":\s*(\d+)/);
    const t1M = obj.match(/[\\]*"team1[\\]*":\s*(\d+)/);
    const t2M = obj.match(/[\\]*"team2[\\]*":\s*(\d+)/);
    const innM = obj.match(/[\\]*"innings[\\]*":\s*(\d+)/);
    if (!overM || !t1M || !t2M || !innM) continue;

    const over = parseInt(overM[1], 10);
    const t1Prob = parseInt(t1M[1], 10);
    const t2Prob = parseInt(t2M[1], 10);
    const innings = parseInt(innM[1], 10);
    const isT1Wicket = /[\\]*"isTeam1Wicket[\\]*":\s*true/.test(obj);
    const isT2Wicket = /[\\]*"isTeam2Wicket[\\]*":\s*true/.test(obj);
    // Test matches carry a `draw` field on every point. Absent for limited-overs.
    const drawM = obj.match(/[\\]*"draw[\\]*":\s*(\d+)/);
    const drawProb = drawM ? parseInt(drawM[1], 10) : undefined;

    // Extract wicket commentary if available
    let wicketCommentary: string | undefined;
    if (isT1Wicket || isT2Wicket) {
      // Look ahead in the HTML for the wicket commentary near this data point
      const field = isT1Wicket ? 'team1WicketCommentary' : 'team2WicketCommentary';
      const overIdx = html.indexOf(`"over\\":${over},`);
      if (overIdx > -1) {
        const chunk = html.substring(overIdx, overIdx + 5000);
        // Find the field and extract the string value between quotes
        const fieldIdx = chunk.indexOf(field);
        if (fieldIdx > -1) {
          // Find opening quote of the commentary text (after :[" or :")
          const afterField = chunk.substring(fieldIdx + field.length);
          // Match content between the first \" and the next unescaped \"
          const textMatch = afterField.match(/[\\]*":\[?[\\]*"((?:[^\\"]|\\\\|\\[^"])*)[\\]*"/);
          if (textMatch && textMatch[1].length > 5) {
            wicketCommentary = textMatch[1]
              .replace(/\\u003c/g, '<')
              .replace(/\\u003e/g, '>')
              .replace(/<\/?span>/gi, '')
              .replace(/<\/?b>/gi, '')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]*>/g, '')
              .replace(/\\"/g, '"')
              .replace(/\\n/g, '\n')
              .trim();
          }
        }
      }
    }

    points.push({
      over,
      innings,
      team1Name: team1Name || 'Team 1',
      team1Prob: t1Prob,
      team2Name: team2Name || 'Team 2',
      team2Prob: t2Prob,
      drawProb,
      isTeam1Wicket: isT1Wicket,
      isTeam2Wicket: isT2Wicket,
      wicketCommentary,
    });
  }

  if (points.length === 0) return null;

  // Deduplicate: the same data appears in both chart and horizontal chart sections
  const seen = new Map<string, WinProbPoint>();
  for (const p of points) {
    const key = `${p.innings}-${p.over}`;
    if (!seen.has(key)) {
      seen.set(key, p);
    }
  }

  const uniquePoints = Array.from(seen.values());
  uniquePoints.sort((a, b) => {
    if (a.innings !== b.innings) return a.innings - b.innings;
    return a.over - b.over;
  });

  return { team1Name, team2Name, team1Color, team2Color, points: uniquePoints };
}


// ============================================
// ICC Rankings
// ============================================

const RankingEntrySchema = z.object({
  rank: z.string(),
  playerName: z.string(),
  country: z.string(),
  rating: z.string(),
  profileId: z.string().optional(),
  imageUrl: z.string().optional(),
});

const RankingsDataSchema = z.object({
  format: z.string(),
  category: z.string(),
  lastUpdated: z.string().optional(),
  entries: z.array(RankingEntrySchema),
});

export type RankingEntry = z.infer<typeof RankingEntrySchema>;
export type RankingsData = z.infer<typeof RankingsDataSchema>;

const TeamRankingEntrySchema = z.object({
  rank: z.string(),
  teamName: z.string(),
  teamId: z.string(),
  teamSlug: z.string(),
  matches: z.string().optional(),
  rating: z.string(),
  points: z.string(),
  imageUrl: z.string().optional(),
});

const TeamRankingsDataSchema = z.object({
  format: z.string(),
  entries: z.array(TeamRankingEntrySchema),
});

export type TeamRankingEntry = z.infer<typeof TeamRankingEntrySchema>;
export type TeamRankingsData = z.infer<typeof TeamRankingsDataSchema>;

// The team-rankings page ships all three formats' rows inside a single RSC
// blob (`formatTypesData.{odi,test,t20}.rank[]`). Only the current format is
// rendered to the DOM; the others live in the payload waiting for the client
// toggle. Reading the payload lets us return any format from one request.
export async function scrapeICCTeamRankings(format: 'test' | 'odi' | 't20'): Promise<TeamRankingsData> {
  const url = `${UPSTREAM_BASE_URL}/cricket-stats/icc-rankings/men/teams`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch team rankings: ${response.statusText}`);
  const html = await response.text();

  const entries: TeamRankingEntry[] = [];

  // Locate the RSC chunk that contains `formatTypesData` and slice out the
  // `rank` array for the requested format. Mirrors the pattern used by
  // scrapeICCRankings for players.
  const rscChunkRe = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let rscMatch: RegExpExecArray | null;
  while ((rscMatch = rscChunkRe.exec(html)) !== null) {
    const chunk = rscMatch[1];
    if (!chunk.includes('formatTypesData')) continue;

    const ftdIdx = chunk.indexOf('formatTypesData');
    const section = chunk.substring(ftdIdx);
    const formatIdx = section.indexOf(`\\"${format}\\":{\\"`);
    if (formatIdx === -1) continue;

    const rankStart = section.indexOf('\\"rank\\":[', formatIdx);
    if (rankStart === -1) continue;

    const arrayStart = rankStart + '\\"rank\\":['.length;
    let depth = 1;
    let pos = arrayStart;
    while (pos < section.length && depth > 0) {
      if (section[pos] === '[') depth++;
      else if (section[pos] === ']') depth--;
      pos++;
    }
    const rankArrayStr = section.substring(arrayStart, pos - 1);

    // Each entry:
    //   {\"id\":\"4\",\"rank\":\"1\",\"name\":\"Australia\",\"matches\":\"24\",
    //    \"rating\":\"131\",\"points\":\"3138\",...,\"imageId\":\"776202\",...}
    const entryRe = /\{\\?"id\\?":\\?"(\d+)\\?".*?\\?"rank\\?":\\?"(\d+)\\?".*?\\?"name\\?":\\?"([^\\]+)\\?".*?\\?"matches\\?":\\?"(\d+)\\?".*?\\?"rating\\?":\\?"(\d+)\\?".*?\\?"points\\?":\\?"(\d+)\\?".*?\\?"imageId\\?":\\?"(\d+)\\?"/g;
    let entryMatch: RegExpExecArray | null;
    while ((entryMatch = entryRe.exec(rankArrayStr)) !== null) {
      const [, teamId, rank, name, matches, rating, points, imageId] = entryMatch;
      const teamSlug = name.toLowerCase().replace(/\s+/g, '-');
      entries.push({
        rank,
        teamName: name,
        teamId,
        teamSlug,
        matches,
        rating,
        points,
        imageUrl: teamFlagImageUrl(imageId, teamSlug),
      });
    }
    if (entries.length > 0) break;
  }

  return TeamRankingsDataSchema.parse({ format, entries });
}

export async function scrapeICCRankings(
  format: 'test' | 'odi' | 't20',
  category: 'batting' | 'bowling' | 'all-rounder'
): Promise<RankingsData> {
  // Always fetch the base category page — it contains all format data in RSC payload
  const categorySlug = category === 'all-rounder' ? 'all-rounder' : category;
  const url = `${UPSTREAM_BASE_URL}/cricket-stats/icc-rankings/men/${categorySlug}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ICC rankings: ${response.statusText}`);
  }

  const html = await response.text();
  const entries: RankingEntry[] = [];

  // Strategy 1: Extract from Next.js RSC data (self.__next_f.push)
  // The page embeds formatTypesData with all formats (odi, test, t20)
  const rscChunkRe = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let rscMatch;
  while ((rscMatch = rscChunkRe.exec(html)) !== null) {
    const chunk = rscMatch[1];
    if (!chunk.includes('formatTypesData')) continue;

    const ftdIdx = chunk.indexOf('formatTypesData');
    // Extract the section from formatTypesData onwards
    const section = chunk.substring(ftdIdx);

    // Find the rank array for the requested format
    const formatKey = format; // 'test', 'odi', or 't20'
    const formatIdx = section.indexOf(`\\"${formatKey}\\":{\\"`);
    if (formatIdx === -1) continue;

    const rankStart = section.indexOf('\\\"rank\\\":[', formatIdx);
    if (rankStart === -1) continue;

    // Find the matching closing bracket for the rank array
    const arrayStart = rankStart + '\\\"rank\\\":['.length;
    let depth = 1;
    let pos = arrayStart;
    while (pos < section.length && depth > 0) {
      if (section[pos] === '[') depth++;
      else if (section[pos] === ']') depth--;
      pos++;
    }

    const rankArrayStr = section.substring(arrayStart, pos - 1);

    // Parse individual entries from the escaped JSON
    const entryRe = /\{\\?"id\\?":\\?"(\d+)\\?".*?\\?"rank\\?":\\?"(\d+)\\?".*?\\?"name\\?":\\?"([^\\]+)\\?".*?\\?"rating\\?":\\?"(\d+)\\?".*?\\?"country\\?":\\?"([^\\]+)\\?".*?\\?"faceImageId\\?":\\?"(\d+)\\?"/g;
    let entryMatch;
    while ((entryMatch = entryRe.exec(rankArrayStr)) !== null) {
      const [, profileId, rank, name, rating, country, faceImageId] = entryMatch;
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      entries.push({
        rank,
        playerName: name,
        country,
        rating,
        profileId,
        imageUrl: `${UPSTREAM_STATIC_URL}/a/img/v1/225x225/i1/c${faceImageId}/${slug}.jpg`,
      });
    }

    if (entries.length > 0) break;
  }

  // Strategy 2: Fall back to HTML grid parsing (works for test format server-rendered content)
  if (entries.length === 0) {
    const $ = cheerio.load(html);
    $('div.grid.grid-cols-4.items-center.border-b').each((_, row) => {
      const $row = $(row);
      const rankText = $row.find('div.text-base').first().text().trim();
      if (!rankText || isNaN(parseInt(rankText))) return;

      const playerLink = $row.find('a[href*="/profiles/"]');
      if (playerLink.length === 0) return;

      const href = playerLink.attr('href') || '';
      const profileMatch = href.match(/\/profiles\/(\d+)\//);
      const profileId = profileMatch ? profileMatch[1] : undefined;
      const playerName = playerLink.attr('title') || playerLink.find('div.text-base.font-medium').text().trim();
      const country = playerLink.find('div.text-cbTxtGray').text().trim();
      const rating = $row.find('div.col-span-1.text-base.text-right').text().trim();
      const imgEl = playerLink.find('img');
      const imageUrl = imgEl.attr('src') || undefined;

      if (playerName && rating) {
        entries.push({
          rank: rankText,
          playerName,
          country,
          rating,
          profileId,
          imageUrl: imageUrl?.replace('&amp;', '&'),
        });
      }
    });
  }

  return RankingsDataSchema.parse({
    format,
    category,
    entries,
  });
}

// =====================================================================
// Match Forecast (Matchups / Venue / All Players)
// =====================================================================

export type ForecastStat = { label: string; value: string };
export type ForecastSubCard = { subCardHeading: string; stats: ForecastStat[] };
export type ForecastCard = {
  cardType: string;
  cardHeading: string;
  cardLabel?: string;
  subCard: ForecastSubCard[];
  playerOneImageId?: string;
  playerTwoImageId?: string;
};
export type MatchupsData = {
  id: number;
  cards: ForecastCard[];
};

export type VenueHeadingContent = { heading: string; content: string };
export type VenueRecentMatchRow = {
  matchId: string;
  label: string;
  firstInnings: string;
  secondInnings: string;
  linkSlug: string;
};
export type VenueData = {
  id: number;
  groundName: string;
  city: string;
  country: string;
  groundDetails: VenueHeadingContent[];
  pitchDetails: VenueHeadingContent[];
  runsExpected: VenueHeadingContent[];
  averageScores?: {
    heading: string;
    label: string;
    values: { heading: string; content: string }[];
  };
  recentMatches?: {
    label: string;
    headers: string[];
    rows: VenueRecentMatchRow[];
  };
  cards: ForecastCard[];
};

export type ForecastPlayerBadge = { label: string; code: string; desc?: string };
export type ForecastPlayerStyle = { label: string; code: string };
export type ForecastPlayer = {
  id: number;
  name: string;
  faceImageId?: number;
  teamFlagId?: number;
  teamName: string;
  teamShortName: string;
  badges: ForecastPlayerBadge[];
  playerStyle: ForecastPlayerStyle[];
  description?: string;
  imageUrl?: string;
};
export type ForecastPlayersByRole = { role: string; players: ForecastPlayer[] };
export type AllPlayersData = {
  playersByRole: ForecastPlayersByRole[];
};

const FORECAST_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchForecast<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${UPSTREAM_BASE_URL}/api/match-forecast/${path}`, {
      headers: { 'User-Agent': FORECAST_UA },
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function scrapeMatchups(matchId: string): Promise<MatchupsData | null> {
  const raw = await fetchForecast<any>(`match-ups/${matchId}`);
  if (!raw || !Array.isArray(raw.cards)) return null;
  const cards: ForecastCard[] = raw.cards
    .filter((c: any) => c && c.cardHeading && Array.isArray(c.subCard))
    .map((c: any) => ({
      cardType: c.cardType || 'playerStatsCard',
      cardHeading: String(c.cardHeading),
      cardLabel: c.cardLabel ? String(c.cardLabel) : undefined,
      playerOneImageId: c.playerOneImageId ? String(c.playerOneImageId) : undefined,
      playerTwoImageId: c.playerTwoImageId ? String(c.playerTwoImageId) : undefined,
      subCard: c.subCard.map((sc: any) => ({
        subCardHeading: String(sc.subCardHeading || ''),
        stats: Array.isArray(sc.stats)
          ? sc.stats.map((s: any) => ({ label: String(s.label || ''), value: String(s.value || '') }))
          : [],
      })),
    }));
  return { id: raw.id, cards };
}

export async function scrapeVenueForecast(matchId: string): Promise<VenueData | null> {
  const raw = await fetchForecast<any>(`venue/${matchId}`);
  if (!raw || !raw.groundName) return null;
  const toHC = (arr: any[]): VenueHeadingContent[] =>
    Array.isArray(arr)
      ? arr
        .filter((x) => x && (x.heading || x.content))
        .map((x) => ({ heading: String(x.heading || ''), content: String(x.content || '') }))
      : [];

  let recentMatches: VenueData['recentMatches'];
  if (raw.recentMatches && Array.isArray(raw.recentMatches.rows)) {
    recentMatches = {
      label: String(raw.recentMatches.label || 'Recent'),
      headers: Array.isArray(raw.recentMatches.headers) ? raw.recentMatches.headers.map(String) : [],
      rows: raw.recentMatches.rows
        .filter((r: any) => Array.isArray(r.values) && r.values.length >= 4)
        .map((r: any) => ({
          matchId: String(r.values[0] || ''),
          label: String(r.values[1] || ''),
          firstInnings: String(r.values[2] || ''),
          secondInnings: String(r.values[3] || ''),
          linkSlug: String(r.followUpLinkText || ''),
        })),
    };
  }

  let averageScores: VenueData['averageScores'];
  if (raw.averageScores && Array.isArray(raw.averageScores.values)) {
    averageScores = {
      heading: String(raw.averageScores.heading || 'Average Scores'),
      label: String(raw.averageScores.label || ''),
      values: raw.averageScores.values
        .filter((v: any) => v && (v.heading || v.content))
        .map((v: any) => ({ heading: String(v.heading || ''), content: String(v.content || '') })),
    };
  }

  const cards: ForecastCard[] = Array.isArray(raw.cards)
    ? raw.cards
      .filter((c: any) => c && c.cardHeading && Array.isArray(c.subCard))
      .map((c: any) => ({
        cardType: c.cardType || 'statsCard',
        cardHeading: String(c.cardHeading),
        cardLabel: c.cardLabel ? String(c.cardLabel) : undefined,
        subCard: c.subCard.map((sc: any) => ({
          subCardHeading: String(sc.subCardHeading || ''),
          stats: Array.isArray(sc.stats)
            ? sc.stats.map((s: any) => ({ label: String(s.label || ''), value: String(s.value || '') }))
            : [],
        })),
      }))
    : [];

  return {
    id: Number(raw.id) || 0,
    groundName: String(raw.groundName),
    city: String(raw.city || ''),
    country: String(raw.country || ''),
    groundDetails: toHC(raw.groundDetails),
    pitchDetails: toHC(raw.pitchDetails),
    runsExpected: toHC(raw.runsExpected),
    averageScores,
    recentMatches,
    cards,
  };
}

export async function scrapeAllPlayersForecast(matchId: string): Promise<AllPlayersData | null> {
  const raw = await fetchForecast<any>(`all-players/${matchId}`);
  if (!raw || !Array.isArray(raw.playersByRole)) return null;
  const playersByRole: ForecastPlayersByRole[] = raw.playersByRole
    .filter((g: any) => g && g.role && Array.isArray(g.players))
    .map((g: any) => ({
      role: String(g.role),
      players: g.players
        .filter((p: any) => p && p.name && p.isVisible !== false)
        .map((p: any): ForecastPlayer => ({
          id: Number(p.id) || 0,
          name: String(p.name),
          faceImageId: p.faceImageId ? Number(p.faceImageId) : undefined,
          teamFlagId: p.teamFlagId ? Number(p.teamFlagId) : undefined,
          teamName: String(p.teamName || ''),
          teamShortName: String(p.teamShortName || ''),
          badges: Array.isArray(p.badges)
            ? p.badges.map((b: any) => ({
              label: String(b.label || ''),
              code: String(b.code || ''),
              desc: b.desc ? String(b.desc) : undefined,
            }))
            : [],
          playerStyle: Array.isArray(p.playerStyle)
            ? p.playerStyle.map((s: any) => ({ label: String(s.label || ''), code: String(s.code || '') }))
            : [],
          description: p.description ? String(p.description) : undefined,
          imageUrl: p.faceImageId
            ? playerFaceImageUrl(p.faceImageId)
            : undefined,
        })),
    }));
  return { playersByRole };
}

// ============================================
// News
// ============================================

const NewsItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  link: z.string(),
  publishedAt: z.string().optional(),
});

const NewsFeedSchema = z.object({
  source: z.string(),
  fetchedAt: z.string(),
  items: z.array(NewsItemSchema),
});

const MostReadItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  publishedAt: z.string().optional(),
});

const NewsBlockSchema = z.discriminatedUnion('type', [
  // Paragraph text is `html` because the source uses inline <b>, <i>, <u>, <a>
  // that carry meaningful emphasis (probable XI lists, form-guide, quotes).
  // The client sanitises this to a safelist before rendering.
  z.object({ type: z.literal('paragraph'), html: z.string() }),
  z.object({ type: z.literal('heading'), text: z.string() }),
  z.object({
    type: z.literal('image'),
    imageUrl: z.string(),
    caption: z.string().optional(),
    credit: z.string().optional(),
  }),
]);
export type NewsBlock = z.infer<typeof NewsBlockSchema>;

const NewsArticleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  wordCount: z.number().default(0),
  readTimeMinutes: z.number().default(0),
  publishedAt: z.string().optional(),
  heroImageUrl: z.string().optional(),
  heroImageCaption: z.string().optional(),
  paragraphs: z.array(z.string()).default([]),
  blocks: z.array(NewsBlockSchema).default([]),
  tags: z.array(z.object({ label: z.string() })).default([]),
  related: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    imageUrl: z.string().optional(),
  })).default([]),
  mostRead: z.array(MostReadItemSchema).default([]),
  video: z.object({
    title: z.string(),
    description: z.string().optional(),
    thumbnailUrl: z.string(),
    duration: z.string().optional(),
    sourceUrl: z.string(),
    // Embed URL for in-app playback. Falls back to sourceUrl if the source
    // doesn't ship a dedicated /embed/ page.
    embedUrl: z.string().optional(),
  }).optional(),
});

export type NewsMostReadItem = z.infer<typeof MostReadItemSchema>;

export type NewsItem = z.infer<typeof NewsItemSchema>;
export type NewsFeed = z.infer<typeof NewsFeedSchema>;
export type NewsArticle = z.infer<typeof NewsArticleSchema>;

// News feed source is env-configurable. The default points at a public RSS
// endpoint (open even when the upstream HTML pages are behind a WAF), which
// carries the same headlines with a cover image and canonical URL.
export async function scrapeCricketNews(): Promise<NewsFeed> {
  const url = NEWS_FEED_URL;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Failed to fetch news feed: ${response.statusText}`);
  const xml = await response.text();

  const items: NewsItem[] = [];
  // Match each <item>…</item> block, then pull field-by-field. Handles
  // CDATA-wrapped values (`<![CDATA[...]]>`) and plain text alike.
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  const pick = (block: string, tag: string): string | undefined => {
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${tag}>`, 'i');
    const found = block.match(re);
    return found ? found[1].trim() : undefined;
  };
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = pick(block, 'title');
    if (!title) continue;
    const description = pick(block, 'description');
    const link = pick(block, 'url') || pick(block, 'link') || '';
    const publishedAt = pick(block, 'pubDate');
    // Prefer <media:content url="..."> — that's the largest asset (typically
    // 1400x2100). Fall back to <coverImages> only if the media tag is absent.
    let imageUrl: string | undefined;
    const mediaMatch = block.match(/<media:content[^>]*\burl="([^"]+)"/i);
    if (mediaMatch) imageUrl = mediaMatch[1];
    if (!imageUrl) imageUrl = pick(block, 'coverImages');
    if (imageUrl && imageUrl.startsWith('http://')) imageUrl = 'https://' + imageUrl.slice(7);
    // Extract the numeric story id + slug from the URL.
    //   new-style: /story/some-slug-here-1547145  → id=1547145, slug=some-slug-here
    //   old-style: /ci/content/story/1547145.html → id=1547145, slug='' (fallback)
    let id = '';
    let slug = '';
    const newStyle = link.match(/\/story\/(.+)-(\d+)(?:$|[/?#])/);
    if (newStyle) {
      slug = newStyle[1];
      id = newStyle[2];
    } else {
      const oldStyle = link.match(/\/story\/(\d+)(?:\.html)?/);
      if (oldStyle) id = oldStyle[1];
    }
    if (!id) continue;
    items.push({
      id,
      slug,
      title: decodeXml(title),
      description: description ? decodeXml(description) : undefined,
      imageUrl,
      link,
      publishedAt,
    });
    if (items.length >= 100) break;
  }

  // Prefer the RSS channel's own title as the source label; fall back to the
  // feed URL's hostname so the UI always has something meaningful to show.
  const channelTitleMatch = xml.match(/<channel>[\s\S]*?<title(?:\s[^>]*)?>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/title>/i);
  let source = channelTitleMatch ? channelTitleMatch[1].trim() : '';
  if (!source) {
    try { source = new URL(url).hostname.replace(/^www\./, ''); } catch { source = 'News'; }
  }

  return NewsFeedSchema.parse({
    source,
    fetchedAt: new Date().toISOString(),
    items,
  });
}

// Given HTML starting with an opening `<div ...>`, return the index just
// past the matching `</div>`. Naive stack — sufficient for the small,
// well-formed panels we scan.
function findMatchingCloseDiv(html: string): number {
  const divOpenRe = /<div[\s>]/gi;
  const divCloseRe = /<\/div>/gi;
  divOpenRe.lastIndex = 0;
  divCloseRe.lastIndex = 0;
  let depth = 0;
  let pos = 0;
  while (pos < html.length) {
    divOpenRe.lastIndex = pos;
    divCloseRe.lastIndex = pos;
    const openMatch = divOpenRe.exec(html);
    const closeMatch = divCloseRe.exec(html);
    if (!closeMatch) return html.length;
    if (openMatch && openMatch.index < closeMatch.index) {
      depth++;
      pos = openMatch.index + 1;
    } else {
      depth--;
      pos = closeMatch.index + '</div>'.length;
      if (depth === 0) return pos;
    }
  }
  return html.length;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// Decode common HTML entities (superset of decodeXml for scraped body text).
function decodeHtml(s: string): string {
  return decodeXml(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)));
}

// Fetch a full news article by story id + slug. Works against the upstream
// story page — needs browser-realistic headers to get past the edge WAF.
export async function scrapeCricketNewsArticle(id: string, slug: string): Promise<NewsArticle> {
  if (!id) throw new Error('Missing story id');
  // Try multiple URL shapes. Some datacenter IPs (Vercel / AWS) are blocked
  // at the edge for one subdomain but not the other, and the legacy
  // `/ci/content/story/{id}.html` route sometimes bypasses the newer route's
  // bot check. Loop the candidates and use whichever returns 200.
  const candidates: string[] = [];
  for (const base of NEWS_ARTICLE_BASE_URLS) {
    if (slug) candidates.push(`${base}/story/${slug}-${id}`);
  }
  for (const base of NEWS_ARTICLE_BASE_URLS) {
    candidates.push(`${base}/ci/content/story/${id}.html`);
  }

  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
  } as const;

  let html = '';
  let lastStatus = 0;
  for (const candidate of candidates) {
    try {
      const r = await fetch(candidate, { headers: commonHeaders, cache: 'no-store' });
      lastStatus = r.status;
      if (r.ok) {
        html = await r.text();
        if (html.includes('ci-story')) break;
        html = '';
      }
    } catch { /* try next */ }
  }
  if (!html) throw new Error(`Failed to fetch article ${id}: ${lastStatus || 'no response'}`);

  const $ = cheerio.load(html);
  const article = $('article.ci-story').first();
  if (!article.length) throw new Error(`Article ${id} has no ci-story block`);

  const title = decodeHtml(article.find('h1').first().text().trim());
  // Category — prefer the genre link's `title` attr from the article header
  // (values: "News", "Preview", "Feature", "Interview" — reader-facing signal).
  let category: string | undefined;
  const genreLinkM = html.match(/<a\s+href="\/genre\/[^"]+"\s+title="([^"]+)"[^>]*>[\s\S]{0,200}?<\/a>/);
  if (genreLinkM) category = decodeHtml(genreLinkM[1]);
  const description = article
    .find('header .ds-text-compact-m p, header .ds-text-typo-mid2 p')
    .first().text().trim() || undefined;
  // Author byline — pulled from the header author link's inner span (the
  // second author-link occurrence carries the name; the first wraps the
  // avatar with no text).
  let author: string | undefined;
  const authorLinkM = html.match(/<a\s+href="\/author\/[^"]+"\s+title="([^"]{2,80})"/);
  if (authorLinkM) author = decodeHtml(authorLinkM[1]);
  const publishedAt = article.find('[data-behavior="date_time"]').attr('data-date') || undefined;

  // Hero image — largest available render. The upstream uses Cloudinary
  // transforms like `t_ds_wide_w_1280` in the img src; rewrite to a bare
  // `f_auto` URL so the CDN serves the best format without a size cap.
  //
  // Fall back to the video thumbnail when the lead media is a video rather
  // than a still image, so the hero slot never renders empty.
  let heroImageUrl = article.find('figure.ci-story-lead-image img').first().attr('src') || undefined;
  if (!heroImageUrl) {
    heroImageUrl = article.find('meta[itemprop="thumbnailUrl"]').first().attr('content') || undefined;
  }
  if (heroImageUrl) {
    heroImageUrl = heroImageUrl.replace(/\/image\/upload\/[^/]*\//, '/image/upload/f_auto/');
  }
  const heroImageCaption = article.find('figure.ci-story-lead-image p, .inline-video-player .ds-text-compact-s')
    .first().text().trim().replace(/\s+/g, ' ') || undefined;

  // Body extraction — build a position-ordered array of blocks so the
  // rendered article preserves the upstream's rhythm: heading, paragraphs,
  // inline image, more paragraphs, another image, and so on. The upstream
  // markup is deliberately invalid (<p><div></div></p>) which trips DOM-based
  // parsing, so we anchor everything on raw HTML.
  type BodyMatch =
    | { idx: number; kind: 'para'; html: string }
    | { idx: number; kind: 'heading'; text: string }
    | { idx: number; kind: 'image'; imageUrl: string; caption?: string; credit?: string };
  const bodyMatches: BodyMatch[] = [];
  const paragraphs: string[] = [];

  // Pass 1 — paragraphs and headings. Upstream ships them as
  //   <span class="ci-html-content"><div>…</div></span>
  // (invalid HTML — `<span>` on the server, promoted to `<p>` on the client).
  const paraRe = /<(?:span|p)[^>]*\bci-html-content\b[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/(?:span|p)>/g;
  let paraMatch: RegExpExecArray | null;
  while ((paraMatch = paraRe.exec(html)) !== null) {
    const raw = paraMatch[1];
    // Heading? The upstream nests an h2/h3 in a paragraph wrapper for section
    // headings ("Big picture", "Form guide", etc.). Detect and lift.
    const headingM = raw.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/);
    if (headingM) {
      const headingText = headingM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (headingText) bodyMatches.push({ idx: paraMatch.index, kind: 'heading', text: decodeHtml(headingText) });
      continue;
    }
    // Preserve inline emphasis (bold, italic, underline) and line breaks so
    // the rendered paragraph reads the same as the source. Every other tag
    // (script, style, div wrappers, images-in-body, etc.) is stripped.
    const inlineSafe = /^\/?(?:b|strong|i|em|u|br|ul|ol|li|sub|sup)$/i;
    const cleanedHtml = raw
      .replace(/<a\s[^>]*>([\s\S]*?)<\/a>/gi, (_m, inner) => `<u>${inner}</u>`)
      .replace(/<(\/?)([a-z0-9]+)(?:\s[^>]*)?>/gi, (m, close, tag) => inlineSafe.test((close || '') + tag) ? `<${close || ''}${tag.toLowerCase()}>` : '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanedHtml) {
      bodyMatches.push({ idx: paraMatch.index, kind: 'para', html: cleanedHtml });
      // Plain-text fallback for the flat `paragraphs` field (used by
      // description ledes, word count, etc.).
      const plain = cleanedHtml.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (plain) paragraphs.push(decodeHtml(plain));
    }
  }

  // Pass 2 — inline `<aside>` image cards. The visible <img> src is a lazy
  // placeholder; the real URL lives in a schema.org ImageObject JSON-LD block
  // *inside* each aside, near the end (`</aside>` closes just after it).
  const asideRe = /<aside[^>]*\bds-mt-4 ds-mb-8\b[^>]*>([\s\S]*?)<\/aside>/g;
  let asideMatch: RegExpExecArray | null;
  while ((asideMatch = asideRe.exec(html)) !== null) {
    const asideBody = asideMatch[1];
    const ldM = asideBody.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    let imageUrl: string | undefined;
    let caption: string | undefined;
    if (ldM) {
      try {
        const ld = JSON.parse(ldM[1]);
        if (ld && ld['@type'] === 'ImageObject' && ld.contentUrl) {
          imageUrl = String(ld.contentUrl);
          if (ld.caption) caption = String(ld.caption);
        }
      } catch { /* malformed JSON — fall back to alt attr */ }
    }
    if (!caption) {
      const altM = asideMatch[1].match(/<img[^>]*\balt="([^"]+)"/);
      if (altM) caption = decodeHtml(altM[1]);
    }
    // Credit — the last text span in the caption row (e.g. "BCCI", "Getty").
    let credit: string | undefined;
    const captionSpans = Array.from(asideMatch[1].matchAll(/<span[^>]*>([^<]+)<\/span>/g)).map(m => m[1].trim());
    for (let i = captionSpans.length - 1; i >= 0; i--) {
      const s = captionSpans[i];
      if (!s || s === '•') continue;
      if (caption && caption.includes(s)) continue;
      credit = decodeHtml(s);
      break;
    }
    if (imageUrl) {
      bodyMatches.push({ idx: asideMatch.index, kind: 'image', imageUrl, caption, credit });
    }
  }

  // Merge in position order — this is what gives the article its rhythm.
  bodyMatches.sort((a, b) => a.idx - b.idx);
  const blocks: NewsBlock[] = bodyMatches.map((bm) => {
    if (bm.kind === 'image') {
      return { type: 'image', imageUrl: bm.imageUrl, caption: bm.caption, credit: bm.credit };
    }
    if (bm.kind === 'heading') return { type: 'heading', text: bm.text };
    return { type: 'paragraph', html: bm.html };
  });

  // Word count from paragraphs (strip tags first) + headings; ~220 wpm.
  const wordCount = blocks.reduce((sum, b) => {
    if (b.type === 'paragraph') {
      const plain = b.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return sum + plain.split(/\s+/).filter(Boolean).length;
    }
    if (b.type === 'heading') return sum + b.text.split(/\s+/).filter(Boolean).length;
    return sum;
  }, 0);
  const readTimeMinutes = Math.max(1, Math.round(wordCount / 220));

  const tags: { label: string }[] = [];
  article.find('a[href^="/cricketers/"], a[href^="/team/"], a[href^="/series/"]').each((_, el) => {
    const label = $(el).find('span').last().text().trim() || $(el).text().trim();
    if (label && !tags.some(t => t.label === label)) tags.push({ label });
  });

  // Related stories — the upstream drops a boxed list of "Related" story
  // links inside the article body. Extract from raw HTML anchored on the
  // "Related" panel header so we grab both the thumbnail image and the title
  // from each row (cheerio's DOM would work for these but we mirror the
  // Most Read approach for consistency across sidebar/related widgets).
  const related: { id: string; slug: string; title: string; imageUrl?: string }[] = [];
  const seenRelated = new Set<string>();
  const relatedHeaderIdx = html.indexOf('>Related<');
  if (relatedHeaderIdx !== -1) {
    const before = html.slice(0, relatedHeaderIdx);
    const panelStart = before.lastIndexOf('<div class="ds-w-full');
    if (panelStart !== -1) {
      const remaining = html.slice(panelStart);
      const panelEnd = findMatchingCloseDiv(remaining);
      const panelHtml = remaining.slice(0, panelEnd);
      const anchorRe = /<a\s+href="\/story\/([^"]+?)-(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
      let am: RegExpExecArray | null;
      while ((am = anchorRe.exec(panelHtml)) !== null) {
        if (related.length >= 6) break;
        const rSlug = am[1];
        const rId = am[2];
        if (rId === id || seenRelated.has(rId)) continue;
        const inner = am[3];
        const titleM = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        if (!titleM) continue;
        const rTitle = titleM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!rTitle || rTitle.length < 8) continue;
        const imgM = inner.match(/<img[^>]*\bsrc="([^"]+)"/);
        let rImage = imgM ? imgM[1] : undefined;
        if (rImage && rImage.includes('lazyimage')) rImage = undefined;
        if (rImage) rImage = rImage.replace(/\/image\/upload\/[^/]*\//, '/image/upload/f_auto/');
        seenRelated.add(rId);
        related.push({ id: rId, slug: rSlug, title: decodeHtml(rTitle), imageUrl: rImage });
      }
    }
  }

  // Most Read widget — the upstream renders a dedicated sidebar on every
  // article page listing the currently-trending stories. The panel is anchored
  // on a "Most Read" header inside a `.ds-w-full` card. Do the extraction on
  // raw HTML for the same reason as the paragraph body — the surrounding
  // markup uses `<p><div>` nesting that cheerio's DOM parser mangles.
  const mostRead: NewsMostReadItem[] = [];
  const seenMostRead = new Set<string>();
  const mrHeaderIdx = html.indexOf('>Most Read<');
  if (mrHeaderIdx !== -1) {
    // Find the panel start by walking back from the header to the opening
    // `<div class="ds-w-full ...">` that wraps the widget.
    const before = html.slice(0, mrHeaderIdx);
    const panelStart = before.lastIndexOf('<div class="ds-w-full');
    if (panelStart !== -1) {
      // The panel ends at its matching </div>; a simple heuristic is enough
      // here because the widget is short and self-contained.
      const remaining = html.slice(panelStart);
      const panelEnd = findMatchingCloseDiv(remaining);
      const panelHtml = remaining.slice(0, panelEnd);

      // Each row is an `<a href="/story/..."` block. Iterate to grab id/slug,
      // title (`<p class="ds-text-title-s ..."`), optional description and image.
      const anchorRe = /<a\s+href="\/story\/([^"]+?)-(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
      let am: RegExpExecArray | null;
      while ((am = anchorRe.exec(panelHtml)) !== null) {
        if (mostRead.length >= 6) break;
        const rSlug = am[1];
        const rId = am[2];
        if (seenMostRead.has(rId)) continue;
        const inner = am[3];

        const titleM = inner.match(/<p[^>]*\bds-text-title-s\b[^>]*>([\s\S]*?)<\/p>/) ||
          inner.match(/<p[^>]*\bds-font-semi-bold\b[^>]*>([\s\S]*?)<\/p>/);
        if (!titleM) continue;
        const rTitle = titleM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!rTitle) continue;

        // Description sits under a `<p class="ds-text-compact-s">` wrapper
        // that contains the same `<div>` nesting quirk as body paragraphs.
        const descM = inner.match(/<p[^>]*\bds-text-compact-s\b[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/p>/) ||
          inner.match(/<p[^>]*\bds-text-compact-s\b[^>]*>([\s\S]*?)<\/p>/);
        const rDescription = descM
          ? descM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || undefined
          : undefined;

        const imgM = inner.match(/<img[^>]*\bsrc="([^"]+)"/);
        let rImage = imgM ? imgM[1] : undefined;
        if (rImage && rImage.includes('lazyimage')) rImage = undefined;
        if (rImage) rImage = rImage.replace(/\/image\/upload\/[^/]*\//, '/image/upload/f_auto/');

        const dateM = inner.match(/<span[^>]*\bds-text-compact-xs\b[^>]*>\s*<span[^>]*>([^<]+)<\/span>/);
        const rDate = dateM ? dateM[1].trim() : undefined;

        seenMostRead.add(rId);
        mostRead.push({
          id: rId,
          slug: rSlug,
          title: decodeHtml(rTitle),
          description: rDescription ? decodeHtml(rDescription) : undefined,
          imageUrl: rImage,
          publishedAt: rDate,
        });
      }
    }
  }

  // Video hero — some stories lead with a video instead of a still image. The
  // upstream doesn't embed the player in the initial HTML (it wires up hotstar
  // via JS after mount), so we can only carry the metadata + source URL and
  // render our own "click to watch" card that opens the source video page.
  let video: NewsArticle['video'];
  const voIdx = html.search(/schema\.org\/VideoObject/i);
  if (voIdx !== -1) {
    const block = html.slice(voIdx, voIdx + 2000);
    const pick = (prop: string) => {
      const re = new RegExp(`<meta[^>]*itemProp="${prop}"[^>]*content="([^"]+)"`, 'i');
      const m = block.match(re);
      return m ? decodeHtml(m[1]) : undefined;
    };
    const vName = pick('name');
    const vThumb = pick('thumbnailUrl');
    const vSource = pick('contentURL');
    if (vName && vThumb && vSource) {
      video = {
        title: vName,
        description: pick('description'),
        thumbnailUrl: vThumb,
        duration: pick('duration'),
        sourceUrl: vSource,
      };
    }
  }

  return NewsArticleSchema.parse({
    id,
    slug,
    title,
    category,
    description,
    author,
    wordCount,
    readTimeMinutes,
    publishedAt,
    heroImageUrl,
    heroImageCaption,
    paragraphs,
    blocks,
    tags: tags.slice(0, 6),
    related: related.slice(0, 6),
    mostRead,
    video,
  });
}
