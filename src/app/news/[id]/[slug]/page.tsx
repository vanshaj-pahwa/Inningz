'use client';

import { useEffect, useState, useRef } from 'react';
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

export default function NewsArticlePage() {
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
                        <article className="max-w-3xl">
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
                            />

                            {/* Live match context — surface a live scorecard
                                when any team named in this article is currently
                                playing. Reader stays in the story instead of
                                bouncing to check the score. */}
                            <LiveMatchContext tags={article.tags} title={article.title} />

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

function ArticleBody({ blocks, fallbackParagraphs, bodyLoading }: { blocks: NewsBlock[]; fallbackParagraphs: string[]; bodyLoading?: boolean }) {
    // Skeleton while the client-side reader fetch is in flight and no blocks
    // have arrived yet. Mirrors the visual rhythm of a real article body so
    // the layout doesn't jump when content lands.
    if (bodyLoading && (!blocks || blocks.length === 0)) {
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
        "[&_q]:font-serif [&_q]:italic [&_q]:text-foreground [&_q]:before:content-[''] [&_q]:after:content-['']";
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
                return (
                    <p
                        key={i}
                        className={proseP}
                        dangerouslySetInnerHTML={{ __html: emphasizeInlineQuotes(b.html) }}
                    />
                );
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

function LiveMatchContext({ tags, title }: { tags: NewsArticle['tags']; title: string }) {
    const [match, setMatch] = useState<LiveMatch | null>(null);
    useEffect(() => {
        (async () => {
            try {
                const { getLiveMatches } = await import('@/app/actions');
                const result = await getLiveMatches();
                if (!result.success || !result.matches) return;
                const searchable = (title + ' ' + tags.map(t => t.label).join(' ')).toLowerCase();
                let best: { m: LiveMatch; score: number } | null = null;
                for (const m of result.matches) {
                    const teamNames = (m.teams || []).map(t => (t.name || '').toLowerCase());
                    const hits = teamNames.reduce((n, name) => n + (name && searchable.includes(name) ? 1 : 0), 0);
                    if (hits > 0 && (!best || hits > best.score)) best = { m, score: hits };
                }
                if (best?.m) setMatch(best.m);
            } catch { /* upstream not reachable — skip the widget */ }
        })();
    }, [tags, title]);
    if (!match) return null;
    return (
        <section className="mt-10">
            <h3 className="font-display text-lg md:text-xl tracking-tight text-foreground mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live now
            </h3>
            {/* Real MatchCard from the home page — flags, format badge,
                live-score treatment, hover state, click-through. */}
            <div className="max-w-sm">
                <MatchCard match={match} header="none" />
            </div>
        </section>
    );
}
