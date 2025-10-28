# Basalt Development Guide

## Overview

Basalt is a web-based Obsidian-like knowledge management system built with Next.js 15, using GitHub as backend storage. This guide covers architecture, conventions, and development workflows.

---

## Quick Start

### Prerequisites
```bash
Node.js 22+
npm or pnpm
GitHub account with OAuth app configured
```

### Setup
```bash
# Clone repo
git clone https://github.com/giobi/basalt.git
cd basalt

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with GitHub OAuth credentials

# Run dev server
npm run dev
# → http://localhost:3000

# Build for production
npm run build
npm start
```

### Environment Variables
```bash
# GitHub OAuth
GITHUB_ID=your_github_oauth_app_id
GITHUB_SECRET=your_github_oauth_app_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Optional: GitHub Personal Access Token for fallback
GITHUB_TOKEN=ghp_...
```

---

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.6 (App Router, React Server Components)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js (GitHub OAuth)
- **Storage**: GitHub API (REST v3)
- **Graph**: react-force-graph-2d (Canvas-based)

### Data Flow

#### Read Path
```
User → Page → GitHub API → Parse Markdown → Render
```

#### Write Path
```
User Edit → Debounce → API Route → GitHub API → Commit → Update SHA
```

#### Graph Path
```
User Search → localStorage Index → Filter → Select → BFS API → Render Graph
```

### Directory Structure
```
basalt/
├── app/
│   ├── api/              # API routes
│   ├── note/[slug]/      # Dynamic note pages
│   ├── graph/            # Graph view page
│   └── auth/             # Auth pages
├── components/           # React components
├── lib/                  # Utilities & clients
├── types/                # TypeScript types
├── docs/                 # Documentation
│   ├── log/              # Development logs
│   └── development-guide.md
└── public/               # Static assets
```

---

## Core Concepts

### 1. Vault Index

The vault index is a cached structure containing all files and wikilinks.

**Structure**:
```typescript
interface VaultIndex {
  files: string[];                    // All .md files
  wikilinks: { [file: string]: string[] }; // Wikilinks per file
  allWikilinks: string[];             // Unique wikilink targets
  timestamp: number;                  // Cache timestamp
}
```

**Lifecycle**:
1. Load from localStorage (if < 1 hour old)
2. Otherwise, fetch from `/api/graph/index`
3. Cache in localStorage
4. Use for local search

**Rebuilding**:
- Automatic: every 1 hour (TTL expiration)
- Manual: clear localStorage key `vaultIndex`

### 2. Graph Nodes

**Types**:
- **Real Node** (`exists: true`): File exists in vault
- **Phantom Node** (`exists: false`): Wikilink to non-existent file

**Rendering**:
```typescript
// Real node: solid circle
ctx.arc(x, y, radius, 0, 2*Math.PI);
ctx.fill();

// Phantom node: dashed outline
ctx.setLineDash([2, 2]);
ctx.arc(x, y, radius+1, 0, 2*Math.PI);
ctx.stroke();
```

### 3. BFS Graph Traversal

**Algorithm**:
```typescript
queue = [startNode]
visited = Set()
depth = 0

while (queue.length > 0 && depth <= maxDepth) {
  node = queue.shift()
  if (visited.has(node)) continue

  visited.add(node)
  wikilinks = extractWikilinks(node.content)

  for (link in wikilinks) {
    if (exists(link)) {
      addEdge(node, link)
      if (depth < maxDepth) queue.push(link)
    } else {
      addPhantomNode(link)
      addEdge(node, link)
    }
  }
}
```

**Key Points**:
- Depth limit prevents exponential explosion
- Phantom nodes added even beyond depth limit
- All visited nodes have wikilinks extracted

### 4. Autosave System

**Strategy**: Debounce + Max Wait

```typescript
// On content change:
clearTimeout(debounceTimer)
debounceTimer = setTimeout(save, 15000) // 15s debounce

// On first change:
if (!firstChangeTime) {
  firstChangeTime = now
  maxWaitTimer = setTimeout(save, 300000) // 5min max
}

// On save complete:
firstChangeTime = null
clearTimeout(maxWaitTimer)
```

**Why this approach?**
- **15s debounce**: Gives user time to finish thought
- **5min max**: Prevents data loss if user types continuously
- **No UI blocking**: All async, no spinners during typing

---

## Conventions

### File Naming
- **API routes**: `route.ts` (Next.js convention)
- **Components**: `PascalCase.tsx`
- **Utilities**: `kebab-case.ts`
- **Types**: `kebab-case.ts`

### Code Style
```typescript
// Prefer explicit return types
function getName(): string { ... }

// Use interfaces for objects
interface Props { ... }

// Use type for unions
type Status = 'loading' | 'success' | 'error'

// Async/await over promises
const data = await fetch(...)

// Optional chaining for safety
const name = user?.profile?.name
```

### Component Patterns

**Server Components** (default):
```typescript
// app/page.tsx
export default async function Page() {
  const data = await fetch(...)
  return <div>{data}</div>
}
```

**Client Components** (interactive):
```typescript
// components/InteractiveComponent.tsx
'use client';
import { useState } from 'react';

export default function InteractiveComponent() {
  const [state, setState] = useState(...)
  return <button onClick={...}>
}
```

### API Route Pattern
```typescript
// app/api/resource/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Auth check
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse params
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');

  // 3. Business logic
  const data = await fetchData(id);

  // 4. Return response
  return NextResponse.json(data);
}
```

---

## Common Tasks

### Add a New API Endpoint

1. Create file: `app/api/[resource]/route.ts`
2. Export HTTP method functions (`GET`, `POST`, `PUT`, `DELETE`)
3. Add auth check with `getSession()`
4. Implement logic
5. Return `NextResponse.json()`

### Add a New Component

1. Create file: `components/ComponentName.tsx`
2. Add `'use client'` if interactive
3. Define `Props` interface
4. Implement component
5. Export default

### Modify Graph Rendering

1. Edit `components/GraphView.tsx`
2. Find `nodeCanvasObject` prop in `<ForceGraph2D>`
3. Modify canvas drawing code
4. Test with various node types (real, phantom, selected)

### Add Search Filter

1. Edit `components/GraphView.tsx`
2. Find search useEffect
3. Add filter condition to `results` array
4. Test with various queries

---

## Testing

### Manual Testing Checklist

- [ ] Search for existing note → graph loads
- [ ] Search for phantom wikilink → appears in results
- [ ] Click phantom in search → shows in graph
- [ ] Double-click phantom node → creates note
- [ ] Double-click real node → opens editor
- [ ] Edit note → autosave after 15s
- [ ] Edit note continuously → saves after 5min
- [ ] Create note from "no results" → redirects to editor
- [ ] Change depth slider → reloads graph

### Debug Tools

**Browser Console**:
```javascript
// Check index
JSON.parse(localStorage.getItem('vaultIndex'))

// Clear index
localStorage.removeItem('vaultIndex')

// Check session
console.log(document.cookie)
```

**Server Logs**:
```bash
tail -f /tmp/basalt-start.log
```

---

## Performance

### Optimization Strategies

**1. Index Caching**
- localStorage reduces API calls
- 1-hour TTL balances freshness vs performance

**2. BFS Depth Limit**
- Prevents loading entire graph
- Configurable by user (1-5 levels)

**3. Debounced Autosave**
- Reduces GitHub API calls
- No save on every keystroke

**4. Canvas Rendering**
- Uses react-force-graph-2d (WebGL-capable)
- More efficient than SVG for large graphs

### Monitoring

**Key Metrics**:
- Index load time: <10s for 1000+ notes
- Search latency: <10ms (local)
- Graph render time: <2s for 100 nodes
- Autosave API call: <1s

---

## Deployment

### Production Build
```bash
npm run build
npm start
# → http://localhost:3004
```

### Docker (if needed)
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment
- Node.js 22+
- 512MB RAM minimum
- GitHub API rate limit: 5000/hour (authenticated)

---

## Troubleshooting

### "Failed to load index"
- Check GitHub API authentication
- Verify repo access permissions
- Check rate limits

### "Phantom nodes not appearing"
- Clear localStorage index
- Reload page
- Check BFS depth setting

### "Autosave not working"
- Check GitHub token permissions
- Verify SHA is being tracked
- Check browser console for errors

### "Graph timeout"
- Increase BFS depth limit
- Check network tab for slow requests
- Verify GitHub API is responsive

---

## Contributing

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "feat: add feature

Detailed description.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push
git push origin feature/my-feature

# Create PR to main
```

### Commit Message Format
```
<type>: <subject>

<body>

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [GitHub API](https://docs.github.com/en/rest)
- [react-force-graph](https://github.com/vasturiano/react-force-graph)

### Related Projects
- [Obsidian](https://obsidian.md) - Inspiration for features
- [Foam](https://foambubble.github.io) - VSCode-based PKM
- [Logseq](https://logseq.com) - Block-based note-taking

---

## Glossary

**Vault**: Collection of markdown notes (like Obsidian vault)

**Wikilink**: `[[target|alias]]` syntax for linking notes

**Phantom Node**: Visual representation of wikilink to non-existent note

**BFS**: Breadth-First Search graph traversal algorithm

**Index**: Cached structure of all files and wikilinks

**SHA**: Git commit hash, required for GitHub update API

**Debounce**: Delay execution until after user stops acting

**TTL**: Time-To-Live, cache expiration duration
