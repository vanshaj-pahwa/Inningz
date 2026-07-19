'use client';

import { forwardRef, ReactNode } from 'react';
import { sharePalette, type ShareMode } from './share-palette';

export interface GraphShareCardProps {
  title: string;
  subtitle?: string;
  matchTitle: string;
  seriesName?: string;
  sectionLabel: string;
  sectionSubtitle?: string;
  inningsLabel?: string;
  children: ReactNode;
  mode?: ShareMode;
}

const GraphShareCard = forwardRef<HTMLDivElement, GraphShareCardProps>(
  ({ matchTitle, seriesName, sectionLabel, sectionSubtitle, inningsLabel, children, mode = 'dark' }, ref) => {
    const c = sharePalette(mode);
    return (
      <div
        ref={ref}
        data-share-card
        style={{
          width: 1080,
          position: 'relative',
          overflow: 'hidden',
          background: c.bg,
          fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
          paddingBottom: 120,
        }}
      >
        <style>{`[data-share-card] [data-hide-in-share]{display:none !important;}`}</style>

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 10, padding: 64, paddingBottom: 32 }}>
          {seriesName && (
            <p style={{ margin: 0, marginBottom: 14, fontSize: 24, color: c.muted, fontWeight: 500 }}>
              {seriesName}
            </p>
          )}
          <h1
            style={{
              fontSize: 40, fontWeight: 600, lineHeight: 1.25, color: c.text, margin: 0, marginBottom: 28,
              fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif',
            }}
          >
            {matchTitle}
          </h1>

          <div style={{ height: 1, marginBottom: 32, background: c.border }} />

          <h2
            style={{
              fontSize: 56, fontWeight: 700, margin: 0, color: c.brand,
              fontFamily: 'var(--font-display), "DM Serif Display", Georgia, serif', lineHeight: 1.1,
            }}
          >
            {sectionLabel}
          </h2>
          {sectionSubtitle && (
            <p style={{ margin: 0, marginTop: 10, fontSize: 24, color: c.muted, fontWeight: 500 }}>
              {sectionSubtitle}
            </p>
          )}
          {inningsLabel && (
            <div
              style={{
                display: 'inline-block', marginTop: 18, padding: '8px 18px', borderRadius: 999,
                border: `1px solid ${c.border}`, backgroundColor: c.track,
                fontSize: 22, fontWeight: 600, color: c.info, letterSpacing: '0.02em',
              }}
            >
              {inningsLabel}
            </div>
          )}
        </div>

        {/* Chart body */}
        <div style={{ position: 'relative', zIndex: 10, padding: '0 48px 56px 48px' }}>
          <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 24, padding: 32 }}>
            {children}
          </div>
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

GraphShareCard.displayName = 'GraphShareCard';

export default GraphShareCard;
