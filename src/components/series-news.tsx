'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Newspaper } from 'lucide-react';
import { getSeriesNews } from '@/app/actions';
import type { NewsFeed, NewsItem } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buildNewsHref } from '@/lib/utils';

interface SeriesNewsProps {
  seriesId: string;
}

export default function SeriesNewsDisplay({ seriesId }: SeriesNewsProps) {
  const [feed, setFeed] = useState<NewsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const result = await getSeriesNews(seriesId);
      if (cancelled) return;
      if (result.success && result.data) setFeed(result.data);
      else { setFeed(null); setError(result.error || 'Failed to load series news'); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [seriesId]);

  if (loading) return <NewsSkeleton />;

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[40vh]">
        <Alert variant="destructive" className="max-w-xl rounded-2xl">
          <AlertTitle className="text-lg">Unable to load news</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!feed || feed.items.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[30vh] p-8">
        <div className="p-5 rounded-full bg-primary/10 mb-5">
          <Newspaper className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-display mb-2">No news yet</h3>
        <p className="text-muted-foreground text-center max-w-sm text-sm">
          Stories for this series will appear here as they get published.
        </p>
      </div>
    );
  }

  const [featured, ...rest] = feed.items;

  return (
    <div>
      {featured && <FeaturedStory item={featured} />}
      {rest.length > 0 && (
        <ul className="mt-8 md:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {rest.map(item => (
            <StoryCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FeaturedStory({ item }: { item: NewsItem }) {
  const rel = relativeTime(item.publishedAt);
  return (
    <Link href={`${buildNewsHref(item.id, item.slug)}?src=series`} className="group block">
      {item.imageUrl && (
        <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden bg-muted">
          <Image
            src={item.imageUrl}
            alt=""
            width={1920}
            height={1080}
            priority
            unoptimized
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <span className="absolute top-3 left-3 md:top-4 md:left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] md:text-[11px] font-bold uppercase tracking-widest backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Top story
          </span>
        </div>
      )}
      <div className="mt-4 md:mt-5">
        {/* Display title fills the full hero width so it visually balances
            the wide image above; description stays at a readable
            ~70ch line length so long-form scanning isn't sabotaged. */}
        <h2 className="font-display text-2xl md:text-4xl lg:text-5xl leading-[1.05] tracking-tight text-foreground group-hover:text-primary transition-colors">
          {item.title}
        </h2>
        {item.description && (
          <p className="mt-3 md:mt-4 text-sm md:text-base leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
        {rel && (
          <p className="mt-3 md:mt-4 text-[11px] md:text-xs text-muted-foreground tabular-nums">
            {rel}
          </p>
        )}
      </div>
    </Link>
  );
}

function StoryCard({ item }: { item: NewsItem }) {
  const rel = relativeTime(item.publishedAt);
  return (
    <li>
      <Link href={`${buildNewsHref(item.id, item.slug)}?src=series`} className="group flex flex-col gap-3 h-full">
        {item.imageUrl ? (
          <div className="aspect-[16/10] rounded-lg md:rounded-xl overflow-hidden bg-muted">
            <Image
              src={item.imageUrl}
              alt=""
              width={1200}
              height={750}
              unoptimized
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="aspect-[16/10] rounded-lg md:rounded-xl bg-muted/40 flex items-center justify-center">
            <Newspaper className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 flex flex-col">
          <h3 className="font-display text-base md:text-lg leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          {item.description && (
            <p className="hidden md:block text-sm text-muted-foreground mt-2 leading-relaxed">
              {item.description}
            </p>
          )}
          {rel && (
            <p className="mt-auto pt-2 text-[11px] text-muted-foreground tabular-nums">
              {rel}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

function NewsSkeleton() {
  return (
    <div>
      <div className="aspect-[16/9] md:aspect-[21/9] rounded-2xl skeleton" />
      <div className="mt-5 space-y-3 max-w-3xl">
        <div className="skeleton h-8 md:h-12 w-11/12 rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
      </div>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[16/10] rounded-xl skeleton" />
            <div className="skeleton h-5 w-11/12 rounded" />
            <div className="skeleton h-3 w-3/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function relativeTime(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
