'use client';

interface PreviousInning {
  teamName?: string;
  teamShortName?: string;
  teamFlagUrl?: string;
  score?: string;
}

interface ScrapedWinProbability {
  team1: { name: string; probability: number };
  team2: { name: string; probability: number };
}

interface WinProbabilityProps {
  score: string;
  currentRunRate: string;
  requiredRunRate: string;
  previousInnings: PreviousInning[];
  status: string;
  scrapedProbability?: ScrapedWinProbability;
}

function parseScoreString(score: string): { runs: number; wickets: number; overs: number } | null {
  if (!score) return null;
  const runsWkts = score.match(/(\d+)\/(\d+)/);
  if (!runsWkts) return null;
  const runs = parseInt(runsWkts[1], 10);
  const wickets = parseInt(runsWkts[2], 10);
  const oversMatch = score.match(/\(([^)]+)\s*[Oo]v\)/);
  const overs = oversMatch ? parseFloat(oversMatch[1]) : 0;
  return { runs, wickets, overs };
}

function oversToDecimal(overs: number): number {
  const full = Math.floor(overs);
  const balls = Math.round((overs - full) * 10);
  return full + balls / 6;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function computeWinProbability(
  currentRuns: number,
  wicketsLost: number,
  oversBowled: number,
  maxOvers: number,
  target: number,
): number {
  const runsNeeded = target - currentRuns;
  const wicketsInHand = 10 - wicketsLost;
  const oversDecimal = oversToDecimal(oversBowled);
  const oversRemaining = maxOvers - oversDecimal;
  const ballsRemaining = Math.max(oversRemaining * 6, 0);

  if (runsNeeded <= 0) return 98;
  if (wicketsInHand <= 0) return 2;
  if (ballsRemaining <= 0) return 2;

  const rrr = runsNeeded / oversRemaining;
  const rateScore = -0.35 * (rrr - 8);
  const wktScore = (wicketsInHand - 4) * 0.45;
  const runsPerBall = runsNeeded / ballsRemaining;
  const rpbScore = -2.5 * (runsPerBall - 1.3);
  const progressFraction = oversDecimal / maxOvers;
  const phaseScore = progressFraction > 0.75 ? -0.5 * (progressFraction - 0.75) * 4 : 0;

  const logit = rateScore * 0.35 + wktScore * 0.25 + rpbScore * 0.30 + phaseScore * 0.10;
  const raw = sigmoid(logit) * 100;

  return Math.max(2, Math.min(98, Math.round(raw)));
}

export default function WinProbability({ score, currentRunRate, requiredRunRate, previousInnings, status, scrapedProbability }: WinProbabilityProps) {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('won') || statusLower.includes('complete') || statusLower.includes('drawn') || statusLower.includes('tied') || statusLower.includes('no result')) {
    return null;
  }

  let battingProb: number;
  let bowlingProb: number;
  let battingTeam: string;
  let bowlingTeam: string;

  if (scrapedProbability) {
    const scoreTeamMatch = score.match(/^([A-Za-z\s]+?)\s+\d+\//);
    const currentBattingTeam = scoreTeamMatch ? scoreTeamMatch[1].trim().toLowerCase() : '';

    const team1Lower = scrapedProbability.team1.name.toLowerCase();
    const team2Lower = scrapedProbability.team2.name.toLowerCase();

    if (currentBattingTeam.includes(team1Lower) || team1Lower.includes(currentBattingTeam)) {
      battingTeam = scrapedProbability.team1.name;
      battingProb = scrapedProbability.team1.probability;
      bowlingTeam = scrapedProbability.team2.name;
      bowlingProb = scrapedProbability.team2.probability;
    } else {
      battingTeam = scrapedProbability.team2.name;
      battingProb = scrapedProbability.team2.probability;
      bowlingTeam = scrapedProbability.team1.name;
      bowlingProb = scrapedProbability.team1.probability;
    }
  } else {
    const current = parseScoreString(score);
    if (!current) return null;

    const targetInning = previousInnings[0];
    if (!targetInning || !targetInning.score) return null;
    const targetParsed = parseScoreString(targetInning.score);
    if (!targetParsed) return null;

    const target = targetParsed.runs + 1;

    let maxOvers = targetParsed.overs > 0 ? oversToDecimal(targetParsed.overs) : 0;
    if (maxOvers <= 0) {
      maxOvers = current.overs > 20 ? 50 : 20;
    }
    if (maxOvers > 20 && maxOvers <= 50) maxOvers = 50;
    else if (maxOvers <= 20) maxOvers = 20;

    battingProb = computeWinProbability(
      current.runs,
      current.wickets,
      current.overs,
      maxOvers,
      target,
    );
    bowlingProb = 100 - battingProb;

    bowlingTeam = targetInning.teamShortName || targetInning.teamName || 'Bowling';
    const scoreTeamMatch = score.match(/^([A-Za-z\s]+?)\s+\d+\//);
    battingTeam = scoreTeamMatch ? scoreTeamMatch[1].trim() : 'Batting';
  }

  // Determine leader - leading team gets green
  const battingIsLeader = battingProb >= bowlingProb;

  return (
    <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 px-3 py-2.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Win Probability
        </span>
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between mb-2">
        {/* Team 1 (Batting) */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase ${battingIsLeader ? 'text-emerald-400' : 'text-rose-400'}`}>
            {battingTeam}
          </span>
          <span className={`text-lg font-display font-black tabular-nums ${battingIsLeader ? 'text-emerald-400' : 'text-rose-400'}`}>
            {battingProb}%
          </span>
        </div>

        {/* Team 2 (Bowling) */}
        <div className="flex items-center gap-2">
          <span className={`text-lg font-display font-black tabular-nums ${!battingIsLeader ? 'text-emerald-400' : 'text-rose-400'}`}>
            {bowlingProb}%
          </span>
          <span className={`text-xs font-bold uppercase ${!battingIsLeader ? 'text-emerald-400' : 'text-rose-400'}`}>
            {bowlingTeam}
          </span>
        </div>
      </div>

      {/* Probability bar */}
      <div className="relative h-1.5 rounded-full overflow-hidden bg-zinc-800">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${battingIsLeader ? 'bg-emerald-500' : 'bg-rose-500'}`}
          style={{ width: `${battingProb}%` }}
        />
        <div
          className={`absolute inset-y-0 right-0 transition-all duration-500 ${!battingIsLeader ? 'bg-emerald-500' : 'bg-rose-500'}`}
          style={{ width: `${bowlingProb}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-zinc-900 z-10"
          style={{ left: `${battingProb}%` }}
        />
      </div>
    </div>
  );
}
