'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bookmark, Newspaper, Share2, Clock } from 'lucide-react';
import { getCricketNews, getAltUpstreamNewsShell, getPlayerProfile } from '@/app/actions';
import type { NewsArticle, NewsItem, NewsBlock, LiveMatch, PlayerProfile } from '@/app/actions';
import MatchCard from '@/components/match-card';
import PlayerProfileDisplay from '@/components/player-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { buildNewsHref, buildTeamHref, buildSeriesHref, buildMatchHref, toFaceCroppedThumb } from '@/lib/utils';
import { NEWS_ARTICLE_BASE_URLS } from '@/lib/upstream';
import { parseJinaArticle, extractJinaLdImages, LAZY_IMAGE_SENTINEL } from '@/lib/parse-jina-article';

export default function NewsArticleClient() {
    const router = useRouter();
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
    const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug as string);

    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [related, setRelated] = useState<NewsItem[]>([]);
    // Fallback hero image from the RSS feed (a proper .jpg from the news image
    // CDN) for stories whose scraped heroImageUrl is a video thumbnail that
    // Next.js Image can't render (no file extension, no MIME sniff).
    const [feedHeroImage, setFeedHeroImage] = useState<string | undefined>(undefined);
    // True while the client-side reader is fetching + parsing the body after
    // the server scrape returned empty. Used to swap the empty body area for a
    // skeleton so the reader sees progress, not a blank space.
    const [bodyScraping, setBodyScraping] = useState(false);
    // Player-profile dialog state — mirrors the pattern in series-stats so
    // tag pills for players open the same overlay the rest of the app uses.
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    useEffect(() => {
        if (!selectedProfileId) return;
        setProfileLoading(true);
        getPlayerProfile(selectedProfileId, selectedPlayerName || undefined).then(result => {
            if (result.success && result.data) setSelectedProfile(result.data);
            setProfileLoading(false);
        });
    }, [selectedProfileId, selectedPlayerName]);
    // Where the click originated. The two upstreams recycle numeric ids in
    // different namespaces (id 138004 exists on both and points to different
    // stories), so the body reader MUST fetch from the origin that produced
    // the click. Series-tab links carry `?src=series`; everything else is a
    // main news tab link. Use useSearchParams (reactive) instead of reading
    // window.location.search — the latter can lag one render behind on
    // client-side navigations and mis-route the fetch on the first render.
    const searchParams = useSearchParams();
    const origin: 'news' | 'series' = searchParams?.get('src') === 'series' ? 'series' : 'news';
    // Guard so the reader-service enrichment fires at most once per (id, slug)
    // pair — otherwise setArticle inside the effect could re-trigger it when
    // the enriched blob still lacks fields the "healthy" heuristic requires.
    const enrichedRef = useRef<string | null>(null);

    // Load the article shell (title, description, hero, publishedAt) from the
    // RSS feed — the server-side scrape used to fill blocks here too, but its
    // cache was returning stale/mispaired content, so blocks are now sourced
    // exclusively from the reader effect below. This effect gets the shell up
    // instantly; the reader effect fills in the body.
    useEffect(() => {
        // Reset per-article state at the top so an in-flight client-side
        // navigation can't render stale content or an error from the
        // previous article while the new fetch is still running.
        setArticle(null);
        setError(null);
        setLoading(true);
        setBodyScraping(false);
        enrichedRef.current = null;
        (async () => {
            const feedResult = await getCricketNews();
            const feedItem = feedResult.success && feedResult.data
                ? feedResult.data.items.find(i => i.id === id)
                : undefined;
            if (feedResult.success && feedResult.data) {
                setRelated(feedResult.data.items.filter(i => i.id !== id).slice(0, 8));
                if (feedItem?.imageUrl) setFeedHeroImage(feedItem.imageUrl);
            }
            // Series-tab clicks skip the RSS lookup entirely — those ids
            // live in a different namespace and a hit would render the wrong
            // story. Build the shell straight from the alternate upstream.
            if (origin === 'series') {
                const shell = await fetchAltUpstreamShell(id, slug);
                if (shell) setArticle(shell);
                else setError('Failed to load article');
            } else if (feedItem) {
                setArticle({
                    id: feedItem.id,
                    slug: feedItem.slug,
                    title: feedItem.title,
                    description: feedItem.description,
                    publishedAt: feedItem.publishedAt,
                    heroImageUrl: feedItem.imageUrl,
                    heroImageCaption: undefined,
                    category: undefined,
                    author: undefined,
                    wordCount: 0,
                    readTimeMinutes: 0,
                    paragraphs: [],
                    blocks: [],
                    tags: [],
                    related: [],
                    mostRead: [],
                });
            } else {
                setError('Failed to load article');
            }
            setLoading(false);
        })();
    }, [id, slug, origin]);


    // Body content comes exclusively from the reader service. Rationale: the
    // upstream's own scrape caches were serving truncated/mispaired content
    // from datacenter IPs. The reader runs from the viewer's residential IP
    // so it returns the full article. Blocks, paragraphs, hero caption and
    // read-time are all sourced from this response — no server-side merge.
    useEffect(() => {
        if (!article) return;
        if (!slug) return;
        // Series-origin articles already carry their full body from the
        // server-side shell — no browser-side reader pass needed.
        if (origin === 'series') return;
        const key = `${id}::${slug}`;
        if (enrichedRef.current === key) return;
        enrichedRef.current = key;
        let cancelled = false;
        setBodyScraping(true);
        (async () => {
            const bases = NEWS_ARTICLE_BASE_URLS.map(base => `${base}/story/${slug}-${id}`);
            try {
                for (const target of bases) {
                    try {
                        // Markdown gives clean structure fast; HTML mode gives
                        // real image URLs via JSON-LD. Fetch both in parallel.
                        const readerUrl = `https://r.jina.ai/${target}`;
                        const [md, html] = await Promise.all([
                            fetch(readerUrl).then(r => r.ok ? r.text() : ''),
                            fetch(readerUrl, { headers: { 'X-Return-Format': 'html' } })
                                .then(r => r.ok ? r.text() : '')
                                .catch(() => ''),
                        ]);
                        if (cancelled || !md) continue;
                        const parsed = parseJinaArticle(md);
                        if (parsed.blocks.length === 0) continue;
                        // Swap sentinel URLs with real ones from HTML-mode JSON-LD,
                        // matched by document order (Nth lazy image → Nth record).
                        let heroFromHtml: string | undefined;
                        let heroCaptionFromHtml: string | undefined;
                        if (html) {
                            const records = extractJinaLdImages(html);
                            let recIdx = 0;
                            const enrichedBlocks = parsed.blocks.map(b => {
                                if (b.type !== 'image' || b.imageUrl !== LAZY_IMAGE_SENTINEL) return b;
                                const rec = records[recIdx++];
                                if (!rec) return b;
                                return { ...b, imageUrl: rec.url, caption: b.caption || rec.caption };
                            });
                            // If markdown had no hero but HTML has an unused first
                            // record, promote it to the hero.
                            if (!parsed.heroImageUrl && records.length > recIdx) {
                                heroFromHtml = records[recIdx].url;
                                heroCaptionFromHtml = records[recIdx].caption;
                            }
                            parsed.blocks = enrichedBlocks.filter(b =>
                                b.type !== 'image' || b.imageUrl !== LAZY_IMAGE_SENTINEL
                            );
                        } else {
                            parsed.blocks = parsed.blocks.filter(b =>
                                b.type !== 'image' || b.imageUrl !== LAZY_IMAGE_SENTINEL
                            );
                        }
                        const wordCount = parsed.paragraphs
                            .reduce((n, p) => n + p.split(/\s+/).filter(Boolean).length, 0);
                        const readTimeMinutes = Math.max(1, Math.round(wordCount / 220));
                        setArticle(prev => prev ? {
                            ...prev,
                            blocks: parsed.blocks,
                            paragraphs: parsed.paragraphs,
                            wordCount,
                            readTimeMinutes,
                            // Hero URL prefers RSS (proper .jpg CDN thumb),
                            // then whatever the reader captured. Caption is
                            // always from the reader — RSS never gives one.
                            heroImageUrl: prev.heroImageUrl || parsed.heroImageUrl || heroFromHtml,
                            heroImageCaption: parsed.heroImageCaption || heroCaptionFromHtml,
                        } : prev);
                        return;
                    } catch { /* try next base */ }
                }
            } finally {
                if (!cancelled) setBodyScraping(false);
            }
        })();
        return () => { cancelled = true; };
    }, [article, id, slug, origin]);

    const publishedLabel = article?.publishedAt ? formatDate(article.publishedAt) : null;

    return (
        <div className="min-h-screen">
            <ReadingProgress />
            <header className="sticky top-0 z-50 w-full glass-nav">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between h-14 md:h-16">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-9 w-9"
                                onClick={() => router.back()}
                                aria-label="Back"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <Link href="/" aria-label="Inningz home">
                                <Image
                                    src="/logo-full-transparent.png"
                                    alt="Inningz"
                                    width={400}
                                    height={120}
                                    priority
                                    className="hidden dark:block h-9 md:h-11 w-auto"
                                />
                                <Image
                                    src="/logo-full-dark.png"
                                    alt="Inningz"
                                    width={400}
                                    height={120}
                                    priority
                                    className="block dark:hidden h-9 md:h-11 w-auto"
                                />
                            </Link>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ShareButton article={article} />
                            <BookmarkButton article={article} />
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-16">
                {loading && <ArticleSkeleton />}

                {!loading && error && (
                    <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[40vh] text-center">
                        <div className="p-4 rounded-full bg-muted mb-4">
                            <Newspaper className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-display mb-1">Story unavailable</p>
                        <p className="text-sm text-muted-foreground mb-5 max-w-xs">{error}</p>
                        <Link href="/news">
                            <Button variant="outline" className="rounded-xl">Back to news</Button>
                        </Link>
                    </div>
                )}

                {!loading && !error && article && (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-12">
                        <article
                            className="max-w-3xl"
                            onClick={(e) => {
                                // Delegated handler for entity links injected via
                                // dangerouslySetInnerHTML — teams do a client-side
                                // route, players open the profile dialog.
                                const target = e.target as HTMLElement | null;
                                if (!target) return;
                                const teamAnchor = target.closest<HTMLAnchorElement>('a[data-entity="team"]');
                                if (teamAnchor) {
                                    const href = teamAnchor.getAttribute('href');
                                    if (href) {
                                        e.preventDefault();
                                        router.push(href);
                                    }
                                    return;
                                }
                                const playerBtn = target.closest<HTMLButtonElement>('button[data-entity="player"]');
                                if (playerBtn) {
                                    e.preventDefault();
                                    const pid = playerBtn.getAttribute('data-player-id');
                                    const name = playerBtn.getAttribute('data-player-name');
                                    if (pid) {
                                        setSelectedProfileId(pid);
                                        setSelectedPlayerName(name || null);
                                        setSelectedProfile(null);
                                    }
                                }
                            }}
                        >
                            {isFresh(article.publishedAt) && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest mb-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    New
                                </span>
                            )}
                            <h1 className="font-display text-3xl md:text-5xl lg:text-[3.5rem] leading-[1.05] tracking-tight text-foreground">
                                {article.title}
                            </h1>
                            {article.description && (
                                <p className="mt-4 md:mt-5 text-base md:text-lg leading-relaxed text-muted-foreground">
                                    {article.description}
                                </p>
                            )}
                            <BylineStrip
                                author={article.author}
                                publishedLabel={publishedLabel}
                                readTime={article.readTimeMinutes}
                            />

                            {/* Hero image — for video-lead stories the upstream's
                                video thumbnail was already extracted as the
                                fallback, so this slot always renders a still.
                                We do not render a play button because the
                                actual player is behind hotstar's partner JWT
                                and their edge CDN 403s cross-origin embeds. */}
                            {(() => {
                                // If the scraped heroImageUrl is a hotstar
                                // video-thumbnail (no file extension, unreliable
                                // in Next Image), swap in the RSS feed's proper
                                // .jpg for the same story.
                                const scraped = article.heroImageUrl;
                                const isHotstar = !!scraped && /img1\.hotstarext\.com/.test(scraped);
                                const bestHero = isHotstar ? (feedHeroImage || scraped) : (scraped || feedHeroImage);
                                if (!bestHero) return null;
                                return (
                                    <figure className="mt-6 md:mt-8">
                                        <div className="rounded-2xl overflow-hidden bg-muted">
                                            <Image
                                                src={bestHero}
                                                alt=""
                                                width={1400}
                                                height={800}
                                                priority
                                                unoptimized
                                                className="w-full h-auto"
                                            />
                                        </div>
                                        {article.heroImageCaption && (
                                            <figcaption className="mt-2 text-[11px] md:text-xs text-muted-foreground italic">
                                                {article.heroImageCaption}
                                            </figcaption>
                                        )}
                                    </figure>
                                );
                            })()}

                            <ArticleBody
                                blocks={article.blocks}
                                fallbackParagraphs={article.paragraphs}
                                bodyLoading={bodyScraping}
                                provisionalLede={article.description}
                                entities={buildLinkableEntities(article)}
                                matchContext={{ tags: article.tags, title: article.title }}
                            />

                            {/* Match context moved inline — `InlineMatchCard`
                                now renders after the first prose paragraph
                                inside `ArticleBody` so the reader sees the
                                fixture at eye level, not after scrolling to
                                the very bottom of the article. */}

                            {(() => {
                                // Resolve each tag into either an in-app route
                                // (team / series / match) or a player-profile
                                // dialog trigger. Anything we can't route is
                                // dropped so the row never contains inert pills.
                                type ResolvedTag =
                                    | { kind: 'link'; label: string; href: string }
                                    | { kind: 'player'; label: string; profileId: string };
                                const resolvedTags: ResolvedTag[] = (article.tags ?? [])
                                    .map((t): ResolvedTag | null => {
                                        const tag = t as { label?: string; href?: string };
                                        const label = tag.label ?? '';
                                        if (!label) return null;
                                        return resolveTagAction({ label, href: tag.href });
                                    })
                                    .filter((t): t is ResolvedTag => t !== null);
                                if (resolvedTags.length === 0) return null;
                                const pillClasses = 'inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground hover:border-primary/60 hover:text-primary transition-colors';
                                return (
                                    <div className="mt-10 pt-6 border-t border-border/60">
                                        <h3 className="font-display text-lg md:text-xl tracking-tight text-foreground mb-3">
                                            Tags
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {resolvedTags.map((t) => (
                                                t.kind === 'link' ? (
                                                    <Link key={t.label} href={t.href} className={pillClasses}>
                                                        {t.label}
                                                    </Link>
                                                ) : (
                                                    <button
                                                        key={t.label}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProfileId(t.profileId);
                                                            setSelectedPlayerName(t.label);
                                                            setSelectedProfile(null);
                                                        }}
                                                        className={pillClasses}
                                                    >
                                                        {t.label}
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </article>

                        <aside className="hidden lg:block">
                            <div className="sticky top-24">
                                {/* Sidebar shows Related (contextual to this article). If the
                                    upstream had no Related widget on this story, fall back to
                                    the RSS "More Stories" so the column is never empty. */}
                                {(article.related?.length ?? 0) > 0 ? (
                                    <>
                                        <h3 className="font-display text-lg md:text-xl tracking-tight text-foreground mb-4">
                                            Related
                                        </h3>
                                        <ul className="space-y-5">
                                            {article.related.map((r) => {
                                                // Related links inherit the current article's
                                                // origin — ids here live in the same namespace
                                                // as the current story.
                                                const href = origin === 'series'
                                                    ? `${buildNewsHref(r.id, r.slug)}?src=series`
                                                    : buildNewsHref(r.id, r.slug);
                                                return (
                                                    <li key={r.id}>
                                                        <Link
                                                            href={href}
                                                            className="group flex gap-3 items-start"
                                                        >
                                                            {r.imageUrl ? (
                                                                <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                                                                    <Image
                                                                        src={r.imageUrl}
                                                                        alt=""
                                                                        width={200}
                                                                        height={140}
                                                                        unoptimized
                                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="w-20 h-14 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                                                                    <Newspaper className="w-4 h-4 text-muted-foreground/40" />
                                                                </div>
                                                            )}
                                                            <h4 className="text-[13px] leading-snug font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-3 flex-1">
                                                                {r.title}
                                                            </h4>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="font-display text-lg md:text-xl tracking-tight text-foreground mb-4">
                                            More stories
                                        </h3>
                                        <ul className="space-y-5">
                                            {related.map((item) => (
                                                <li key={item.id}>
                                                    <Link
                                                        href={buildNewsHref(item.id, item.slug)}
                                                        className="group flex gap-3 items-start"
                                                    >
                                                        {item.imageUrl && (
                                                            <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                                                                <Image
                                                                    src={toFaceCroppedThumb(item.imageUrl, { width: 200, aspect: '16:10' }) || item.imageUrl}
                                                                    alt=""
                                                                    width={200}
                                                                    height={140}
                                                                    unoptimized
                                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                />
                                                            </div>
                                                        )}
                                                        <h4 className="text-[13px] leading-snug font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-3 flex-1">
                                                            {item.title}
                                                        </h4>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </aside>

                    </div>
                )}
            </main>

            <Dialog open={!!selectedProfileId} onOpenChange={(open) => {
                if (!open) {
                    setSelectedProfileId(null);
                    setSelectedPlayerName(null);
                    setSelectedProfile(null);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Player Profile</DialogTitle>
                    </DialogHeader>
                    {profileLoading && (
                        <div className="flex justify-center items-center p-12">
                            <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
                            <p className="ml-4 text-muted-foreground">Loading player profile...</p>
                        </div>
                    )}
                    {selectedProfile && <PlayerProfileDisplay profile={selectedProfile} />}
                    {!profileLoading && !selectedProfile && selectedProfileId && (
                        <div className="p-8 text-center text-muted-foreground">
                            Failed to load player profile
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Build a bare article shell for stories the RSS feed doesn't index
// (series-news items live on the alternate upstream). Server action reads
// og:title / og:description / og:image / article:published_time from the
// story page so the header renders while the body reader fills in below.
// Map an upstream tag's raw href to something the article page can render.
// Teams / series / matches route to their in-app page; player tags emit a
// `player` action the page opens as a profile dialog. Unmapped hrefs (e.g.
// author pages, generic tag lists) return null so the tag is dropped.
type ResolvedTagAction =
    | { kind: 'link'; label: string; href: string }
    | { kind: 'player'; label: string; profileId: string };
function resolveTagAction(tag: { label: string; href?: string }): ResolvedTagAction | null {
    const href = tag.href;
    if (!href) return null;
    // /profiles/{id}/{slug} — open the existing player-profile dialog.
    const playerM = href.match(/^\/profiles\/(\d+)(?:\/|$)/);
    if (playerM) return { kind: 'player', label: tag.label, profileId: playerM[1] };
    // /cricket-team/{slug}/{id}  →  /team/{id}/{slug}
    const teamM = href.match(/^\/cricket-team\/([^/?#]+)\/(\d+)(?:$|[/?#])/);
    if (teamM) {
        const h = buildTeamHref(teamM[2], tag.label);
        return h ? { kind: 'link', label: tag.label, href: h } : null;
    }
    // /cricket-series/{id}/{slug}[/...]  →  /series/{id}/{slug}
    const seriesM = href.match(/^\/cricket-series\/(\d+)\/([^/?#]+)/);
    if (seriesM) {
        const h = buildSeriesHref(tag.label, `/cricket-series/${seriesM[1]}/${seriesM[2]}`);
        return h ? { kind: 'link', label: tag.label, href: h } : null;
    }
    // /live-cricket-scores/{id}/{slug}  →  /match/{id}/{slug}
    const matchM = href.match(/^\/live-cricket-scores\/(\d+)\b/);
    if (matchM) return { kind: 'link', label: tag.label, href: buildMatchHref(matchM[1], tag.label) };
    return null;
}

async function fetchAltUpstreamShell(id: string, slug: string): Promise<NewsArticle | null> {
    const result = await getAltUpstreamNewsShell(id, slug);
    if (!result.success || !result.data) return null;
    const d = result.data;
    return {
        id: d.id,
        slug: d.slug,
        title: d.title,
        description: d.description,
        publishedAt: d.publishedAt,
        heroImageUrl: d.heroImageUrl,
        heroImageCaption: d.heroImageCaption,
        category: undefined,
        author: d.author,
        wordCount: d.wordCount,
        readTimeMinutes: d.readTimeMinutes,
        paragraphs: d.paragraphs,
        blocks: d.blocks,
        tags: d.tags,
        related: d.related,
        mostRead: [],
    };
}

function ArticleSkeleton() {
    return (
        <div className="max-w-3xl">
            <div className="skeleton h-4 w-20 rounded mb-4" />
            <div className="skeleton h-10 md:h-14 w-full rounded mb-3" />
            <div className="skeleton h-10 md:h-14 w-4/5 rounded mb-6" />
            <div className="skeleton h-4 w-3/5 rounded mb-8" />
            <div className="skeleton aspect-[16/9] w-full rounded-2xl mb-8" />
            <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="skeleton h-4 w-full rounded" />
                        <div className="skeleton h-4 w-11/12 rounded" />
                        <div className="skeleton h-4 w-3/4 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Fresh-story pill fires for anything published in the last hour. Cheap
// but effective signal for readers scanning "what's just broken".
function isFresh(iso?: string): boolean {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < 60 * 60 * 1000;
}

// Thin fill bar pinned to the very top of the viewport that grows with the
// reader's scroll depth. Uses rAF to coalesce scroll events, `scaleX`
// transform to avoid layout, and only mounts on the article page so it can't
// leak into other routes. Hidden until the reader has scrolled ≥ 2% — a
// zero-width bar is visual noise on first paint.
function ReadingProgress() {
    const [pct, setPct] = useState(0);
    useEffect(() => {
        let raf = 0;
        const update = () => {
            raf = 0;
            const doc = document.documentElement;
            const scrollable = doc.scrollHeight - window.innerHeight;
            if (scrollable <= 0) { setPct(0); return; }
            const ratio = Math.max(0, Math.min(1, window.scrollY / scrollable));
            setPct(ratio);
        };
        const onScroll = () => {
            if (raf) return;
            raf = window.requestAnimationFrame(update);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        update();
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (raf) window.cancelAnimationFrame(raf);
        };
    }, []);
    const visible = pct > 0.02;
    return (
        <div
            aria-hidden
            className="fixed top-0 left-0 right-0 h-0.5 z-[60] pointer-events-none"
        >
            <div
                className="h-full bg-primary origin-left transition-opacity duration-200"
                style={{
                    transform: `scaleX(${pct})`,
                    opacity: visible ? 1 : 0,
                }}
            />
        </div>
    );
}

function BylineStrip({ author, publishedLabel, readTime }: { author?: string; publishedLabel: string | null; readTime: number }) {
    const parts: React.ReactNode[] = [];
    if (author) parts.push(<span key="a" className="font-semibold text-foreground">{author}</span>);
    if (publishedLabel) parts.push(<span key="d" className="tabular-nums">{publishedLabel}</span>);
    if (readTime > 0) parts.push(
        <span key="r" className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="w-3 h-3" />{readTime} min read
        </span>
    );
    if (parts.length === 0) return null;
    return (
        <div className="mt-5 md:mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] md:text-xs text-muted-foreground border-y border-border/60 py-3">
            {parts.reduce<React.ReactNode[]>((acc, node, i) => {
                if (i > 0) acc.push(<span key={`s${i}`} className="text-muted-foreground/40" aria-hidden>·</span>);
                acc.push(node);
                return acc;
            }, [])}
        </div>
    );
}

// ─── Inline entity linking ──────────────────────────────────────────
//
// Turns first mentions of teams and players inside article prose into
// clickable links / profile-dialog triggers. Only FIRST mention per entity
// per article is wrapped so a run of names ("Sammy said... Sammy added...")
// doesn't turn the paragraph into an underlined mesh. Runs on the sanitised
// paragraph HTML, so anything inside an existing `<a>` or `<q>` is skipped
// (direct-speech blocks stay untouched).

type LinkableEntity =
    | { kind: 'team'; name: string; href: string }
    | { kind: 'player'; name: string; profileId: string };

function buildLinkableEntities(article: NewsArticle | null): LinkableEntity[] {
    if (!article) return [];
    const out: LinkableEntity[] = [];
    const seenKeys = new Set<string>();
    const addTeam = (name: string, href: string) => {
        const key = 't:' + name.toLowerCase();
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        out.push({ kind: 'team', name, href });
    };
    const addPlayer = (name: string, profileId: string) => {
        const key = 'p:' + name.toLowerCase();
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        out.push({ kind: 'player', name, profileId });
    };
    // Tag-derived entities (only cricbuzz-origin articles ship these today).
    for (const t of article.tags ?? []) {
        const tag = t as { label?: string; href?: string };
        const label = tag.label ?? '';
        if (!label) continue;
        const action = resolveTagAction({ label, href: tag.href });
        if (!action) continue;
        if (action.kind === 'link' && action.href.startsWith('/team/')) {
            addTeam(action.label, action.href);
        } else if (action.kind === 'player') {
            addPlayer(action.label, action.profileId);
        }
    }
    // Static team fallback — the RSS source doesn't ship tags at all, so
    // teams from `TEAM_ID_BY_NAME` are the only linkable entities for those
    // articles. Only the well-known ones — associate sides in the map would
    // false-positive too easily inside common English words otherwise.
    const WELL_KNOWN = [
        'India', 'Pakistan', 'Australia', 'England', 'Sri Lanka', 'New Zealand',
        'South Africa', 'West Indies', 'Bangladesh', 'Zimbabwe', 'Ireland',
        'Afghanistan', 'Netherlands', 'Scotland', 'Canada', 'Namibia', 'Nepal',
        'Oman', 'United Arab Emirates', 'United States',
    ];
    for (const name of WELL_KNOWN) {
        const href = buildTeamHref(undefined, name);
        if (href) addTeam(name, href);
    }
    // Longest names first — "West Indies" must match before "Indies" would
    // accidentally split from an unrelated phrase.
    out.sort((a, b) => b.name.length - a.name.length);
    return out;
}

// Walk `html` character-by-character tracking `<a>` and `<q>` tag depth.
// When in plain-text mode (both depths = 0) attempt the first regex match;
// on hit, wrap it via `makeWrapper` and return the full string. Returns the
// input unchanged if no match is found in any text region.
function wrapFirstInTextNodes(
    html: string,
    re: RegExp,
    makeWrapper: (matchedText: string) => string,
): string {
    const chunks: string[] = [];
    let i = 0;
    let textStart = 0;
    let inALink = 0;
    let inQuote = 0;
    // Fresh regex each call to reset lastIndex.
    const scan = new RegExp(re.source, re.flags.includes('i') ? 'i' : '');
    while (i < html.length) {
        if (html[i] === '<') {
            // Flush text since last tag.
            if (i > textStart) {
                const text = html.slice(textStart, i);
                if (!inALink && !inQuote) {
                    const m = scan.exec(text);
                    if (m) {
                        chunks.push(text.slice(0, m.index));
                        chunks.push(makeWrapper(m[0]));
                        chunks.push(text.slice(m.index + m[0].length));
                        chunks.push(html.slice(i));
                        return chunks.join('');
                    }
                }
                chunks.push(text);
            }
            const tagEnd = html.indexOf('>', i);
            if (tagEnd === -1) { chunks.push(html.slice(i)); return chunks.join(''); }
            const tag = html.slice(i, tagEnd + 1);
            chunks.push(tag);
            const nameM = tag.match(/^<\/?([a-zA-Z]+)/);
            if (nameM) {
                const name = nameM[1].toLowerCase();
                const isClose = tag.startsWith('</');
                if (name === 'a') inALink += isClose ? -1 : 1;
                else if (name === 'q') inQuote += isClose ? -1 : 1;
            }
            i = tagEnd + 1;
            textStart = i;
        } else {
            i++;
        }
    }
    if (textStart < html.length) {
        const text = html.slice(textStart);
        if (!inALink && !inQuote) {
            const m = scan.exec(text);
            if (m) {
                chunks.push(text.slice(0, m.index));
                chunks.push(makeWrapper(m[0]));
                chunks.push(text.slice(m.index + m[0].length));
                return chunks.join('');
            }
        }
        chunks.push(text);
    }
    return chunks.join('');
}

function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function linkEntities(html: string, entities: LinkableEntity[], seen: Set<string>): string {
    let out = html;
    for (const e of entities) {
        const seenKey = e.kind + ':' + e.name.toLowerCase();
        if (seen.has(seenKey)) continue;
        // Word-boundary, case-insensitive. Team names like "West Indies"
        // include a space — \b works around whitespace too.
        const re = new RegExp('\\b' + escapeRegex(e.name) + '\\b', 'i');
        const wrapped = wrapFirstInTextNodes(out, re, (matched) => {
            if (e.kind === 'team') {
                return `<a href="${escapeAttr(e.href)}" data-entity="team" class="entity-link">${matched}</a>`;
            }
            return `<button type="button" data-entity="player" data-player-id="${escapeAttr(e.profileId)}" data-player-name="${escapeAttr(e.name)}" class="entity-link">${matched}</button>`;
        });
        if (wrapped !== out) {
            out = wrapped;
            seen.add(seenKey);
        }
    }
    return out;
}

function ArticleBody({ blocks, fallbackParagraphs, bodyLoading, provisionalLede, entities, matchContext }: { blocks: NewsBlock[]; fallbackParagraphs: string[]; bodyLoading?: boolean; provisionalLede?: string; entities?: LinkableEntity[]; matchContext?: { tags: NewsArticle['tags']; title: string } }) {
    // While the client-side reader fetch is in flight, prefer to show the
    // RSS/shell description as a real lede paragraph rather than gray bars —
    // the reader lands in ~2-4s and staring at skeleton for that long makes
    // the article feel broken. The lede is replaced in place when blocks
    // arrive. Falls back to a minimal 2-line skeleton if there's no
    // description to show yet.
    if (bodyLoading && (!blocks || blocks.length === 0)) {
        if (provisionalLede) {
            return (
                <div className="mt-6 md:mt-10 space-y-5 md:space-y-6" aria-busy="true" aria-live="polite">
                    <p className="text-[17px] md:text-[19px] leading-[1.7] md:leading-[1.85] text-foreground">
                        {provisionalLede}
                    </p>
                    <div className="space-y-2" aria-hidden>
                        <div className="skeleton h-4 w-11/12 rounded" />
                        <div className="skeleton h-4 w-2/3 rounded" />
                    </div>
                </div>
            );
        }
        return (
            <div className="mt-6 md:mt-10 space-y-5 md:space-y-6" aria-busy="true" aria-live="polite">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="skeleton h-4 w-full rounded" />
                        <div className="skeleton h-4 w-11/12 rounded" />
                        <div className="skeleton h-4 w-3/4 rounded" />
                    </div>
                ))}
            </div>
        );
    }
    // Use the structured blocks when the scraper produced them; fall back to
    // a flat paragraph array for older cache entries or malformed responses.
    if (!blocks || blocks.length === 0) {
        return (
            <div className="mt-6 md:mt-10 space-y-5 md:space-y-6">
                {fallbackParagraphs.map((p, i) => (
                    <p key={i} className="text-[16px] md:text-[17px] leading-[1.75] md:leading-[1.9] text-foreground/90">
                        {p}
                    </p>
                ))}
            </div>
        );
    }
    // Detect paragraphs that are ENTIRELY direct speech. Attribution in
    // journalism ALWAYS follows a closing quote character (`," Sammy said`
    // or `</q>, said Sammy`) — it never sits mid-speech. So look for the
    // structural pattern "close-quote → capitalized word → attribution
    // verb" instead of a loose "said appears anywhere" match, which would
    // wrongly flag lines like `"Like I said, …"` as narrative.
    const ATTRIB_AFTER_QUOTE_RE =
        /(?:[""»""]|<\/q>)\s*[,.]?\s*(?:<[^>]+>\s*)*[A-Z][A-Za-z]+\s+(?:said|told|added|explained|asked|stated|noted|wrote|announced|remarked|commented|responded|replied|revealed|admitted|confirmed|acknowledged|argued|insisted|declared|claimed|conceded)\b/;
    const isQuoteHtml = (h: string) => {
        const text = h.replace(/<[^>]+>/g, '').trim();
        if (!text) return false;
        // Must open with a quote character — the universal marker of speech.
        if (!/^[""„«"]/.test(text)) return false;
        // Multi-paragraph quotes don't close intermediate paragraphs, so the
        // trailing character isn't a reliable signal. Attribution presence is.
        return !ATTRIB_AFTER_QUOTE_RE.test(h);
    };
    // Some source flows double the edge quote characters ("" at start/end).
    // For blockquote rendering we already provide the drop-cap glyph, so
    // strip up to two leading and trailing quote characters cleanly.
    const stripEdgeQuotes = (h: string) =>
        h
            .replace(/^(\s*(?:<[^>]+>\s*)*)[""„«"]{1,2}/, '$1')
            .replace(/[""»""]{1,2}((?:\s*<\/[^>]+>)*\s*[.,;!?]?)\s*$/, '$1');
    // Cluster consecutive quote paragraphs so an interview reads as one
    // continuous voice inside a single <blockquote> — not a stack of
    // isolated cards, one per line.
    type RenderItem =
        | { kind: 'block'; block: NewsBlock }
        | { kind: 'quotes'; htmls: string[] };
    const grouped: RenderItem[] = [];
    for (const b of blocks) {
        if (b.type === 'paragraph' && isQuoteHtml(b.html)) {
            const tail = grouped[grouped.length - 1];
            if (tail && tail.kind === 'quotes') tail.htmls.push(b.html);
            else grouped.push({ kind: 'quotes', htmls: [b.html] });
        } else {
            grouped.push({ kind: 'block', block: b });
        }
    }

    // Prose vs quote paragraphs share the SAME size + leading so the article
    // has one consistent reading rhythm — the italic serif face is what
    // marks speech, not a size bump.
    // Inline quoted spans inside prose (`"…"`) are rendered as italic
    // serif via the [&_q]:… rules so a fragment of speech inside a
    // narrative sentence still reads distinctly. `emphasizeInlineQuotes`
    // below synthesises `<q>` wrappers when the source uses plain quote
    // characters instead of real `<q>` tags.
    const proseP =
        'text-[16px] md:text-[17px] leading-[1.75] md:leading-[1.9] text-foreground/90 mb-5 md:mb-6 last:mb-0 ' +
        "[&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic " +
        '[&_u]:underline [&_u]:decoration-primary/50 [&_u]:underline-offset-2 ' +
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:mb-1 ' +
        '[&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-2 hover:[&_a]:decoration-primary ' +
        "[&_q]:font-serif [&_q]:italic [&_q]:text-foreground [&_q]:before:content-[''] [&_q]:after:content-[''] " +
        // Entity links (teams + players) — tuned to be discoverable without
        // turning a paragraph into a wall of underlines. No default underline;
        // a solid dotted-underline reveals on hover. Player buttons reset
        // their native chrome so they sit inline with the sentence.
        '[&_.entity-link]:text-primary [&_.entity-link]:font-semibold [&_.entity-link]:no-underline [&_.entity-link]:decoration-primary/60 [&_.entity-link]:underline-offset-2 [&_.entity-link]:cursor-pointer [&_.entity-link]:transition-colors ' +
        'hover:[&_.entity-link]:underline hover:[&_.entity-link]:text-primary ' +
        '[&_button.entity-link]:bg-transparent [&_button.entity-link]:border-0 [&_button.entity-link]:p-0 [&_button.entity-link]:font-inherit [&_button.entity-link]:text-inherit [&_button.entity-link]:align-baseline';
    const quoteP =
        'font-serif italic text-[16px] md:text-[17px] leading-[1.75] md:leading-[1.9] text-foreground/95 ' +
        '[&_b]:not-italic [&_b]:font-semibold [&_strong]:not-italic [&_strong]:font-semibold ' +
        '[&_a]:italic [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline';

    // Wrap bare `"…"` spans in a synthetic `<q>` so the italic serif
    // treatment above picks them up. Skip when the paragraph already has
    // real `<q>` tags (the RSS parser sometimes emits them) to avoid
    // double-wrapping and skip anchors / links so URL text stays untouched.
    const emphasizeInlineQuotes = (h: string): string => {
        if (/<q[\s>]/i.test(h)) return h;
        // Straight double quotes: match pairs conservatively (min 3 chars
        // inside) and don't cross tag boundaries. Smart-quote pairs are a
        // separate pass because their opening/closing glyphs are asymmetric
        // (open `“` vs close `”`) and can be matched safely.
        let out = h.replace(
            /“([^“”<>]{3,}?)”/g,
            '<q>“$1”</q>',
        );
        out = out.replace(
            /(^|[\s>(])"([^"<>]{3,}?)"(?=[\s.,;:!?)<]|$)/g,
            '$1<q>"$2"</q>',
        );
        return out;
    };

    // Shared `seen` set across the paragraph render so first-mention is
    // enforced at ARTICLE scope, not per-paragraph.
    const seenEntities = new Set<string>();
    // Inject the live/upcoming match card AFTER the first prose paragraph so
    // the reader sees the story opening + then a visual anchor to the actual
    // fixture the story is about. Skipped when no context provided.
    const firstProseIdx = grouped.findIndex(
        item => item.kind === 'block' && item.block.type === 'paragraph',
    );
    return (
        <div className="mt-6 md:mt-10">
            {grouped.map((item, i) => {
                if (item.kind === 'quotes') {
                    return (
                        <figure key={i} className="my-8 md:my-10">
                            {/* No rail, no card, no background. Editorial
                                treatment: italic serif body at the same size
                                as prose, a drop-cap opening quote in the
                                display face floats into the first line and
                                visually replaces the stripped `"`. A run of
                                consecutive answers flows inside ONE figure
                                so it reads as one voice, not stacked cards. */}
                            <div className="space-y-4 md:space-y-5">
                                {item.htmls.map((h, qi) => {
                                    const trimmedHtml = stripEdgeQuotes(h);
                                    if (qi === 0) {
                                        return (
                                            <p key={qi} className={quoteP}>
                                                <span
                                                    aria-hidden
                                                    className="float-left font-display not-italic text-primary/70 text-[3.25rem] md:text-[3.75rem] leading-[0.82] mr-2.5 -mt-1 select-none"
                                                >
                                                    “
                                                </span>
                                                <span dangerouslySetInnerHTML={{ __html: trimmedHtml }} />
                                            </p>
                                        );
                                    }
                                    return (
                                        <p
                                            key={qi}
                                            className={quoteP}
                                            dangerouslySetInnerHTML={{ __html: trimmedHtml }}
                                        />
                                    );
                                })}
                            </div>
                        </figure>
                    );
                }
                const b = item.block;
                if (b.type === 'heading') {
                    return (
                        <h2
                            key={i}
                            className="font-display text-2xl md:text-3xl leading-tight tracking-tight text-foreground mt-10 md:mt-12 mb-3 md:mb-4 first:mt-0"
                        >
                            {b.text}
                        </h2>
                    );
                }
                if (b.type === 'image') {
                    return (
                        <figure key={i} className="my-8 md:my-10 -mx-4 md:mx-0">
                            <div className="md:rounded-2xl overflow-hidden bg-muted">
                                <Image
                                    src={b.imageUrl}
                                    alt={b.caption ?? ''}
                                    width={1200}
                                    height={720}
                                    unoptimized
                                    className="w-full h-auto"
                                />
                            </div>
                            {(b.caption || b.credit) && (
                                <figcaption className="mt-2.5 px-4 md:px-0 text-[11px] md:text-xs text-muted-foreground italic flex flex-wrap items-center gap-1.5">
                                    {b.caption && <span>{b.caption}</span>}
                                    {b.caption && b.credit && <span className="text-muted-foreground/50 not-italic" aria-hidden>·</span>}
                                    {b.credit && <span className="not-italic">{b.credit}</span>}
                                </figcaption>
                            )}
                        </figure>
                    );
                }
                // Order: (1) wrap `"…"` in `<q>` so entity linking can then
                // skip inside speech spans, (2) wrap first-mention entities
                // in the resulting text-only regions.
                const withQuotes = emphasizeInlineQuotes(b.html);
                const finalHtml = entities && entities.length > 0
                    ? linkEntities(withQuotes, entities, seenEntities)
                    : withQuotes;
                const paragraph = (
                    <p
                        key={i}
                        className={proseP}
                        dangerouslySetInnerHTML={{ __html: finalHtml }}
                    />
                );
                if (i === firstProseIdx && matchContext) {
                    return (
                        <React.Fragment key={i}>
                            {paragraph}
                            <InlineMatchCard tags={matchContext.tags} title={matchContext.title} />
                        </React.Fragment>
                    );
                }
                return paragraph;
            })}
        </div>
    );
}

function ShareButton({ article }: { article: NewsArticle | null }) {
    const [copied, setCopied] = useState(false);
    const onShare = async () => {
        if (!article) return;
        const url = typeof window !== 'undefined' ? window.location.href : '';
        try {
            if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
                await navigator.share({ title: article.title, text: article.description, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* dismissed or blocked */ }
    };
    return (
        <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-9 w-9"
            onClick={onShare}
            aria-label="Share article"
            title={copied ? 'Copied' : 'Share'}
            disabled={!article}
        >
            <Share2 className={`h-4 w-4 ${copied ? 'text-primary' : ''}`} />
        </Button>
    );
}

function BookmarkButton({ article }: { article: NewsArticle | null }) {
    const [saved, setSaved] = useState(false);
    useEffect(() => {
        if (!article) return;
        try {
            const raw = localStorage.getItem('inningz:news:bookmarks');
            const list: { id: string }[] = raw ? JSON.parse(raw) : [];
            setSaved(list.some(b => b.id === article.id));
        } catch { /* storage blocked */ }
    }, [article]);
    const toggle = () => {
        if (!article) return;
        try {
            const raw = localStorage.getItem('inningz:news:bookmarks');
            const list: { id: string; slug: string; title: string; imageUrl?: string; savedAt: number }[] = raw ? JSON.parse(raw) : [];
            const idx = list.findIndex(b => b.id === article.id);
            if (idx >= 0) {
                list.splice(idx, 1);
                setSaved(false);
            } else {
                list.unshift({ id: article.id, slug: article.slug, title: article.title, imageUrl: article.heroImageUrl, savedAt: Date.now() });
                if (list.length > 40) list.length = 40;
                setSaved(true);
            }
            localStorage.setItem('inningz:news:bookmarks', JSON.stringify(list));
        } catch { /* storage blocked */ }
    };
    return (
        <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-9 w-9"
            onClick={toggle}
            aria-label={saved ? 'Remove bookmark' : 'Save for later'}
            title={saved ? 'Saved' : 'Save for later'}
            disabled={!article}
        >
            <Bookmark className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`} />
        </Button>
    );
}

// Match card injected inline (after the first prose paragraph) when the
// article names both teams of a fixture that is either currently live or
// upcoming. Threshold is both-teams-present (score >= 2) to avoid injecting
// the wrong Indian match into a story that just mentions "India" once.
// Live matches win over upcoming so a story about a currently-live series
// always surfaces the live scorecard.
function InlineMatchCard({ tags, title }: { tags: NewsArticle['tags']; title: string }) {
    const [state, setState] = useState<{ match: LiveMatch; kind: 'live' | 'upcoming' } | null>(null);
    useEffect(() => {
        (async () => {
            try {
                const { getLiveMatches, getUpcomingMatches } = await import('@/app/actions');
                const [live, upcoming] = await Promise.all([
                    getLiveMatches().catch(() => null),
                    getUpcomingMatches().catch(() => null),
                ]);
                const searchable = (title + ' ' + (tags?.map(t => t.label).join(' ') || '')).toLowerCase();
                const teamMatchScore = (m: LiveMatch) => {
                    const names = (m.teams || []).map(t => (t.name || '').toLowerCase());
                    return names.reduce((n, name) => n + (name && searchable.includes(name) ? 1 : 0), 0);
                };
                let best: { match: LiveMatch; kind: 'live' | 'upcoming'; score: number } | null = null;
                for (const m of live?.matches || []) {
                    const s = teamMatchScore(m);
                    if (s >= 2 && (!best || s > best.score)) best = { match: m, kind: 'live', score: s };
                }
                if (!best) {
                    for (const m of upcoming?.matches || []) {
                        const s = teamMatchScore(m);
                        if (s >= 2 && (!best || s > best.score)) best = { match: m, kind: 'upcoming', score: s };
                    }
                }
                if (best) setState({ match: best.match, kind: best.kind });
            } catch { /* upstream not reachable — skip the widget */ }
        })();
    }, [tags, title]);
    if (!state) return null;
    return (
        <figure className="my-7 md:my-9 -mx-4 md:mx-0">
            <div className="px-4 md:px-0 mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                {state.kind === 'live' ? (
                    <>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
                        <span className="text-red-500 dark:text-red-400">Live now</span>
                    </>
                ) : (
                    <>
                        <Clock className="w-3 h-3 text-primary" aria-hidden />
                        <span className="text-primary">Coming up</span>
                    </>
                )}
                <span aria-hidden className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">Referenced in this story</span>
            </div>
            <div className="max-w-md mx-4 md:mx-0">
                <MatchCard match={state.match} header="none" />
            </div>
        </figure>
    );
}
