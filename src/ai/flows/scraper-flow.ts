

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
  })).describe('The current batsmen.'),
  bowlers: z.array(z.object({
    name: z.string(),
    overs: z.string(),
    maidens: z.string(),
    runs: z.string(),
    wickets: z.string(),
    economy: z.string(),
    onStrike: z.boolean(),
  })).describe('The current bowlers.'),
  commentary: z.array(CommentarySchema).describe('The latest commentary, including live and user comments.'),
  previousInnings: z.array(z.object({
    teamName: z.string(),
    score: z.string(),
  })).describe('The scores of the previous innings.'),
  currentRunRate: z.string(),
  partnership: z.string(),
  lastWicket: z.string(),
  recentOvers: z.string(),
  toss: z.string(),
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
});


const FullScorecardSchema = z.object({
  title: z.string(),
  status: z.string(),
  innings: z.array(FullScorecardInningsSchema),
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
  odi: z.string(),
  t20: z.string(),
});

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


const PlayerProfileSchema = z.object({
  info: PlayerProfileInfoSchema,
  bio: z.string(),
  rankings: z.object({
    batting: PlayerRankingSchema,
    bowling: PlayerRankingSchema,
  }),
  battingStats: z.array(PlayerStatsSchema),
  bowlingStats: z.array(PlayerBowlingStatsSchema),
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

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
export type FullScorecard = z.infer<typeof FullScorecardSchema>;
export type LiveMatch = z.infer<typeof LiveMatchSchema>;
export type NewsItem = z.infer<typeof NewsItemSchema>;
export type PlayerRankings = z.infer<typeof PlayerRankingsSchema>;
export type TeamRankings = z.infer<typeof TeamRankingsSchema>;
export type MatchStats = z.infer<typeof MatchStatsSchema>;

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


export async function getPlayerProfile(profileId: string): Promise<PlayerProfile> {
  const url = `https://www.cricbuzz.com/profiles/${profileId}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
  });
  if (!response.ok) throw new Error(`Failed to fetch player profile: ${response.statusText}`);
  const html = await response.text();
  const $ = cheerio.load(html);

  const infoContainer = $('div.cb-col.cb-col-100.cb-bg-white');
  const name = infoContainer.find('h1.cb-font-40').text().trim();
  const country = infoContainer.find('h3.cb-font-18.text-gray').text().trim();

  let imageUrl = '';
  const src = infoContainer.find('img').attr('src');
  if (src) {
    if (src.startsWith('http')) {
      imageUrl = src;
    } else {
      imageUrl = `https://www.cricbuzz.com${src}`;
    }
  }


  const personalInfoContainer = $('div.cb-col.cb-col-33.text-black');
  const getPersonalInfo = (label: string) => {
    const text = personalInfoContainer.find(`.cb-col-40:contains("${label}")`).next().text().trim();
    return text || '--';
  };

  const personal = {
    born: getPersonalInfo('Born'),
    birthPlace: getPersonalInfo('Birth Place'),
    height: getPersonalInfo('Height'),
    role: getPersonalInfo('Role'),
    battingStyle: getPersonalInfo('Batting Style'),
    bowlingStyle: getPersonalInfo('Bowling Style'),
  };

  const teams = getPersonalInfo('Teams');

  const getRankings = (type: 'Batting' | 'Bowling'): z.infer<typeof PlayerRankingSchema> => {
    const rankLabelDiv = $(`div.cb-col.cb-col-25.cb-plyr-rank.text-bold:contains("${type}")`);
    const testRank = rankLabelDiv.next().text().trim() || '--';
    const odiRank = rankLabelDiv.next().next().text().trim() || '--';
    const t20Rank = rankLabelDiv.next().next().next().text().trim() || '--';

    return {
      test: testRank,
      odi: odiRank,
      t20: t20Rank,
    };
  };

  const battingRankings = getRankings('Batting');
  const bowlingRankings = getRankings('Bowling');

  // Get bio from the Overview section
  const bio = $('.cb-player-description').html() || $('.cb-col-100.cb-col.cb-player-bio').html() || '';

  const battingStats: z.infer<typeof PlayerStatsSchema>[] = [];
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

  const bowlingStats: z.infer<typeof PlayerBowlingStatsSchema>[] = [];
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

  return PlayerProfileSchema.parse({
    info: { name, country, imageUrl, personal, teams },
    bio,
    rankings: { batting: battingRankings, bowling: bowlingRankings },
    battingStats,
    bowlingStats,
  });
}


export async function getFullScorecard(matchId: string): Promise<FullScorecard> {
  const url = `https://www.cricbuzz.com/api/html/cricket-scorecard/${matchId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch scorecard: ${response.statusText}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $('h1').text().split(' - ')[0] || '';
  const status = $('.cb-scrcrd-status').text();
  const innings: FullScorecard['innings'] = [];

  const teamNames = title.split(' vs ').map(t => t.split(' Innings')[0].trim());
  const team1 = teamNames[0];
  const team2 = teamNames.length > 1 ? teamNames[1] : '';

  $('div[id^="innings_"]').each((_, inningsEl) => {
    const $innings = $(inningsEl);
    const name = $innings.find('.cb-scrd-hdr-rw > span:first-child').text();
    const score = $innings.find('.cb-scrd-hdr-rw > span.pull-right').text();

    let battingTeamName = '';
    if (name.toLowerCase().includes(team1.toLowerCase())) {
      battingTeamName = team1;
    } else if (team2 && name.toLowerCase().includes(team2.toLowerCase())) {
      battingTeamName = team2;
    }

    const bowlingTeamName = team1 === battingTeamName ? team2 : team1;


    const batsmen: z.infer<typeof FullScorecardBatsmanSchema>[] = [];
    $innings.find('.cb-scrd-itms').each((_, el) => {
      const $playerRow = $(el);
      const playerLink = $playerRow.find('a');
      const playerName = playerLink.text().replace(/►/g, '').trim();
      if (!playerName || playerName.includes('Extras') || playerName.includes('Total')) return;

      const profileId = extractProfileId(playerLink.attr('href'));
      const dismissal = $playerRow.find('.cb-col-33').text().replace(/►/g, '').trim();
      const runs = $playerRow.find('.cb-col-8').eq(0).text().trim();
      const balls = $playerRow.find('.cb-col-8').eq(1).text().trim();
      const fours = $playerRow.find('.cb-col-8').eq(2).text().trim();
      const sixes = $playerRow.find('.cb-col-8').eq(3).text().trim();
      const strikeRate = $playerRow.find('.cb-col-8').eq(4).text().trim();

      batsmen.push({ name: playerName, dismissal, runs, balls, fours, sixes, strikeRate, profileId });
    });

    const extrasText = $innings.find('.cb-scrd-itms:contains("Extras")').find('.cb-col-8').text().trim();
    const extrasDetails = $innings.find('.cb-scrd-itms:contains("Extras")').find('.cb-col-32').text().trim();
    const extras = `${extrasText} ${extrasDetails}`;

    const totalText = $innings.find('.cb-scrd-itms:contains("Total")').find('.cb-col-8').text().trim();
    const totalDetails = $innings.find('.cb-scrd-itms:contains("Total")').find('.cb-col-32').text().trim();
    const total = `${totalText} ${totalDetails}`;

    const yetToBat = $innings.find('.cb-scrd-itms:contains("Yet to Bat") .cb-col-73 a').map((_, el) => $(el).text()).get();

    const fow: z.infer<typeof FullScorecardFowSchema>[] = [];
    $innings.find('.cb-col-rt.cb-font-13 span').each((_, el) => {
      const text = $(el).text().trim().replace(/[()]/g, '');
      const parts = text.split(/\s+/);
      if (parts.length >= 3) {
        const score = parts[0];
        const player = parts.slice(1, -1).join(' ');
        const over = parts[parts.length - 1];
        fow.push({ score, player, over });
      }
    });

    const bowlers: z.infer<typeof FullScorecardBowlerSchema>[] = [];
    $innings.find('.cb-ltst-wgt-hdr').last().find('.cb-scrd-itms').each((_, el) => {
      const $bowlerRow = $(el);
      const playerLink = $bowlerRow.find('a');
      const name = playerLink.text().replace(/►/g, '').trim();
      if (!name) return;

      const profileId = extractProfileId(playerLink.attr('href'));
      const overs = $bowlerRow.find('.cb-col-8').eq(0).text().trim();
      const maidens = $bowlerRow.find('.cb-col-8').eq(1).text().trim();
      const runs = $bowlerRow.find('.cb-col-10').eq(0).text().trim();
      const wickets = $bowlerRow.find('.cb-col-8').eq(2).text().trim();
      const noBalls = $bowlerRow.find('.cb-col-8').eq(3).text().trim();
      const wides = $bowlerRow.find('.cb-col-8').eq(4).text().trim();
      const economy = $bowlerRow.find('.cb-col-10').eq(1).text().trim();

      bowlers.push({ name, overs, maidens, runs, wickets, noBalls, wides, economy, profileId });
    });

    innings.push({
      name,
      score,
      battingTeamName,
      bowlingTeamName,
      batsmen,
      extras,
      total,
      yetToBat,
      fallOfWickets: fow,
      bowlers,
    });
  });

  return FullScorecardSchema.parse({ title, status, innings });
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

  $('div.cb-col.cb-col-100.cb-plyr-tbody.cb-rank-hdr.cb-lv-main').each((_, categoryEl) => {
    const $category = $(categoryEl);
    const ngShow = $category.attr('ng-show');
    const matchType = getMatchTypeFromNgShow(ngShow);

    $category.find('div.cb-mtch-lst.cb-col.cb-col-100.cb-tms-itm').each((index, element) => {
      const matchContainer = $(element);
      const linkElement = matchContainer.find('h3.cb-lv-scr-mtch-hdr a');

      if (linkElement.length) {
        const href = linkElement.attr('href');
        if (!href) return;

        const matchId = extractMatchId(href);
        if (!matchId || upcomingMatches.some(m => m.matchId === matchId)) return;

        const title = linkElement.attr('title') || 'Untitled Match';
        const teamNames = title.split(' vs ');

        const teams: { name: string, score?: string }[] = teamNames.map(name => ({ name: name.trim() }));

        const statusText = matchContainer.find('.text-gray').first().text().trim().replace(/\s+/g, ' ');
        const venueText = matchContainer.find('.text-gray').last().text().trim();
        const status = `${statusText} at ${venueText}`;

        if (teams.length > 0) {
          upcomingMatches.push({
            title: linkElement.text().replace(',', ''),
            url: href,
            matchId,
            teams,
            status: status || 'Status not available',
            matchType
          });
        }
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

  $('div.cb-col.cb-col-100.cb-plyr-tbody.cb-rank-hdr.cb-lv-main').each((_, categoryEl) => {
    const $category = $(categoryEl);
    const ngShow = $category.attr('ng-show');
    const matchType = getMatchTypeFromNgShow(ngShow);

    $category.find('div.cb-mtch-lst.cb-col.cb-col-100.cb-tms-itm').each((index, element) => {
      const matchContainer = $(element);
      const linkElement = matchContainer.find('a.cb-lv-scrs-well-complete');

      if (linkElement.length) {
        const href = linkElement.attr('href');
        if (!href) return;

        let correctedHref = href;
        if (href.startsWith('/live-cricket-scores/')) {
          correctedHref = href.replace('/live-cricket-scores/', '/cricket-scores/');
        }

        const matchId = extractMatchId(correctedHref);
        if (!matchId || recentMatches.some(m => m.matchId === matchId)) return;

        const title = matchContainer.find('h3.cb-lv-scr-mtch-hdr a').attr('title') || 'Untitled Match';

        const teams: { name: string, score?: string }[] = [];
        linkElement.find('.cb-hmscg-bat-txt, .cb-hmscg-bwl-txt').each((i, teamEl) => {
          const teamName = $(teamEl).find('.cb-hmscg-tm-nm').text().trim();
          const teamScore = $(teamEl).find('div').last().text().trim();
          if (teamName) {
            teams.push({ name: teamName, score: teamScore || undefined });
          }
        });

        const status = linkElement.find('.cb-text-complete').text().trim();

        if (teams.length > 0) {
          recentMatches.push({
            title,
            url: correctedHref,
            matchId,
            teams,
            status: status || 'Status not available',
            matchType,
          });
        }
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

  if (liveMatches.length === 0) {
    $('a[href^="/live-cricket-scores/"]').each((index, element) => {
      const a = $(element);
      const href = a.attr('href');
      if (!href) return;

      const matchId = extractMatchId(href);
      if (!matchId) return;
      if (liveMatches.some(m => m.matchId === matchId)) return;

      const title = a.attr('title') ?? a.find('.cb-mtch-crd-hdr').attr('title') ?? 'Untitled Match';
      const status = a.find('.cb-mtch-crd-state').text().trim();

      const teams: { name: string, score?: string }[] = [];
      a.find('.cb-hmscg-tm-nm').each((i, el) => {
        const teamName = $(el).text().trim();
        if (teamName) {
          const scoreEl = $(el).next();
          const score = scoreEl.text().trim();
          teams.push({ name: teamName, score: score || undefined });
        }
      });
      if (teams.length === 0) {
        a.find('.cb-col-50.cb-ovr-flo.cb-hmscg-tm-name').each((i, el) => {
          const teamName = $(el).find('span').attr('title');
          if (teamName) {
            const score = $(el).next().text().trim();
            teams.push({ name: teamName, score: score || undefined });
          }
        });
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

export async function getScoreForMatchId(
  matchId: string
): Promise<ScrapeCricbuzzUrlOutput> {
  if (!matchId) {
    throw new Error('Could not extract match ID from the URL.');
  }

  const apiUrl = `https://www.cricbuzz.com/api/cricket-match/commentary/${matchId}`;

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch API: ${response.statusText}`);
  }

  const data = await response.json();

  const { matchHeader, miniscore, commentaryList } = data;

  const title = matchHeader ? `${matchHeader.team1.name} vs ${matchHeader.team2.name}, ${matchHeader.matchDescription}` : 'Match';
  const status = matchHeader ? matchHeader.status : 'Status not available';

  const batTeamId = miniscore?.batTeam?.teamId;
  const battingTeam = batTeamId && matchHeader ? (matchHeader.team1.id === batTeamId ? matchHeader.team1 : matchHeader.team2) : null;
  const formattedOvers = formatOvers(miniscore?.overs);
  const score = battingTeam && miniscore ? `${battingTeam?.shortName} ${miniscore.batTeam.teamScore ?? 0}/${miniscore.batTeam.teamWkts ?? 0} (${formattedOvers} ov)` : 'N/A';

  const batsmen: { name: string; runs: string; balls: string, onStrike: boolean, strikeRate: string, fours: string, sixes: string }[] = [];
  if (miniscore?.batsmanStriker?.batName) {
    batsmen.push({
      name: miniscore.batsmanStriker.batName,
      runs: String(miniscore.batsmanStriker.batRuns ?? 0),
      balls: String(miniscore.batsmanStriker.batBalls ?? 0),
      onStrike: true,
      strikeRate: String(miniscore.batsmanStriker.batStrikeRate ?? 0),
      fours: String(miniscore.batsmanStriker.batFours ?? 0),
      sixes: String(miniscore.batsmanStriker.batSixes ?? 0),
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
    });
  }

  const bowlers: { name: string; overs: string; maidens: string, runs: string, wickets: string, economy: string, onStrike: boolean }[] = [];
  if (miniscore?.bowlerStriker?.bowlName) {
    bowlers.push({
      name: miniscore.bowlerStriker.bowlName,
      overs: String(miniscore.bowlerStriker.bowlOvs ?? 0),
      maidens: String(miniscore.bowlerStriker.bowlMaidens ?? 0),
      runs: String(miniscore.bowlerStriker.bowlRuns ?? 0),
      wickets: String(miniscore.bowlerStriker.bowlWkts ?? 0),
      economy: String(miniscore.bowlerStriker.bowlEcon ?? 0),
      onStrike: true,
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
        const overNumber = parseFloat(c.overNumber);
        const wholeOver = Math.floor(overNumber);
        const ballNumber = Math.round((overNumber - wholeOver) * 10);
        if (ballNumber === 6) {
          overNumberStr = `${wholeOver + 1}.0`;
        } else {
          overNumberStr = c.overNumber;
        }
      }


      if (c.ballNbr > 0 && overNumberStr) {
        return {
          type: 'live',
          text: `${overNumberStr}: ${commText}`,
          event: c.event,
          runs: c.runs,
          milestone,
        };
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
    .map((inn: any) => ({
      teamName: inn.batTeamName,
      score: `${inn.score}/${inn.wickets}`,
    })) ?? [];

  const partnership = miniscore?.partnerShip ? `${miniscore.partnerShip.runs}(${miniscore.partnerShip.balls})` : "N/A";
  const lastWicket = miniscore?.lastWicket ?? "N/A";
  const recentOvers = miniscore?.recentOvsStats ?? "N/A";
  const toss = matchHeader?.tossResults?.tossWinnerName ? `${matchHeader.tossResults.tossWinnerName} won the toss and elected to ${matchHeader.tossResults.decision}` : "N/A";

  const result = {
    title,
    status,
    score,
    batsmen,
    bowlers,
    commentary,
    previousInnings,
    currentRunRate: String(miniscore?.currentRunRate ?? 0),
    partnership,
    lastWicket,
    recentOvers,
    toss,
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
            console.log(`Trying: ${url}`);
            response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              },
            });

            if (response.ok) {
              html = await response.text();
              console.log(`Success: ${url}`);
              break;
            }
          } catch (e) {
            console.log(`Error with ${url}:`, e);
          }
        }

        if (!html) {
          console.log(`All URLs failed for ${gender} ${category}`);
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
            console.log(`No specific section found for ${category} ${format}, trying general extraction`);

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

          console.log(`Found ${players.length} players for ${gender} ${category} ${format}`);

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
          console.log(`Trying team rankings: ${url}`);
          response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
          });

          if (response.ok) {
            html = await response.text();
            console.log(`Success: ${url}`);
            break;
          }
        } catch (e) {
          console.log(`Error with ${url}:`, e);
        }
      }

      if (!html) {
        console.log(`All URLs failed for ${gender} team rankings`);
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
          console.log(`No specific section found for ${format}, trying general extraction`);

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

        console.log(`Found ${teams.length} teams for ${gender} ${format}`);
        rankings[gender as keyof TeamRankings][format as keyof TeamRankings['men']] = teams.slice(0, 20);
      }
    } catch (error) {
      console.error(`Error scraping ${gender} team rankings:`, error);
    }
  }

  return rankings;
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