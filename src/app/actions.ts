
'use server';

import { unstable_cache } from 'next/cache';
import {
    getScoreForMatchId as getScoreForMatchIdFlow,
    scrapeLiveMatches as scrapeLiveMatchesFlow,
    scrapeRecentMatches as scrapeRecentMatchesFlow,
    scrapeUpcomingMatches as scrapeUpcomingMatchesFlow,
    getFullScorecard as getFullScorecardFlow,
    getPlayerProfile as getPlayerProfileFlow,
    scrapeMatchStats as scrapeMatchStatsFlow,
    scrapeSeriesMatches as scrapeSeriesMatchesFlow,
    getMatchSquads as getMatchSquadsFlow,
    scrapePlayerHighlights as scrapePlayerHighlightsFlow,
    scrapeSeriesSchedule as scrapeSeriesScheduleFlow,
    scrapeSeriesStatsTypes as scrapeSeriesStatsTypesFlow,
    scrapeSeriesStats as scrapeSeriesStatsFlow,
    scrapeSeriesPointsTable as scrapeSeriesPointsTableFlow,
    getOverByOverData as getOverByOverDataFlow,
    fetchPartnershipData as fetchPartnershipDataFlow,
    fetchBallMapData as fetchBallMapDataFlow,
    scrapeWinProbHistory as scrapeWinProbHistoryFlow,
    scrapeMatchups as scrapeMatchupsFlow,
    scrapeVenueForecast as scrapeVenueForecastFlow,
    scrapeVenue as scrapeVenueFlow,
    scrapeAllPlayersForecast as scrapeAllPlayersForecastFlow,
    type VenuePageData as VenuePageDataType,
    type MatchupsData as MatchupsDataType,
    type VenueData as VenueDataType,
    type AllPlayersData as AllPlayersDataType,
    type ForecastCard as ForecastCardType,
    type ForecastSubCard as ForecastSubCardType,
    type ForecastStat as ForecastStatType,
    type ForecastPlayer as ForecastPlayerType,
    type ForecastPlayersByRole as ForecastPlayersByRoleType,
    type ForecastPlayerBadge as ForecastPlayerBadgeType,
    type ForecastPlayerStyle as ForecastPlayerStyleType,
    type VenueRecentMatchRow as VenueRecentMatchRowType,
    type VenueHeadingContent as VenueHeadingContentType,
    type ScrapeCricbuzzUrlOutput as ScrapeFlowOutput,
    type Commentary as CommentaryType,
    type LiveMatch as LiveMatchType,
    type FullScorecard as FullScorecardType,
    type PlayerProfile as PlayerProfileType,
    type MatchStats as MatchStatsType,
    type MatchSquads as MatchSquadsType,
    type SquadPlayer as SquadPlayerType,
    type PlayerHighlights as PlayerHighlightsType,
    type CricketSeries as CricketSeriesType,
    type SeriesMatch as SeriesMatchType,
    type SeriesSchedule as SeriesScheduleType,
    type SeriesStatEntry as SeriesStatEntryType,
    type SeriesStatCategory as SeriesStatCategoryType,
    type SeriesStatsType as SeriesStatsTypeType,
    type PointsTableData as PointsTableDataType,
    type PointsTableGroup as PointsTableGroupType,
    type PointsTableTeam as PointsTableTeamType,
    type PointsTableMatch as PointsTableMatchType,
    type OverData as OverDataType,
    type InningsOverData as InningsOverDataType,
    type PartnershipEntry as PartnershipEntryType,
    type PartnershipInnings as PartnershipInningsType,
    type BallMapBall as BallMapBallType,
    type BallMapBatter as BallMapBatterType,
    type BallMapBowler as BallMapBowlerType,
    type BallMapData as BallMapDataType,
    type WinProbPoint as WinProbPointType,
    type WinProbHistory as WinProbHistoryType,
    scrapeICCRankings as scrapeICCRankingsFlow,
    scrapeICCTeamRankings as scrapeICCTeamRankingsFlow,
    scrapeCricketNews as scrapeCricketNewsFlow,
    scrapeCricketNewsArticle as scrapeCricketNewsArticleFlow,
    type RankingsData as RankingsDataType,
    type RankingEntry as RankingEntryType,
    type AwardPlayer as AwardPlayerType,
    type TeamRankingsData as TeamRankingsDataType,
    type TeamRankingEntry as TeamRankingEntryType,
    type NewsFeed as NewsFeedType,
    type NewsItem as NewsItemType,
    type NewsArticle as NewsArticleType,
    type NewsBlock as NewsBlockType,
} from '@/ai/flows/scraper-flow';

import {
    fetchStreamMatchList as fetchStreamMatchListFlow,
    fetchStreamDetail as fetchStreamDetailFlow,
    type StreamMatch as StreamMatchType,
    type StreamDetail as StreamDetailType,
    type StreamSource as StreamSourceType,
} from '@/lib/stream-fetcher';

import { UPSTREAM_BASE_URL } from '@/lib/upstream';

export type VenuePageData = VenuePageDataType;
export type ScrapeCricbuzzUrlOutput = ScrapeFlowOutput;
export type Commentary = CommentaryType;
export type LiveMatch = LiveMatchType;
export type FullScorecard = FullScorecardType;
export type PlayerProfile = PlayerProfileType;
export type MatchSquads = MatchSquadsType;
export type SquadPlayer = SquadPlayerType;
export type PlayerHighlights = PlayerHighlightsType;
export type CricketSeries = CricketSeriesType;
export type SeriesMatch = SeriesMatchType;
export type SeriesSchedule = SeriesScheduleType;
export type SeriesStatEntry = SeriesStatEntryType;
export type SeriesStatCategory = SeriesStatCategoryType;
export type SeriesStatsType = SeriesStatsTypeType;
export type PointsTableData = PointsTableDataType;
export type PointsTableGroup = PointsTableGroupType;
export type PointsTableTeam = PointsTableTeamType;
export type PointsTableMatch = PointsTableMatchType;
export type OverData = OverDataType;
export type InningsOverData = InningsOverDataType;
export type RankingsData = RankingsDataType;
export type RankingEntry = RankingEntryType;
export type AwardPlayer = AwardPlayerType;
export type PartnershipEntry = PartnershipEntryType;
export type PartnershipInnings = PartnershipInningsType;
export type BallMapBall = BallMapBallType;
export type BallMapBatter = BallMapBatterType;
export type BallMapBowler = BallMapBowlerType;
export type BallMapData = BallMapDataType;
export type WinProbPoint = WinProbPointType;
export type WinProbHistory = WinProbHistoryType;
export type MatchupsData = MatchupsDataType;
export type VenueData = VenueDataType;
export type AllPlayersData = AllPlayersDataType;
export type ForecastCard = ForecastCardType;
export type ForecastSubCard = ForecastSubCardType;
export type ForecastStat = ForecastStatType;
export type ForecastPlayer = ForecastPlayerType;
export type ForecastPlayersByRole = ForecastPlayersByRoleType;
export type ForecastPlayerBadge = ForecastPlayerBadgeType;
export type ForecastPlayerStyle = ForecastPlayerStyleType;
export type VenueRecentMatchRow = VenueRecentMatchRowType;
export type VenueHeadingContent = VenueHeadingContentType;
export type MatchStats = MatchStatsType;
export type StreamMatch = StreamMatchType;
export type StreamDetail = StreamDetailType;
export type StreamSource = StreamSourceType;
interface ScrapeState {
    success: boolean;
    data?: ScrapeCricbuzzUrlOutput | null;
    error?: string | null;
    matchId?: string | null;
}

export async function loadMoreCommentary(matchId: string, timestamp: number, inningsId: number = 1): Promise<{ success: boolean; commentary?: Commentary[]; timestamp?: number; error?: string }> {
    console.log('[loadMoreCommentary API] Called with matchId:', matchId, 'timestamp:', timestamp, 'inningsId:', inningsId);
    if (!matchId || !timestamp) {
        return { success: false, error: 'Invalid parameters' };
    }

    try {
        // Try both pagination variants. The `hcommentary-pagination` endpoint
        // serves matches that use the `hcomm` data source (The Hundred and
        // similar); the plain `commentary-pagination` serves everything else.
        // Whichever returns real data first wins.
        const variants = ['commentary-pagination', 'hcommentary-pagination'];
        let text = '';
        let usedUrl = '';
        for (const variant of variants) {
            const candidateUrl = `${UPSTREAM_BASE_URL}/api/mcenter/${variant}/${matchId}/${inningsId}/${timestamp}`;
            const response = await fetch(candidateUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });
            if (!response.ok) continue;
            const body = await response.text();
            if (!body || body.trim() === '' || body.trim() === '[]') {
                // Empty from this variant, try the next.
                continue;
            }
            text = body;
            usedUrl = candidateUrl;
            break;
        }

        // If both variants returned empty, there's genuinely no more commentary.
        if (!text) {
            return {
                success: true,
                commentary: [],
                timestamp: 0, // Signal that there's no more data
            };
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            return {
                success: true,
                commentary: [],
                timestamp: 0, // Signal that there's no more data
            };
        }

        const commentary: Commentary[] = [];

        // The API returns an array directly
        // Filter to only include items with timestamp strictly less than requested
        if (Array.isArray(data)) {
            for (const item of data) {
                // Skip items with timestamps >= what we requested (shouldn't happen but just in case)
                if (item.timestamp && item.timestamp >= timestamp) {
                    continue;
                }
                if (item.commType === 'commentary' && item.commText) {
                    // Get over number from overNumber (legacy) or ballMetric (new API format)
                    let overNumberStr = '';
                    if (item.overNumber) {
                        overNumberStr = item.overNumber.toString();
                    } else if (item.ballMetric) {
                        overNumberStr = item.ballMetric.toString();
                    }

                    // Format the commentary text with bold/italic
                    let commText = item.commText.replace(/\\n/g, '<br />');
                    if (item.commentaryFormats) {
                        const { bold, italic } = item.commentaryFormats;
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

                    // Check if this is a ball-by-ball commentary (has ballNbr > 0 OR has ballMetric)
                    if ((item.ballNbr > 0 || item.ballMetric) && overNumberStr) {
                        const comm: Commentary = {
                            type: 'live',
                            text: `${overNumberStr}: ${commText}`,
                            event: Array.isArray(item.event) ? item.event.join(',') : item.event,
                            runs: item.runs,
                        };

                        // Add over summary if this is an over-break (support both old and new API formats)
                        if (item.overSeparator) {
                            comm.overSummary = item.overSeparator.o_summary || item.overSeparator.overSummary;
                            comm.overRuns = item.overSeparator.runs;
                            comm.overNumber = item.overSeparator.overNum || item.overSeparator.overNumber;
                            comm.teamShortName = item.overSeparator.batTeamName || item.overSeparator.batTeamObj?.teamName;
                            // Parse score from batTeamObj.teamScore if available (format: "ENG 174-6")
                            if (item.overSeparator.batTeamObj?.teamScore) {
                                const scoreMatch = item.overSeparator.batTeamObj.teamScore.match(/(\d+)-(\d+)/);
                                if (scoreMatch) {
                                    comm.teamScore = parseInt(scoreMatch[1], 10);
                                    comm.teamWickets = parseInt(scoreMatch[2], 10);
                                }
                            } else {
                                comm.teamScore = item.overSeparator.score;
                                comm.teamWickets = item.overSeparator.wickets;
                            }
                            const batsmen: { name: string; score: string }[] = [];
                            const sep = item.overSeparator;
                            if (sep.batStrikerObj?.playerName) {
                                batsmen.push({ name: sep.batStrikerObj.playerName, score: sep.batStrikerObj.playerScore || '' });
                            }
                            if (sep.batNonStrikerObj?.playerName) {
                                batsmen.push({ name: sep.batNonStrikerObj.playerName, score: sep.batNonStrikerObj.playerScore || '' });
                            }
                            if (batsmen.length > 0) comm.overBatsmen = batsmen;
                            if (sep.bowlerObj?.playerName) {
                                comm.overBowler = { name: sep.bowlerObj.playerName, figures: sep.bowlerObj.playerScore || '' };
                            }
                        }

                        commentary.push(comm);
                    } else if (!overNumberStr) {
                        // No ballMetric/overNumber - it's a stat/info type commentary
                        commentary.push({
                            type: 'stat',
                            text: commText,
                        });
                    }
                } else if (item.commType === 'snippet') {
                    // Snippet cards (forecasts, insights, etc.)
                    commentary.push({
                        type: 'snippet',
                        text: item.content || '',
                        headline: item.headline || '',
                        snippetType: item.eventType || '',
                    });
                }
            }
        }

        // Get the oldest (minimum) timestamp from the data for pagination
        // Only consider timestamps that are strictly less than what we requested
        let oldestTimestamp = timestamp;
        if (Array.isArray(data) && data.length > 0) {
            const timestamps = data
                .filter((item: any) => item.timestamp && item.timestamp < timestamp)
                .map((item: any) => item.timestamp);
            console.log('[loadMoreCommentary API] Valid timestamps (< requested):', timestamps.slice(0, 5), '... total:', timestamps.length);
            if (timestamps.length > 0) {
                oldestTimestamp = Math.min(...timestamps);
                console.log('[loadMoreCommentary API] Min timestamp:', oldestTimestamp, 'Max timestamp:', Math.max(...timestamps));
            } else {
                console.log('[loadMoreCommentary API] No valid timestamps found, keeping original:', timestamp);
            }
        }

        console.log('[loadMoreCommentary API] Returning', commentary.length, 'items, oldestTimestamp:', oldestTimestamp);
        return {
            success: true,
            commentary,
            timestamp: oldestTimestamp,
        };
    } catch (e) {
        console.error('[loadMoreCommentary] Error:', e);
        return { success: false, error: e instanceof Error ? e.message : 'Failed to load commentary' };
    }
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
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getRecentMatches(): Promise<{ success: boolean; matches?: LiveMatch[]; error?: string; }> {
    try {
        const matches = await scrapeRecentMatchesFlow();
        return { success: true, matches };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getUpcomingMatches(): Promise<{ success: boolean; matches?: LiveMatch[]; error?: string; }> {
    try {
        const matches = await scrapeUpcomingMatchesFlow();
        return { success: true, matches };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getVenue(venuePath: string): Promise<{ success: boolean; data?: VenuePageData; error?: string; }> {
    try {
        const data = await scrapeVenueFlow(venuePath);
        return { success: true, data };
    } catch (e) {
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
        console.error('[getScorecardData] Error:', e);
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getPlayerProfile(profileId: string, playerName?: string): Promise<{ success: boolean; data?: PlayerProfile; error?: string }> {
    if (!profileId) {
        return { success: false, error: 'Invalid Profile ID' };
    }
    try {
        const data = await getPlayerProfileFlow(profileId, playerName);
        return { success: true, data };
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

export async function getSeriesMatches(seriesId: string): Promise<{ success: boolean; matches?: LiveMatch[]; error?: string }> {
    if (!seriesId) {
        return { success: false, error: 'Invalid Series ID' };
    }
    try {
        const matches = await scrapeSeriesMatchesFlow(seriesId);
        return { success: true, matches };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}





export async function getMatchSquads(matchId: string): Promise<{ success: boolean; squads?: MatchSquads; error?: string }> {
    if (!matchId) {
        return { success: false, error: 'Invalid Match ID' };
    }
    try {
        const squads = await getMatchSquadsFlow(matchId);
        return { success: true, squads };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getPlayerHighlights(highlightsUrl: string): Promise<{ success: boolean; data?: PlayerHighlightsType; error?: string }> {
    if (!highlightsUrl) {
        return { success: false, error: 'Invalid highlights URL' };
    }
    try {
        const data = await scrapePlayerHighlightsFlow(highlightsUrl);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getSeriesSchedule(): Promise<{ success: boolean; data?: SeriesScheduleType; error?: string }> {
    try {
        const data = await scrapeSeriesScheduleFlow();
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getSeriesStatsTypes(seriesId: string): Promise<{ success: boolean; data?: SeriesStatsTypeType; error?: string }> {
    if (!seriesId) {
        return { success: false, error: 'Invalid Series ID' };
    }
    try {
        const data = await scrapeSeriesStatsTypesFlow(seriesId);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getSeriesStats(seriesId: string, statsType: string): Promise<{ success: boolean; data?: SeriesStatCategoryType; error?: string }> {
    if (!seriesId || !statsType) {
        return { success: false, error: 'Invalid parameters' };
    }
    try {
        const data = await scrapeSeriesStatsFlow(seriesId, statsType);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getSeriesPointsTable(seriesId: string): Promise<{ success: boolean; data?: PointsTableDataType; error?: string }> {
    if (!seriesId) {
        return { success: false, error: 'Invalid Series ID' };
    }
    try {
        const data = await scrapeSeriesPointsTableFlow(seriesId);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getInningsOverData(matchId: string, inningsId: number): Promise<{ success: boolean; data?: InningsOverDataType; error?: string }> {
    if (!matchId) {
        return { success: false, error: 'Invalid Match ID' };
    }
    try {
        const data = await getOverByOverDataFlow(matchId, inningsId);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getPartnershipData(matchId: string): Promise<{ success: boolean; data?: PartnershipInningsType[]; error?: string }> {
    if (!matchId) return { success: false, error: 'Invalid Match ID' };
    try {
        const data = await fetchPartnershipDataFlow(matchId);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getBallMapData(matchId: string, inningsId: number): Promise<{ success: boolean; data?: BallMapDataType; error?: string }> {
    if (!matchId) return { success: false, error: 'Invalid Match ID' };
    try {
        const data = await fetchBallMapDataFlow(matchId, inningsId);
        if (!data) return { success: false, error: 'No ball map data available' };
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getWinProbHistory(matchId: string): Promise<{ success: boolean; data?: WinProbHistoryType; error?: string }> {
    if (!matchId) return { success: false, error: 'Invalid Match ID' };
    try {
        const data = await scrapeWinProbHistoryFlow(matchId);
        if (!data) return { success: false, error: 'No win probability data available' };
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

// These three forecast endpoints are effectively static per match once the
// match card exists, so we cache them aggressively via the Next
// data cache keyed by matchId.
const getMatchupsCached = (matchId: string) => unstable_cache(
    async () => {
        const data = await scrapeMatchupsFlow(matchId);
        if (!data) throw new Error('No matchup data available');
        return data;
    },
    ['matchups', matchId],
    { tags: [`matchups-${matchId}`], revalidate: 86400 },
)();

const getVenueForecastCached = (matchId: string) => unstable_cache(
    async () => {
        const data = await scrapeVenueForecastFlow(matchId);
        if (!data) throw new Error('No venue data available');
        return data;
    },
    ['venue-forecast', matchId],
    { tags: [`venue-forecast-${matchId}`], revalidate: 86400 },
)();

const getAllPlayersForecastCached = (matchId: string) => unstable_cache(
    async () => {
        const data = await scrapeAllPlayersForecastFlow(matchId);
        if (!data) throw new Error('No player forecast data available');
        return data;
    },
    ['all-players-forecast', matchId],
    { tags: [`all-players-forecast-${matchId}`], revalidate: 86400 },
)();

export async function getMatchups(matchId: string): Promise<{ success: boolean; data?: MatchupsDataType; error?: string }> {
    if (!matchId) return { success: false, error: 'Invalid Match ID' };
    try {
        const data = await getMatchupsCached(matchId);
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred.' };
    }
}

export async function getVenueForecast(matchId: string): Promise<{ success: boolean; data?: VenueDataType; error?: string }> {
    if (!matchId) return { success: false, error: 'Invalid Match ID' };
    try {
        const data = await getVenueForecastCached(matchId);
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred.' };
    }
}

export async function getAllPlayersForecast(matchId: string): Promise<{ success: boolean; data?: AllPlayersDataType; error?: string }> {
    if (!matchId) return { success: false, error: 'Invalid Match ID' };
    try {
        const data = await getAllPlayersForecastCached(matchId);
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred.' };
    }
}

export async function getICCRankings(
    format: 'test' | 'odi' | 't20',
    category: 'batting' | 'bowling' | 'all-rounder'
): Promise<{ success: boolean; data?: RankingsDataType; error?: string }> {
    try {
        const data = await scrapeICCRankingsFlow(format, category);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export type TeamRankingsData = TeamRankingsDataType;
export type TeamRankingEntry = TeamRankingEntryType;

export async function getICCTeamRankings(
    format: 'test' | 'odi' | 't20'
): Promise<{ success: boolean; data?: TeamRankingsDataType; error?: string }> {
    try {
        const data = await scrapeICCTeamRankingsFlow(format);
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export type NewsFeed = NewsFeedType;
export type NewsItem = NewsItemType;
export type NewsArticle = NewsArticleType;
export type NewsBlock = NewsBlockType;

// Cache the feed for 5 minutes — the news list only refreshes a few times an
// hour, and this keeps us well under the source's rate expectations.
const getCricketNewsCached = unstable_cache(
    async () => scrapeCricketNewsFlow(),
    ['cricket-news:v1'],
    { revalidate: 300, tags: ['cricket-news'] }
);

export async function getCricketNews(): Promise<{ success: boolean; data?: NewsFeedType; error?: string }> {
    try {
        const data = await getCricketNewsCached();
        // Fire-and-forget: warm the article cache for the top 10 stories so
        // the reader's first click opens sub-500ms instead of waiting on the
        // upstream fetch + parse. Failures are swallowed — we're just filling
        // the cache, and the list page has already returned to the caller.
        if (data?.items?.length) {
            const topTen = data.items.slice(0, 10).filter(i => i.slug);
            Promise.allSettled(topTen.map(item =>
                getCricketNewsArticleCached(item.id, item.slug)()
            )).catch(() => {});
        }
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

// Article bodies rarely change once published — cache aggressively (1 hour)
// so revisiting a story is instant. Keyed by id+slug so the cache doesn't
// collide between different variants of the same article URL.
const getCricketNewsArticleCached = (id: string, slug: string) => unstable_cache(
    async () => scrapeCricketNewsArticleFlow(id, slug),
    ['cricket-news-article:v7', id, slug],
    { revalidate: 3600, tags: ['cricket-news-article', `cricket-news-article:${id}`] }
);

export async function getCricketNewsArticle(id: string, slug: string): Promise<{ success: boolean; data?: NewsArticleType; error?: string }> {
    try {
        const data = await getCricketNewsArticleCached(id, slug)();
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

// Fetch the current Most Read list by piggy-backing on any recent article
// page (the widget is global, not per-story). Cached separately so the /news
// list can display real popularity data without waiting for a story fetch.
const getCricketNewsMostReadCached = unstable_cache(
    async () => {
        const feed = await scrapeCricketNewsFlow();
        for (const item of feed.items) {
            if (!item.slug) continue;
            try {
                const article = await scrapeCricketNewsArticleFlow(item.id, item.slug);
                if (article.mostRead.length > 0) return article.mostRead;
            } catch {
                continue;
            }
        }
        return [];
    },
    ['cricket-news-most-read:v2'],
    { revalidate: 600, tags: ['cricket-news', 'cricket-news-most-read'] }
);

export async function getCricketNewsMostRead(): Promise<{ success: boolean; data?: NewsArticleType['mostRead']; error?: string }> {
    try {
        const data = await getCricketNewsMostReadCached();
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getStreamMatchList(): Promise<{
    success: boolean;
    matches?: StreamMatchType[];
    error?: string;
}> {
    try {
        const matches = await fetchStreamMatchListFlow();
        return { success: true, matches };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getStreamForMatch(streamMatchId: string): Promise<{
    success: boolean;
    data?: StreamDetailType;
    error?: string;
}> {
    if (!streamMatchId) {
        return { success: false, error: 'Invalid stream match ID' };
    }
    try {
        const data = await fetchStreamDetailFlow(streamMatchId);
        if (!data) {
            return { success: false, error: 'No stream available for this match' };
        }
        return { success: true, data };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}
