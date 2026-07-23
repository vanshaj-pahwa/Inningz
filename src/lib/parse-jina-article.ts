/**
 * Parse the reader-mode markdown returned by r.jina.ai for a news article
 * into structured content blocks. The upstream reader emits two common
 * shapes for cricket articles:
 *
 *   Pattern A (feature stories, byline present):
 *     Markdown Content:
 *     ... nav / trending ...
 *     # {title}
 *     {subhead}
 *     [![Image N: author](...)](...author-url...)
 *     [{author}](...)
 *     Published: ...
 *     {commentCount}
 *     ![Image N: hero](...)
 *     {hero caption}•SOURCE
 *     {body paragraphs and ## sub-headings}
 *
 *   Pattern B (previews, no byline block, jumps straight into structure):
 *     Markdown Content:
 *     ... nav / trending ...
 *     ## {first section heading}
 *     {body paragraphs}
 *     ...
 *     ## {next section heading}
 *     ...
 *
 * The parser tolerates both — anchoring on the earliest of `Published:` or
 * the first `## ` heading — and emits paragraph/heading blocks with `**bold**`
 * preserved as `<b>` for inline emphasis on player names and team labels.
 */

import type { NewsBlock } from '@/app/actions';

export interface ParsedJinaArticle {
    paragraphs: string[];
    blocks: NewsBlock[];
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

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Turn `**bold**` into `<b>bold</b>`. Called AFTER escapeHtml so tag chars
// in the source can't produce invalid markup. Non-greedy, single-line.
function applyBold(escaped: string): string {
    return escaped.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

function stripMarkdownLinks(line: string): string {
    return line
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function toParagraphHtml(rawLine: string): string {
    // Preserve **bold** through the escape by using a placeholder, then apply.
    const withoutLinks = stripMarkdownLinks(rawLine);
    return applyBold(escapeHtml(withoutLinks));
}

export function parseJinaArticle(md: string): ParsedJinaArticle {
    const empty: ParsedJinaArticle = { paragraphs: [], blocks: [] };

    // Trim to just the Markdown Content section when present — it's the
    // reader's stable body delimiter.
    const contentMarker = 'Markdown Content:';
    const contentIdx = md.indexOf(contentMarker);
    const contentBody = contentIdx >= 0
        ? md.slice(contentIdx + contentMarker.length)
        : md;

    const lines = contentBody.split(/\r?\n/).map(l => l.trim());

    // Find earliest anchor: `Published:` (Pattern A) OR first `## ` (Pattern B).
    let anchorIdx = -1;
    let anchorIsByline = false;
    for (let i = 0; i < lines.length; i++) {
        if (/^Published:\s/.test(lines[i])) { anchorIdx = i; anchorIsByline = true; break; }
        if (/^##\s+\S/.test(lines[i])) { anchorIdx = i; break; }
    }
    if (anchorIdx < 0) return empty;

    let bodyStartIdx = anchorIdx;
    let heroImageUrl: string | undefined;
    let heroImageCaption: string | undefined;

    if (anchorIsByline) {
        // Skip forward to hero image, capture it and the caption.
        bodyStartIdx = anchorIdx + 1;
        for (let i = anchorIdx + 1; i < lines.length; i++) {
            const m = lines[i].match(IMAGE_RE);
            if (!m) continue;
            heroImageUrl = m[1];
            for (let j = i + 1; j < lines.length; j++) {
                if (!lines[j]) continue;
                heroImageCaption = stripMarkdownLinks(lines[j]);
                bodyStartIdx = j + 1;
                break;
            }
            break;
        }
    }

    const paragraphs: string[] = [];
    const blocks: NewsBlock[] = [];
    let inRelatedSection = false;
    // In Pattern A the hero image is captured above and rendered as the page
    // hero. In Pattern B the first inline image becomes the page hero so it
    // isn't duplicated in the body. Every subsequent image becomes a block.
    let heroConsumed = !!heroImageUrl;
    const seenImageUrls = new Set<string>();
    if (heroImageUrl) seenImageUrls.add(heroImageUrl);

    // Batch consecutive stat-list items into a single <ul> paragraph.
    let listBuffer: string[] = [];
    const flushList = () => {
        if (listBuffer.length === 0) return;
        const itemsHtml = listBuffer
            .map(text => `<li>${applyBold(escapeHtml(text))}</li>`)
            .join('');
        blocks.push({ type: 'paragraph', html: `<ul>${itemsHtml}</ul>` });
        for (const t of listBuffer) paragraphs.push(t);
        listBuffer = [];
    };

    for (let i = bodyStartIdx; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        if (END_MARKERS.some(re => re.test(line))) { flushList(); break; }
        if (TAG_BLOCK_RE.test(line)) { flushList(); break; }

        // Related section: the reader marks a plain "Related" line then
        // emits linked-thumbnail bullet items. Skip until we exit the list.
        if (/^Related\s*$/.test(line)) {
            flushList();
            inRelatedSection = true;
            continue;
        }

        // Bullet items
        if (line.startsWith('*')) {
            const stripped = line.replace(/^\*+\s+/, '').trim();
            // Related-section items start with `[![Image N:` (linked thumbnails).
            if (inRelatedSection || stripped.startsWith('[![')) continue;
            const clean = stripMarkdownLinks(stripped);
            if (clean.length < 8) continue;
            listBuffer.push(clean);
            continue;
        }

        // Any non-bullet line closes both the related section and any open list.
        inRelatedSection = false;
        flushList();

        // Headings
        if (line.startsWith('# ')) continue; // redundant with page <h1>
        if (/^##+\s+/.test(line)) {
            const text = stripMarkdownLinks(line.replace(/^##+\s+/, ''));
            if (text) blocks.push({ type: 'heading', text });
            continue;
        }

        // Images
        if (line.startsWith('![')) {
            const m = line.match(IMAGE_RE);
            if (!m) continue;
            const url = m[1];
            if (seenImageUrls.has(url)) continue;
            seenImageUrls.add(url);
            // Skip lazy-placeholder svgs (used in related-story bullet lists,
            // but occasionally leak through if the reader lost context).
            if (/lazyimage-noaspect|logo\.svg/i.test(url)) continue;
            // Alt text: `Image N: {alt}` — strip the numeric prefix.
            const altMatch = line.match(/^!\[Image \d+:\s*([^\]]+?)\]/);
            const alt = altMatch ? altMatch[1].trim() : undefined;
            if (!heroConsumed) {
                heroImageUrl = url;
                heroImageCaption = alt;
                heroConsumed = true;
                continue;
            }
            blocks.push({ type: 'image', imageUrl: url, caption: alt });
            continue;
        }
        if (AUTHOR_IMAGE_RE.test(line)) continue;
        if (STANDALONE_LINK_RE.test(line)) continue;
        if (/^\d+$/.test(line)) continue;
        if (/^Published:/.test(line)) continue;

        const clean = stripMarkdownLinks(line);
        if (clean.length < 40) continue;
        // Photo captions ("... in Delhi•BCCI") — short, end with •SOURCE.
        if (/•[A-Z]{2,}\s*$/.test(clean) && clean.length < 120) continue;

        paragraphs.push(clean);
        blocks.push({ type: 'paragraph', html: toParagraphHtml(line) });
    }
    flushList();

    return { paragraphs, blocks, heroImageUrl, heroImageCaption };
}
