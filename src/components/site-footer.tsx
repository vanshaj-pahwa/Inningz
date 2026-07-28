// The site footer. Two competing jobs to reconcile here:
//   1. UX/brand: it's the closing frame of every server-rendered page and
//      should read as an intentional piece of the product, not raw scraped
//      link soup.
//   2. SEO: the routes above it are client-rendered SPAs, so a fresh
//      Googlebot crawl of `/`, `/news`, or `/rankings` sees zero deep
//      anchors without a server-rendered link block. The footer is the
//      natural place for those anchors to live.
//
// The answer isn't to pick one over the other. A proper editorial footer
// (e.g. The Athletic, NYT) also carries dozens of section/story links and
// still feels considered. This component does the same: a brand row, a
// small product-nav block, a compact SEO discovery row (tight lists, muted
// type, still crawlable), and a bottom legal strip. Every deep link is a
// real `<a href>` in the SSR HTML so the internal-link SEO story is intact.

import Image from 'next/image';
import Link from 'next/link';
import { Github } from 'lucide-react';
import {
  getLiveMatches, getRecentMatches, getUpcomingMatches,
  getICCTeamRankings, getCricketNews,
} from '@/app/actions';
import { buildMatchHref, buildNewsHref, buildTeamHref } from '@/lib/utils';

export type SiteFooterProps = {
  /** Which discovery sections to surface. All three by default; individual
   *  pages can drop one that's already the page's own subject matter (e.g.
   *  hide `news` on `/news` because those anchors are already in view). */
  sections?: Array<'matches' | 'teams' | 'news'>;
};

export default async function SiteFooter({
  sections = ['matches', 'teams', 'news'],
}: SiteFooterProps) {
  const [live, recent, upcoming, teams, news] = await Promise.allSettled([
    sections.includes('matches') ? getLiveMatches() : Promise.resolve(null),
    sections.includes('matches') ? getRecentMatches() : Promise.resolve(null),
    sections.includes('matches') ? getUpcomingMatches() : Promise.resolve(null),
    sections.includes('teams') ? getICCTeamRankings('odi') : Promise.resolve(null),
    sections.includes('news') ? getCricketNews() : Promise.resolve(null),
  ]);

  // Dedupe match cards across live/recent/upcoming; the same fixture can
  // appear in multiple buckets during transitions. Live first so a currently
  // running fixture ranks above recent.
  const matchLinks: Array<{ href: string; title: string }> = [];
  const seenMatch = new Set<string>();
  const pushMatches = (bucket: PromiseSettledResult<{ matches?: Array<{ matchId?: string; title?: string }> } | null>) => {
    if (bucket.status !== 'fulfilled' || !bucket.value?.matches) return;
    for (const m of bucket.value.matches) {
      if (!m.matchId || !m.title || seenMatch.has(m.matchId)) continue;
      seenMatch.add(m.matchId);
      matchLinks.push({ href: buildMatchHref(m.matchId, m.title), title: m.title });
    }
  };
  pushMatches(live);
  pushMatches(upcoming);
  pushMatches(recent);

  const teamLinks: Array<{ href: string; title: string }> = [];
  if (teams.status === 'fulfilled' && teams.value?.data?.entries) {
    for (const t of teams.value.data.entries) {
      const href = buildTeamHref(t.teamId, t.teamName);
      if (href) teamLinks.push({ href, title: t.teamName });
      if (teamLinks.length >= 10) break;
    }
  }

  const newsLinks: Array<{ href: string; title: string }> = [];
  if (news.status === 'fulfilled' && news.value?.data?.items) {
    for (const n of news.value.data.items) {
      newsLinks.push({ href: buildNewsHref(n.id, n.slug), title: n.title });
      if (newsLinks.length >= 10) break;
    }
  }

  const year = new Date().getFullYear();

  return (
    <footer
      aria-label="Site footer"
      className="mt-16 md:mt-24 border-t border-border/40 bg-muted/[0.03]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-12 md:pt-16 pb-8 md:pb-10 space-y-10 md:space-y-12">
        {/* Brand row: logo + tagline on the left, Source-on-GitHub CTA on
            the right. Anchors the footer as brand chrome, not link soup. */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <Link href="/" aria-label="Inningz home" className="inline-block">
              <Image
                src="/logo-full-transparent.png"
                alt="Inningz"
                width={400}
                height={120}
                className="hidden dark:block h-9 md:h-10 w-auto"
              />
              <Image
                src="/logo-full-dark.png"
                alt="Inningz"
                width={400}
                height={120}
                className="block dark:hidden h-9 md:h-10 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm md:text-[15px] leading-relaxed text-muted-foreground max-w-md">
              Live cricket scores, ball-by-ball commentary, and the stories worth reading, all in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/vanshaj-pahwa/Inningz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-border bg-background/60 text-[13px] font-medium text-foreground hover:border-primary/60 hover:text-primary transition-colors"
            >
              <Github aria-hidden className="w-4 h-4" />
              <span>Source on GitHub</span>
            </a>
          </div>
        </div>

        {/* Product + About nav: the actual "footer navigation" bit. Small
            column count keeps it looking like a considered site index, not
            a data dump. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-10 pt-8 md:pt-10 border-t border-border/30">
          <FooterColumn heading="Product">
            <FooterLink href="/">Live scores</FooterLink>
            <FooterLink href="/news">Cricket news</FooterLink>
            <FooterLink href="/rankings">ICC rankings</FooterLink>
          </FooterColumn>
          <FooterColumn heading="Explore">
            <FooterLink href="/rankings?category=teams">Teams</FooterLink>
            <FooterLink href="/rankings?category=batting">Batters</FooterLink>
            <FooterLink href="/rankings?category=bowling">Bowlers</FooterLink>
            <FooterLink href="/rankings?category=allrounder">All-rounders</FooterLink>
          </FooterColumn>
          <FooterColumn heading="About">
            <a
              href="https://github.com/vanshaj-pahwa/Inningz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] leading-snug text-muted-foreground hover:text-primary transition-colors"
            >
              Source code
            </a>
            <a
              href="https://github.com/vanshaj-pahwa/Inningz/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] leading-snug text-muted-foreground hover:text-primary transition-colors"
            >
              Report an issue
            </a>
          </FooterColumn>
          <FooterColumn heading="Follow">
            <a
              href="https://github.com/vanshaj-pahwa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] leading-snug text-muted-foreground hover:text-primary transition-colors"
            >
              Vanshaj Pahwa
            </a>
          </FooterColumn>
        </div>

        {/* SEO / discovery block: tight lists, muted typography, kept in
            the footer because they're navigation-adjacent, not editorial.
            The compact `text-[12px]` type is intentional: the block still
            gives Googlebot the anchors it needs without dominating the
            visual weight. */}
        {(matchLinks.length + teamLinks.length + newsLinks.length > 0) && (
          <div className="pt-8 md:pt-10 border-t border-border/30">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 mb-5">
              Discover more
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {sections.includes('matches') && matchLinks.length > 0 && (
                <SeoColumn heading="Recent matches" items={matchLinks.slice(0, 12)} />
              )}
              {sections.includes('teams') && teamLinks.length > 0 && (
                <SeoColumn heading="Top teams" items={teamLinks} inline />
              )}
              {sections.includes('news') && newsLinks.length > 0 && (
                <SeoColumn heading="Latest news" items={newsLinks} />
              )}
            </div>
          </div>
        )}

        {/* Colophon: copyright, credit, honest data disclaimer. Small type
            (as it should be), single line on desktop, wraps on mobile. */}
        <div className="pt-6 md:pt-8 border-t border-border/30 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] md:text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>© {year} Inningz</span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span>
              Built by{' '}
              <a
                href="https://github.com/vanshaj-pahwa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
              >
                Vanshaj Pahwa
              </a>
            </span>
          </div>
          <p className="max-w-xl leading-relaxed text-muted-foreground/80">
            Not officially affiliated with any cricket board, league or broadcaster. Match data via public feeds.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-[13px] md:text-sm tracking-tight text-foreground mb-3.5">
        {heading}
      </h2>
      <ul className="space-y-2.5">
        {Array.isArray(children)
          ? children.map((c, i) => <li key={i}>{c}</li>)
          : <li>{children}</li>}
      </ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="text-[13px] leading-snug text-muted-foreground hover:text-primary transition-colors"
    >
      {children}
    </Link>
  );
}

function SeoColumn({
  heading, items, inline = false,
}: {
  heading: string;
  items: Array<{ href: string; title: string }>;
  inline?: boolean;
}) {
  if (inline) {
    // Team names inline as small text with `·` separators; reads as a
    // subtle roll call rather than a stacked list, and takes a fraction of
    // the vertical space of a bullet column.
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3">
          {heading}
        </p>
        <p className="text-[12px] leading-[1.9] text-muted-foreground">
          {items.map((it, i) => (
            <span key={it.href}>
              {i > 0 && <span aria-hidden className="text-muted-foreground/30 mx-1.5">·</span>}
              <Link
                href={it.href}
                prefetch={false}
                className="hover:text-primary transition-colors"
              >
                {it.title}
              </Link>
            </span>
          ))}
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3">
        {heading}
      </p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              prefetch={false}
              className="text-[12px] leading-snug text-muted-foreground hover:text-primary transition-colors line-clamp-2"
            >
              {it.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
