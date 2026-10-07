import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { parseMarkdown, type InlineNode } from "@/lib/markdown";

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return nodes.map((node, index) =>
    node.type === "bold" ? (
      <strong key={index} className="font-bold text-fg">
        {node.text}
      </strong>
    ) : node.type === "italic" ? (
      <em key={index}>{node.text}</em>
    ) : (
      <Fragment key={index}>{node.text}</Fragment>
    )
  );
}

// Renders the safe Markdown subset from lib/markdown (event descriptions).
export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);

  return (
    <div className={cn("grid gap-4", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3 key={index} className="text-xl font-bold text-fg">
              <Inline nodes={block.content} />
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="grid list-disc gap-1 pl-6">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline nodes={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <Inline nodes={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
