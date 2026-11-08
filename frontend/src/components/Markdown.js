import React from "react";

// Lightweight, safe Markdown renderer (no HTML injection).
// Used for AI answers and for previewing uploaded .md files.
// Supports headings, paragraphs, bold/italic, inline code, links,
// bullet/numbered lists, blockquotes, fenced code blocks and rules.

const SAFE_URL = /^(https?:|mailto:)/i;

const renderInline = (text, keyPrefix) => {
  const parts = [];
  const regex =
    /(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("[")) {
      const [, label, url] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      parts.push(
        SAFE_URL.test(url) ? (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ) : (
          label
        )
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

const parseBlocks = (text) => {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let list = null;
  let paragraph = [];
  let quote = [];
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "p", content: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) blocks.push({ type: "quote", content: quote.join(" ") });
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  lines.forEach((raw) => {
    // Inside a fenced code block: keep lines verbatim
    if (code) {
      if (/^\s*```/.test(raw)) {
        blocks.push(code);
        code = null;
      } else {
        code.lines.push(raw);
      }
      return;
    }

    const line = raw.trim();
    const fence = line.match(/^```(\w*)/);
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const bullet = line.match(/^[-*+•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const blockquote = line.match(/^>\s?(.*)$/);
    const rule = /^([-*_]\s*){3,}$/.test(line);

    if (fence) {
      flushAll();
      code = { type: "code", lang: fence[1], lines: [] };
    } else if (!line) {
      flushAll();
    } else if (rule) {
      flushAll();
      blocks.push({ type: "hr" });
    } else if (heading) {
      flushAll();
      blocks.push({ type: "h", level: heading[1].length, content: heading[2] });
    } else if (blockquote) {
      flushParagraph();
      flushList();
      quote.push(blockquote[1]);
    } else if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((bullet || numbered)[1]);
    } else {
      flushList();
      flushQuote();
      paragraph.push(line);
    }
  });

  if (code) blocks.push(code);
  flushAll();
  return blocks;
};

const Markdown = ({ text = "", className = "" }) => {
  const blocks = parseBlocks(text);

  return (
    <div className={`markdown ${className}`}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h": {
            const Tag = `h${Math.min(block.level + 1, 6)}`;
            return <Tag key={i}>{renderInline(block.content, i)}</Tag>;
          }
          case "ul":
          case "ol": {
            const Tag = block.type;
            return (
              <Tag key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote key={i}>{renderInline(block.content, i)}</blockquote>
            );
          case "code":
            return (
              <pre key={i}>
                <code>{block.lines.join("\n")}</code>
              </pre>
            );
          case "hr":
            return <hr key={i} />;
          default:
            return <p key={i}>{renderInline(block.content, i)}</p>;
        }
      })}
    </div>
  );
};

export default Markdown;
