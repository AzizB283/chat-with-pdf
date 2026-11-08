const fs = require("fs");

class MarkdownService {
  // Convert Markdown to plain text that is good for embedding and search.
  extractTextFromMarkdown(filePath) {
    const raw = fs.readFileSync(filePath, "utf8");

    const text = raw
      .replace(/^﻿/, "") // BOM
      .replace(/^---\n[\s\S]*?\n---\n/, "") // YAML front matter
      .replace(/```[^\n]*\n([\s\S]*?)```/g, "$1") // keep code block contents
      .replace(/<!--[\s\S]*?-->/g, "") // HTML comments
      .replace(/<[^>]+>/g, "") // HTML tags
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images -> alt text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> link text
      .replace(/^\s{0,3}#{1,6}\s+/gm, "") // headings
      .replace(/^\s{0,3}>\s?/gm, "") // blockquotes
      .replace(/^\s*[-*+]\s+/gm, "") // bullets
      .replace(/^\s*\d+[.)]\s+/gm, "") // numbered lists
      .replace(/^\s*([-*_]\s*){3,}$/gm, "") // horizontal rules
      .replace(/\|/g, " ") // table pipes
      .replace(/(\*\*|__|\*|_|~~|`)/g, "") // emphasis / inline code
      .replace(/[ \t]+/g, " ")
      .replace(/\n{2,}/g, "\n")
      .trim();

    if (!text || text.length < 10) {
      throw new Error("Markdown file appears to be empty");
    }

    console.log(`Extracted ${text.length} characters from Markdown`);
    return text;
  }
}

module.exports = new MarkdownService();
