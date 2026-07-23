'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, Newspaper, Share2, Clock } from 'lucide-react';
import { getCricketNewsArticle, getCricketNews } from '@/app/actions';
import type { NewsArticle, NewsItem, NewsBlock, LiveMatch } from '@/app/actions';
import MatchCard from '@/components/match-card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { buildNewsHref, toFaceCroppedThumb } from '@/lib/utils';
import { NEWS_ARTICLE_BASE_URLS } from '@/lib/upstream';
import { parseJinaArticle } from '@/lib/parse-jina-article';

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

    // Fetch the article + the feed in parallel. When the server-side article
    // fetch is blocked (WAF 403 against datacenter IPs), synthesize a minimal
    // article from the RSS entry and let the client-side effect below fill in
    // the body via a CORS proxy — the reader's residential IP isn't blocked.
    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            const [articleResult, feedResult] = await Promise.all([
                getCricketNewsArticle(id, slug || ''),
                getCricketNews(),
            ]);
            const feedItem = feedResult.success && feedResult.data
                ? feedResult.data.items.find(i => i.id === id)
                : undefined;
            if (feedResult.success && feedResult.data) {
                setRelated(feedResult.data.items.filter(i => i.id !== id).slice(0, 8));
                if (feedItem?.imageUrl) setFeedHeroImage(feedItem.imageUrl);
            }
            if (articleResult.success && articleResult.data) {
                setArticle(articleResult.data);
            } else if (feedItem) {
                // Synthesize a minimal article from the RSS entry — the reader
                // still gets title, description and hero, plus a clear
                // "Read on source" CTA (rendered below via `sourceUrl`).
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
                setError(articleResult.error || 'Failed to load article');
            }
            setLoading(false);
        })();
    }, [id, slug]);


    // Client-side body scrape via a reader service — kicks in when the server
    // side couldn't reach the upstream (Vercel IP blocked at the edge). The
    // reader has its own residential-friendly fetcher and returns cleaned
    // markdown; we parse it into paragraphs. Silent on failure — the RSS
    // description + hero image + related sidebar remain as the base experience.
    useEffect(() => {
        if (!article) return;
        if ((article.blocks?.length ?? 0) > 0) return;
        if (!slug) return;
        let cancelled = false;
        (async () => {
            const bases = NEWS_ARTICLE_BASE_URLS.map(base => `${base}/story/${slug}-${id}`);
            for (const target of bases) {
                try {
                    const md = await fetch(`https://r.jina.ai/${target}`).then(r => r.ok ? r.text() : '');
                    if (cancelled || !md) continue;
                    const parsed = parseJinaArticle(md);
                    if (parsed.paragraphs.length === 0) continue;
                    const escapeHtml = (s: string) =>
                        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const blocks: NewsBlock[] = parsed.paragraphs.map(text => ({
                        type: 'paragraph',
                        html: escapeHtml(text),
                    }));
                    const wordCount = parsed.paragraphs
                        .reduce((n, p) => n + p.split(/\s+/).filter(Boolean).length, 0);
                    const readTimeMinutes = Math.max(1, Math.round(wordCount / 220));
                    setArticle(prev => prev ? {
                        ...prev,
                        blocks,
                        paragraphs: parsed.paragraphs,
                        wordCount,
                        readTimeMinutes,
                        heroImageUrl: prev.heroImageUrl || parsed.heroImageUrl,
                        heroImageCaption: prev.heroImageCaption || parsed.heroImageCaption,
                    } : prev);
                    return;
                } catch { /* try next base */ }
            }
        })();
        return () => { cancelled = true; };
    }, [article, id, slug]);

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
                            />

                            {/* Live match context — surface a live scorecard
                                when any team named in this article is currently
                                playing. Reader stays in the story instead of
                                bouncing to check the score. */}
                            <LiveMatchContext tags={article.tags} title={article.title} />

                            {(article.tags?.length ?? 0) > 0 && (
                                <div className="mt-10 pt-6 border-t border-border/60">
                                    <h3 className="font-display text-lg md:text-xl tracking-tight text-foreground mb-3">
                                        Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {article.tags.map((t) => (
                                            <span
                                                key={t.label}
                                                className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground"
                                            >
                                                {t.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                                        <ul className="space-y-1">
                                            {article.related.map((r) => (
                                                <li key={r.id}>
                                                    <Link
                                                        href={buildNewsHref(r.id, r.slug)}
                                                        className="group flex gap-2 items-start py-2.5 border-b border-border/40 last:border-b-0"
                                                    >
                                                        <span className="font-display text-sm leading-none text-primary/70 shrink-0 mt-1" aria-hidden>›</span>
                                                        <p className="flex-1 min-w-0 font-display text-[15px] leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
                                                            {r.title}
                                                        </p>
                                                    </Link>
                                                </li>
                                            ))}
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

                        {/* More Stories — full-width strip under the article + Related
                            sidebar. Uses the RSS "more stories" list for general browsing. */}
                        {related.length > 0 && (
                            <section className="mt-12 md:mt-16 lg:col-span-2">
                                <h2 className="font-display text-xl md:text-2xl tracking-tight text-foreground mb-4 md:mb-5">
                                    More stories
                                </h2>
                                <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                                    {related.slice(0, 8).map((item) => (
                                        <li key={item.id}>
                                            <Link
                                                href={buildNewsHref(item.id, item.slug)}
                                                className="group flex flex-col gap-2 md:gap-3 h-full"
                                            >
                                                {item.imageUrl && (
                                                    <div className="aspect-[4/3] md:aspect-[16/10] rounded-lg md:rounded-xl overflow-hidden bg-muted">
                                                        <Image
                                                            src={toFaceCroppedThumb(item.imageUrl, { width: 400, aspect: '4:3' }) || item.imageUrl}
                                                            alt=""
                                                            width={400}
                                                            height={250}
                                                            unoptimized
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    </div>
                                                )}
                                                <h4 className="font-display text-[13px] md:text-lg leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3">
                                                    {item.title}
                                                </h4>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
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

function ArticleBody({ blocks, fallbackParagraphs }: { blocks: NewsBlock[]; fallbackParagraphs: string[] }) {
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
    return (
        <div className="mt-6 md:mt-10">
            {blocks.map((b, i) => {
                if (b.type === 'heading') {
                    return (
                        <h2
                            key={i}
                            className="font-display text-2xl md:text-3xl leading-tight tracking-tight text-foreground mt-8 md:mt-10 mb-3 md:mb-4 first:mt-0"
                        >
                            {b.text}
                        </h2>
                    );
                }
                if (b.type === 'image') {
                    return (
                        <figure key={i} className="my-6 md:my-8">
                            <div className="rounded-2xl overflow-hidden bg-muted">
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
                                <figcaption className="mt-2 text-[11px] md:text-xs text-muted-foreground italic flex flex-wrap items-center gap-1.5">
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
                        className="text-[16px] md:text-[17px] leading-[1.75] md:leading-[1.9] text-foreground/90 mb-5 md:mb-6 last:mb-0 [&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline [&_u]:decoration-primary/50 [&_u]:underline-offset-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:mb-1"
                        dangerouslySetInnerHTML={{ __html: b.html }}
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
