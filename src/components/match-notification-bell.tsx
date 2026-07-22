'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import type { LiveMatch } from '@/app/actions';
import { useNotificationScopes } from '@/hooks/use-notification-scopes';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { buildSeriesHref } from '@/lib/utils';
import { rememberMatchLabel, rememberSeriesLabel } from '@/lib/notification-labels';

interface Props {
    match: LiveMatch;
    className?: string;
}

// A per-card notification bell. Tap opens a popover with four toggles: this
// match, this series, and each of the two teams. Toggles mutate a local draft;
// Save commits the diff to the hook (which persists to the server) and closes.
export default function MatchNotificationBell({ match, className }: Props) {
    const [open, setOpen] = useState(false);
    const { status, isMatchOn, isSeriesOn, isTeamOn, toggleMatch, toggleSeries, toggleTeam } = useNotificationScopes();
    const { subscribe, status: pushStatus } = usePushNotifications();

    const seriesId = seriesIdFromMatch(match);
    const team1 = match.teams?.[0]?.name;
    const team2 = match.teams?.[1]?.name;

    // Current saved state (derived from the hook).
    const savedMatch  = isMatchOn(match.matchId);
    const savedSeries = seriesId ? isSeriesOn(seriesId) : false;
    const savedTeam1  = team1 ? isTeamOn(team1) : false;
    const savedTeam2  = team2 ? isTeamOn(team2) : false;
    const anyOn = savedMatch || savedSeries || savedTeam1 || savedTeam2;

    // Draft state — resets to saved values whenever the popover opens.
    const [draft, setDraft] = useState({ match: false, series: false, team1: false, team2: false });
    useEffect(() => {
        if (open) setDraft({ match: savedMatch, series: savedSeries, team1: savedTeam1, team2: savedTeam2 });
    }, [open, savedMatch, savedSeries, savedTeam1, savedTeam2]);

    const dirty =
        draft.match !== savedMatch ||
        draft.series !== savedSeries ||
        draft.team1 !== savedTeam1 ||
        draft.team2 !== savedTeam2;

    const save = () => {
        // Only fire the toggles that actually changed to avoid needless writes.
        // Toggles are optimistic in the hook (state updates immediately, the
        // server sync happens in the background) so the popover can close
        // right away without waiting for the network. Labels are cached so the
        // "Following" strip can show real names, not just ids.
        if (draft.match !== savedMatch) {
            if (draft.match) rememberMatchLabel(match.matchId, match.title || 'Match');
            void toggleMatch(match.matchId);
        }
        if (seriesId && draft.series !== savedSeries) {
            if (draft.series && match.seriesName) rememberSeriesLabel(seriesId, match.seriesName);
            void toggleSeries(seriesId);
        }
        if (team1 && draft.team1 !== savedTeam1) void toggleTeam(team1);
        if (team2 && draft.team2 !== savedTeam2) void toggleTeam(team2);
        setOpen(false);
    };

    const stop = (e: React.MouseEvent | React.KeyboardEvent) => { e.stopPropagation(); e.preventDefault(); };

    return (
        <div className={className} onClick={stop} onKeyDown={stop}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label={anyOn ? 'Manage notifications for this match' : 'Follow this match'}
                        className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-colors ${
                            anyOn
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border/60 bg-card/40 hover:bg-card/70 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {anyOn
                            ? <BellRing className="w-3.5 h-3.5" />
                            : <Bell className="w-3.5 h-3.5" />}
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    className="w-64 p-1.5 rounded-xl"
                    onClick={stop}
                >
                    {status === 'permission-needed' || pushStatus === 'ready-to-subscribe' || pushStatus === 'error' ? (
                        <div className="px-3 py-2.5 space-y-2">
                            <p className="text-xs text-muted-foreground leading-snug">
                                Enable notifications to follow this match.
                            </p>
                            <button
                                type="button"
                                onClick={subscribe}
                                className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition"
                            >
                                Enable notifications
                            </button>
                        </div>
                    ) : status === 'not-subscribed' ? (
                        <div className="px-3 py-2.5 space-y-2">
                            <p className="text-xs text-muted-foreground leading-snug">
                                Notifications aren't enabled on this device.
                            </p>
                            <button
                                type="button"
                                onClick={subscribe}
                                className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition"
                            >
                                Enable notifications
                            </button>
                        </div>
                    ) : (
                        <div>
                            <ul className="space-y-0.5">
                                <Row
                                    label="This match"
                                    sub={shortMatchLabel(match)}
                                    checked={draft.match}
                                    onChange={(v) => setDraft((d) => ({ ...d, match: v }))}
                                />
                                {seriesId && (
                                    <Row
                                        label="This series"
                                        sub={match.seriesName}
                                        checked={draft.series}
                                        onChange={(v) => setDraft((d) => ({ ...d, series: v }))}
                                    />
                                )}
                                {team1 && (
                                    <Row
                                        label={team1}
                                        sub="Every match, every series"
                                        checked={draft.team1}
                                        onChange={(v) => setDraft((d) => ({ ...d, team1: v }))}
                                    />
                                )}
                                {team2 && (
                                    <Row
                                        label={team2}
                                        sub="Every match, every series"
                                        checked={draft.team2}
                                        onChange={(v) => setDraft((d) => ({ ...d, team2: v }))}
                                    />
                                )}
                            </ul>
                            <div className="pt-1.5 mt-1 border-t border-border/40 px-1.5">
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={!dirty}
                                    className={`w-full h-8 rounded-lg text-xs font-semibold transition ${
                                        dirty
                                            ? 'bg-primary text-primary-foreground hover:brightness-110'
                                            : 'bg-muted/50 text-muted-foreground cursor-default'
                                    }`}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}

function Row({
    label,
    sub,
    checked,
    onChange,
}: {
    label: string;
    sub?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <li>
            <label className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-tight">{label}</p>
                    {sub && <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{sub}</p>}
                </div>
                <Switch checked={checked} onCheckedChange={onChange} />
            </label>
        </li>
    );
}

function seriesIdFromMatch(match: LiveMatch): string | null {
    const href = buildSeriesHref(match.seriesName, match.seriesUrl);
    if (!href) return null;
    return href.match(/\/series\/(\d+)/)?.[1] ?? null;
}

function shortMatchLabel(match: LiveMatch): string {
    const parts = (match.title || '').split(',').map((s) => s.trim());
    if (parts.length > 1) return parts.slice(1).join(', ');
    return match.title || 'Match';
}
