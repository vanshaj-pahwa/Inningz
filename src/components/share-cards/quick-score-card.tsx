'use client';

import { forwardRef } from 'react';

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
}

const QuickScoreCard = forwardRef<HTMLDivElement, QuickScoreCardProps>(
  (
    {
      title,
      score,
      status,
      seriesName,
      currentRunRate,
      requiredRunRate,
      previousInnings,
      winProbability,
    },
    ref
  ) => {
    // Parse current score for better display
    const scoreMatch = score?.match(/^([A-Za-z\s]+?)\s+(\d+\/\d+)/);
    const currentTeam = scoreMatch ? scoreMatch[1].trim() : '';
    const currentScore = scoreMatch ? scoreMatch[2] : score?.split('(')[0]?.trim() || score;
    const oversMatch = score?.match(/\(([^)]+)\s*[Oo]v\)/);
    const overs = oversMatch ? oversMatch[1] : '';

    return (
      <div
        ref={ref}
        data-share-card
        style={{
          width: 1080,
          height: 1080,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Ambient glow effects */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at top right, rgba(6, 182, 212, 0.12) 0%, transparent 50%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at bottom left, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, padding: 64, paddingTop: 80, paddingBottom: 100 }}>
          {/* Series Name & Live Badge */}
          <div style={{ marginBottom: 16 }}>
            {status.toLowerCase().includes('live') && (
              <span style={{
                display: 'inline-block',
                padding: '8px 20px',
                borderRadius: 8,
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '0.1em',
                marginRight: 20,
                verticalAlign: 'middle',
              }}>
                LIVE
              </span>
            )}
            {seriesName && (
              <span style={{
                fontSize: 26,
                color: '#a1a1aa',
                fontWeight: 500,
                verticalAlign: 'middle',
              }}>
                {seriesName}
              </span>
            )}
          </div>

          {/* Full Match Title */}
          <h1 style={{
            fontSize: 44,
            fontWeight: 600,
            lineHeight: 1.3,
            color: '#fafafa',
            margin: 0,
            marginBottom: 40,
            fontFamily: '"DM Serif Display", Georgia, serif',
          }}>
            {title}
          </h1>

          {/* Divider */}
          <div style={{ height: 3, marginBottom: 40, background: 'linear-gradient(90deg, #06b6d4, transparent)', borderRadius: 2 }} />

          {/* Previous Innings */}
          {previousInnings && previousInnings.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              {previousInnings.map((inning, index) => (
                <p key={index} style={{ margin: 0, marginBottom: 10, fontSize: 0 }}>
                  <span style={{ fontSize: 32, fontWeight: 600, color: '#a1a1aa', verticalAlign: 'baseline' }}>
                    {inning.teamShortName || inning.teamName}
                  </span>
                  <span style={{ fontSize: 56, fontWeight: 700, color: '#71717a', fontFamily: '"DM Serif Display", Georgia, serif', marginLeft: 24, verticalAlign: 'baseline' }}>
                    {inning.score?.split('(')[0]?.trim()}
                  </span>
                </p>
              ))}
            </div>
          )}

          {/* Current Team Name */}
          {currentTeam && (
            <p style={{ fontSize: 36, fontWeight: 600, marginBottom: 0, marginTop: 0, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {currentTeam}
            </p>
          )}

          {/* Score Line */}
          <p style={{ margin: 0, marginBottom: 40, fontSize: 0 }}>
            <span style={{ fontSize: 160, fontWeight: 700, color: '#f59e0b', fontFamily: '"DM Serif Display", Georgia, serif', lineHeight: 1, verticalAlign: 'baseline' }}>
              {currentScore}
            </span>
            {overs && (
              <span style={{ fontSize: 40, color: '#71717a', fontWeight: 500, marginLeft: 24, verticalAlign: 'baseline' }}>
                ({overs} ov)
              </span>
            )}
          </p>

          {/* Run Rates - Simple text */}
          {(currentRunRate || requiredRunRate) && (
            <p style={{ margin: 0, marginBottom: 40, fontSize: 32, fontFamily: 'monospace', fontWeight: 700 }}>
              {currentRunRate && (
                <span style={{ color: '#22d3ee', marginRight: 48 }}>
                  CRR: {currentRunRate}
                </span>
              )}
              {requiredRunRate && (
                <span style={{ color: '#fb923c' }}>
                  RRR: {requiredRunRate}
                </span>
              )}
            </p>
          )}

          {/* Status */}
          <p style={{ fontSize: 28, fontWeight: 500, color: '#a1a1aa', margin: 0, marginBottom: winProbability ? 48 : 0 }}>
            {status}
          </p>

          {/* Win Probability Bar - In content flow */}
          {winProbability && (
            <div style={{ marginTop: 0 }}>
              <p style={{ margin: 0, marginBottom: 14, fontSize: 0 }}>
                <span style={{ fontSize: 24, fontWeight: 600, color: '#22c55e' }}>
                  {winProbability.team1.name} {winProbability.team1.probability}%
                </span>
                <span style={{ fontSize: 24, fontWeight: 600, color: '#ef4444', float: 'right' }}>
                  {winProbability.team2.probability}% {winProbability.team2.name}
                </span>
              </p>
              <div style={{ height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: '#27272a', position: 'relative', clear: 'both' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: 18, width: `${winProbability.team1.probability}%`, background: 'linear-gradient(90deg, #22c55e, #4ade80)' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, height: 18, width: `${winProbability.team2.probability}%`, background: 'linear-gradient(90deg, #f87171, #ef4444)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer with branding - Absolutely positioned at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: '28px 64px',
            backgroundColor: '#050505',
            borderTop: '1px solid #27272a',
          }}
        >
          <span style={{ fontSize: 0 }}>
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#06b6d4',
                fontFamily: '"DM Serif Display", Georgia, serif',
                letterSpacing: '-0.02em',
                verticalAlign: 'baseline',
              }}
            >
              Inningz
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 400,
                color: '#525252',
                fontFamily: '"DM Sans", system-ui, sans-serif',
                marginLeft: 20,
                verticalAlign: 'baseline',
              }}
            >
              by
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: '#a1a1aa',
                fontFamily: '"DM Sans", system-ui, sans-serif',
                marginLeft: 8,
                verticalAlign: 'baseline',
              }}
            >
              Vanshaj
            </span>
          </span>
          <span style={{ fontSize: 20, color: '#52525b', float: 'right', marginTop: 6 }}>
            Live Cricket Scores
          </span>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #06b6d4, #0891b2, #06b6d4)',
          }}
        />
      </div>
    );
  }
);

QuickScoreCard.displayName = 'QuickScoreCard';

export default QuickScoreCard;
