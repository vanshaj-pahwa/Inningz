'use client';

import { forwardRef } from 'react';
import { sharePalette, type ShareMode } from './share-palette';

export interface StatShareCardProps {
    matchTitle: string;
    seriesName?: string;
    score?: string;
    headline?: string;
    text: string;
    snippetType?: string;
    mode?: ShareMode;
}

const StatShareCard = forwardRef<HTMLDivElement, StatShareCardProps>(
    ({ matchTitle, seriesName, score, headline, text, snippetType, mode = 'dark' }, ref) => {
        const c = sharePalette(mode);
        const type = snippetType?.toLowerCase() || '';

        // Accent by snippet type, routed through the token palette (was ad-hoc cyan/amber/etc.).
        let accentColor: string = c.info;
        if (type.includes('forecast')) accentColor = c.brand;
        else if (type.includes('milestone') || type.includes('achievement')) accentColor = c.success;
        else if (type.includes('alert') || type.includes('breaking')) accentColor = c.danger;
        else if (type.includes('trivia') || type.includes('fun')) accentColor = c.six;

        const rawText = text.replace(/<[^>]*>/g, '').trim();
        const cleanText = rawText.replace(/^stat\s*:\s*/i, '').trim();
        const cleanHeadline = headline?.replace(/<[^>]*>/g, '').trim();

        const scoreMatch = score?.match(/^([A-Za-z\s]+?)\s+(\d+\/\d+)/);
        const currentTeam = scoreMatch ? scoreMatch[1].trim() : '';
        const currentScore = scoreMatch ? scoreMatch[2] : score?.split('(')[0]?.trim() || score;
        const oversMatch = score?.match(/\(([^)]+)\s*[Oo]v\)/);
        const overs = oversMatch ? oversMatch[1] : '';

        const textLen = cleanText.length;
        const textFontSize = textLen > 300 ? 32 : textLen > 200 ? 36 : textLen > 120 ? 40 : 48;

        return (
            <div
                ref={ref}
                data-share-card
                style={{
                    width: 1080,
                    position: 'relative',
                    overflow: 'hidden',
                    background: c.bg,
                    fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
                }}
            >
                {/* Top accent bar — solid, colour cues the snippet type */}
                <div style={{ height: 5, background: accentColor }} />

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 10, padding: '56px 64px 40px' }}>
                    {/* Header row: match info + score */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, gap: 32 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {seriesName && (
                                <p style={{ fontSize: 20, color: c.faint, fontWeight: 500, margin: 0, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    {seriesName}
                                </p>
                            )}
                            <p style={{ fontSize: 28, fontWeight: 600, color: c.muted, margin: 0, fontFamily: '"DM Serif Display", Georgia, serif', lineHeight: 1.3 }}>
                                {matchTitle}
                            </p>
                        </div>

                        {score && (
                            <div style={{ padding: '14px 28px', borderRadius: 16, background: c.surface, border: `1px solid ${c.border}`, flexShrink: 0, textAlign: 'right' }}>
                                {currentTeam && (
                                    <p style={{ fontSize: 18, fontWeight: 600, color: c.faint, margin: 0, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        {currentTeam}
                                    </p>
                                )}
                                <p style={{ margin: 0, fontSize: 0 }}>
                                    <span style={{ fontSize: 42, fontWeight: 700, color: c.brand, fontFamily: '"DM Serif Display", Georgia, serif', verticalAlign: 'baseline' }}>
                                        {currentScore}
                                    </span>
                                    {overs && (
                                        <span style={{ fontSize: 20, color: c.faint, fontWeight: 500, marginLeft: 10, verticalAlign: 'baseline' }}>
                                            ({overs} ov)
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Stat content block with left accent border */}
                    <div style={{ borderLeft: `5px solid ${accentColor}`, paddingLeft: 40, paddingTop: 8, paddingBottom: 8 }}>
                        <div style={{ fontSize: 120, lineHeight: '0.6', color: accentColor, opacity: 0.28, fontFamily: 'Georgia, serif', marginBottom: 8, userSelect: 'none' }}>
                            {'“'}
                        </div>

                        {cleanHeadline && (
                            <p style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.35, color: c.text, margin: 0, marginBottom: 20, fontFamily: '"DM Serif Display", Georgia, serif' }}>
                                {cleanHeadline}
                            </p>
                        )}

                        <p style={{ fontSize: textFontSize, fontWeight: 600, lineHeight: 1.55, color: c.text, margin: 0, letterSpacing: '-0.01em' }}>
                            {cleanText}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ position: 'relative', zIndex: 10, padding: '24px 64px', marginTop: 24, borderTop: `1px solid ${c.border}`, background: c.footer }}>
                    <span style={{ fontSize: 0 }}>
                        <span style={{ fontSize: 34, fontWeight: 700, color: c.brand, fontFamily: '"DM Serif Display", Georgia, serif', letterSpacing: '-0.02em', verticalAlign: 'baseline' }}>
                            Inningz
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 400, color: c.faint, marginLeft: 16, verticalAlign: 'baseline' }}>by</span>
                        <span style={{ fontSize: 20, fontWeight: 500, color: c.muted, marginLeft: 8, verticalAlign: 'baseline' }}>Vanshaj</span>
                    </span>
                    <span style={{ fontSize: 18, color: c.faint, float: 'right', marginTop: 6 }}>Live Cricket Scores</span>
                </div>
            </div>
        );
    }
);

StatShareCard.displayName = 'StatShareCard';

export default StatShareCard;
