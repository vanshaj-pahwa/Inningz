
'use server';

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
    type ScrapeCricbuzzUrlOutput as ScrapeFlowOutput,
    type Commentary as CommentaryType,
    type LiveMatch as LiveMatchType,
    type FullScorecard as FullScorecardType,
    type PlayerProfile as PlayerProfileType,
    type MatchStats,
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
    scrapeICCRankings as scrapeICCRankingsFlow,
    type RankingsData as RankingsDataType,
    type RankingEntry as RankingEntryType,
    type AwardPlayer as AwardPlayerType,
} from '@/ai/flows/scraper-flow';

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
export type { MatchStats };

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
        const url = `https://www.cricbuzz.com/api/mcenter/commentary-pagination/${matchId}/${inningsId}/${timestamp}`;
        console.log('[loadMoreCommentary API] Fetching URL:', url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!response.ok) {
            return { success: false, error: `Failed to fetch commentary: ${response.statusText}` };
        }

        const data = await response.json();

        const commentary: Commentary[] = [];

        // The API returns an array directly
        // Filter to only include items with timestamp strictly less than requested
        if (Array.isArray(data)) {
            for (const item of data) {
                // Skip items with timestamps >= what we requested (shouldn't happen but just in case)
                if (item.timestamp && item.timestamp >= timestamp) {
                    console.log('[loadMoreCommentary API] Skipping item with timestamp', item.timestamp, '>= requested', timestamp);
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
