'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotificationScopes } from '@/hooks/use-notification-scopes';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { getMatchLabel, getSeriesLabel } from '@/lib/notification-labels';

type FollowKind = 'team' | 'series' | 'match';
interface FollowItem {
    kind: FollowKind;
    id: string;
    label: string;
    href?: string;
    onRemove: () => void;
}

// Header trigger + popover for "what am I following". Sits next to Search and
// Theme. Icon mirrors those two (h-10 w-10, rounded-xl, subtle border) so it
// belongs. When at least one scope is active, the icon shifts to BellRing in
// primary and a red pulse dot sits in the corner. That dot deliberately echoes
// the LIVE indicator used across the app so returning users read it fast.
export default function FollowingButton() {
    const [open, setOpen] = useState(false);
    const { status, scopes, toggleTeam, toggleSeries, toggleMatch } = useNotificationScopes();
    const { subscribe } = usePushNotifications();

    const items = useMemo<FollowItem[]>(() => {
        const list: FollowItem[] = [];
        for (const team of scopes.teams) {
            list.push({ kind: 'team', id: team, label: team, onRemove: () => toggleTeam(team) });
        }
        for (const id of scopes.series) {
            list.push({
                kind: 'series',
                id,
                label: getSeriesLabel(id) || `Series ${id}`,
                href: `/series/${id}`,
                onRemove: () => toggleSeries(id),
            });
        }
        for (const id of scopes.matches) {
            list.push({
                kind: 'match',
                id,
                label: getMatchLabel(id) || `Match ${id}`,
                href: `/match/${id}`,
                onRemove: () => toggleMatch(id),
            });
        }
        return list;
    }, [scopes, toggleTeam, toggleSeries, toggleMatch]);

    const count = items.length;
    const anyOn = count > 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={anyOn ? `Following ${count}` : 'Following'}
                    className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-colors text-muted-foreground"
                >
                    {anyOn
                        ? <BellRing className="h-4 w-4 text-primary" />
                        : <Bell className="h-4 w-4" />}
                    {anyOn && (
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500/70 animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-1 ring-background" />
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[320px] p-0 rounded-xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                        Following
                    </h3>
                    {anyOn && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums">
                            {count} active
                        </span>
                    )}
                </div>

                {/* Body */}
                {status === 'permission-needed' || status === 'not-subscribed' ? (
                    <div className="px-4 py-5 space-y-3">
                        <p className="text-sm text-muted-foreground leading-snug">
                            Enable notifications to start following matches, series, and teams.
                        </p>
                        <button
                            type="button"
                            onClick={subscribe}
                            className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition"
                        >
                            Enable notifications
                        </button>
                    </div>
                ) : count === 0 ? (
                    <div className="px-4 py-6">
                        <p className="text-sm text-muted-foreground leading-snug">
                            You're not following anything yet.
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1.5 leading-snug">
                            Tap the bell on any match card to follow that match, its series, or either team.
                        </p>
                    </div>
                ) : (
                    <ul className="max-h-[380px] overflow-y-auto">
                        {items.map((item, i) => (
                            <FollowRow
                                key={`${item.kind}-${item.id}`}
                                item={item}
                                isLast={i === items.length - 1}
                                onClose={() => setOpen(false)}
                            />
                        ))}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    );
}

const KIND_LABEL: Record<FollowKind, string> = {
    team: 'Team',
    series: 'Series',
    match: 'Match',
};

function FollowRow({
    item,
    isLast,
    onClose,
}: {
    item: FollowItem;
    isLast: boolean;
    onClose: () => void;
}) {
    const body = (
        <>
            <span className="inline-flex items-center h-5 px-1.5 rounded text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 shrink-0 tabular-nums">
                {KIND_LABEL[item.kind]}
            </span>
            <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
                {item.label}
            </span>
        </>
    );

    return (
        <li className={`group relative ${isLast ? '' : 'border-b border-border/40'}`}>
            {item.href ? (
                <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 pl-4 pr-11 py-2.5 hover:bg-muted/50 transition-colors"
                >
                    {body}
                </Link>
            ) : (
                <div className="flex items-center gap-3 pl-4 pr-11 py-2.5">
                    {body}
                </div>
            )}
            <button
                type="button"
                aria-label={`Stop following ${item.label}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); item.onRemove(); }}
                className="absolute top-1/2 right-2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </li>
    );
}
