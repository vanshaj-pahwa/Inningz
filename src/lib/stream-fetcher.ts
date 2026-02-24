'use server';

export interface StreamTeam {
  id: string;
  name: string;
  score: string;
  avatar: string;
  abbreviation: string;
}

export interface StreamMatchInfo {
  score: string;
  crtRunsScored: string;
  crtWicketsLost: string;
  crtOvers: string;
  crtOversExtraBalls: string;
}

export interface StreamSource {
  title: string;
  path: string;
  id: string;
  cover?: string;
}

export interface StreamMatch {
  id: string;
  team1: StreamTeam;
  team2: StreamTeam;
  status: string; // "MatchIng", "MatchEnded", "MatchNotStart"
  playPath: string;
  playSource: StreamSource[];
  league: string;
  matchRound: string;
  matchResult: string;
  startTime: string;
  teamMatchInfo1: StreamMatchInfo;
  teamMatchInfo2: StreamMatchInfo;
}

export interface StreamDetail {
  matchId: string;
  playPath: string | null;
  playSource: StreamSource[];
  team1Name: string;
  team2Name: string;
}

const STREAM_API_BASE = process.env.STREAM_API_BASE || '';
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': process.env.STREAM_ORIGIN || '',
  'Referer': process.env.STREAM_REFERER || '',
};

export async function fetchStreamMatchList(): Promise<StreamMatch[]> {
  try {
    const url = `${STREAM_API_BASE}/wefeed-h5-bff/live/match-list-v5?sportType=cricket`;
    console.log('[StreamFetcher] Fetching match list from:', url);

    const response = await fetch(url, { headers: DEFAULT_HEADERS });

    if (!response.ok) {
      console.error('[StreamFetcher] Match list fetch failed:', response.status, response.statusText);
      return [];
    }

    const json = await response.json();

    if (json.code !== 0 || !json.data?.list) {
      console.error('[StreamFetcher] Unexpected response:', json.code, json.message);
      return [];
    }

    const cricketMatches = json.data.list.filter((m: any) => m.type === 'cricket');
    console.log('[StreamFetcher] Found', cricketMatches.length, 'cricket matches');

    return cricketMatches.map((m: any) => ({
      id: m.id || '',
      team1: {
        id: m.team1?.id || '',
        name: m.team1?.name || '',
        score: m.team1?.score || '0',
        avatar: m.team1?.avatar || '',
        abbreviation: m.team1?.abbreviation || '',
      },
      team2: {
        id: m.team2?.id || '',
        name: m.team2?.name || '',
        score: m.team2?.score || '0',
        avatar: m.team2?.avatar || '',
        abbreviation: m.team2?.abbreviation || '',
      },
      status: m.status || '',
      playPath: m.playPath || '',
      playSource: (m.playSource || []).map((s: any) => ({
        title: s.title || '',
        path: s.path || '',
        id: s.id || '',
        cover: s.cover,
      })),
      league: m.league || '',
      matchRound: m.matchRound || '',
      matchResult: m.matchResult || '',
      startTime: m.startTime || '0',
      teamMatchInfo1: {
        score: m.teamMatchInfo1?.score || '0',
        crtRunsScored: m.teamMatchInfo1?.crtRunsScored || '0',
        crtWicketsLost: m.teamMatchInfo1?.crtWicketsLost || '0',
        crtOvers: m.teamMatchInfo1?.crtOvers || '0',
        crtOversExtraBalls: m.teamMatchInfo1?.crtOversExtraBalls || '0',
      },
      teamMatchInfo2: {
        score: m.teamMatchInfo2?.score || '0',
        crtRunsScored: m.teamMatchInfo2?.crtRunsScored || '0',
        crtWicketsLost: m.teamMatchInfo2?.crtWicketsLost || '0',
        crtOvers: m.teamMatchInfo2?.crtOvers || '0',
        crtOversExtraBalls: m.teamMatchInfo2?.crtOversExtraBalls || '0',
      },
    }));
  } catch (error) {
    console.error('[StreamFetcher] Error fetching match list:', error);
    return [];
  }
}

export async function fetchStreamDetail(streamMatchId: string): Promise<StreamDetail | null> {
  try {
    const url = `${STREAM_API_BASE}/wefeed-h5-bff/live/match-detail?id=${streamMatchId}`;
    console.log('[StreamFetcher] Fetching stream detail for:', streamMatchId);

    const response = await fetch(url, { headers: DEFAULT_HEADERS });

    if (!response.ok) {
      console.error('[StreamFetcher] Detail fetch failed:', response.status);
      return null;
    }

    const json = await response.json();

    if (json.code !== 0 || !json.data) {
      console.error('[StreamFetcher] Unexpected detail response:', json.code);
      return null;
    }

    const d = json.data;
    return {
      matchId: streamMatchId,
      playPath: d.playPath || null,
      playSource: (d.playSource || []).map((s: any) => ({
        title: s.title || '',
        path: s.path || '',
        id: s.id || '',
        cover: s.cover,
      })),
      team1Name: d.team1?.name || '',
      team2Name: d.team2?.name || '',
    };
  } catch (error) {
    console.error('[StreamFetcher] Error fetching detail:', error);
    return null;
  }
}
