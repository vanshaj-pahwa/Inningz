'use client';

import { forwardRef } from 'react';

export interface StatShareCardProps {
    matchTitle: string;
    seriesName?: string;
    score?: string;
    headline?: string;
    text: string;
    snippetType?: string;
}

const StatShareCard = forwardRef<HTMLDivElement, StatShareCardProps>(
    ({ matchTitle, seriesName, score, headline, text, snippetType }, ref) => {
        const type = snippetType?.toLowerCase() || '';
        let accentColor = '#06b6d4';
        let accentGlow = 'rgba(6, 182, 212, 0.18)';
        let accentGlow2 = 'rgba(6, 182, 212, 0.06)';

        if (type.includes('forecast')) {
            accentColor = '#f59e0b';
            accentGlow = 'rgba(245, 158, 11, 0.18)';
            accentGlow2 = 'rgba(245, 158, 11, 0.06)';
        } else if (type.includes('stat') || type.includes('record')) {
            accentColor = '#3b82f6';
            accentGlow = 'rgba(59, 130, 246, 0.18)';
            accentGlow2 = 'rgba(59, 130, 246, 0.06)';
        } else if (type.includes('milestone') || type.includes('achievement')) {
            accentColor = '#22c55e';
            accentGlow = 'rgba(34, 197, 94, 0.18)';
            accentGlow2 = 'rgba(34, 197, 94, 0.06)';
        } else if (type.includes('alert') || type.includes('breaking')) {
            accentColor = '#ef4444';
            accentGlow = 'rgba(239, 68, 68, 0.18)';
            accentGlow2 = 'rgba(239, 68, 68, 0.06)';
        } else if (type.includes('trivia') || type.includes('fun')) {
            accentColor = '#a855f7';
            accentGlow = 'rgba(168, 85, 247, 0.18)';
            accentGlow2 = 'rgba(168, 85, 247, 0.06)';
        }

        // Strip HTML tags and remove leading "STAT:" / "Stat:" prefix from text
        const rawText = text.replace(/<[^>]*>/g, '').trim();
        const cleanText = rawText.replace(/^stat\s*:\s*/i, '').trim();
        const cleanHeadline = headline?.replace(/<[^>]*>/g, '').trim();

        // Parse current score
        const scoreMatch = score?.match(/^([A-Za-z\s]+?)\s+(\d+\/\d+)/);
        const currentTeam = scoreMatch ? scoreMatch[1].trim() : '';
        const currentScore = scoreMatch ? scoreMatch[2] : score?.split('(')[0]?.trim() || score;
        const oversMatch = score?.match(/\(([^)]+)\s*[Oo]v\)/);
        const overs = oversMatch ? oversMatch[1] : '';

        // Dynamic font size
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
                    background: '#09090b',
                    fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
                }}
            >
                {/* Multi-layer ambient glow */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 20% 0%, ${accentGlow} 0%, transparent 60%)` }} />
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 80% 100%, ${accentGlow2} 0%, transparent 50%)` }} />
                {/* Subtle noise texture overlay */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 40%, rgba(255,255,255,0.01) 100%)' }} />

                {/* Top accent bar */}
                <div style={{ height: 5, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 10, padding: '56px 64px 40px' }}>

                    {/* Header row: match info + score */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        marginBottom: 48,
                        gap: 32,
                    }}>
                        {/* Left: match details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {seriesName && (
                                <p style={{ fontSize: 20, color: '#52525b', fontWeight: 500, margin: 0, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    {seriesName}
                                </p>
                            )}
                            <p style={{
                                fontSize: 28,
                                fontWeight: 600,
                                color: '#a1a1aa',
                                margin: 0,
                                fontFamily: '"DM Serif Display", Georgia, serif',
                                lineHeight: 1.3,
                            }}>
                                {matchTitle}
                            </p>
                        </div>

                        {/* Right: compact score chip */}
                        {score && (
                            <div style={{
                                padding: '14px 28px',
                                borderRadius: 16,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                flexShrink: 0,
                                textAlign: 'right',
                            }}>
                                {currentTeam && (
                                    <p style={{ fontSize: 18, fontWeight: 600, color: '#71717a', margin: 0, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        {currentTeam}
                                    </p>
                                )}
                                <p style={{ margin: 0, fontSize: 0 }}>
                                    <span style={{ fontSize: 42, fontWeight: 700, color: '#f59e0b', fontFamily: '"DM Serif Display", Georgia, serif', verticalAlign: 'baseline' }}>
                                        {currentScore}
                                    </span>
                                    {overs && (
                                        <span style={{ fontSize: 20, color: '#52525b', fontWeight: 500, marginLeft: 10, verticalAlign: 'baseline' }}>
                                            ({overs} ov)
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Stat content block with left accent border */}
                    <div style={{
                        borderLeft: `5px solid ${accentColor}`,
                        paddingLeft: 40,
                        paddingTop: 8,
                        paddingBottom: 8,
                    }}>
                        {/* Large decorative opening quote */}
                        <div style={{
                            fontSize: 120,
                            lineHeight: '0.6',
                            color: accentColor,
                            opacity: 0.25,
                            fontFamily: 'Georgia, serif',
                            marginBottom: 8,
                            userSelect: 'none',
                        }}>
                            {'\u201C'}
                        </div>

                        {/* Headline if present */}
                        {cleanHeadline && (
                            <p style={{
                                fontSize: 36,
                                fontWeight: 700,
                                lineHeight: 1.35,
                                color: '#fafafa',
                                margin: 0,
                                marginBottom: 20,
                                fontFamily: '"DM Serif Display", Georgia, serif',
                            }}>
                                {cleanHeadline}
                            </p>
                        )}

                        {/* Main stat text */}
                        <p style={{
                            fontSize: textFontSize,
                            fontWeight: 600,
                            lineHeight: 1.55,
                            color: '#e4e4e7',
                            margin: 0,
                            letterSpacing: '-0.01em',
                        }}>
                            {cleanText}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 10,
                        padding: '22px 64px',
                        marginTop: 24,
                        borderTop: '1px solid #1a1a1a',
                        background: 'rgba(0,0,0,0.4)',
                    }}
                >
                    <span style={{ fontSize: 0 }}>
                        <span style={{
                            fontSize: 34,
                            fontWeight: 700,
                            color: '#06b6d4',
                            fontFamily: '"DM Serif Display", Georgia, serif',
                            letterSpacing: '-0.02em',
                            verticalAlign: 'baseline',
                        }}>
                            Inningz
                        </span>
                        <span style={{
                            fontSize: 18,
                            fontWeight: 400,
                            color: '#404040',
                            fontFamily: '"DM Sans", system-ui, sans-serif',
                            marginLeft: 16,
                            verticalAlign: 'baseline',
                        }}>
                            by
                        </span>
                        <span style={{
                            fontSize: 20,
                            fontWeight: 500,
                            color: '#a1a1aa',
                            fontFamily: '"DM Sans", system-ui, sans-serif',
                            marginLeft: 8,
                            verticalAlign: 'baseline',
                        }}>
                            Vanshaj
                        </span>
                    </span>
                    <span style={{ fontSize: 18, color: '#3f3f46', float: 'right', marginTop: 6 }}>
                        Live Cricket Scores
                    </span>
                </div>

                {/* Bottom accent bar */}
                <div style={{ height: 5, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
            </div>
        );
    }
);

StatShareCard.displayName = 'StatShareCard';

export default StatShareCard;
