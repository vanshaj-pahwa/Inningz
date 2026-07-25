// Server-rendered structured data. Emitting JSON-LD in the initial HTML lets
// crawlers read match/article/organization schema without executing any JS.
// `data` is serialized with a <, >, & escape so it can't break out of the
// <script> or inject markup.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
