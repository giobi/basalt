# Basalt

Web-based Obsidian vault reader with Git integration.

## Features

- 📖 Read Obsidian vaults directly from GitHub
- 🔗 Wikilinks support with automatic navigation
- 📊 Browse files with directory tree
- 🎨 Clean markdown rendering
- ⚡ Deployed on Cloudflare Pages
- 🔍 Search functionality

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Markdown**: unified + remark + rehype
- **Data Source**: GitHub API (giobi/brain repo)
- **Deployment**: Cloudflare Pages

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Architecture

### File Structure

```
basalt/
├── app/                    # Next.js app directory
│   ├── api/               # API routes for GitHub integration
│   ├── note/[slug]/       # Dynamic note pages
│   └── page.tsx           # Homepage with file browser
├── components/            # React components
│   ├── FileBrowser.tsx    # Directory tree and search
│   └── NoteViewer.tsx     # Markdown renderer
├── lib/                   # Core libraries
│   ├── github.ts          # GitHub API client
│   └── markdown.ts        # Markdown parser with wikilinks
└── types/                 # TypeScript types
    └── vault.ts           # Vault data structures
```

### Features

#### Wikilinks
Supports Obsidian-style wikilinks:
- `[[note]]` - Links to note
- `[[note|alias]]` - Links with custom text

#### File Resolution
Automatically searches for notes in:
- Exact path
- `log/2025/`
- `diary/2025/`
- `sketch/`
- `database/`

#### Caching
GitHub API responses cached for 1 hour to reduce rate limiting.

## Deployment

### Cloudflare Pages

1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `.next`
4. Framework preset: Next.js

## Future Enhancements

- [ ] Graph view of note connections
- [ ] Backlinks panel
- [ ] Full-text search
- [ ] Edit mode with GitHub commits
- [ ] Dark/light theme toggle
- [ ] Obsidian plugin support (Dataview, etc.)

## License

MIT

---

Built with Claude Code 🚀
