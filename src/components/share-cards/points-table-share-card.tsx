'use client';

import { forwardRef } from 'react';
import type { PointsTableGroup } from '@/app/actions';

export interface PointsTableShareCardProps {
    seriesName: string;
    matchType?: string;
    groups: PointsTableGroup[];
    flagDataUrls?: Record<number, string>;
}

const accentColor = '#06b6d4';
const accentGlow = 'rgba(6, 182, 212, 0.18)';
const accentGlow2 = 'rgba(6, 182, 212, 0.06)';

function getQualifyCutoff(teams: PointsTableGroup['teams']): number {
    const lastQIdx = teams.map((t, i) => t.teamQualifyStatus === 'Q' ? i : -1).filter(i => i >= 0).pop();
    if (lastQIdx !== undefined && lastQIdx >= 0) return lastQIdx;
    if (teams.length >= 8) return 3;
    return -1;
}

export function teamFlagSlug(teamName: string): string {
    return teamName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);
}

export function teamFlagProxyUrl(teamImageId: number, teamName: string): string {
    const safeName = teamFlagSlug(teamName);
    return `/api/team-flag?id=${teamImageId}&name=${encodeURIComponent(safeName)}`;
}

function resolveFlagSrc(
    team: PointsTableGroup['teams'][number],
    flagDataUrls?: Record<number, string>,
): string | null {
    if (!team.teamImageId) return null;
    const dataUrl = flagDataUrls?.[team.teamId];
    if (dataUrl) return dataUrl;
    return teamFlagProxyUrl(team.teamImageId, team.teamName);
}

const PointsTableShareCard = forwardRef<HTMLDivElement, PointsTableShareCardProps>(
    ({ seriesName, matchType, groups, flagDataUrls }, ref) => {
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
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 20% 0%, ${accentGlow} 0%, transparent 60%)` }} />
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 80% 100%, ${accentGlow2} 0%, transparent 50%)` }} />
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 40%, rgba(255,255,255,0.01) 100%)' }} />

                <div style={{ height: 5, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

                <div style={{ position: 'relative', zIndex: 10, padding: '56px 64px 32px' }}>
                    {/* Header */}
                    <div style={{ marginBottom: 36 }}>
                        <p style={{
                            fontSize: 18,
                            color: accentColor,
                            fontWeight: 600,
                            margin: 0,
                            marginBottom: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                        }}>
                            Points Table{matchType ? ` · ${matchType}` : ''}
                        </p>
                        <p style={{
                            fontSize: 44,
                            fontWeight: 700,
                            color: '#fafafa',
                            margin: 0,
                            fontFamily: '"DM Serif Display", Georgia, serif',
                            lineHeight: 1.15,
                            letterSpacing: '-0.01em',
                        }}>
                            {seriesName}
                        </p>
                    </div>

                    {/* Groups */}
                    {groups.map((group, gi) => {
                        const cutoff = getQualifyCutoff(group.teams);
                        return (
                            <div key={gi} style={{ marginBottom: gi === groups.length - 1 ? 0 : 36 }}>
                                {groups.length > 1 && group.groupName && (
                                    <p style={{
                                        fontSize: 18,
                                        color: '#a1a1aa',
                                        fontWeight: 600,
                                        margin: 0,
                                        marginBottom: 14,
                                        letterSpacing: '0.16em',
                                        textTransform: 'uppercase',
                                    }}>
                                        {group.groupName}
                                    </p>
                                )}
                                <div style={{
                                    borderRadius: 18,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.025)' }}>
                                                <th style={thStyle({ width: 64, textAlign: 'left', paddingLeft: 28 })}>#</th>
                                                <th style={thStyle({ textAlign: 'left' })}>Team</th>
                                                <th style={thStyle({ width: 70, textAlign: 'center' })}>M</th>
                                                <th style={thStyle({ width: 70, textAlign: 'center' })}>W</th>
                                                <th style={thStyle({ width: 70, textAlign: 'center' })}>L</th>
                                                <th style={thStyle({ width: 70, textAlign: 'center' })}>T</th>
                                                <th style={thStyle({ width: 70, textAlign: 'center' })}>NR</th>
                                                <th style={thStyle({ width: 90, textAlign: 'center' })}>Pts</th>
                                                <th style={thStyle({ width: 110, textAlign: 'right' })}>NRR</th>
                                                <th style={thStyle({ width: 170, textAlign: 'center', paddingRight: 28 })}>Form</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.teams.map((team, idx) => {
                                                const isQualified = team.teamQualifyStatus === 'Q';
                                                const isEliminated = team.teamQualifyStatus === 'E';
                                                const isCutoff = idx === cutoff;
                                                const nrr = team.nrr || '';
                                                const nrrColor = nrr.startsWith('+') ? '#4ade80' : nrr.startsWith('-') ? '#f87171' : '#a1a1aa';
                                                return (
                                                    <tr
                                                        key={team.teamId}
                                                        style={{
                                                            borderBottom: isCutoff
                                                                ? `2px solid ${accentColor}`
                                                                : '1px solid rgba(255,255,255,0.04)',
                                                            background: isQualified
                                                                ? 'rgba(6, 182, 212, 0.05)'
                                                                : isEliminated
                                                                    ? 'rgba(239, 68, 68, 0.04)'
                                                                    : 'transparent',
                                                            opacity: isEliminated ? 0.7 : 1,
                                                        }}
                                                    >
                                                        <td style={tdStyle({ paddingLeft: 28 })}>
                                                            <span style={{
                                                                fontFamily: '"DM Mono", ui-monospace, monospace',
                                                                fontSize: 22,
                                                                fontWeight: 700,
                                                                color: idx < 4 ? '#fbbf24' : '#71717a',
                                                            }}>
                                                                {idx + 1}
                                                            </span>
                                                        </td>
                                                        <td style={tdStyle({})}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                                {resolveFlagSrc(team, flagDataUrls) ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={resolveFlagSrc(team, flagDataUrls)!}
                                                                        alt={team.teamName}
                                                                        width={44}
                                                                        height={32}
                                                                        style={{
                                                                            width: 44,
                                                                            height: 32,
                                                                            objectFit: 'contain',
                                                                            flexShrink: 0,
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div style={{
                                                                        width: 44,
                                                                        height: 32,
                                                                        borderRadius: 4,
                                                                        background: 'rgba(255,255,255,0.04)',
                                                                        flexShrink: 0,
                                                                    }} />
                                                                )}
                                                                <span style={{
                                                                    fontSize: 24,
                                                                    fontWeight: 600,
                                                                    color: '#fafafa',
                                                                    letterSpacing: '-0.01em',
                                                                }}>
                                                                    {team.teamName}
                                                                </span>
                                                                {isQualified && (
                                                                    <span style={{
                                                                        fontSize: 14,
                                                                        fontWeight: 700,
                                                                        color: accentColor,
                                                                        background: 'rgba(6, 182, 212, 0.15)',
                                                                        padding: '3px 8px',
                                                                        borderRadius: 6,
                                                                        letterSpacing: '0.04em',
                                                                    }}>
                                                                        Q
                                                                    </span>
                                                                )}
                                                                {isEliminated && (
                                                                    <span style={{
                                                                        fontSize: 14,
                                                                        fontWeight: 700,
                                                                        color: '#f87171',
                                                                        border: '1.5px solid rgba(248, 113, 113, 0.45)',
                                                                        padding: '2px 9px',
                                                                        borderRadius: 6,
                                                                        letterSpacing: '0.06em',
                                                                        background: 'transparent',
                                                                    }}>
                                                                        E
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={tdStyle({ textAlign: 'center', color: '#a1a1aa' })}>{team.matchesPlayed}</td>
                                                        <td style={tdStyle({ textAlign: 'center', color: '#4ade80', fontWeight: 600 })}>{team.matchesWon}</td>
                                                        <td style={tdStyle({ textAlign: 'center', color: '#f87171', fontWeight: 600 })}>{team.matchesLost}</td>
                                                        <td style={tdStyle({ textAlign: 'center', color: '#a1a1aa' })}>{team.matchesTied}</td>
                                                        <td style={tdStyle({ textAlign: 'center', color: '#a1a1aa' })}>{team.noRes}</td>
                                                        <td style={tdStyle({ textAlign: 'center' })}>
                                                            <span style={{
                                                                fontFamily: '"DM Serif Display", Georgia, serif',
                                                                fontSize: 28,
                                                                fontWeight: 700,
                                                                color: accentColor,
                                                            }}>
                                                                {team.points}
                                                            </span>
                                                        </td>
                                                        <td style={tdStyle({ textAlign: 'right', color: nrrColor, fontFamily: '"DM Mono", ui-monospace, monospace', fontWeight: 600 })}>
                                                            {nrr}
                                                        </td>
                                                        <td style={tdStyle({ textAlign: 'center', paddingRight: 28 })}>
                                                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                                                {team.form.slice(-5).map((r, i) => (
                                                                    <span
                                                                        key={i}
                                                                        style={{
                                                                            width: 26,
                                                                            height: 26,
                                                                            borderRadius: 13,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: 13,
                                                                            fontWeight: 700,
                                                                            background: r === 'W' ? 'rgba(34, 197, 94, 0.18)' : r === 'L' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(113, 113, 122, 0.2)',
                                                                            color: r === 'W' ? '#4ade80' : r === 'L' ? '#f87171' : '#a1a1aa',
                                                                        }}
                                                                    >
                                                                        {r}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
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

                <div style={{ height: 5, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
            </div>
        );
    }
);

function thStyle(extra: React.CSSProperties): React.CSSProperties {
    return {
        fontSize: 14,
        fontWeight: 700,
        color: '#71717a',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '14px 8px',
        ...extra,
    };
}

function tdStyle(extra: React.CSSProperties): React.CSSProperties {
    return {
        fontSize: 22,
        fontFamily: '"DM Mono", ui-monospace, monospace',
        padding: '14px 8px',
        color: '#e4e4e7',
        ...extra,
    };
}

PointsTableShareCard.displayName = 'PointsTableShareCard';

export default PointsTableShareCard;
