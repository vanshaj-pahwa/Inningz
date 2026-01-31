'use client';

interface PreviousInning {
  teamName?: string;
  teamShortName?: string;
  teamFlagUrl?: string;
  score?: string;
}

interface WinProbabilityProps {
  score: string;
  currentRunRate: string;
  requiredRunRate: string;
  previousInnings: PreviousInning[];
  status: string;
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

// Logistic sigmoid: maps any real number to 0-1
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

  // Terminal states
  if (runsNeeded <= 0) return 98;
  if (wicketsInHand <= 0) return 2;
  if (ballsRemaining <= 0) return 2;

  // Required run rate for remaining overs
  const rrr = runsNeeded / oversRemaining;

  // --- Factor 1: Run rate difficulty ---
  // Compare RRR against realistic scoring benchmarks
  // T20 average ~8.5 rpo, max sustainable ~12-14
  // A RRR of 6 is easy, 10 is moderate, 15 is very hard, 20+ is nearly impossible
  const rateScore = -0.35 * (rrr - 8);  // centered at 8 rpo as neutral

  // --- Factor 2: Wickets in hand ---
  // Losing wickets exponentially hurts — going from 4 to 2 wickets is worse than 8 to 6
  const wktScore = (wicketsInHand - 4) * 0.45;

  // --- Factor 3: Runs per ball needed ---
  // Direct measure: how many runs needed per remaining ball
  const runsPerBall = runsNeeded / ballsRemaining;
  // Average T20 is ~1.3 rpb, >2 is very hard, >3 is nearly impossible
  const rpbScore = -2.5 * (runsPerBall - 1.3);

  // --- Factor 4: Match phase pressure ---
  // In death overs with many runs needed, probability drops sharply
  const progressFraction = oversDecimal / maxOvers;
  const phaseScore = progressFraction > 0.75 ? -0.5 * (progressFraction - 0.75) * 4 : 0;

  // Combine with logistic function
  const logit = rateScore * 0.35 + wktScore * 0.25 + rpbScore * 0.30 + phaseScore * 0.10;
  const raw = sigmoid(logit) * 100;

  return Math.max(2, Math.min(98, Math.round(raw)));
}

function getBarColor(probability: number): string {
  if (probability >= 65) return 'bg-emerald-500';
  if (probability >= 50) return 'bg-yellow-500';
  if (probability >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

function getTextColor(probability: number): string {
  if (probability >= 65) return 'text-emerald-400';
  if (probability >= 50) return 'text-yellow-400';
  if (probability >= 30) return 'text-orange-400';
  return 'text-red-400';
}

export default function WinProbability({ score, currentRunRate, requiredRunRate, previousInnings, status }: WinProbabilityProps) {
  // Don't show for completed matches
  const statusLower = status.toLowerCase();
  if (statusLower.includes('won') || statusLower.includes('complete') || statusLower.includes('drawn') || statusLower.includes('tied') || statusLower.includes('no result')) {
    return null;
  }

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

  const battingProb = computeWinProbability(
    current.runs,
    current.wickets,
    current.overs,
    maxOvers,
    target,
  );
  const bowlingProb = 100 - battingProb;

  const bowlingTeam = targetInning.teamShortName || targetInning.teamName || 'Bowling';
  const scoreTeamMatch = score.match(/^([A-Za-z\s]+?)\s+\d+\//);
  const battingTeam = scoreTeamMatch ? scoreTeamMatch[1].trim() : 'Batting';

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30">
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Win Probability
          </span>
        </div>

        {/* Team labels + percentages */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${getTextColor(battingProb)}`}>
              {battingTeam}
            </span>
            <span className={`text-sm font-display font-bold tabular-nums ${getTextColor(battingProb)}`}>
              {battingProb}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-display font-bold tabular-nums ${getTextColor(bowlingProb)}`}>
              {bowlingProb}%
            </span>
            <span className={`text-xs font-bold ${getTextColor(bowlingProb)}`}>
              {bowlingTeam}
            </span>
          </div>
        </div>

        {/* Probability bar */}
        <div className="flex h-2 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`${getBarColor(battingProb)} transition-all duration-700 ease-out rounded-l-full`}
            style={{ width: `${battingProb}%` }}
          />
          <div
            className={`${getBarColor(bowlingProb)} transition-all duration-700 ease-out rounded-r-full`}
            style={{ width: `${bowlingProb}%` }}
          />
        </div>
      </div>
    </div>
  );
}
