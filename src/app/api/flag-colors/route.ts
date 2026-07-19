import sharp from 'sharp';

// Colours never change per team, so memoise by flag URL for the process lifetime.
const cache = new Map<string, { colors: string[] }>();

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url') ?? '';

  // Only our known flag host, to avoid this becoming an open image proxy.
  let host = '';
  try { host = new URL(url).host; } catch { /* invalid */ }
  if (host !== 'static.cricbuzz.com') {
    return Response.json({ colors: [] }, { status: 400 });
  }

  const hit = cache.get(url);
  if (hit) return Response.json(hit);

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/91' } });
    if (!res.ok) throw new Error(res.statusText);
    const buf = Buffer.from(await res.arrayBuffer());

    // Quantise the flag's pixels into colour buckets, then pick the two most
    // prominent ones that are clearly different — favouring saturated colours so
    // we get the flag's real accents (India -> saffron/green, England -> white/red).
    const { data } = await sharp(buf).resize(16, 16, { fit: 'fill' }).removeAlpha().raw()
      .toBuffer({ resolveWithObject: true });

    type Bucket = { r: number; g: number; b: number; count: number; sat: number };
    const buckets = new Map<string, Bucket>();
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const e = buckets.get(key);
      if (e) e.count++;
      else buckets.set(key, { r, g, b, count: 1, sat });
    }
    // Prominence = frequency weighted up by saturation (so a small vivid accent beats a big flat white).
    const ranked = [...buckets.values()].sort((a, b) => b.count * (0.4 + b.sat) - a.count * (0.4 + a.sat));
    const dist = (a: Bucket, c: Bucket) => Math.abs(a.r - c.r) + Math.abs(a.g - c.g) + Math.abs(a.b - c.b);
    const first = ranked[0];
    const second = ranked.find((c) => dist(c, first) > 110) ?? ranked[1] ?? first;
    const out = { colors: [toHex(first.r, first.g, first.b), toHex(second.r, second.g, second.b)] };

    cache.set(url, out);
    return Response.json(out);
  } catch {
    return Response.json({ colors: [] });
  }
}
