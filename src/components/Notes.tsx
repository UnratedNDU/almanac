import type { ReactNode } from "react";
import { parseBlocks, parseInline } from "../lib/markdown";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((span, i) =>
        span.style === "bold" ? <strong key={i}>{span.text}</strong> : span.style === "code" ? <code key={i}>{span.text}</code> : span.text,
      )}
    </>
  );
}

/** Release notes as text: headings, paragraphs, lists, bold and code. Level 1 and 2 headings are the release title, which the caller shows. */
export function Notes({ markdown }: { markdown: string }) {
  const out: ReactNode[] = [];
  let items: string[] = [];
  const flush = () => {
    if (items.length === 0) return;
    out.push(
      <ul key={out.length}>
        {items.map((item, i) => (
          <li key={i}>
            <Inline text={item} />
          </li>
        ))}
      </ul>,
    );
    items = [];
  };
  for (const block of parseBlocks(markdown)) {
    if (block.kind === "item") {
      items.push(block.text);
      continue;
    }
    flush();
    if (block.kind === "paragraph") {
      out.push(
        <p key={out.length}>
          <Inline text={block.text} />
        </p>,
      );
    } else if (block.level >= 3) {
      out.push(<h4 key={out.length}>{block.text}</h4>);
    }
  }
  flush();
  return <div className="notes">{out}</div>;
}
