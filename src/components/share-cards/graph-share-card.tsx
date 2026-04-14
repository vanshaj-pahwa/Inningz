'use client';

import { forwardRef, ReactNode } from 'react';

export interface GraphShareCardProps {
  title: string;
  subtitle?: string;
  matchTitle: string;
  seriesName?: string;
  sectionLabel: string;
  sectionSubtitle?: string;
  inningsLabel?: string;
  children: ReactNode;
}

const GraphShareCard = forwardRef<HTMLDivElement, GraphShareCardProps>(
  ({ matchTitle, seriesName, sectionLabel, sectionSubtitle, inningsLabel, children }, ref) => {
    return (
      <div
        ref={ref}
        data-share-card
        style={{
          width: 1080,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
          paddingBottom: 120,
        }}
      >
        <style>{`[data-share-card] [data-hide-in-share]{display:none !important;}`}</style>
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at top right, rgba(6, 182, 212, 0.12) 0%, transparent 50%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at bottom left, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
          }}
        />

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 10, padding: 64, paddingBottom: 32 }}>
          {seriesName && (
            <p
              style={{
                margin: 0,
                marginBottom: 14,
                fontSize: 24,
                color: '#a1a1aa',
                fontWeight: 500,
              }}
            >
              {seriesName}
            </p>
          )}
          <h1
            style={{
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.25,
              color: '#fafafa',
              margin: 0,
              marginBottom: 28,
              fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif',
            }}
          >
            {matchTitle}
          </h1>

          <div
            style={{
              height: 3,
              marginBottom: 32,
              background: 'linear-gradient(90deg, #06b6d4, transparent)',
              borderRadius: 2,
            }}
          />

          <h2
            style={{
              fontSize: 56,
              fontWeight: 700,
              margin: 0,
              color: '#f59e0b',
              fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif',
              lineHeight: 1.1,
            }}
          >
            {sectionLabel}
          </h2>
          {sectionSubtitle && (
            <p
              style={{
                margin: 0,
                marginTop: 10,
                fontSize: 24,
                color: '#a1a1aa',
                fontWeight: 500,
              }}
            >
              {sectionSubtitle}
            </p>
          )}
          {inningsLabel && (
            <div
              style={{
                display: 'inline-block',
                marginTop: 18,
                padding: '8px 18px',
                borderRadius: 999,
                border: '1px solid rgba(6, 182, 212, 0.4)',
                backgroundColor: 'rgba(6, 182, 212, 0.12)',
                fontSize: 22,
                fontWeight: 600,
                color: '#22d3ee',
                letterSpacing: '0.02em',
              }}
            >
              {inningsLabel}
            </div>
          )}
        </div>

        {/* Chart body */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '0 48px 56px 48px',
          }}
        >
          <div
            style={{
              background: 'rgba(24, 24, 27, 0.6)',
              border: '1px solid #27272a',
              borderRadius: 24,
              padding: 32,
            }}
          >
            {children}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: '24px 64px',
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
                fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif',
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
                marginLeft: 8,
                verticalAlign: 'baseline',
              }}
            >
              Vanshaj
            </span>
          </span>
          <span
            style={{
              fontSize: 20,
              color: '#52525b',
              float: 'right',
              marginTop: 6,
            }}
          >
            Live Cricket Scores
          </span>
        </div>

        {/* Accent line */}
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

GraphShareCard.displayName = 'GraphShareCard';

export default GraphShareCard;
