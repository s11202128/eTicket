// A tiny, safe Markdown subset for event descriptions. Pure, unit-tested.
// Supported: paragraphs, "## " headings, "- " / "* " bullet lists,
// **bold** and *italic*. Everything else is plain text (no HTML, no links),
// so organizer text can never inject markup.

export type InlineNode = { type: "text" | "bold" | "italic"; text: string };

export type Block =
  | { type: "heading"; content: InlineNode[] }
  | { type: "paragraph"; lines: InlineNode[][] }
  | { type: "list"; items: InlineNode[][] };

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(\S(?:.*?\S)?)\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push({ type: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) nodes.push({ type: "bold", text: match[1] });
    else nodes.push({ type: "italic", text: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push({ type: "text", text: text.slice(last) });
  return nodes;
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const HEADING = /^\s*#{1,3}\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: InlineNode[][] | null = null;
  let list: InlineNode[][] | null = null;

  const flush = () => {
    if (paragraph) blocks.push({ type: "paragraph", lines: paragraph });
    if (list) blocks.push({ type: "list", items: list });
    paragraph = null;
    list = null;
  };

  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: "heading", content: parseInline(heading[1].trim()) });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      if (paragraph) flush();
      list ??= [];
      list.push(parseInline(bullet[1].trim()));
      continue;
    }

    if (list) flush();
    paragraph ??= [];
    paragraph.push(parseInline(line.trim()));
  }
  flush();
  return blocks;
}
