'use client';

import { useEffect, useMemo, useState } from 'react';

interface Drop {
    left: string;
    delay: string;
    duration: string;
    width: number;
    height: number;
    opacity: number;
    blur?: number;
    rotate: number;
}

interface LayerSpec {
    count: number;
    widthRange: [number, number];
    heightRange: [number, number];
    durationRange: [number, number];
    opacityRange: [number, number];
    blur?: number;
    rotate: number;
}

// Three parallax layers make a flat animation read as depth. Back drops are
// small, faded and slow (distant); front drops are longer, sharper, and fast
// (close). The slight blur on the front layer gives a real-camera focus feel.
const LAYERS: LayerSpec[] = [
    { count: 55, widthRange: [0.5, 0.9], heightRange: [10, 22],  durationRange: [1.7, 2.4], opacityRange: [0.20, 0.38], rotate: 8 },
    { count: 70, widthRange: [0.9, 1.4], heightRange: [20, 38],  durationRange: [0.95, 1.4], opacityRange: [0.45, 0.65], rotate: 8 },
    { count: 35, widthRange: [1.4, 2.2], heightRange: [34, 68],  durationRange: [0.5, 0.8], opacityRange: [0.7, 0.95], blur: 0.35, rotate: 8 },
];

function makeDrops(spec: LayerSpec, seed: number): Drop[] {
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    return Array.from({ length: spec.count }, () => ({
        left: `${Math.random() * 105 - 2}%`,
        delay: `${-Math.random() * 1.4}s`,
        duration: `${rand(spec.durationRange[0], spec.durationRange[1])}s`,
        width: rand(spec.widthRange[0], spec.widthRange[1]),
        height: rand(spec.heightRange[0], spec.heightRange[1]),
        opacity: rand(spec.opacityRange[0], spec.opacityRange[1]),
        blur: spec.blur,
        rotate: spec.rotate + rand(-1, 1),
    }));
    void seed;
}

interface Ripple {
    left: string;
    size: number;
    delay: string;
    duration: string;
}

function makeRipples(count: number): Ripple[] {
    return Array.from({ length: count }, () => {
        // Mix of small quick ripples and larger slow ones for organic look.
        const big = Math.random() < 0.35;
        const size = big ? 40 + Math.random() * 60 : 14 + Math.random() * 26;
        const duration = big ? 1.0 + Math.random() * 0.8 : 0.55 + Math.random() * 0.5;
        return {
            left: `${Math.random() * 100}%`,
            size,
            delay: `${-Math.random() * 1.6}s`,
            duration: `${duration}s`,
        };
    });
}

// Ambient rain animation that plays for `duration` ms then fades out.
// Positioned fixed over the viewport, pointer-events off so it never
// interferes with UI. Drops are randomised once per mount.
export default function RainOverlay({
    active,
    duration = 5000,
    onDone,
}: {
    active: boolean;
    duration?: number;
    onDone?: () => void;
}) {
    const [rendered, setRendered] = useState(active);
    const [phase, setPhase] = useState<'in' | 'out'>('in');

    const layers = useMemo(() => LAYERS.map((spec, i) => makeDrops(spec, i)), []);
    const ripples = useMemo(() => makeRipples(48), []);

    useEffect(() => {
        if (!active) return;
        setRendered(true);
        setPhase('in');
        const fadeOutStart = window.setTimeout(() => setPhase('out'), Math.max(0, duration - 700));
        const removeAt = window.setTimeout(() => {
            setRendered(false);
            onDone?.();
        }, duration);
        return () => {
            clearTimeout(fadeOutStart);
            clearTimeout(removeAt);
        };
    }, [active, duration, onDone]);

    if (!rendered) return null;

    return (
        <div
            className={`fixed inset-0 pointer-events-none z-50 overflow-hidden ${phase === 'in' ? 'rain-fade-in' : 'rain-fade-out'}`}
            aria-hidden
        >
            {/* Storm vignette — light-touch darkening so drops feel lit from
                within the scene without dimming the UI beneath. */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(15,23,42,0.12) 100%),' +
                        'linear-gradient(to bottom, rgba(15,23,42,0.10), transparent 25%, transparent 80%, rgba(15,23,42,0.12))',
                }}
            />

            {/* Floor — a collecting water pool that rises during the animation.
                Ripples spawn on its top edge as drops "hit" the surface. */}
            <div className="absolute inset-x-0 bottom-0 rain-pool overflow-visible">
                {/* Pool body — deeper gradient with proper water tones */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(to top, rgba(2,10,26,0.92) 0%, rgba(6,26,54,0.80) 30%, rgba(14,52,100,0.55) 65%, rgba(48,110,180,0.20) 92%, rgba(180,220,255,0.05) 100%)',
                    }}
                />
                {/* Deep bottom shadow — hint of depth at the pool floor */}
                <div
                    className="absolute inset-x-0 bottom-0 h-3"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }}
                />
                {/* Subsurface glow band — faint horizontal light diffusing
                    just under the surface, like light hitting shallow water */}
                <div
                    className="absolute inset-x-0 top-1.5 h-1.5"
                    style={{
                        background:
                            'linear-gradient(90deg, transparent 0%, rgba(186,230,253,0.20) 25%, rgba(224,242,254,0.15) 55%, rgba(186,230,253,0.20) 80%, transparent 100%)',
                        filter: 'blur(1px)',
                    }}
                />
                {/* Moving sheen sweep — light glinting across the surface */}
                <div
                    className="absolute inset-0 rain-pool-sheen"
                    style={{
                        background:
                            'linear-gradient(90deg, transparent 25%, rgba(186,230,253,0.22) 50%, transparent 75%)',
                    }}
                />
                {/* Wavy meniscus at the surface — SVG wave gives an undulating
                    top edge and a bright waterline highlight. Two layers with
                    slightly different opacities read as light + shadow on the
                    surface curvature. */}
                <svg
                    className="absolute inset-x-0 -top-[3px] h-[6px] w-full"
                    preserveAspectRatio="none"
                    viewBox="0 0 1200 6"
                    aria-hidden
                >
                    <path
                        d="M0,3 Q75,0 150,3 T300,3 T450,3 T600,3 T750,3 T900,3 T1050,3 T1200,3 L1200,6 L0,6 Z"
                        fill="rgba(224,242,254,0.55)"
                    />
                    <path
                        d="M0,3.5 Q100,1.5 200,3.5 T400,3.5 T600,3.5 T800,3.5 T1000,3.5 T1200,3.5"
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="0.6"
                    />
                </svg>
                {/* Ripples spawned along the pool's top edge — mix of small
                    and large, staggered timings for organic distribution */}
                <div className="absolute inset-x-0 top-0 h-0">
                    {ripples.map((r, i) => (
                        <span
                            key={i}
                            className="rain-ripple"
                            style={{
                                left: r.left,
                                top: -Math.round(r.size / 8),
                                width: `${r.size}px`,
                                height: `${Math.round(r.size / 3)}px`,
                                marginLeft: `-${Math.round(r.size / 2)}px`,
                                animationDelay: r.delay,
                                animationDuration: r.duration,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Parallax layers back → front */}
            {layers.map((drops, layerIdx) => (
                <div key={layerIdx} className="absolute inset-0">
                    {drops.map((d, i) => (
                        <span
                            key={i}
                            className="rain-drop"
                            style={{
                                left: d.left,
                                animationDelay: d.delay,
                                animationDuration: d.duration,
                            }}
                        >
                            <span
                                className="block"
                                style={{
                                    width: `${d.width}px`,
                                    height: `${d.height}px`,
                                    opacity: d.opacity,
                                    transform: `rotate(${d.rotate}deg)`,
                                    filter: d.blur ? `blur(${d.blur}px)` : undefined,
                                    background:
                                        'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(224,242,254,0.95) 55%, rgba(186,230,253,0.35) 100%)',
                                    borderRadius: '9999px',
                                    boxShadow: d.blur ? '0 0 3px rgba(186,230,253,0.35)' : undefined,
                                }}
                            />
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}
