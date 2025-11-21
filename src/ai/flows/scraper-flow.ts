

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

const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  content: z.string().optional(),
  category: z.enum(['Breaking', 'Match', 'Player', 'Tournament', 'General', 'News', 'Premium', 'Topics', 'Spotlight', 'Opinions', 'Special', 'Stats', 'Interviews', 'Live Blogs']),
  timestamp: z.string(),
  imageUrl: z.string().optional(),
  url: z.string(),
  newsType: z.string().optional(),
});

const PlayerRankingItemSchema = z.object({
  rank: z.string(),
  name: z.string(),
  country: z.string(),
  rating: z.string(),
  profileId: z.string().optional(),
  imageUrl: z.string().optional(),
});

const PlayerRankingsSchema = z.object({
  men: z.object({
    batting: z.object({
      test: z.array(PlayerRankingItemSchema),
      odi: z.array(PlayerRankingItemSchema),
      t20: z.array(PlayerRankingItemSchema),
    }),
    bowling: z.object({
      test: z.array(PlayerRankingItemSchema),
      odi: z.array(PlayerRankingItemSchema),
      t20: z.array(PlayerRankingItemSchema),
    }),
    allRounder: z.object({
      test: z.array(PlayerRankingItemSchema),
      odi: z.array(PlayerRankingItemSchema),
      t20: z.array(PlayerRankingItemSchema),
    }),
  }),
  women: z.object({
    batting: z.object({
      test: z.array(PlayerRankingItemSchema),
      odi: z.array(PlayerRankingItemSchema),
      t20: z.array(PlayerRankingItemSchema),
    }),
    bowling: z.object({
      test: z.array(PlayerRankingItemSchema),
      odi: z.array(PlayerRankingItemSchema),
      t20: z.array(PlayerRankingItemSchema),
    }),
    allRounder: z.object({
      test: z.array(PlayerRankingItemSchema),
      odi: z.array(PlayerRankingItemSchema),
      t20: z.array(PlayerRankingItemSchema),
    }),
  }),
});

const TeamRankingItemSchema = z.object({
  rank: z.string(),
  team: z.string(),
  rating: z.string(),
  points: z.string(),
});

const TeamRankingsSchema = z.object({
  men: z.object({
    test: z.array(TeamRankingItemSchema),
    odi: z.array(TeamRankingItemSchema),
    t20: z.array(TeamRankingItemSchema),
  }),
  women: z.object({
    test: z.array(TeamRankingItemSchema),
    odi: z.array(TeamRankingItemSchema),
    t20: z.array(TeamRankingItemSchema),
  }),
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
export type NewsItem = z.infer<typeof NewsItemSchema>;
export type PlayerRankings = z.infer<typeof PlayerRankingsSchema>;
export type TeamRankings = z.infer<typeof TeamRankingsSchema>;
export type MatchStats = z.infer<typeof MatchStatsSchema>;
export type MatchSquads = z.infer<typeof MatchSquadsSchema>;
export type SquadPlayer = z.infer<typeof SquadPlayerSchema>;

export type ScrapeCricbuzzUrlOutput = z.infer<
  typeof ScrapeCricbuzzUrlOutputSchema
>;
export type Commentary = z.infer<typeof CommentarySchema>;


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


  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch player profile: ${response.statusText}`);
  }

  const html = await response.text();

  // Try to extract JSON data from Next.js page
  try {
    // Try multiple patterns to find the player data
    let scriptMatch = html.match(/self\.__next_f\.push\(\[1,"([^"]+)"\]\)/g);
    
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
            test: playerData.rankings?.allRounder?.testRank || '--',
            testBest: playerData.rankings?.allRounder?.testBestRank || '--',
            odi: playerData.rankings?.allRounder?.odiRank || '--',
            odiBest: playerData.rankings?.allRounder?.odiBestRank || '--',
            t20: playerData.rankings?.allRounder?.t20Rank || '--',
            t20Best: playerData.rankings?.allRounder?.t20BestRank || '--',
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

  // Extract player name from the header
  let name = $('span.tb\\:font-bold.wb\\:text-xl.wb\\:mt-1').first().text().trim();
  if (!name) {
    name = $('h1').first().text().trim();
  }

  // Extract country from the flag section - use first() to avoid duplicates
  let country = $('.flex.items-center.w-full.justify-center').first().find('.text-xs.text-cbItmBkgDark, .wb\\:text-base').first().text().trim();
  if (!country) {
    country = $('h3.cb-font-18.text-gray').first().text().trim();
  }

  // Extract image URL
  let imageUrl = '';
  const imgSrc = $('.h-avatarLarge.w-avatarLarge img, .wb\\:rounded-full').attr('src') || $('.h-avatarLarge.w-avatarLarge img, .wb\\:rounded-full').attr('srcset')?.split(' ')[0];
  if (imgSrc) {
    if (imgSrc.startsWith('http')) {
      imageUrl = imgSrc;
    } else if (imgSrc.startsWith('//')) {
      imageUrl = `https:${imgSrc}`;
    } else {
      imageUrl = `https://www.cricbuzz.com${imgSrc}`;
    }
  }

  // Extract personal information from the new structure
  const getPersonalInfo = (label: string): string => {
    let value = '';
    
    // Try new structure first
    $('.w-full.flex.tb\\:flex-col.gap-4').each((_, row) => {
      const $row = $(row);
      const labelText = $row.find('.text-cbItmBkgDark, .wb\\:text-black.wb\\:font-bold').first().text().trim();
      if (labelText.toLowerCase() === label.toLowerCase()) {
        value = $row.find('.flex-grow, .tb\\:font-bold, .wb\\:font-normal').last().text().trim();
        return false; // break
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

  // Extract ICC Rankings from the new table structure
  const getRankings = (type: 'Batting' | 'Bowling' | 'All-Rounder'): z.infer<typeof PlayerRankingSchema> => {
    const rankings = { 
      test: '--', 
      testBest: '--',
      odi: '--', 
      odiBest: '--',
      t20: '--',
      t20Best: '--'
    };
    
    // The issue is that Cricbuzz shows the same table for all tabs in static HTML
    // The table content changes dynamically via JavaScript when tabs are clicked
    // So we can only reliably get the batting rankings (default tab)
    
    // Only extract for batting, return empty for others
    if (type !== 'Batting') {
      return rankings;
    }
    
    // Find the rankings table
    $('table').each((_, table) => {
      const $table = $(table);
      const headers = $table.find('thead th').map((_, th) => $(th).text().trim().toUpperCase()).get();
      
      // Check if this is a rankings table
      if (headers.includes('FORMAT') && headers.includes('CURRENT RANK') && headers.includes('BEST RANK')) {
        $table.find('tbody tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          if (cells.length >= 3) {
            const format = cells.eq(0).text().trim().toLowerCase();
            const currentRank = cells.eq(1).find('span').first().text().trim() || cells.eq(1).text().trim();
            const bestRank = cells.eq(2).text().trim();
            
            if (format === 'test') {
              rankings.test = currentRank || '--';
              rankings.testBest = bestRank || '--';
            } else if (format === 'odi') {
              rankings.odi = currentRank || '--';
              rankings.odiBest = bestRank || '--';
            } else if (format === 't20i') {
              rankings.t20 = currentRank || '--';
              rankings.t20Best = bestRank || '--';
            }
          }
        });
        return false; // break
      }
    });
    
    // Fallback: Try old structure - look for the active tab and table
      const isActiveTab = type === 'Batting' 
        ? $('button:contains("Batting")').hasClass('bg-white') || $('button:contains("Batting")').hasClass('m-1')
        : $('button:contains("Bowling")').hasClass('bg-white');
      
      if (isActiveTab || type === 'Batting') {
        $('table tbody tr').each((_, row) => {
          const $row = $(row);
          const format = $row.find('td').first().text().trim().toLowerCase();
          const rank = $row.find('td').eq(1).find('span').first().text().trim();
          
          if (format === 'test') rankings.test = rank || '--';
          else if (format === 'odi') rankings.odi = rank || '--';
          else if (format === 't20i') rankings.t20 = rank || '--';
        });
      }

    // Fallback to oldest structure
    if (rankings.test === '--' && rankings.odi === '--' && rankings.t20 === '--') {
      const rankLabelDiv = $(`div.cb-col.cb-col-25.cb-plyr-rank.text-bold:contains("${type}")`);
      rankings.test = rankLabelDiv.next().text().trim() || '--';
      rankings.odi = rankLabelDiv.next().next().text().trim() || '--';
      rankings.t20 = rankLabelDiv.next().next().next().text().trim() || '--';
    }
    
    return rankings;
  };

  // Extract all three ranking types from HTML
  const battingRankings = getRankings('Batting');
  const bowlingRankings = getRankings('Bowling');
  const allRounderRankings = getRankings('All-Rounder');

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
  
  // Try to extract new format (Cricbuzz style: stats as rows, formats as columns)
  $('h3:contains("Batting Career Summary")').next().find('table').each((_, table) => {
    const $table = $(table);
    const headers = $table.find('thead th').map((_, th) => $(th).text().trim()).get();
    
    // Check if this is the new format (Test, ODI, T20, IPL as columns)
    if (headers.includes('Test') && headers.includes('ODI')) {
      $table.find('tbody tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
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
      return false; // break after finding the table
    }
  });
  
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
  
  // Try to extract new format (Cricbuzz style: stats as rows, formats as columns)
  $('h3:contains("Bowling Career Summary")').next().find('table').each((_, table) => {
    const $table = $(table);
    const headers = $table.find('thead th').map((_, th) => $(th).text().trim()).get();
    
    // Check if this is the new format (Test, ODI, T20, IPL as columns)
    if (headers.includes('Test') && headers.includes('ODI')) {
      $table.find('tbody tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
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
      return false; // break after finding the table
    }
  });
  
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

  // Find the Recent Form section
  $('h3:contains("RECENT FORM")').parent().each((_, section) => {
    const $section = $(section);
    
    // Find the container with both batting and bowling sections
    const $formsContainer = $section.find('.flex.w-full.gap-4');
    
    if ($formsContainer.length > 0) {
      // Get the two columns (batting and bowling)
      const columns = $formsContainer.find('> div');
      
      // First column should be batting
      const $battingColumn = columns.eq(0);
      if ($battingColumn.find('div:contains("Batting Form")').length > 0) {
        $battingColumn.find('a[href*="/live-cricket-scores/"]').each((_, row) => {
          const $row = $(row);
          const gridCells = $row.find('> div, > span');
          if (gridCells.length >= 4) {
            recentBattingForm.push({
              opponent: gridCells.eq(0).find('span').text().trim() || gridCells.eq(0).text().trim(),
              score: gridCells.eq(1).find('span').text().trim() || gridCells.eq(1).text().trim(),
              format: gridCells.eq(2).find('span').text().trim() || gridCells.eq(2).text().trim(),
              date: gridCells.eq(3).find('span').text().trim() || gridCells.eq(3).text().trim(),
              matchUrl: $row.attr('href') || undefined,
            });
          }
        });
      }

      // Second column should be bowling
      const $bowlingColumn = columns.eq(1);
      if ($bowlingColumn.find('div:contains("Bowling Form")').length > 0) {
        $bowlingColumn.find('a[href*="/live-cricket-scores/"]').each((_, row) => {
          const $row = $(row);
          const gridCells = $row.find('> div, > span');
          if (gridCells.length >= 4) {
            recentBowlingForm.push({
              opponent: gridCells.eq(0).find('span').text().trim() || gridCells.eq(0).text().trim(),
              wickets: gridCells.eq(1).find('span').text().trim() || gridCells.eq(1).text().trim(),
              format: gridCells.eq(2).find('span').text().trim() || gridCells.eq(2).text().trim(),
              date: gridCells.eq(3).find('span').text().trim() || gridCells.eq(3).text().trim(),
              matchUrl: $row.attr('href') || undefined,
            });
          }
        });
      }
    }
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

  const { matchHeader, miniscore, commentaryList } = data;

  const title = matchHeader ? `${matchHeader.team1.name} vs ${matchHeader.team2.name}, ${matchHeader.matchDescription}` : 'Match';
  const status = matchHeader ? matchHeader.status : 'Status not available';

  const batTeamId = miniscore?.batTeam?.teamId;
  const battingTeam = batTeamId && matchHeader ? (matchHeader.team1.id === batTeamId ? matchHeader.team1 : matchHeader.team2) : null;
  const formattedOvers = formatOvers(miniscore?.overs);
  const score = battingTeam && miniscore ? `${battingTeam?.shortName} ${miniscore.batTeam.teamScore ?? 0}/${miniscore.batTeam.teamWkts ?? 0} (${formattedOvers} ov)` : 'N/A';

  const batsmen: { name: string; runs: string; balls: string, onStrike: boolean, strikeRate: string, fours: string, sixes: string, profileId?: string }[] = [];
  if (miniscore?.batsmanStriker?.batName) {
    batsmen.push({
      name: miniscore.batsmanStriker.batName,
      runs: String(miniscore.batsmanStriker.batRuns ?? 0),
      balls: String(miniscore.batsmanStriker.batBalls ?? 0),
      onStrike: true,
      strikeRate: String(miniscore.batsmanStriker.batStrikeRate ?? 0),
      fours: String(miniscore.batsmanStriker.batFours ?? 0),
      sixes: String(miniscore.batsmanStriker.batSixes ?? 0),
      profileId: miniscore.batsmanStriker.batId ? String(miniscore.batsmanStriker.batId) : undefined,
    });
  }
  if (miniscore?.batsmanNonStriker?.batName) {
    batsmen.push({
      name: miniscore.batsmanNonStriker.batName,
      runs: String(miniscore.batsmanNonStriker.batRuns ?? 0),
      balls: String(miniscore.batsmanNonStriker.batBalls ?? 0),
      onStrike: false,
      strikeRate: String(miniscore.batsmanNonStriker.batStrikeRate ?? 0),
      fours: String(miniscore.batsmanNonStriker.batFours ?? 0),
      sixes: String(miniscore.batsmanNonStriker.batSixes ?? 0),
      profileId: miniscore.batsmanNonStriker.batId ? String(miniscore.batsmanNonStriker.batId) : undefined,
    });
  }

  const bowlers: { name: string; overs: string; maidens: string, runs: string, wickets: string, economy: string, onStrike: boolean, profileId?: string }[] = [];
  if (miniscore?.bowlerStriker?.bowlName) {
    bowlers.push({
      name: miniscore.bowlerStriker.bowlName,
      overs: String(miniscore.bowlerStriker.bowlOvs ?? 0),
      maidens: String(miniscore.bowlerStriker.bowlMaidens ?? 0),
      runs: String(miniscore.bowlerStriker.bowlRuns ?? 0),
      wickets: String(miniscore.bowlerStriker.bowlWkts ?? 0),
      economy: String(miniscore.bowlerStriker.bowlEcon ?? 0),
      onStrike: true,
      profileId: miniscore.bowlerStriker.bowlId ? String(miniscore.bowlerStriker.bowlId) : undefined,
    });
  }
  if (miniscore?.bowlerNonStriker?.bowlName) {
    bowlers.push({
      name: miniscore.bowlerNonStriker.bowlName,
      overs: String(miniscore.bowlerNonStriker.bowlOvs ?? 0),
      maidens: String(miniscore.bowlerNonStriker.bowlMaidens ?? 0),
      runs: String(miniscore.bowlerNonStriker.bowlRuns ?? 0),
      wickets: String(miniscore.bowlerNonStriker.bowlWkts ?? 0),
      economy: String(miniscore.bowlerNonStriker.bowlEcon ?? 0),
      onStrike: false,
      profileId: miniscore.bowlerNonStriker.bowlId ? String(miniscore.bowlerNonStriker.bowlId) : undefined,
    });
  }

  const commentary: Commentary[] = commentaryList
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

      let overNumberStr = '';
      if (c.overNumber) {
        overNumberStr = c.overNumber.toString();
      }


      if (c.ballNbr > 0 && overNumberStr) {
        const commentary: Commentary = {
          type: 'live',
          text: `${overNumberStr}: ${commText}`,
          event: c.event,
          runs: c.runs,
          milestone,
        };

        // Add over summary if this is an over-break
        if (c.overSeparator) {
          commentary.overSummary = c.overSeparator.o_summary;
          commentary.overRuns = c.overSeparator.runs;
          commentary.overNumber = c.overSeparator.overNum;
          commentary.teamShortName = c.overSeparator.batTeamName;
          commentary.teamScore = c.overSeparator.score;
          commentary.teamWickets = c.overSeparator.wickets;
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
        score: `${inn.score}/${inn.wickets}`,
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

  // Get the oldest timestamp from commentaryList for pagination
  const oldestTimestamp = commentaryList && commentaryList.length > 0
    ? commentaryList[commentaryList.length - 1]?.timestamp
    : undefined;

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

















export async function scrapeCricketNews(): Promise<NewsItem[]> {
  const response = await fetch('https://www.cricbuzz.com/cricket-news', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch cricket news: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  const news: NewsItem[] = [];

  // Use the new structure you provided
  $('#news-list .cb-lst-itm, .cb-lst-itm').each((index, element) => {
    const $item = $(element);

    // Get the main news link
    const linkElement = $item.find('.cb-nws-hdln-ancr');
    const href = linkElement.attr('href');

    if (!href) return;

    const title = linkElement.text().trim();
    const summary = $item.find('.cb-nws-intr').text().trim();

    // Get timestamp and news type
    const timeElements = $item.find('.cb-nws-time');
    let timestamp = 'Recently';
    let newsType = '';

    if (timeElements.length > 0) {
      // First element might contain news type
      const firstTimeElement = timeElements.first();
      const newsTypeLink = firstTimeElement.find('a');
      if (newsTypeLink.length > 0) {
        newsType = newsTypeLink.text().trim();
      }

      // Last element contains the actual timestamp
      timestamp = timeElements.last().text().trim() || 'Recently';
    }

    // Get image URL
    let imageUrl = '';
    const imgElement = $item.find('img');
    if (imgElement.length) {
      const src = imgElement.attr('src');
      if (src) {
        imageUrl = src.startsWith('http') ? src : `https://www.cricbuzz.com${src}`;
      }
    }

    // Determine category based on news type and content
    let category: NewsItem['category'] = 'General';
    const newsTypeLower = newsType.toLowerCase();
    const titleLower = title.toLowerCase();

    if (newsTypeLower.includes('news')) {
      category = 'News';
    } else if (newsTypeLower.includes('premium')) {
      category = 'Premium';
    } else if (newsTypeLower.includes('spotlight')) {
      category = 'Spotlight';
    } else if (newsTypeLower.includes('opinion')) {
      category = 'Opinions';
    } else if (newsTypeLower.includes('special')) {
      category = 'Special';
    } else if (newsTypeLower.includes('stats')) {
      category = 'Stats';
    } else if (newsTypeLower.includes('interview')) {
      category = 'Interviews';
    } else if (newsTypeLower.includes('live blog')) {
      category = 'Live Blogs';
    } else if (titleLower.includes('breaking') || titleLower.includes('urgent')) {
      category = 'Breaking';
    } else if (titleLower.includes('match') || titleLower.includes('vs') || titleLower.includes('innings')) {
      category = 'Match';
    } else if (titleLower.includes('player') || titleLower.includes('captain') || titleLower.includes('century') || titleLower.includes('wicket')) {
      category = 'Player';
    } else if (titleLower.includes('ipl') || titleLower.includes('world cup') || titleLower.includes('series') || titleLower.includes('tournament')) {
      category = 'Tournament';
    }

    // Create a unique ID using index and timestamp to avoid duplicates
    const id = `news-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const url = href.startsWith('http') ? href : `https://www.cricbuzz.com${href}`;

    if (title && summary) {
      news.push({
        id,
        title,
        summary,
        category,
        timestamp,
        imageUrl,
        url,
        newsType,
      });
    }
  });

  return news.slice(0, 20); // Return top 20 news items
}

export async function getNewsContent(newsUrl: string): Promise<string> {
  try {
    const response = await fetch(newsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch news content: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements first
    $('.cb-nws-sub-txt').remove();
    $('.spt-nws-dtl-hdln').remove();
    $('.cb-news-img-section').remove();
    $('.cb-sptlt-hdr').remove();
    $('.cb-news-copyright').remove();
    $('.cb-sptlt-sctn').remove();

    // Extract the main content from the news article
    let content = '';

    // Try different selectors for news content
    const contentSelectors = [
      '.cb-nws-dtl-cnt',
      '.cb-col.cb-col-100.cb-nws-dtl-cnt',
      '.cb-nws-cnt',
      '.cb-col-100.cb-nws-cnt',
      'article',
      '.article-content'
    ];

    for (const selector of contentSelectors) {
      const contentElement = $(selector);
      if (contentElement.length > 0) {
        content = contentElement.html() || contentElement.text();
        break;
      }
    }

    // If no specific content found, try to get paragraphs
    if (!content) {
      const paragraphs = $('p').map((_, el) => $(el).text()).get();
      content = paragraphs.join('\n\n');
    }

    return content || 'Content not available';
  } catch (error) {
    console.error('Error fetching news content:', error);
    return 'Content not available';
  }
}

export async function scrapePlayerRankings(): Promise<PlayerRankings> {
  const rankings: PlayerRankings = {
    men: {
      batting: { test: [], odi: [], t20: [] },
      bowling: { test: [], odi: [], t20: [] },
      allRounder: { test: [], odi: [], t20: [] },
    },
    women: {
      batting: { test: [], odi: [], t20: [] },
      bowling: { test: [], odi: [], t20: [] },
      allRounder: { test: [], odi: [], t20: [] },
    },
  };

  const categories = ['batting', 'bowling', 'all-rounder'];
  const genders = ['men', 'women'];

  for (const gender of genders) {
    for (const category of categories) {
      try {
        // Try multiple URL patterns
        const urls = [
          `https://www.cricbuzz.com/cricket-stats/icc-rankings/${gender}/${category}`,
          `https://www.cricbuzz.com/cricket-stats/icc-rankings/${category}` // fallback for men's rankings
        ];

        let response;
        let html = '';

        for (const url of urls) {
          try {
            response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              },
            });

            if (response.ok) {
              html = await response.text();
              break;
            }
          } catch (e) {
          }
        }

        if (!html) {
          continue;
        }

        const $ = cheerio.load(html);

        // Extract rankings for all formats from the same page
        // Player rankings pages have Angular directives similar to team rankings
        const categoryMap = {
          'batting': 'batsmen',
          'bowling': 'bowlers',
          'all-rounder': 'allrounders'
        };

        const mappedCategory = categoryMap[category as keyof typeof categoryMap] || category;
        const formatMappings = {
          'test': `${mappedCategory}-tests`,
          'odi': `${mappedCategory}-odis`,
          't20': `${mappedCategory}-t20s`
        };

        for (const [format, ngShowValue] of Object.entries(formatMappings)) {
          const players: z.infer<typeof PlayerRankingItemSchema>[] = [];

          // Look for the specific ng-show section for this format
          const formatSection = $(`[ng-show="'${ngShowValue}' == act_rank_format"]`);

          if (formatSection.length > 0) {
            // Find player rows within this format section
            formatSection.find('.cb-lst-itm').each((_, element) => {
              const $row = $(element);

              // Try different ways to get rank
              let rank = $row.find('.cb-col.cb-col-16.cb-rank-tbl.cb-font-16').text().trim() ||
                $row.find('.cb-col.cb-col-16').first().text().trim() ||
                $row.find('.cb-rank-tbl').first().text().trim();

              // Try different ways to get player name and link
              let playerLink = $row.find('.cb-rank-plyr a').first();
              if (!playerLink.length) {
                playerLink = $row.find('a').first();
              }

              const name = playerLink.text().trim();

              // Try different ways to get country
              let country = $row.find('.cb-font-12.text-gray').text().trim() ||
                $row.find('.text-gray').text().trim() ||
                $row.find('.cb-col-20').text().trim();

              // Try different ways to get rating
              let rating = $row.find('.cb-col.cb-col-17.cb-rank-tbl.pull-right').text().trim() ||
                $row.find('.pull-right').text().trim() ||
                $row.find('.cb-col-14').text().trim();

              // Get player image and extract profile ID from it
              let imageUrl = '';
              let profileId: string | undefined;

              interface PlayerRowElements {
                rank: string;
                name: string;
                country: string;
                rating: string;
                profileId?: string;
                imageUrl?: string;
              }  const imgElement = $row.find('.cb-rank-plyr-img, img').first();
              if (imgElement.length) {
                const src = imgElement.attr('src') || imgElement.attr('data-src');
                if (src) {
                  // Try to extract profile ID from the image URL
                  const match = src.match(/\/i1\/c(\d+)\//);
                  if (match) {
                    profileId = match[1];
                    imageUrl = src;
                  }
                }
              }

              // If no profile ID found from image, try from URL
              if (!profileId) {
                profileId = extractProfileId(playerLink.attr('href'));
              }

              // If we have a profile ID but no image URL, construct it
              if (!imageUrl && profileId) {
                imageUrl = `https://static.cricbuzz.com/a/img/v1/50x50/i1/c${profileId}/${name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
              }

              if (rank && name && country && rating && !isNaN(Number(rank))) {
                players.push({ rank, name, country, rating, profileId, imageUrl });
              }
            });
          } else {
            // Fallback: try to extract from the general structure

            // For the first format (test), try to extract from visible data
            if (format === 'test') {
              $('.cb-lst-itm').each((_, element) => {
                const $row = $(element);

                // Skip if this row doesn't contain ranking data
                if (!$row.find('.cb-rank-tbl, .cb-col-16').length) return;

                let rank = $row.find('.cb-col.cb-col-16.cb-rank-tbl.cb-font-16').text().trim() ||
                  $row.find('.cb-col.cb-col-16').first().text().trim() ||
                  $row.find('.cb-rank-tbl').first().text().trim();

                let playerLink = $row.find('.cb-rank-plyr a').first();
                if (!playerLink.length) {
                  playerLink = $row.find('a').first();
                }

                const name = playerLink.text().trim();

                let country = $row.find('.cb-font-12.text-gray').text().trim() ||
                  $row.find('.text-gray').text().trim() ||
                  $row.find('.cb-col-20').text().trim();

                let rating = $row.find('.cb-col.cb-col-17.cb-rank-tbl.pull-right').text().trim() ||
                  $row.find('.pull-right').text().trim() ||
                  $row.find('.cb-col-14').text().trim();

                let imageUrl = '';
                let profileId;
                const imgElement = $row.find('.cb-rank-plyr-img, img').first();
                if (imgElement.length) {
                  const src = imgElement.attr('src') || imgElement.attr('data-src');
                  if (src) {
                    // Try to extract profile ID from the image URL
                    const match = src.match(/\/i1\/c(\d+)\//);
                    if (match) {
                      profileId = match[1];
                      imageUrl = src;
                    }
                  }
                }

                // If no profile ID found from image, try from URL
                if (!profileId) {
                  profileId = extractProfileId(playerLink.attr('href'));
                }

                // If we have a profile ID but no image URL, construct it
                if (!imageUrl && profileId) {
                  imageUrl = `https://static.cricbuzz.com/a/img/v1/50x50/i1/c${profileId}/${name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
                }

                if (rank && name && country && rating && !isNaN(Number(rank))) {
                  players.push({ rank, name, country, rating, profileId, imageUrl });
                }
              });
            }
          }


          // Assign to the correct category and format
          if (category === 'batting') {
            rankings[gender as keyof PlayerRankings].batting[format as keyof PlayerRankings['men']['batting']] = players.slice(0, 15);
          } else if (category === 'bowling') {
            rankings[gender as keyof PlayerRankings].bowling[format as keyof PlayerRankings['men']['bowling']] = players.slice(0, 15);
          } else if (category === 'all-rounder') {
            rankings[gender as keyof PlayerRankings].allRounder[format as keyof PlayerRankings['men']['allRounder']] = players.slice(0, 15);
          }
        }
      } catch (error) {
        console.error(`Error scraping ${gender} ${category} rankings:`, error);
      }
    }
  }

  return rankings;
}

export async function scrapeTeamRankings(): Promise<TeamRankings> {
  const rankings: TeamRankings = {
    men: {
      test: [],
      odi: [],
      t20: [],
    },
    women: {
      test: [],
      odi: [],
      t20: [],
    },
  };

  const genders = ['men', 'women'];

  for (const gender of genders) {
    try {
      // Try multiple URL patterns for team rankings
      const urls = [
        `https://www.cricbuzz.com/cricket-stats/icc-rankings/${gender}/teams`,
        `https://www.cricbuzz.com/cricket-stats/icc-rankings/teams` // fallback for men's rankings
      ];

      let response;
      let html = '';

      for (const url of urls) {
        try {
          response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
          });

          if (response.ok) {
            html = await response.text();
            break;
          }
        } catch (e) {
        }
      }

      if (!html) {
        continue;
      }

      const $ = cheerio.load(html);

      // Extract rankings for all formats from the same page
      // The page has Angular directives that show/hide different format data
      const formatMappings = {
        'test': 'teams-tests',
        'odi': 'teams-odis',
        't20': 'teams-t20s'
      };

      for (const [format, ngShowValue] of Object.entries(formatMappings)) {
        const teams: z.infer<typeof TeamRankingItemSchema>[] = [];

        // Look for the specific ng-show section for this format
        const formatSection = $(`[ng-show="'${ngShowValue}' == act_rank_format"]`);

        if (formatSection.length > 0) {
          // Find team rows within this format section
          formatSection.find('.cb-col.cb-col-100.cb-font-14.cb-brdr-thin-btm.text-center').each((_, element) => {
            const $row = $(element);

            // Extract team data from the specific column structure
            const rankCol = $row.find('.cb-col.cb-col-20.cb-lst-itm-sm').first();
            const teamCol = $row.find('.cb-col.cb-col-50.cb-lst-itm-sm.text-left');
            const ratingCol = $row.find('.cb-col.cb-col-14.cb-lst-itm-sm').first();
            const pointsCol = $row.find('.cb-col.cb-col-14.cb-lst-itm-sm').last();

            const rank = rankCol.text().trim();
            const team = teamCol.text().trim();
            const rating = ratingCol.text().trim();
            const points = pointsCol.text().trim();

            if (rank && team && rating && points && !isNaN(Number(rank))) {
              teams.push({ rank, team, rating, points });
            }
          });
        } else {
          // Fallback: try to extract from the general structure

          // For the first format (test), try to extract from visible data
          if (format === 'test') {
            $('.cb-col.cb-col-100.cb-font-14.cb-brdr-thin-btm.text-center').each((_, element) => {
              const $row = $(element);

              const rankCol = $row.find('.cb-col.cb-col-20.cb-lst-itm-sm').first();
              const teamCol = $row.find('.cb-col.cb-col-50.cb-lst-itm-sm.text-left');
              const ratingCol = $row.find('.cb-col.cb-col-14.cb-lst-itm-sm').first();
              const pointsCol = $row.find('.cb-col.cb-col-14.cb-lst-itm-sm').last();

              const rank = rankCol.text().trim();
              const team = teamCol.text().trim();
              const rating = ratingCol.text().trim();
              const points = pointsCol.text().trim();

              if (rank && team && rating && points && !isNaN(Number(rank))) {
                teams.push({ rank, team, rating, points });
              }
            });
          }
        }

        rankings[gender as keyof TeamRankings][format as keyof TeamRankings['men']] = teams.slice(0, 20);
      }
    } catch (error) {
      console.error(`Error scraping ${gender} team rankings:`, error);
    }
  }

  return rankings;
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

  // Fallback to HTML scraping
  const url = `https://www.cricbuzz.com/cricket-series/${cleanSeriesId}`;

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
