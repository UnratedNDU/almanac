/** The few Markdown pieces release notes use. Output is data, never HTML, so notes from the network cannot inject markup. */
export type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "item"; text: string }
  | { kind: "paragraph"; text: string };

export interface Span {
  text: string;
  style?: "bold" | "code";
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const ITEM = /^[-*]\s+(.*)$/;

/** One block per non-empty line. */
export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = HEADING.exec(line);
    const item = ITEM.exec(line);
    if (heading) blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
    else if (item) blocks.push({ kind: "item", text: item[1] });
    else blocks.push({ kind: "paragraph", text: line });
  }
  return blocks;
}

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`/g;

/** Splits `**bold**` and `code` spans from the text around them. */
export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) spans.push({ text: text.slice(last, match.index) });
    spans.push(match[1] !== undefined ? { text: match[1], style: "bold" } : { text: match[2], style: "code" });
    last = match.index + match[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans;
}
