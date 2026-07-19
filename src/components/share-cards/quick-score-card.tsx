'use client';

import { forwardRef } from 'react';
import { sharePalette, type ShareMode } from './share-palette';

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
}

const QuickScoreCard = forwardRef<HTMLDivElement, QuickScoreCardProps>(
  (
    { title, score, status, seriesName, currentRunRate, requiredRunRate, previousInnings, winProbability, mode = 'dark' },
    ref
  ) => {
    const c = sharePalette(mode);
    const isLive = status.toLowerCase().includes('live');

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
          background: c.bg,
          fontFamily: 'var(--font-sans), "DM Sans", system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ position: 'relative', zIndex: 10, padding: 64, paddingBottom: 120 }}>
          {/* Series + Live */}
          <div style={{ marginBottom: 24 }}>
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
            fontSize: 44, fontWeight: 600, lineHeight: 1.3, color: c.text, margin: 0, marginBottom: 44,
            fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif',
          }}>
            {title}
          </h1>

          {/* Hairline divider (flat, matches the app's surface separators) */}
          <div style={{ height: 1, marginBottom: 44, background: c.border }} />

          {/* Previous innings */}
          {previousInnings && previousInnings.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              {previousInnings.map((inning, index) => (
                <p key={index} style={{ margin: 0, marginBottom: 10, fontSize: 0 }}>
                  <span style={{ fontSize: 32, fontWeight: 600, color: c.muted, verticalAlign: 'baseline' }}>
                    {inning.teamShortName || inning.teamName}
                  </span>
                  <span style={{ fontSize: 52, fontWeight: 700, color: c.faint, fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif', marginLeft: 24, verticalAlign: 'baseline' }}>
                    {inning.score?.split('(')[0]?.trim()}
                  </span>
                </p>
              ))}
            </div>
          )}

          {/* Current team + score (gold, serif — the hero) */}
          <div style={{ marginBottom: 32 }}>
            {currentTeam && (
              <p style={{ fontSize: 38, fontWeight: 600, marginBottom: 8, marginTop: 0, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentTeam}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 0, lineHeight: 1 }}>
              <span style={{ fontSize: 150, fontWeight: 700, color: c.brand, fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif', lineHeight: 1, display: 'inline-block' }}>
                {currentScore}
              </span>
              {overs && (
                <span style={{ fontSize: 38, color: c.faint, fontWeight: 500, marginLeft: 20, verticalAlign: 'middle' }}>
                  ({overs} ov)
                </span>
              )}
            </p>
          </div>

          {/* Run rates — plain label + value, like the hero (no cyan/orange chips) */}
          {(currentRunRate || requiredRunRate) && (
            <p style={{ margin: 0, marginBottom: 32, fontSize: 30, fontWeight: 600, fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif' }}>
              {currentRunRate && (
                <span style={{ marginRight: 48 }}>
                  <span style={{ color: c.muted }}>CRR </span>
                  <span style={{ color: c.text }}>{currentRunRate}</span>
                </span>
              )}
              {requiredRunRate && (
                <span>
                  <span style={{ color: c.muted }}>REQ </span>
                  <span style={{ color: c.brand }}>{requiredRunRate}</span>
                </span>
              )}
            </p>
          )}

          {/* Status */}
          <p style={{ fontSize: 28, fontWeight: 500, color: c.muted, margin: 0, marginBottom: winProbability ? 44 : 0 }}>
            {status}
          </p>

          {/* Win probability — flat success/danger fills */}
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

        {/* Footer — flat, hairline top border */}
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
