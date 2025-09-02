
'use server';

import { 
  getScoreForMatchId as getScoreForMatchIdFlow,
  scrapeLiveMatches as scrapeLiveMatchesFlow,
  scrapeRecentMatches as scrapeRecentMatchesFlow,
  scrapeUpcomingMatches as scrapeUpcomingMatchesFlow,
  getFullScorecard as getFullScorecardFlow,
  getPlayerProfile as getPlayerProfileFlow,
  scrapeCricketNews as scrapeCricketNewsFlow,
  getNewsContent as getNewsContentFlow,
  scrapePlayerRankings as scrapePlayerRankingsFlow,
  scrapeTeamRankings as scrapeTeamRankingsFlow,
  scrapeMatchStats as scrapeMatchStatsFlow,
  type ScrapeCricbuzzUrlOutput as ScrapeFlowOutput,
  type Commentary as CommentaryType,
  type LiveMatch as LiveMatchType,
  type FullScorecard as FullScorecardType,
  type PlayerProfile as PlayerProfileType,
  type NewsItem,
  type PlayerRankings,
  type TeamRankings,
  type MatchStats,
} from '@/ai/flows/scraper-flow';

export type ScrapeCricbuzzUrlOutput = ScrapeFlowOutput;
export type Commentary = CommentaryType;
export type LiveMatch = LiveMatchType;
export type FullScorecard = FullScorecardType;
export type PlayerProfile = PlayerProfileType;
export type { NewsItem, PlayerRankings, TeamRankings, MatchStats };

interface ScrapeState {
  success: boolean;
  data?: ScrapeCricbuzzUrlOutput | null;
  error?: string | null;
  matchId?: string | null;
}

export async function getScoreForMatchId(matchId: string): Promise<ScrapeState> {
  if (!matchId || typeof matchId !== 'string') {
    return {
      success: false,
      error: 'Invalid Match ID provided.',
    };
  }

  try {
    const result = await getScoreForMatchIdFlow(matchId);
    if (!result) {
      return {
        success: false,
        error: 'Failed to scrape the match data. No data returned.',
      };
    }
    return {
      success: true,
      data: result,
      matchId,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error(e);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function getLiveMatches(): Promise<{ success: boolean; matches?: LiveMatch[]; error?: string; }> {
    try {
        const matches = await scrapeLiveMatchesFlow();
        return { success: true, matches };
    } catch(e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getRecentMatches(): Promise<{ success: boolean; matches?: LiveMatch[]; error?: string; }> {
    try {
        const matches = await scrapeRecentMatchesFlow();
        return { success: true, matches };
    } catch(e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getUpcomingMatches(): Promise<{ success: boolean; matches?: LiveMatch[]; error?: string; }> {
    try {
        const matches = await scrapeUpcomingMatchesFlow();
        return { success: true, matches };
    } catch(e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getScorecardData(matchId: string): Promise<{ success: boolean; data?: FullScorecard; error?: string; }> {
    if (!matchId) {
        return { success: false, error: 'Invalid Match ID' };
    }
    try {
        const data = await getFullScorecardFlow(matchId);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getPlayerProfile(profileId: string): Promise<{ success: boolean; data?: PlayerProfile; error?: string }> {
    if (!profileId) {
        return { success: false, error: 'Invalid Profile ID' };
    }
    try {
        const data = await getPlayerProfileFlow(profileId);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getCricketNews(): Promise<{ success: boolean; news?: NewsItem[]; error?: string }> {
    try {
        const news = await scrapeCricketNewsFlow();
        return { success: true, news };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getPlayerRankings(): Promise<{ success: boolean; rankings?: PlayerRankings; error?: string }> {
    try {
        const rankings = await scrapePlayerRankingsFlow();
        return { success: true, rankings };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getTeamRankings(): Promise<{ success: boolean; rankings?: TeamRankings; error?: string }> {
    try {
        const rankings = await scrapeTeamRankingsFlow();
        return { success: true, rankings };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getMatchStats(matchId: string): Promise<{ success: boolean; stats?: MatchStats; error?: string }> {
    if (!matchId) {
        return { success: false, error: 'Invalid Match ID' };
    }
    try {
        const stats = await scrapeMatchStatsFlow(matchId);
        return { success: true, stats };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getNewsContent(newsUrl: string): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!newsUrl) {
        return { success: false, error: 'Invalid News URL' };
    }
    try {
        const content = await getNewsContentFlow(newsUrl);
        return { success: true, content };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}
    

    
