/**
 * Parse the reader-mode markdown returned by r.jina.ai for a news article
 * into a list of body paragraphs. The reader output has a stable shape:
 *
 *   Title: ...
 *   URL Source: ...
 *   Published Time: ...
 *   Markdown Content:
 *   ... nav / trending / breadcrumbs ...
 *   # {title}
 *   {subhead}
 *   [![Image N: author](...)](...author-url...)
 *   [{author}](...)
 *   Published: ...
 *   {commentCount}
 *   ![Image N: hero-alt](...hero-url...)
 *   {hero caption}•SOURCE
 *   {body paragraphs}
 *   ...
 *   [Tag1](...)[Tag2](...)
 *   ...
 *   [Terms of Use](...)•[Privacy Policy](...)...
 *
 * We anchor on the `Published:` byline and skip forward past the hero image
 * and its caption, then keep body-shaped lines until end markers.
 */

export interface ParsedJinaArticle {
    paragraphs: string[];
    heroImageUrl?: string;
    heroImageCaption?: string;
}

const END_MARKERS: RegExp[] = [
    /^\[Terms of Use\]/,
    /^## Your Privacy Choices/,
    /^Manage Preferences\s*$/,
    /^Accept All\s*$/,
];

// A "tag block" line looks like: [Team](url)[Team](url)... — only bracketed
// links, no free text in between.
const TAG_BLOCK_RE = /^(?:\[[^\]]+\]\([^)]+\))+$/;

// Standalone byline link: [Daya Sagar](...)
const STANDALONE_LINK_RE = /^\[[^\]]+\]\([^)]+\)$/;

// Author image: [![Image N: name](...)](...)
const AUTHOR_IMAGE_RE = /^\[!\[Image \d+:[\s\S]*?\]\([^)]+\)\]\([^)]+\)$/;

// Inline image: ![Image N: alt](url)
const IMAGE_RE = /^!\[Image \d+:[\s\S]*?\]\(([^)]+)\)$/;

function stripMarkdownLinks(line: string): string {
    return line
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

export function parseJinaArticle(md: string): ParsedJinaArticle {
    const lines = md.split(/\r?\n/).map(l => l.trim());

    // 1. Locate the byline "Published: ..." line — that's the anchor.
    let bylineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/^Published:\s/.test(lines[i])) { bylineIdx = i; break; }
    }
    if (bylineIdx < 0) return { paragraphs: [] };

    // 2. From the byline, skip forward to the hero image (first standalone
    //    ![Image N: ...](hscicdn or img1) line). The line right after is the
    //    hero caption — capture both, then start collecting body.
    let heroImageUrl: string | undefined;
    let heroImageCaption: string | undefined;
    let bodyStartIdx = bylineIdx + 1;
    for (let i = bylineIdx + 1; i < lines.length; i++) {
        const m = lines[i].match(IMAGE_RE);
        if (!m) continue;
        heroImageUrl = m[1];
        // caption is the next non-empty line
        for (let j = i + 1; j < lines.length; j++) {
            if (!lines[j]) continue;
            heroImageCaption = stripMarkdownLinks(lines[j]);
            bodyStartIdx = j + 1;
            break;
        }
        break;
    }

    // 3. Walk forward collecting body paragraphs until an end marker fires.
    const paragraphs: string[] = [];
    for (let i = bodyStartIdx; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        if (END_MARKERS.some(re => re.test(line))) break;
        if (TAG_BLOCK_RE.test(line)) break;
        if (line.startsWith('#')) continue;
        if (line.startsWith('*')) continue;
        if (line.startsWith('![')) continue;
        if (AUTHOR_IMAGE_RE.test(line)) continue;
        if (STANDALONE_LINK_RE.test(line)) continue;
        if (/^\d+$/.test(line)) continue; // comment count / share count
        if (/^Published:/.test(line)) continue;
        const clean = stripMarkdownLinks(line);
        // Skip caption-shaped lines (short, end with •source) and other tiny
        // metadata leftovers.
        if (clean.length < 40) continue;
        if (/•[A-Z]{2,}\s*$/.test(clean) && clean.length < 120) continue;
        paragraphs.push(clean);
    }

    return { paragraphs, heroImageUrl, heroImageCaption };
}
