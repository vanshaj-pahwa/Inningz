'use client';

import { Gauge, Mic2 } from 'lucide-react';
import { useAudioState } from './article-listen';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SPEED_OPTIONS = [
    { value: 0.75, label: '0.75×' },
    { value: 1, label: '1×' },
    { value: 1.25, label: '1.25×' },
    { value: 1.5, label: '1.5×' },
    { value: 2, label: '2×' },
];

export default function AudioControlBar() {
    const audioState = useAudioState();
    const { state, voice, voiceOptions, rate, changeVoice, changeRate } = audioState;

    if (state === 'idle') return null;

    const currentSpeedLabel = SPEED_OPTIONS.find(s => s.value === rate)?.label ?? '1×';

    return (
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 px-4 py-2">
                {voiceOptions.length > 1 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 text-foreground/70 hover:text-foreground hover:border-primary/40 transition-colors"
                                aria-label={`Voice: ${voice?.name ?? 'default'}`}
                                title={`Voice: ${voice?.name ?? 'default'}`}
                            >
                                <Mic2 className="w-4 h-4" aria-hidden />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="center"
                            side="bottom"
                            className="min-w-56 max-w-[80vw] rounded-xl max-h-72 overflow-y-auto"
                        >
                            <DropdownMenuRadioGroup
                                value={voice?.name ?? ''}
                                onValueChange={changeVoice}
                            >
                                {voiceOptions.map((v) => (
                                    <DropdownMenuRadioItem
                                        key={v.voiceURI || v.name}
                                        value={v.name}
                                        className="text-sm"
                                    >
                                        <span className="flex items-baseline gap-2 min-w-0">
                                            <span className="truncate">{v.name}</span>
                                            <span className="text-xs text-muted-foreground shrink-0 uppercase tracking-wider">
                                                {v.lang}
                                            </span>
                                        </span>
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg border border-border/60 text-[11px] font-semibold text-foreground/70 hover:text-foreground hover:border-primary/40 transition-colors"
                            aria-label="Playback speed"
                            title="Playback speed"
                        >
                            <Gauge className="w-3.5 h-3.5" aria-hidden />
                            <span className="tabular-nums">{currentSpeedLabel}</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" side="bottom" className="min-w-24 rounded-xl">
                        <DropdownMenuRadioGroup
                            value={String(rate)}
                            onValueChange={(v) => changeRate(Number(v))}
                        >
                            {SPEED_OPTIONS.map(opt => (
                                <DropdownMenuRadioItem
                                    key={opt.value}
                                    value={String(opt.value)}
                                    className="text-sm tabular-nums"
                                >
                                    {opt.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
