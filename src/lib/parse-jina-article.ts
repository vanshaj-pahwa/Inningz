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

/**
 * Sentinel URL for images whose real URL is JS-lazy-loaded by the source and
 * therefore absent from the reader's static markdown output. The client
 * enriches these blocks via `extractJinaLdImages` from the HTML-mode reader.
 */
export const LAZY_IMAGE_SENTINEL = '__lazy_image__';

export interface JinaImageRecord {
    url: string;
    caption?: string;
}

/**
 * Extract inline body images from the reader's HTML-mode response by pulling
 * out every `<script type="application/ld+json">{"@type":"ImageObject",...}</script>`
 * block. These records preserve document order — the Nth record corresponds
 * to the Nth lazy-placeholder image in the parsed markdown, so callers can
 * replace sentinel URLs in the same order.
 */
export function extractJinaLdImages(html: string): JinaImageRecord[] {
    const records: JinaImageRecord[] = [];
    const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = scriptRe.exec(html)) !== null) {
        const raw = m[1].trim();
        if (!raw.includes('ImageObject')) continue;
        try {
            const data = JSON.parse(raw);
            const push = (obj: { '@type'?: string; contentUrl?: string; url?: string; caption?: string; description?: string }) => {
                if (!obj || obj['@type'] !== 'ImageObject') return;
                const url = obj.contentUrl || obj.url;
                if (!url) return;
                // Body photos live under `.../lsci/db/PICTURES/` at full width
                // (no `t_ds_square_*` thumbnail transform); everything else is
                // navigation/logo/author artefacts.
                if (!/lsci\/db\/PICTURES\//.test(url)) return;
                if (/t_ds_square_w_\d+/.test(url)) return;
                if (/t_h_\d+/.test(url)) return;
                records.push({ url, caption: obj.caption || obj.description });
            };
            if (Array.isArray(data)) data.forEach(push);
            else push(data);
        } catch { /* malformed JSON — skip */ }
    }
    return records;
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

// Turn `_text_` into `<i>text</i>`. Skips underscores inside identifiers
// (`snake_case`, `some_var`) via lookarounds; non-greedy so multiple italic
// spans on one line resolve independently.
function applyItalic(escaped: string): string {
    return escaped.replace(/(?<![\w_])_(\S(?:[^_\n]*?\S)?)_(?![\w_])/g, '<i>$1</i>');
}

// Wrap balanced straight/curly double-quoted spans in <q>. The quote marks
// stay inside the tag so the reader still sees them; the tag exists purely
// as a styling hook for the article body renderer.
function wrapQuotes(html: string): string {
    return html.replace(/(["“])([^"“”\n]{3,400}?)(["”])/g, '<q>$1$2$3</q>');
}

function stripMarkdownLinks(line: string): string {
    return line
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function decorate(escaped: string): string {
    return wrapQuotes(applyItalic(applyBold(escaped)));
}

function toParagraphHtml(rawLine: string): string {
    // Preserve **bold** through the escape by using a placeholder, then apply.
    const withoutLinks = stripMarkdownLinks(rawLine);
    return decorate(escapeHtml(withoutLinks));
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

    // Locate two anchors: the byline (`Published:`) and the first article-body
    // heading (`## ...`). `firstHeadingIdx` is only trusted when it appears
    // BEFORE the footer end-markers — the reader also emits `## Your Privacy
    // Choices` etc. as part of the cookie banner block, and those would
    // otherwise be mistaken for the article's first section.
    let firstHeadingIdx = -1;
    let publishedIdx = -1;
    let firstEndIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (firstEndIdx < 0 && END_MARKERS.some(re => re.test(lines[i]))) firstEndIdx = i;
        if (publishedIdx < 0 && /^Published:\s/.test(lines[i])) publishedIdx = i;
        if (firstHeadingIdx < 0 && /^##\s+\S/.test(lines[i])) firstHeadingIdx = i;
        if (publishedIdx >= 0 && firstHeadingIdx >= 0 && firstEndIdx >= 0) break;
    }
    if (firstEndIdx >= 0 && firstHeadingIdx >= firstEndIdx) firstHeadingIdx = -1;
    if (firstHeadingIdx < 0 && publishedIdx < 0) return empty;

    const anchorIsByline = publishedIdx >= 0;
    let bodyStartIdx: number;
    let heroImageUrl: string | undefined;
    let heroImageCaption: string | undefined;

    if (anchorIsByline) {
        // Look for the hero image between the byline and the first heading
        // (or end of document if no heading). Captures URL + the caption line
        // that follows. Doesn't advance bodyStartIdx past those — headings
        // that live before the hero image (common in preview articles) must
        // still be walked as content.
        const searchEnd = firstHeadingIdx >= 0 ? firstHeadingIdx : lines.length;
        for (let i = publishedIdx + 1; i < searchEnd; i++) {
            const m = lines[i].match(IMAGE_RE);
            if (!m) continue;
            heroImageUrl = m[1];
            for (let j = i + 1; j < searchEnd; j++) {
                if (!lines[j]) continue;
                heroImageCaption = stripMarkdownLinks(lines[j]);
                break;
            }
            break;
        }
        bodyStartIdx = firstHeadingIdx >= 0 ? firstHeadingIdx : publishedIdx + 1;
    } else {
        bodyStartIdx = firstHeadingIdx;
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
            .map(text => `<li>${decorate(escapeHtml(text))}</li>`)
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

        // Images. A lazy-loaded image still emits a sentinel block so the
        // client can later swap its URL from JSON-LD; skipping these here
        // would lose their document position.
        if (line.startsWith('![')) {
            const m = line.match(IMAGE_RE);
            if (!m) continue;
            const url = m[1];
            const isLazy = /lazyimage-noaspect|logo\.svg/i.test(url);
            if (!isLazy && seenImageUrls.has(url)) continue;
            if (!isLazy) seenImageUrls.add(url);
            // Alt text: `Image N: {alt}` — strip the numeric prefix.
            const altMatch = line.match(/^!\[Image \d+:\s*([^\]]+?)\]/);
            const alt = altMatch ? altMatch[1].trim() : undefined;
            // Peek at the next non-blank line — the source places the human
            // caption ("... struck a half-century ... •BCCI") right after
            // the image. Prefer that over the alt when both exist.
            let caption = alt;
            for (let j = i + 1; j < lines.length; j++) {
                const next = lines[j];
                if (!next) continue;
                if (next.startsWith('![') || next.startsWith('[![')) break;
                if (/^##?\s/.test(next) || next.startsWith('*')) break;
                // Caption lines end with `•{Source}` — BCCI, Reuters, Getty
                // Images, AFP, etc. Anything short after the bullet counts.
                if (/•\s*[A-Z][A-Za-z][^\n]{0,60}$/.test(next)) {
                    caption = stripMarkdownLinks(next);
                    i = j; // consume the caption line
                }
                break;
            }
            if (!heroConsumed && !isLazy) {
                heroImageUrl = url;
                heroImageCaption = caption;
                heroConsumed = true;
                continue;
            }
            blocks.push({
                type: 'image',
                imageUrl: isLazy ? LAZY_IMAGE_SENTINEL : url,
                caption,
            });
            continue;
        }
        if (AUTHOR_IMAGE_RE.test(line)) continue;
        if (STANDALONE_LINK_RE.test(line)) continue;
        if (/^\d+$/.test(line)) continue;
        if (/^Published:/.test(line)) continue;

        const clean = stripMarkdownLinks(line);
        if (clean.length < 40) continue;
        // Photo captions ("... in Delhi•BCCI") — short, end with •SOURCE.
        if (/•\s*[A-Z][A-Za-z][^\n]{0,60}$/.test(clean) && clean.length < 200) continue;

        paragraphs.push(clean);
        blocks.push({ type: 'paragraph', html: toParagraphHtml(line) });
    }
    flushList();

    return { paragraphs, blocks, heroImageUrl, heroImageCaption };
}
