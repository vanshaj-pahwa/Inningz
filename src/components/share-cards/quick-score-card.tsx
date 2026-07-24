'use client';

import { forwardRef } from 'react';
import { sharePalette, alpha, type ShareMode } from './share-palette';

export interface QuickScoreCardProps {
  title: string;
  score?: string;
  status: string;
  seriesName?: string;
  currentRunRate?: string;
  requiredRunRate?: string;
  previousInnings?: Array<{
    teamName?: string;
    teamShortName?: string;
    score?: string;
  }>;
  winProbability?: {
    team1: { name: string; probability: number };
    team2: { name: string; probability: number };
  };
  /** Resolved app theme; anything other than 'light' uses the dark palette. */
  mode?: ShareMode;
  /** Batting side's identity colour (matches the live hero). */
  accent?: string;
  /** Batting side's flag (an upstream static URL); proxied same-origin for capture. */
  flagUrl?: string;
  /** Per-over runs + whether a wicket fell, for the sparkline. */
  overPoints?: { runs: number; wicketFell: boolean }[];
  // Threaded to the dialog (which fetches overPoints); unused in the card render.
  matchId?: string;
  inningsId?: number;
}

function proxyFlag(url?: string): string | undefined {
  if (!url) return undefined;
  const m = url.match(/\/c(\d+)\/([a-z0-9-]+)\.jpg/i);
  return m ? `/api/team-flag?id=${m[1]}&name=${encodeURIComponent(m[2])}` : url;
}

const QuickScoreCard = forwardRef<HTMLDivElement, QuickScoreCardProps>(
  (
    { title, score, status, seriesName, currentRunRate, requiredRunRate, previousInnings, winProbability, mode = 'dark', accent, flagUrl, overPoints },
    ref
  ) => {
    const c = sharePalette(mode);
    const scoreColor = accent || c.brand;
    const isLive = status.toLowerCase().includes('live');
    const flag = proxyFlag(flagUrl);

    const scoreMatch = score?.match(/^([A-Za-z\s]+?)\s+(\d+\/\d+)/);
    const currentTeam = scoreMatch ? scoreMatch[1].trim() : '';
    const currentScore = scoreMatch ? scoreMatch[2] : score?.split('(')[0]?.trim() || score;
    const oversMatch = score?.match(/\(([^)]+)\s*[Oo]v\)/);
    const overs = oversMatch ? oversMatch[1] : '';

    // Runs-per-over sparkline geometry (viewBox units; SVG stretches to width).
    const spark = overPoints && overPoints.length >= 2 ? overPoints.slice(-20) : null;
    const SW = 900, SH = 150, SPAD = 14;
    const sx = (i: number) => (spark ? (i / (spark.length - 1)) * SW : 0);
    const sMax = spark ? Math.max(...spark.map((p) => p.runs), 6) : 6;
    const sy = (v: number) => SH - SPAD - (v / sMax) * (SH - SPAD * 2);
    const linePath = spark ? spark.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(p.runs).toFixed(1)}`).join(' ') : '';
    const areaPath = spark ? `${linePath} L${SW},${SH} L0,${SH} Z` : '';

    return (
      <div
        ref={ref}
        data-share-card
        style={{
          width: 1080,
          minHeight: 1080,
          position: 'relative',
          overflow: 'hidden',
          background: c.bg,
          fontFamily: 'var(--font-sans), "DM Sans", system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ position: 'relative', zIndex: 10, padding: 64, paddingBottom: 128 }}>
          {/* Series + Live */}
          <div style={{ marginBottom: 22 }}>
            {isLive && (
              <span style={{
                display: 'inline-block', padding: '8px 20px', borderRadius: 999,
                backgroundColor: c.danger, color: '#ffffff', fontSize: 18, fontWeight: 700,
                letterSpacing: '0.1em', marginRight: 20, verticalAlign: 'middle',
              }}>
                LIVE
              </span>
            )}
            {seriesName && (
              <span style={{ fontSize: 26, color: c.muted, fontWeight: 500, verticalAlign: 'middle' }}>
                {seriesName}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 44, fontWeight: 600, lineHeight: 1.25, color: c.text, margin: 0, marginBottom: 28,
            fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif',
          }}>
            {title}
          </h1>

          {/* Hairline divider */}
          <div style={{ height: 1, marginBottom: 28, background: c.border }} />

          {/* Previous innings */}
          {previousInnings && previousInnings.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {previousInnings.map((inning, index) => (
                <p key={index} style={{ margin: 0, marginBottom: 8, fontSize: 0 }}>
                  <span style={{ fontSize: 30, fontWeight: 600, color: c.muted, verticalAlign: 'baseline' }}>
                    {inning.teamShortName || inning.teamName}
                  </span>
                  <span style={{ fontSize: 48, fontWeight: 700, color: c.faint, fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif', marginLeft: 22, verticalAlign: 'baseline' }}>
                    {inning.score?.split('(')[0]?.trim()}
                  </span>
                </p>
              ))}
            </div>
          )}

          {/* Current team + score (flag + team-coloured serif score, overs on the baseline) */}
          <div style={{ marginBottom: 26 }}>
            {currentTeam && (
              <p style={{ fontSize: 34, fontWeight: 600, marginBottom: 12, marginTop: 0, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentTeam}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
              {flag && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={flag} alt="" style={{ width: 118, height: 84, objectFit: 'cover', borderRadius: 10, marginBottom: 14, flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 132, fontWeight: 700, color: scoreColor, fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif', lineHeight: 0.86 }}>
                {currentScore}
              </span>
              {overs && (
                <span style={{ fontSize: 36, color: c.faint, fontWeight: 500, marginBottom: 16 }}>
                  ({overs} ov)
                </span>
              )}
            </div>
          </div>

          {/* Run rates */}
          {(currentRunRate || requiredRunRate) && (
            <p style={{ margin: 0, marginBottom: 26, fontSize: 44, fontWeight: 700, fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif' }}>
              {currentRunRate && (
                <span style={{ marginRight: 56 }}>
                  <span style={{ color: c.muted }}>CRR </span>
                  <span style={{ color: c.text }}>{currentRunRate}</span>
                </span>
              )}
              {requiredRunRate && (
                <span>
                  <span style={{ color: c.muted }}>REQ </span>
                  <span style={{ color: scoreColor }}>{requiredRunRate}</span>
                </span>
              )}
            </p>
          )}

          {/* Runs-per-over sparkline (team colour, with wicket markers) */}
          {spark && (
            <div style={{ marginBottom: 26 }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0, marginBottom: 14 }}>
                Runs per over
              </p>
              <svg viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" width="100%" height="112" style={{ display: 'block', overflow: 'visible' }}>
                <path d={areaPath} fill={alpha(scoreColor, 0.16)} />
                <path d={linePath} fill="none" stroke={scoreColor} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                {spark.map((p, i) =>
                  p.wicketFell ? (
                    <circle key={i} cx={sx(i)} cy={sy(p.runs)} r={5} fill={c.danger} stroke={c.bg} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  ) : null
                )}
              </svg>
            </div>
          )}

          {/* Status — tinted pill, matching the live hero */}
          <div style={{ marginBottom: winProbability ? 30 : 0 }}>
            <span style={{
              display: 'inline-block',
              padding: '14px 30px',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${alpha(scoreColor, 0.30)}, ${alpha(scoreColor, 0.12)} 55%, ${alpha(scoreColor, 0)})`,
              border: `1px solid ${alpha(scoreColor, 0.22)}`,
              fontSize: 28,
              fontWeight: 600,
              color: c.text,
            }}>
              {status}
            </span>
          </div>

          {/* Win probability */}
          {winProbability && (
            <div style={{ marginTop: 0 }}>
              <p style={{ margin: 0, marginBottom: 14, fontSize: 0 }}>
                <span style={{ fontSize: 24, fontWeight: 600, color: c.success }}>
                  {winProbability.team1.name} {winProbability.team1.probability}%
                </span>
                <span style={{ fontSize: 24, fontWeight: 600, color: c.danger, float: 'right' }}>
                  {winProbability.team2.probability}% {winProbability.team2.name}
                </span>
              </p>
              <div style={{ height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: c.track, position: 'relative', clear: 'both' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: 18, width: `${winProbability.team1.probability}%`, background: c.success }} />
                <div style={{ position: 'absolute', top: 0, right: 0, height: 18, width: `${winProbability.team2.probability}%`, background: c.danger }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
            padding: '28px 64px', backgroundColor: c.footer, borderTop: `1px solid ${c.border}`,
          }}
        >
          <span style={{ fontSize: 0 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: c.brand, fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif', letterSpacing: '-0.02em', verticalAlign: 'baseline' }}>
              Inningz
            </span>
            <span style={{ fontSize: 20, fontWeight: 400, color: c.faint, marginLeft: 20, verticalAlign: 'baseline' }}>by</span>
            <span style={{ fontSize: 22, fontWeight: 500, color: c.muted, marginLeft: 8, verticalAlign: 'baseline' }}>Vanshaj</span>
          </span>
          <span style={{ fontSize: 20, color: c.faint, float: 'right', marginTop: 6 }}>Live Cricket Scores</span>
        </div>
      </div>
    );
  }
);

QuickScoreCard.displayName = 'QuickScoreCard';

export default QuickScoreCard;
