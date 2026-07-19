'use client';

import { forwardRef } from 'react';
import type { PointsTableGroup } from '@/app/actions';
import { sharePalette, alpha, type ShareMode, type SharePalette } from './share-palette';

export interface PointsTableShareCardProps {
    seriesName: string;
    matchType?: string;
    groups: PointsTableGroup[];
    flagDataUrls?: Record<number, string>;
    mode?: ShareMode;
}

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
    ({ seriesName, matchType, groups, flagDataUrls, mode = 'dark' }, ref) => {
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
                    fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
                }}
            >
                <div style={{ height: 5, background: c.info }} />

                <div style={{ position: 'relative', zIndex: 10, padding: '56px 64px 32px' }}>
                    {/* Header */}
                    <div style={{ marginBottom: 36 }}>
                        <p style={{ fontSize: 18, color: c.info, fontWeight: 600, margin: 0, marginBottom: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            Points Table{matchType ? ` · ${matchType}` : ''}
                        </p>
                        <p style={{ fontSize: 44, fontWeight: 700, color: c.text, margin: 0, fontFamily: '"DM Serif Display", Georgia, serif', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                            {seriesName}
                        </p>
                    </div>

                    {/* Groups */}
                    {groups.map((group, gi) => {
                        const cutoff = getQualifyCutoff(group.teams);
                        return (
                            <div key={gi} style={{ marginBottom: gi === groups.length - 1 ? 0 : 36 }}>
                                {groups.length > 1 && group.groupName && (
                                    <p style={{ fontSize: 18, color: c.muted, fontWeight: 600, margin: 0, marginBottom: 14, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                                        {group.groupName}
                                    </p>
                                )}
                                <div style={{ borderRadius: 18, background: c.surface, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: c.track }}>
                                                <th style={thStyle(c, { width: 64, textAlign: 'left', paddingLeft: 28 })}>#</th>
                                                <th style={thStyle(c, { textAlign: 'left' })}>Team</th>
                                                <th style={thStyle(c, { width: 70, textAlign: 'center' })}>M</th>
                                                <th style={thStyle(c, { width: 70, textAlign: 'center' })}>W</th>
                                                <th style={thStyle(c, { width: 70, textAlign: 'center' })}>L</th>
                                                <th style={thStyle(c, { width: 70, textAlign: 'center' })}>T</th>
                                                <th style={thStyle(c, { width: 70, textAlign: 'center' })}>NR</th>
                                                <th style={thStyle(c, { width: 90, textAlign: 'center' })}>Pts</th>
                                                <th style={thStyle(c, { width: 110, textAlign: 'right' })}>NRR</th>
                                                <th style={thStyle(c, { width: 170, textAlign: 'center', paddingRight: 28 })}>Form</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.teams.map((team, idx) => {
                                                const isQualified = team.teamQualifyStatus === 'Q';
                                                const isEliminated = team.teamQualifyStatus === 'E';
                                                const isCutoff = idx === cutoff;
                                                const nrr = team.nrr || '';
                                                const nrrColor = nrr.startsWith('+') ? c.success : nrr.startsWith('-') ? c.danger : c.muted;
                                                return (
                                                    <tr
                                                        key={team.teamId}
                                                        style={{
                                                            borderBottom: isCutoff ? `2px solid ${c.info}` : `1px solid ${c.border}`,
                                                            background: isQualified
                                                                ? alpha(c.success, 0.08)
                                                                : isEliminated
                                                                    ? alpha(c.danger, 0.06)
                                                                    : 'transparent',
                                                            opacity: isEliminated ? 0.75 : 1,
                                                        }}
                                                    >
                                                        <td style={tdStyle(c, { paddingLeft: 28 })}>
                                                            <span style={{ fontFamily: '"DM Mono", ui-monospace, monospace', fontSize: 22, fontWeight: 700, color: idx < 4 ? c.brand : c.faint }}>
                                                                {idx + 1}
                                                            </span>
                                                        </td>
                                                        <td style={tdStyle(c, {})}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                                {resolveFlagSrc(team, flagDataUrls) ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={resolveFlagSrc(team, flagDataUrls)!}
                                                                        alt={team.teamName}
                                                                        width={44}
                                                                        height={32}
                                                                        style={{ width: 44, height: 32, objectFit: 'contain', flexShrink: 0 }}
                                                                    />
                                                                ) : (
                                                                    <div style={{ width: 44, height: 32, borderRadius: 4, background: c.track, flexShrink: 0 }} />
                                                                )}
                                                                <span style={{ fontSize: 24, fontWeight: 600, color: c.text, letterSpacing: '-0.01em' }}>
                                                                    {team.teamName}
                                                                </span>
                                                                {isQualified && (
                                                                    <span style={{ fontSize: 14, fontWeight: 700, color: c.success, background: alpha(c.success, 0.16), padding: '3px 8px', borderRadius: 6, letterSpacing: '0.04em' }}>
                                                                        Q
                                                                    </span>
                                                                )}
                                                                {isEliminated && (
                                                                    <span style={{ fontSize: 14, fontWeight: 700, color: c.danger, border: `1.5px solid ${alpha(c.danger, 0.45)}`, padding: '2px 9px', borderRadius: 6, letterSpacing: '0.06em', background: 'transparent' }}>
                                                                        E
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={tdStyle(c, { textAlign: 'center', color: c.muted })}>{team.matchesPlayed}</td>
                                                        <td style={tdStyle(c, { textAlign: 'center', color: c.success, fontWeight: 600 })}>{team.matchesWon}</td>
                                                        <td style={tdStyle(c, { textAlign: 'center', color: c.danger, fontWeight: 600 })}>{team.matchesLost}</td>
                                                        <td style={tdStyle(c, { textAlign: 'center', color: c.muted })}>{team.matchesTied}</td>
                                                        <td style={tdStyle(c, { textAlign: 'center', color: c.muted })}>{team.noRes}</td>
                                                        <td style={tdStyle(c, { textAlign: 'center' })}>
                                                            <span style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 28, fontWeight: 700, color: c.text }}>
                                                                {team.points}
                                                            </span>
                                                        </td>
                                                        <td style={tdStyle(c, { textAlign: 'right', color: nrrColor, fontFamily: '"DM Mono", ui-monospace, monospace', fontWeight: 600 })}>
                                                            {nrr}
                                                        </td>
                                                        <td style={tdStyle(c, { textAlign: 'center', paddingRight: 28 })}>
                                                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                                                {team.form.slice(-5).map((r, i) => (
                                                                    <span
                                                                        key={i}
                                                                        style={{
                                                                            width: 26, height: 26, borderRadius: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontSize: 13, fontWeight: 700,
                                                                            background: r === 'W' ? alpha(c.success, 0.18) : r === 'L' ? alpha(c.danger, 0.18) : alpha(c.faint, 0.22),
                                                                            color: r === 'W' ? c.success : r === 'L' ? c.danger : c.muted,
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

function thStyle(c: SharePalette, extra: React.CSSProperties): React.CSSProperties {
    return {
        fontSize: 14, fontWeight: 700, color: c.faint, letterSpacing: '0.12em',
        textTransform: 'uppercase', padding: '14px 8px', ...extra,
    };
}

function tdStyle(c: SharePalette, extra: React.CSSProperties): React.CSSProperties {
    return {
        fontSize: 22, fontFamily: '"DM Mono", ui-monospace, monospace', padding: '14px 8px', color: c.text, ...extra,
    };
}

PointsTableShareCard.displayName = 'PointsTableShareCard';

export default PointsTableShareCard;
