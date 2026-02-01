

'use server';

import { z } from 'zod';
import * as cheerio from 'cheerio';

const CommentarySchema = z.object({
  type: z.enum(['live', 'user', 'stat']),
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
  date: z.string().optional(),
  oldestCommentaryTimestamp: z.number().optional(),
  matchStartTimestamp: z.number().optional(),
  currentInningsId: z.number().optional(),
  seriesName: z.string().optional(),
  seriesId: z.string().optional(),
  playerOfTheMatch: AwardPlayerSchema.optional(),
  playerOfTheSeries: AwardPlayerSchema.optional(),
});

const LiveMatchSchema = z.object({
  title: z.string(),
  url: z.string(),
  matchId: z.string(),
  teams: z.array(z.object({
    name: z.string(),
    score: z.string().optional(),
  })),
  status: z.string(),
  matchType: z.enum(['International', 'League', 'Domestic', 'Women']).optional(),
  seriesName: z.string().optional(),
  seriesUrl: z.string().optional(),
  venue: z.string().optional(),
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
  let url = `https://www.cricbuzz.com/profiles/${profileId}`;
  if (playerName) {
    const slug = playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    url = `https://www.cricbuzz.com/profiles/${profileId}/${slug}`;
  }

  // Helper function to create a minimal profile with just the name
  const createMinimalProfile = (name: string): PlayerProfile => ({
    info: {
      name: name,
      country: '',
      imageUrl: `https://static.cricbuzz.com/a/img/v1/152x152/i1/c${profileId}/player.jpg`,
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
        const imageUrl = playerData.image || (playerData.faceImageId ? `https://img1.cricbuzz.com/c-img/faceImages/${playerData.faceImageId}.jpg` : '');

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
  // New format: <img srcset="https://static.cricbuzz.com/a/img/v1/i1/c717783/zak-crawley.jpg...">
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
      imageUrl = `https://www.cricbuzz.com${imgSrc}`;
    }
  }

  // If still no image, construct from profile ID
  if (!imageUrl && profileId) {
    imageUrl = `https://static.cricbuzz.com/a/img/v1/152x152/i1/c${profileId}/player.jpg`;
  }

  // Extract personal information from the new structure
  const getPersonalInfo = (label: string): string => {
    let value = '';

    // Try new structure with flex layout (Cricbuzz's current HTML)
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

  // Extract career summary — Cricbuzz uses a div (not h3) with text "Batting Career Summary"
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

  // Find Recent Form — Cricbuzz uses div containers with "Batting Form" / "Bowling Form" headers
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
  const url = `https://www.cricbuzz.com/api/mcenter/scorecard/${matchId}`;
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
    const venueUrl = `https://www.cricbuzz.com/api/mcenter/venue/${matchId}`;
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


export async function scrapeUpcomingMatches(): Promise<LiveMatch[]> {
  const response = await fetch('https://www.cricbuzz.com/cricket-match/live-scores/upcoming-matches', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch upcoming matches: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  const upcomingMatches: LiveMatch[] = [];
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
      let dateTime = '';
      
      if ($infoDiv.length > 0) {
        // Extract venue
        const venueLink = $infoDiv.find('a[href*="/venues/"]');
        if (venueLink.length > 0) {
          venue = venueLink.attr('title') || venueLink.text().trim();
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

      const teams: { name: string, score?: string }[] = [];

      $match.find('.flex.items-center.gap-4.justify-between').each((_, teamContainer) => {
        const $team = $(teamContainer);
        let teamName = $team.find('span.text-cbTxtPrim.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtSec.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtPrim.block.wb\\:hidden').text().trim() ||
          $team.find('span.text-cbTxtSec.block.wb\\:hidden').text().trim();

        if (teamName) {
          teams.push({
            name: teamName
          });
        }
      });

      let status = $match.find('span.text-cbLive').text().trim() ||
        $match.find('span.text-cbComplete').text().trim() ||
        $match.find('span.text-cbPreview').text().trim();

      if (!status) {
        status = $match.find('span[class*="text-cb"]').last().text().trim();
      }
      
      // Use dateTime as status if available and no other status found
      if (!status && dateTime) {
        status = dateTime;
      }

      if (teams.length > 0) {
        upcomingMatches.push({
          title,
          url: href,
          matchId,
          teams,
          status: status || 'Status not available',
          seriesName,
          seriesUrl,
          venue: venue || undefined,
        });
      }
    });
  });

  return upcomingMatches;
}

export async function scrapeRecentMatches(): Promise<LiveMatch[]> {
  const response = await fetch('https://www.cricbuzz.com/cricket-match/live-scores/recent-matches', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch recent matches: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

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

      const teams: { name: string, score?: string }[] = [];

      $match.find('.flex.items-center.gap-4.justify-between').each((_, teamContainer) => {
        const $team = $(teamContainer);
        let teamName = $team.find('span.text-cbTxtPrim.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtSec.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtPrim.block.wb\\:hidden').text().trim() ||
          $team.find('span.text-cbTxtSec.block.wb\\:hidden').text().trim();

        const scoreEl = $team.find('span.font-medium.wb\\:font-semibold');
        const score = scoreEl.text().trim();

        if (teamName) {
          teams.push({
            name: teamName,
            score: score || undefined
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
          seriesName,
          seriesUrl,
          venue,
        });
      }
    });
  });

  return recentMatches;
}

export async function scrapeLiveMatches(): Promise<LiveMatch[]> {
  const response = await fetch('https://www.cricbuzz.com/cricket-match/live-scores', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch live matches: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  const liveMatches: LiveMatch[] = [];

  // New structure: matches are organized by series
  // Structure from HTML: <div class="flex flex-col gap-2"> contains multiple series
  // Each series: <div> with <div><a series-link/></div> then <div class="flex flex-col gap-px"> with matches
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
      const teams: { name: string, score?: string }[] = [];

      // Find team containers - they have specific classes for team info
      $match.find('.flex.items-center.gap-4.justify-between').each((_, teamContainer) => {
        const $team = $(teamContainer);

        // Team name - try multiple selectors
        let teamName = $team.find('span.text-cbTxtPrim.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtSec.hidden.wb\\:block').text().trim() ||
          $team.find('span.text-cbTxtPrim.block.wb\\:hidden').text().trim() ||
          $team.find('span.text-cbTxtSec.block.wb\\:hidden').text().trim();

        // Score is in a span with font-medium class
        const scoreEl = $team.find('span.font-medium.wb\\:font-semibold');
        const score = scoreEl.text().trim();

        if (teamName) {
          teams.push({
            name: teamName,
            score: score || undefined
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

      if (teams.length > 0) {
        liveMatches.push({
          title,
          url: href,
          matchId,
          teams,
          status: status || 'Status not available',
          seriesName: seriesName || undefined,
          seriesUrl: seriesUrl || undefined,
          venue: venue || undefined,
        });
      }
    });
  });

  // Fallback: if no matches found with new structure, try old structure
  if (liveMatches.length === 0) {
    $('div.cb-mtch-lst.cb-col.cb-col-100.cb-tms-itm').each((index, element) => {
      const matchContainer = $(element);
      const linkElement = matchContainer.find('a.cb-lv-scrs-well');

      if (linkElement.length) {
        const href = linkElement.attr('href');
        if (!href) return;

        const matchId = extractMatchId(href);
        if (!matchId || liveMatches.some(m => m.matchId === matchId)) return;

        const title = matchContainer.find('h3.cb-lv-scr-mtch-hdr a').attr('title') || 'Untitled Match';

        const teams: { name: string, score?: string }[] = [];

        linkElement.find('.cb-hmscg-bat-txt, .cb-hmscg-bwl-txt').each((i, teamEl) => {
          const teamName = $(teamEl).find('.cb-hmscg-tm-nm').text().trim();
          const teamScore = $(teamEl).find('div').last().text().trim();
          if (teamName) {
            teams.push({ name: teamName, score: teamScore || undefined });
          }
        });

        let status = linkElement.find('.cb-text-live').text().trim();
        if (!status) {
          status = linkElement.find('.cb-text-preview').text().trim();
        }
        if (!status) {
          status = linkElement.find('.cb-text-complete').text().trim();
        }

        if (teams.length > 0) {
          liveMatches.push({
            title,
            url: href,
            matchId,
            teams,
            status: status || 'Status not available',
          });
        }
      }
    });
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
  const liveUrl = `https://www.cricbuzz.com/live-cricket-scores/${matchId}`;

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
    imageUrl: p.faceImageId ? `https://static.cricbuzz.com/a/img/v1/152x152/i1/c${p.faceImageId}/player.jpg` : undefined,
  };
}

export async function getScoreForMatchId(
  matchId: string
): Promise<ScrapeCricbuzzUrlOutput> {
  if (!matchId) {
    throw new Error('Could not extract match ID from the URL.');
  }

  // Try multiple API endpoints
  const apiEndpoints = [
    `https://www.cricbuzz.com/api/mcenter/comm/${matchId}`,
    `https://www.cricbuzz.com/api/cricket-match/commentary/${matchId}`,
  ];

  let data = null;

  for (const apiUrl of apiEndpoints) {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get('content-type');

      // If API returns HTML, try next endpoint
      if (!contentType || !contentType.includes('application/json')) {
        continue;
      }

      data = await response.json();
      break;
    } catch (e) {
      console.error('[getScoreForMatchId] Error with endpoint:', apiUrl, e);
    }
  }

  // If all API endpoints failed, fall back to HTML parsing
  if (!data) {
    return await getScoreFromHtml(matchId);
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
      // Use a very large timestamp to get the newest commentary from pagination
      const paginationUrl = `https://www.cricbuzz.com/api/mcenter/commentary-pagination/${matchId}/${miniscore.inningsId}/9999999999999`;
      const paginationResponse = await fetch(paginationUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      if (paginationResponse.ok) {
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
    ?.filter((c: any) => c.commText)
    .map((c: any): Commentary => {
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
          commentary.overRuns = c.overSeparator.runs;
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
        teamFlagUrl = `https://static.cricbuzz.com/a/img/v1/25x18/i1/c${team.imageId}/${team.shortName.toLowerCase()}.jpg`;
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
  const venue = matchHeader?.venueInfo ? `${matchHeader.venueInfo.ground}, ${matchHeader.venueInfo.city}` : undefined;
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
      console.log('[getScoreForMatchId] Initial fetch - min timestamp:', oldestTimestamp, 'max timestamp:', Math.max(...timestamps), 'commentary count:', commentaryArray.length);
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
    date: matchDate,
    oldestCommentaryTimestamp: oldestTimestamp,
    matchStartTimestamp: matchHeader?.matchStartTimestamp,
    currentInningsId: miniscore?.inningsId,
    seriesName: matchHeader?.seriesName || undefined,
    seriesId: matchHeader?.seriesId ? String(matchHeader.seriesId) : undefined,
    playerOfTheMatch: extractAwardPlayer(matchHeader?.playersOfTheMatch),
    playerOfTheSeries: extractAwardPlayer(matchHeader?.playersOfTheSeries),
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






export async function scrapeSeriesMatches(seriesId: string): Promise<LiveMatch[]> {
  // seriesId can be either just the ID (9596) or the full path (9596/india-tour-of-australia-2025)
  // Remove '/matches' suffix if present (from URL path)
  const cleanSeriesId = seriesId.replace(/\/matches$/, '');

  // Extract just the numeric ID from the path
  const numericId = cleanSeriesId.split('/')[0];

  // Try the API endpoint first - it returns clean JSON data
  const apiUrl = `https://www.cricbuzz.com/api/series/${numericId}`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json();

      const matches: LiveMatch[] = [];

      // The API returns matchDetails array with date groups
      if (data.matchDetails && Array.isArray(data.matchDetails)) {
        for (const dateGroup of data.matchDetails) {
          if (dateGroup.matchDetailsMap && dateGroup.matchDetailsMap.match) {
            for (const match of dateGroup.matchDetailsMap.match) {
              const matchInfo = match.matchInfo;
              if (!matchInfo) continue;

              const teams: { name: string, score?: string }[] = [];

              // Add team 1
              if (matchInfo.team1) {
                let score1 = '';
                if (match.matchScore?.team1Score?.inngs1) {
                  const inngs = match.matchScore.team1Score.inngs1;
                  score1 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                }
                teams.push({
                  name: matchInfo.team1.teamName,
                  score: score1 || undefined
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
                  score: score2 || undefined
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
                venue,
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
  const matchesUrl = `https://www.cricbuzz.com/cricket-series/${cleanSeriesId}/matches`;
  const baseUrl = `https://www.cricbuzz.com/cricket-series/${cleanSeriesId}`;
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

      if (matchDetails && Array.isArray(matchDetails)) {
        const matches: LiveMatch[] = [];

        for (const dateGroup of matchDetails) {
          if (dateGroup.matchDetailsMap && dateGroup.matchDetailsMap.match) {
            for (const match of dateGroup.matchDetailsMap.match) {
              const matchInfo = match.matchInfo;
              if (!matchInfo) continue;

              const teams: { name: string, score?: string }[] = [];

              // Add team 1
              if (matchInfo.team1) {
                let score1 = '';
                if (match.matchScore?.team1Score?.inngs1) {
                  const inngs = match.matchScore.team1Score.inngs1;
                  score1 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                }
                teams.push({
                  name: matchInfo.team1.teamName,
                  score: score1 || undefined
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
                  score: score2 || undefined
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
                venue,
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

  // Try to extract match data from React Server Components (RSC) payload
  // RSC data is in self.__next_f.push([1,"..."]) calls with escaped JSON
  const rscPushRegex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let rscContent = '';
  let rscMatch;
  while ((rscMatch = rscPushRegex.exec(html)) !== null) {
    rscContent += rscMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  }
  if (rscContent) {
    const mdIdx = rscContent.indexOf('"matchDetails"');
    if (mdIdx > -1) {
      // Find the JSON array after "matchDetails":
      const arrStart = rscContent.indexOf('[', mdIdx);
      if (arrStart > -1) {
        let depth = 0;
        let end = -1;
        for (let i = arrStart; i < rscContent.length && i < arrStart + 50000; i++) {
          if (rscContent[i] === '[') depth++;
          if (rscContent[i] === ']') depth--;
          if (depth === 0) { end = i + 1; break; }
        }
        if (end > -1) {
          try {
            const matchDetails = JSON.parse(rscContent.substring(arrStart, end));
            const matches: LiveMatch[] = [];
            for (const dateGroup of matchDetails) {
              if (dateGroup.matchDetailsMap?.match) {
                for (const match of dateGroup.matchDetailsMap.match) {
                  const matchInfo = match.matchInfo;
                  if (!matchInfo) continue;
                  const teams: { name: string; score?: string }[] = [];
                  if (matchInfo.team1) {
                    let score1 = '';
                    if (match.matchScore?.team1Score?.inngs1) {
                      const inngs = match.matchScore.team1Score.inngs1;
                      score1 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                    }
                    teams.push({ name: matchInfo.team1.teamName, score: score1 || undefined });
                  }
                  if (matchInfo.team2) {
                    let score2 = '';
                    if (match.matchScore?.team2Score?.inngs1) {
                      const inngs = match.matchScore.team2Score.inngs1;
                      score2 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
                    }
                    teams.push({ name: matchInfo.team2.teamName, score: score2 || undefined });
                  }
                  const venue = matchInfo.venueInfo
                    ? `${matchInfo.venueInfo.ground}, ${matchInfo.venueInfo.city}`
                    : undefined;
                  matches.push({
                    title: `${matchInfo.team1?.teamName || ''} vs ${matchInfo.team2?.teamName || ''}, ${matchInfo.matchDesc}`,
                    url: `/live-cricket-scores/${matchInfo.matchId}`,
                    matchId: matchInfo.matchId.toString(),
                    teams,
                    status: matchInfo.status || 'Status not available',
                    venue,
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
          for (const match of dateGroup.matchDetailsMap.match) {
            const matchInfo = match.matchInfo;
            if (!matchInfo) continue;

            const teams: { name: string, score?: string }[] = [];

            // Add team 1
            if (matchInfo.team1) {
              let score1 = '';
              if (match.matchScore?.team1Score?.inngs1) {
                const inngs = match.matchScore.team1Score.inngs1;
                score1 = `${inngs.runs}${inngs.wickets !== undefined ? `/${inngs.wickets}` : ''} (${inngs.overs})`;
              }
              teams.push({
                name: matchInfo.team1.teamName,
                score: score1 || undefined
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
                score: score2 || undefined
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
              venue,
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

export async function scrapeMatchStats(matchId: string): Promise<MatchStats> {
  const url = `https://www.cricbuzz.com/live-cricket-scores/${matchId}`;
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
  const url = `https://www.cricbuzz.com/cricket-match-squads/${matchId}`;
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
      const flagUrl = $teamDiv.find('img').attr('src') || $teamDiv.find('img').attr('srcset')?.split(' ')[0];
      
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

  // Process Playing XI section
  const playingXISections = $('h1:contains("playing XI"), h1:contains("Playing XI")');
  console.log('[Squad Parser] Found Playing XI sections:', playingXISections.length);
  
  playingXISections.each((_, sectionHeader) => {
    const $section = $(sectionHeader).parent();
    const $squadGrid = $section.find('.w-full.flex');
    
    // Left column (Team 1)
    $squadGrid.find('.w-1\\/2').first().find('a').each((_, player) => {
      const $player = $(player);
      const href = $player.attr('href') || '';
      const profileId = href.match(/\/profiles\/(\d+)\//)?.[1];
      
      // Name is in the first span inside flex-row
      const name = $player.find('.flex.flex-row span').first().text().trim();
      
      // Captain/WK is in the second span (if exists)
      const captainWK = $player.find('.flex.flex-row span').eq(1).text().trim();
      
      // Role is in the div with text-cbTxtSec text-xs classes
      const role = $player.find('div.text-cbTxtSec.text-xs').text().trim();
      
      // Image URL from img tag
      const imageUrl = $player.find('img').attr('src') || $player.find('img').attr('srcset')?.split(' ')[0];

      if (name) {
        teams[0].playingXI.push({
          name,
          role: role || 'Player',
          profileId,
          imageUrl,
          isCaptain: captainWK.includes('C'),
          isWicketKeeper: captainWK.includes('WK'),
        });
      }
    });

    // Right column (Team 2)
    $squadGrid.find('.w-1\\/2').last().find('a').each((_, player) => {
      const $player = $(player);
      const href = $player.attr('href') || '';
      const profileId = href.match(/\/profiles\/(\d+)\//)?.[1];
      
      // Name is in the first span inside flex-row
      const name = $player.find('.flex.flex-row span').first().text().trim();
      
      // Captain/WK is in the second span (if exists)
      const captainWK = $player.find('.flex.flex-row span').eq(1).text().trim();
      
      // Role is in the div with text-cbTxtSec text-xs classes
      const role = $player.find('div.text-cbTxtSec.text-xs').text().trim();
      
      // Image URL from img tag
      const imageUrl = $player.find('img').attr('src') || $player.find('img').attr('srcset')?.split(' ')[0];

      if (name) {
        teams[1].playingXI.push({
          name,
          role: role || 'Player',
          profileId,
          imageUrl,
          isCaptain: captainWK.includes('C'),
          isWicketKeeper: captainWK.includes('WK'),
        });
      }
    });
  });

  // Process Bench section
  $('h1:contains("bench"), h1:contains("Bench")').each((_, sectionHeader) => {
    const $section = $(sectionHeader).parent();
    const $squadGrid = $section.find('.w-full.flex');
    
    // Left column (Team 1)
    $squadGrid.find('.w-1\\/2').first().find('a').each((_, player) => {
      const $player = $(player);
      const href = $player.attr('href') || '';
      const profileId = href.match(/\/profiles\/(\d+)\//)?.[1];
      
      // Name is in the first span inside flex-row
      const name = $player.find('.flex.flex-row span').first().text().trim();
      
      // Role is in the div with text-cbTxtSec text-xs classes
      const role = $player.find('div.text-cbTxtSec.text-xs').text().trim();
      
      // Image URL from img tag
      const imageUrl = $player.find('img').attr('src') || $player.find('img').attr('srcset')?.split(' ')[0];

      if (name) {
        teams[0].bench.push({
          name,
          role: role || 'Player',
          profileId,
          imageUrl,
        });
      }
    });

    // Right column (Team 2)
    $squadGrid.find('.w-1\\/2').last().find('a').each((_, player) => {
      const $player = $(player);
      const href = $player.attr('href') || '';
      const profileId = href.match(/\/profiles\/(\d+)\//)?.[1];
      
      // Name is in the first span inside flex-row
      const name = $player.find('.flex.flex-row span').first().text().trim();
      
      // Role is in the div with text-cbTxtSec text-xs classes
      const role = $player.find('div.text-cbTxtSec.text-xs').text().trim();
      
      // Image URL from img tag
      const imageUrl = $player.find('img').attr('src') || $player.find('img').attr('srcset')?.split(' ')[0];

      if (name) {
        teams[1].bench.push({
          name,
          role: role || 'Player',
          profileId,
          imageUrl,
        });
      }
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
          
          const name = $link.find('.flex.flex-row span').first().text().trim();
          const roleMarker = $link.find('.flex.flex-row span').eq(1).text().trim();
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
            
            teams[teamIndex].playingXI.push({
              name,
              role,
              profileId,
              imageUrl,
              isCaptain: roleMarker.includes('C'),
              isWicketKeeper: roleMarker.includes('WK'),
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
  const fullUrl = `https://www.cricbuzz.com${highlightsUrl}`;
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
  // Cricbuzz HTML structure:
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
  const response = await fetch('https://www.cricbuzz.com/cricket-schedule/series/all', {
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

  const url = `https://www.cricbuzz.com/cricket-series/${numericId}/${slug}/stats`;
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

  const url = `https://www.cricbuzz.com/api/cricket-series/series-stats/${numericId}/${statsType}`;
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
      for (let i = 0; i < headers.length; i++) {
        valueMap[headers[i]] = vals[i + 2] || '';
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

  const url = `https://www.cricbuzz.com/cricket-series/${numericId}/${slug}/points-table`;
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
    const url = `https://www.cricbuzz.com/api/mcenter/commentary-pagination/${matchId}/${inningsId}/${timestamp}`;
    let response: Response;
    try {
      response = await fetch(url, {
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
            runs: sep.runs || 0,
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

export async function scrapeICCRankings(
  format: 'test' | 'odi' | 't20',
  category: 'batting' | 'bowling' | 'all-rounder'
): Promise<RankingsData> {
  // Always fetch the base category page — it contains all format data in RSC payload
  const categorySlug = category === 'all-rounder' ? 'all-rounder' : category;
  const url = `https://www.cricbuzz.com/cricket-stats/icc-rankings/men/${categorySlug}`;

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
        imageUrl: `https://static.cricbuzz.com/a/img/v1/i1/c${faceImageId}/${slug}.jpg`,
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
