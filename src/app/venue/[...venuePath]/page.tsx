'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { getVenue } from '@/app/actions';
import type { VenuePageData } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, MapPin, ChevronRight } from 'lucide-react';

export default function VenuePage() {
  const router = useRouter();
  const params = useParams();
  const segments = (params.venuePath as string[] | undefined) ?? [];
  const venuePath = segments.join('/');

  const [data, setData] = useState<VenuePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [statFmt, setStatFmt] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!venuePath) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await getVenue(venuePath);
      if (cancelled) return;
      if (res.success && res.data) {
        setData(res.data);
        setStatFmt(0);
      } else setError(res.error ?? 'Failed to load venue.');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [venuePath, reloadKey]);

  const activeStats = data?.statGroups?.[statFmt];

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 w-full glass-nav">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3 h-14">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl shrink-0 hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {/* Reads "Venue" until the hero scrolls away, then swaps to the
                name so the header never repeats the big title on the image. */}
            <h1 className="text-lg md:text-xl font-display tracking-tight truncate">
              {loading ? 'Loading…' : scrolled ? data?.name || 'Venue' : 'Venue'}
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-5 space-y-5">
        {loading && (
          <div className="space-y-4">
            <div className="skeleton h-44 rounded-2xl" />
            <div className="skeleton h-40 rounded-2xl" />
            <div className="skeleton h-32 rounded-2xl" />
          </div>
        )}

        {!loading && error && (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertTitle>Unable to load venue</AlertTitle>
            <AlertDescription className="mt-2">{error}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </Button>
          </Alert>
        )}

        {!loading && !error && data && (
          <>
            {/* Hero: name + location overlaid on the image */}
            {data.imageUrl ? (
              <div className="surface-card overflow-hidden relative aspect-[16/9]">
                <Image
                  src={data.imageUrl}
                  alt={data.name}
                  fill
                  priority
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 768px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
                  <h2 className="text-2xl md:text-3xl font-display tracking-tight text-white drop-shadow-sm">
                    {data.name}
                  </h2>
                  {data.location && (
                    <p className="flex items-center gap-1.5 text-sm text-white/80 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {data.location}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="surface-card p-4 md:p-5">
                <h2 className="text-xl md:text-2xl font-display tracking-tight">{data.name}</h2>
                {data.location && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {data.location}
                  </p>
                )}
              </div>
            )}

            {/* Facts */}
            {data.facts.length > 0 && (
              <section>
                <SectionTitle>Facts</SectionTitle>
                <div className="surface-card divide-y divide-border/50 overflow-hidden">
                  {data.facts.map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">{f.label}</span>
                      <span className="text-sm font-medium text-foreground text-right">{f.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Matches scheduled, grouped by series */}
            {data.matchGroups.length > 0 && (
              <section className="space-y-4">
                <SectionTitle>Matches at this venue</SectionTitle>
                {data.matchGroups.map((g) => (
                  <div key={g.series}>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2 px-1 truncate">{g.series}</p>
                    <div className="surface-card divide-y divide-border/50 overflow-hidden">
                      {g.matches.map((m) => (
                        <Link
                          key={m.matchId}
                          href={`/match/${m.matchId}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{m.teams}</p>
                            {m.date && <p className="text-[11px] text-muted-foreground mt-0.5">{m.date}</p>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Stats, with a format switcher */}
            {data.statGroups.length > 0 && (
              <section>
                <SectionTitle>Stats</SectionTitle>
                {data.statGroups.length > 1 && (
                  <div className="flex gap-1.5 mb-3">
                    {data.statGroups.map((s, i) => (
                      <button
                        key={s.format}
                        onClick={() => setStatFmt(i)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          i === statFmt
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {s.format}
                      </button>
                    ))}
                  </div>
                )}
                {activeStats && (
                  <div className="surface-card divide-y divide-border/50 overflow-hidden">
                    {activeStats.rows.map((r) => (
                      <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-3">
                        <span className="text-sm text-muted-foreground min-w-0">{r.label}</span>
                        <span className="text-sm font-semibold text-foreground text-right tabular-nums shrink-0">{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{children}</h3>
  );
}
