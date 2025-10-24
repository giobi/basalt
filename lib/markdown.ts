import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import matter from 'gray-matter';

export interface ParsedMarkdown {
  content: string;
  frontmatter: Record<string, any>;
  wikilinks: string[];
}

/**
 * Parse markdown content with frontmatter and wikilinks
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  // Extract frontmatter
  const { data: frontmatter, content: markdownContent } = matter(content);

  // Extract wikilinks [[link]] or [[link|alias]]
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const wikilinks: string[] = [];
  let match;

  while ((match = wikilinkRegex.exec(markdownContent)) !== null) {
    wikilinks.push(match[1]);
  }

  return {
    content: markdownContent,
    frontmatter,
    wikilinks: Array.from(new Set(wikilinks)), // Remove duplicates
  };
}

/**
 * Convert wikilinks to HTML links
 */
export function convertWikilinks(content: string): string {
  return content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (match, target, alias) => {
      const displayText = alias || target;
      const href = `/note/${encodeURIComponent(target)}`;
      return `<a href="${href}" class="wikilink">${displayText}</a>`;
    }
  );
}

/**
 * Process markdown to HTML
 */
export async function markdownToHtml(content: string): Promise<string> {
  // First convert wikilinks
  const contentWithLinks = convertWikilinks(content);

  // Then process markdown
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .process(contentWithLinks);

  return String(file);
}
