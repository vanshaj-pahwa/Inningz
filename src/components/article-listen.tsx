'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Play, Pause, X, LoaderCircle } from 'lucide-react';
import type { NewsArticle } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type PlaybackState = 'idle' | 'playing' | 'paused';

// Global state for sharing audio player state with other components
let audioState = {
    state: 'idle' as PlaybackState,
    voice: null as SpeechSynthesisVoice | null,
    voiceOptions: [] as SpeechSynthesisVoice[],
    rate: 1,
    changeVoice: (name: string) => {},
    changeRate: (rate: number) => {},
};

const audioStateListeners = new Set<() => void>();

export function useAudioState() {
    const [, setTrigger] = useState({});

    useEffect(() => {
        const listener = () => setTrigger({});
        audioStateListeners.add(listener);
        return () => { audioStateListeners.delete(listener); };
    }, []);

    return audioState;
}

function updateAudioState(updates: Partial<typeof audioState>) {
    audioState = { ...audioState, ...updates };
    audioStateListeners.forEach(listener => listener());
}

/** Points a chunk (utterance) back at its source block so highlighting can
 *  find the right paragraph DOM element. `blockKey` is the same value we
 *  stamp onto `data-listen-idx` in the article renderer. */
type ChunkMeta = {
    text: string;
    /** `'title'` / `'description'` for header text, numeric index for body
     *  blocks. Matches `data-listen-idx` on the DOM node. */
    blockKey: string | number;
    /** Character offset into that block's plain text where this chunk
     *  starts. Added to the boundary event's `charIndex` to locate the
     *  word inside the full block text. */
    offsetInBlock: number;
};

interface Props {
    article: NewsArticle | null;
}

const HIGHLIGHT_NAME = 'tts-word';

// Feature detection for the CSS Custom Highlight API. Not present on
// older Firefox / older Safari; we simply skip the paint in those cases.
function hasCssHighlights(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof CSS !== 'undefined'
        && 'highlights' in CSS
        && typeof (window as unknown as { Highlight?: unknown }).Highlight === 'function';
}

// Split a paragraph into speech-friendly chunks. Chrome's speechSynthesis
// silently truncates any single utterance longer than ~15 seconds of
// speech (roughly ~200 chars at rate 1.0), which drops the last few words
// of every long chunk. Keeping chunks small (~140 chars) sidesteps this;
// long sentences get split further at word boundaries so no chunk ever
// exceeds the cap.
function splitToChunks(text: string, maxLen = 140): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.length <= maxLen) return [trimmed];
    const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [trimmed];

    // Fallback: split a too-long segment at the nearest word boundary
    // <= maxLen so no chunk ever exceeds the cap.
    const splitLongSentence = (s: string): string[] => {
        const parts: string[] = [];
        let rest = s.trim();
        while (rest.length > maxLen) {
            // Find the last space within maxLen
            let cut = rest.lastIndexOf(' ', maxLen);
            if (cut <= 0) cut = maxLen; // no space? hard cut
            parts.push(rest.slice(0, cut).trim());
            rest = rest.slice(cut).trim();
        }
        if (rest) parts.push(rest);
        return parts;
    };

    const out: string[] = [];
    let cur = '';
    for (const s of sentences) {
        // Sentence alone exceeds cap: flush current buffer, then word-split.
        if (s.length > maxLen) {
            if (cur.trim()) { out.push(cur.trim()); cur = ''; }
            for (const p of splitLongSentence(s)) out.push(p);
            continue;
        }
        if ((cur + s).length > maxLen && cur) {
            out.push(cur.trim());
            cur = s;
        } else {
            cur += s;
        }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

// Some browsers don't populate `charLength` on boundary events. Compute the
// end of the word by scanning forward for the next whitespace-ish boundary.
function wordEnd(text: string, charIndex: number, charLength?: number): number {
    if (charLength && charLength > 0) return Math.min(text.length, charIndex + charLength);
    const rest = text.slice(charIndex);
    const m = rest.match(/^\S+/);
    return charIndex + (m ? m[0].length : 0);
}

// Pre-compute every word's character span inside a chunk. Used by the
// timer-based fallback to walk word-by-word when the voice doesn't emit
// per-word `onboundary` events (Chrome's Google cloud voices, most
// Firefox builds).
function wordSpans(text: string): Array<{ start: number; end: number }> {
    const spans: Array<{ start: number; end: number }> = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        spans.push({ start: m.index, end: m.index + m[0].length });
    }
    return spans;
}

// Find the word span whose start is closest to (but ≤) `charIndex`. Used
// to snap the timer-driven cursor back to the position an `onboundary`
// event reports whenever one does fire.
function findWordAt(spans: Array<{ start: number; end: number }>, charIndex: number): number {
    if (spans.length === 0) return -1;
    // Binary search wouldn't buy much for ~50-word chunks; linear scan is fine.
    let best = 0;
    for (let i = 0; i < spans.length; i++) {
        if (spans[i].start <= charIndex) best = i;
        else break;
    }
    return best;
}

// Walk a paragraph's text nodes and produce a Range covering
// [start, end) in its accumulated textContent. Returns null if the offsets
// are outside the element's text length.
function rangeAtCharOffset(el: Element, start: number, end: number): Range | null {
    if (start >= end) return null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node = walker.nextNode() as Text | null;
    let acc = 0;
    let startSet = false;
    while (node) {
        const next = acc + node.length;
        if (!startSet && start >= acc && start < next) {
            range.setStart(node, start - acc);
            startSet = true;
        }
        if (startSet && end <= next) {
            range.setEnd(node, end - acc);
            return range;
        }
        acc = next;
        node = walker.nextNode() as Text | null;
    }
    return null;
}

// Normalise a block's text the same way we produce speech text. Keeps the
// offsets in our chunks aligned with what the DOM's textContent reports.
function plainFromHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

const SPEED_OPTIONS: Array<{ value: number; label: string }> = [
    { value: 0.75, label: '0.75×' },
    { value: 1, label: '1×' },
    { value: 1.25, label: '1.25×' },
    { value: 1.5, label: '1.5×' },
    { value: 2, label: '2×' },
];

export default function ArticleListen({ article }: Props) {
    const [supported, setSupported] = useState<boolean>(true);
    const [state, setState] = useState<PlaybackState>('idle');
    const [progress, setProgress] = useState(0); // 0..1
    const [rate, setRate] = useState(1);
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [ready, setReady] = useState(false);

    // Refs so `onend` / `onboundary` callbacks always read the freshest
    // values without stale closures.
    const chunksRef = useRef<ChunkMeta[]>([]);
    const idxRef = useRef(0);
    const playingRef = useRef(false);
    const rateRef = useRef(1);
    const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
    // Chrome silently freezes the TTS engine after ~15 seconds of
    // continuous speech unless `pause()` + `resume()` is called
    // periodically to reset the internal timer. The interval is armed
    // while playback is active and cleared on stop / pause / unmount.
    const keepAliveRef = useRef<number | null>(null);
    const stopKeepAlive = () => {
        if (keepAliveRef.current !== null) {
            window.clearInterval(keepAliveRef.current);
            keepAliveRef.current = null;
        }
    };
    const startKeepAlive = () => {
        stopKeepAlive();
        keepAliveRef.current = window.setInterval(() => {
            if (!playingRef.current) { stopKeepAlive(); return; }
            if (window.speechSynthesis.speaking) {
                // The pause/resume dance is imperceptible to the listener
                // but resets Chrome's internal watchdog so playback
                // continues past the 15-second cutoff.
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 10000);
    };

    // Build the utterance queue AND remember which block each chunk came
    // from so the highlight pass can target the right paragraph DOM.
    const chunks = useMemo<ChunkMeta[]>(() => {
        if (!article) return [];
        const out: ChunkMeta[] = [];
        const emitBlock = (key: string | number, plain: string) => {
            if (!plain) return;
            const pieces = splitToChunks(plain);
            let cursor = 0;
            for (const p of pieces) {
                // Locate the chunk inside the block's plain text so we know
                // the offset for the DOM range walker. `indexOf` from the
                // running cursor keeps us monotonic through repeated words.
                const idx = plain.indexOf(p, cursor);
                const off = idx >= 0 ? idx : cursor;
                out.push({ text: p, blockKey: key, offsetInBlock: off });
                cursor = off + p.length;
            }
        };
        if (article.title) emitBlock('title', article.title);
        if (article.description) emitBlock('description', article.description);
        const blocks = article.blocks || [];
        let bodyChunks = 0;
        blocks.forEach((b, bi) => {
            if (b.type === 'paragraph') {
                const plain = plainFromHtml(b.html);
                if (plain) { emitBlock(bi, plain); bodyChunks++; }
            } else if (b.type === 'heading') {
                emitBlock(bi, b.text);
                bodyChunks++;
            }
        });
        if (bodyChunks === 0 && article.paragraphs?.length) {
            article.paragraphs.forEach((p, i) => {
                if (p.trim()) emitBlock(`p:${i}`, p.trim());
            });
        }
        return out;
    }, [article]);

    // Set up the highlight registry once so we can push/clear ranges
    // without touching the DOM. Falls back to a no-op if unsupported.
    // The `::highlight(...)` rule is injected at runtime here because
    // Turbopack's static CSS parser rejects the pseudo-element syntax at
    // build time — inserting the sheet from JS bypasses that entirely
    // while the browser understands it fine.
    const highlightRef = useRef<Highlight | null>(null);
    useEffect(() => {
        if (!hasCssHighlights()) return;
        const H = (window as unknown as { Highlight: typeof Highlight }).Highlight;
        let h = CSS.highlights.get(HIGHLIGHT_NAME) as Highlight | undefined;
        if (!h) {
            h = new H();
            CSS.highlights.set(HIGHLIGHT_NAME, h);
        }
        highlightRef.current = h;
        // Inject the paint rule once per document. Idempotent via the
        // `data-tts-highlight-css` attribute so hot-reloads and multiple
        // ArticleListen mounts don't stack duplicate <style> tags.
        const styleId = 'tts-highlight-css';
        if (!document.head.querySelector(`style[data-${styleId}]`)) {
            const style = document.createElement('style');
            style.setAttribute(`data-${styleId}`, 'true');
            style.textContent = [
                '::highlight(' + HIGHLIGHT_NAME + ') {',
                '  background-color: hsl(var(--primary) / 0.22);',
                '  color: hsl(var(--primary));',
                '  border-radius: 3px;',
                '}',
            ].join('\n');
            document.head.appendChild(style);
        }
        return () => { h?.clear(); };
    }, []);

    // Capability check + voice selection. Some browsers return an empty
    // voice list on first read and fire a `voiceschanged` event later.
    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            setSupported(false);
            return;
        }
        const pickVoice = () => {
            const list = window.speechSynthesis.getVoices();
            if (list.length === 0) return;
            const en = list.filter(v => v.lang.toLowerCase().startsWith('en'));
            const pool = en.length > 0 ? en : list;
            // LOCAL voices are strongly preferred: Chrome's Google cloud
            // voices simply don't fire `onboundary` word events, which
            // means no article-body highlighting. Microsoft (Windows) /
            // Siri (Mac) / Android system voices all fire boundaries
            // reliably. Fall back to the network voices only if there's no
            // local option available.
            const localOnes = pool.filter(v => v.localService);
            const searchPool = localOnes.length > 0 ? localOnes : pool;
            const naturalRe = /(natural|neural|premium|enhanced|siri|samantha|karen|daniel|arthur|aria|zira|david|hazel)/i;
            const best = searchPool.find(v => naturalRe.test(v.name)) || searchPool[0];
            voiceRef.current = best;
            setVoice(best);
            setReady(true);
        };
        pickVoice();
        window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
        return () => window.speechSynthesis.removeEventListener?.('voiceschanged', pickVoice);
    }, []);

    // Clean up any queued audio + clear the highlight on unmount.
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            stopKeepAlive();
            highlightRef.current?.clear();
        };
    }, []);

    // Reset when the article id changes so we don't keep speaking the old story.
    const articleId = article?.id;
    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        stopKeepAlive();
        highlightRef.current?.clear();
        setState('idle');
        setProgress(0);
        idxRef.current = 0;
        playingRef.current = false;
    }, [articleId]);

    // Paint the highlight for the current word. Called from `onboundary`.
    const paintWord = useCallback((meta: ChunkMeta, start: number, end: number) => {
        const h = highlightRef.current;
        if (!h) return;
        h.clear();
        const el = document.querySelector<HTMLElement>(
            `[data-listen-idx="${String(meta.blockKey)}"]`,
        );
        if (!el) return;
        const range = rangeAtCharOffset(
            el,
            meta.offsetInBlock + start,
            meta.offsetInBlock + end,
        );
        if (range) {
            h.add(range);
            // Keep the paragraph in view. `nearest` avoids jerky scrolls
            // when the word is already visible.
            try {
                (range.startContainer.parentElement || el).scrollIntoView({
                    behavior: 'smooth', block: 'nearest',
                });
            } catch { /* ignore */ }
        }
    }, []);

    const speakNext = useCallback(() => {
        if (!playingRef.current) return;
        const arr = chunksRef.current;
        const i = idxRef.current;
        if (i >= arr.length) {
            playingRef.current = false;
            highlightRef.current?.clear();
            setState('idle');
            setProgress(1);
            return;
        }
        const meta = arr[i];
        const u = new SpeechSynthesisUtterance(meta.text);
        u.rate = rateRef.current;
        if (voiceRef.current) u.voice = voiceRef.current;
        u.onboundary = (event: SpeechSynthesisEvent) => {
            if (event.name && event.name !== 'word') return;
            const start = event.charIndex ?? 0;
            const end = wordEnd(meta.text, start, event.charLength);
            paintWord(meta, start, end);
        };
        u.onend = () => {
            if (!playingRef.current) return;
            idxRef.current = i + 1;
            setProgress(arr.length ? (i + 1) / arr.length : 1);
            speakNext();
        };
        u.onerror = (e: SpeechSynthesisErrorEvent) => {
            if (e.error === 'interrupted' || e.error === 'canceled') return;
            playingRef.current = false;
            setState('idle');
        };
        window.speechSynthesis.speak(u);
    }, [paintWord]);

    const start = useCallback(() => {
        if (!supported || chunks.length === 0) return;
        chunksRef.current = chunks;
        idxRef.current = 0;
        rateRef.current = rate;
        playingRef.current = true;
        setState('playing');
        setProgress(0);
        window.speechSynthesis.cancel();
        // A tiny delay avoids Chrome swallowing the first utterance if we
        // speak() immediately after cancel().
        setTimeout(speakNext, 60);
        startKeepAlive();
    }, [chunks, rate, speakNext, supported]);

    const pause = useCallback(() => {
        if (!supported) return;
        window.speechSynthesis.pause();
        setState('paused');
        // Stop the watchdog while paused so it doesn't accidentally
        // resume playback via its own pause/resume cycle.
        stopKeepAlive();
    }, [supported]);

    const resume = useCallback(() => {
        if (!supported) return;
        window.speechSynthesis.resume();
        setState('playing');
        startKeepAlive();
    }, [supported]);

    const stop = useCallback(() => {
        if (!supported) return;
        playingRef.current = false;
        stopKeepAlive();
        // Chrome bug workaround: cancel() on a PAUSED utterance sometimes
        // doesn't release the audio channel. Resume first so cancel()
        // actually stops playback, then cancel to clear the queue.
        try { window.speechSynthesis.resume(); } catch { /* not paused */ }
        window.speechSynthesis.cancel();
        highlightRef.current?.clear();
        setState('idle');
        setProgress(0);
        idxRef.current = 0;
    }, [supported]);

    const changeRate = useCallback((next: number) => {
        setRate(next);
        rateRef.current = next;
        if (playingRef.current) {
            window.speechSynthesis.cancel();
            setTimeout(speakNext, 60);
        }
    }, [speakNext]);

    // Store all available voices so the switcher dropdown can list them.
    // Refreshed by the same `voiceschanged` event that seeds the default.
    const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([]);
    useEffect(() => {
        if (!supported || typeof window === 'undefined') return;
        const load = () => setVoiceList(window.speechSynthesis.getVoices());
        load();
        window.speechSynthesis.addEventListener?.('voiceschanged', load);
        return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
    }, [supported]);

    // Only expose voices that fire `onboundary` word events — otherwise the
    // in-article word highlight sits frozen on the first word for the whole
    // utterance. In practice that means dropping every network voice
    // (`localService === false`): Chrome's Google cloud voices, some
    // Microsoft cloud entries. Locally-installed system voices (Microsoft
    // David / Zira on Windows, Siri / Samantha on Mac, native Android
    // engines) all emit boundaries. Falls back to the full list only if the
    // browser has no local voices at all, so the menu is never empty.
    const voiceOptions = useMemo(() => {
        const en = voiceList.filter(v => v.lang.toLowerCase().startsWith('en'));
        const pool = en.length > 0 ? en : voiceList;
        const localOnly = pool.filter(v => v.localService);
        return localOnly.length > 0 ? localOnly : pool;
    }, [voiceList]);

    const changeVoice = useCallback((name: string) => {
        const next = voiceList.find(v => v.name === name);
        if (!next) return;
        voiceRef.current = next;
        setVoice(next);
        if (playingRef.current) {
            // Restart the current chunk so the swap is audible immediately
            // rather than deferred to the next sentence boundary.
            window.speechSynthesis.cancel();
            setTimeout(speakNext, 60);
        }
    }, [voiceList, speakNext]);

    // Sync local state with global audio state for other components
    useEffect(() => {
        updateAudioState({
            state,
            voice,
            voiceOptions,
            rate,
            changeVoice,
            changeRate,
        });
    }, [state, voice, voiceOptions, rate, changeVoice, changeRate]);

    if (!supported) return null;

    const canPlay = chunks.length > 0;

    const buttonIcon =
        state === 'playing' ? <Pause className="h-4 w-4 text-primary" aria-hidden />
        : state === 'paused' ? <Play className="h-4 w-4 text-primary" aria-hidden />
        : ready ? <Headphones className="h-4 w-4" aria-hidden />
        : <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />;
    const buttonLabel =
        state === 'playing' ? 'Pause listen'
        : state === 'paused' ? 'Resume listen'
        : 'Listen to article';

    const onToggle = () => {
        if (state === 'idle') start();
        else if (state === 'playing') pause();
        else resume();
    };

    const currentSpeedLabel = SPEED_OPTIONS.find(s => s.value === rate)?.label ?? '1×';

    return (
        <Button
            variant="ghost"
            size="icon"
            className={`rounded-xl h-9 w-9 ${state !== 'idle' ? 'bg-primary/10' : ''}`}
            onClick={onToggle}
            disabled={!article || !canPlay}
            aria-label={buttonLabel}
            title={buttonLabel}
        >
            {buttonIcon}
        </Button>
    );
}
