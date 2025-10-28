# Basalt Development Log - 2025-10-28

## Initial Setup & Core Features

### Context
Basalt is a web-based Obsidian-like note-taking and knowledge management system built with Next.js 15, backed by GitHub as storage. The goal is to provide an elegant, lightweight interface for navigating and editing a vault of thousands of markdown notes with wikilinks.

### Session Overview
Complete rebuild of graph system from load-all to search-first approach, plus addition of in-place editor with autosave.

---

## Features Implemented

### 1. Graph System Refactoring (Search-First Architecture)

**Problem**: Previous implementation tried to load entire vault (thousands of notes), causing timeouts.

**Solution**: Implemented search-first approach:
- Empty state on load (no graph displayed initially)
- Search box to find specific notes
- BFS graph traversal with configurable depth (1-5 levels)
- Only loads connected subgraph around selected note

**Files Modified**:
- `/app/api/graph/search/route.ts` - New endpoint for fuzzy note search
- `/app/api/graph/node/route.ts` - BFS depth-limited graph construction
- `/components/GraphView.tsx` - Complete rewrite with search UI

**Performance**: Handles vaults with 1,000+ notes efficiently

---

### 2. Phantom Nodes (Obsidian-Style)

**Feature**: Visualize wikilinks to non-existent notes (like Obsidian)

**Implementation**:
- Added `exists: boolean` field to `GraphNode` type
- Modified BFS to create phantom nodes for unmatched wikilinks
- Visual distinction:
  - Dashed outline border
  - Italic text labels
  - Darker gray color (group 6: `#5a5a5a`)
- Double-click phantom node → create note with confirmation dialog

**Files Modified**:
- `/types/vault.ts` - Added `exists` field
- `/app/api/graph/node/route.ts` - Phantom node creation logic
- `/components/GraphView.tsx` - Canvas rendering with dashed outline

**Bug Fix**: Initially phantom nodes only appeared within depth limit. Fixed by extracting wikilinks for ALL visited nodes regardless of depth.

---

### 3. Note Creation from Search

**Feature**: Create orphan notes when search returns no results (Obsidian-like)

**Implementation**:
- "No notes found" → clickable button
- Confirmation dialog before creation
- Calls `/api/note/create` endpoint
- Auto-redirect to newly created note in editor

**Files Modified**:
- `/app/api/note/create/route.ts` - New endpoint
- `/components/GraphView.tsx` - No-results UI

---

### 4. In-Place Editor with Autosave

**Feature**: Edit notes directly in browser with automatic GitHub commits

**Implementation**:

**Three View Modes**:
- Edit: Full-width textarea
- Split: Editor + preview side-by-side (50/50)
- Preview: Full-width rendered markdown

**Autosave Logic**:
- Initial: 2s debounce (too aggressive)
- **Updated**: 15s debounce + 5min max wait
  - Saves when user stops typing for 15 seconds
  - Force save after 5 minutes if user keeps typing
- Each save creates a GitHub commit

**Sync Status Indicator** (bottom-right):
- 🔄 "Saving..." - Spinner animation
- ✓ "Saved" - Checkmark (gray)
- ⚠ "Error" - Alert icon (red)

**Files Created**:
- `/components/NoteEditor.tsx` - Main editor component
- `/app/api/note/update/route.ts` - PUT endpoint for updates
- `/lib/github.ts` - Added `getFileWithMetadata()` method for SHA retrieval

**Files Modified**:
- `/app/note/[slug]/page.tsx` - Changed from NoteViewer to NoteEditor

---

### 5. Vault Indexing with localStorage Cache

**Problem**:
- Notes in subdirectories (e.g., `diary/2023/2023-gmail-diary.md`) not found by search
- Wikilinks not searchable (only existed files)
- Path matching failures

**Solution**: Full vault indexing system

**Implementation**:

**Backend** (`/api/graph/index`):
- Scans all markdown files
- Extracts wikilinks from each file
- Returns:
  ```json
  {
    "files": ["path/to/note.md", ...],
    "wikilinks": {
      "path/to/note.md": ["Target1", "Target2"],
      ...
    },
    "allWikilinks": ["Target1", "Target2", ...],
    "timestamp": 1234567890
  }
  ```

**Frontend** (GraphView):
- Loads index on mount
- Caches in localStorage (1 hour TTL)
- Instant local search across:
  - File paths and names
  - All wikilink targets
- Phantom wikilinks tagged with "phantom" badge

**Performance**:
- Initial index: ~5-10s for 1000+ notes
- Subsequent loads: instant (localStorage)
- Search: <10ms (local, no API calls)

**Files Created**:
- `/app/api/graph/index/route.ts`

**Files Modified**:
- `/components/GraphView.tsx` - Local search with index

---

### 6. Double-Click Detection Fix

**Problem**: Double-click not reliably detected (useState timing issues)

**Solution**: Replaced useState counter with useRef timestamps
- Tracks time between clicks
- Detects double-click if <300ms on same node
- More reliable than React state updates

**Files Modified**:
- `/components/GraphView.tsx` - Click handler rewrite

---

## Technical Stack

### Frontend
- **Framework**: Next.js 15.5.6 (App Router)
- **React**: Server + Client Components
- **TypeScript**: Strict mode
- **Graph Visualization**: react-force-graph-2d
- **Styling**: Tailwind CSS (dark theme)

### Backend
- **API Routes**: Next.js API routes
- **Storage**: GitHub API (contents endpoint)
- **Authentication**: NextAuth.js with GitHub OAuth

### Data Flow
```
User Search → localStorage Index → Filter Results → Display
User Edit → Debounce → /api/note/update → GitHub API → Commit
User Click Node → /api/graph/node → BFS → GraphData → Render
```

---

## File Structure

```
basalt.giobi.com/
├── app/
│   ├── api/
│   │   ├── graph/
│   │   │   ├── index/route.ts       # Vault indexing
│   │   │   ├── node/route.ts        # BFS graph construction
│   │   │   └── search/route.ts      # [DEPRECATED - now local]
│   │   └── note/
│   │       ├── create/route.ts      # Create new notes
│   │       └── update/route.ts      # Update existing notes
│   ├── note/[slug]/page.tsx         # Note editor page
│   └── graph/page.tsx               # Graph view page
├── components/
│   ├── GraphView.tsx                # Main graph component
│   └── NoteEditor.tsx               # Editor with autosave
├── lib/
│   ├── github.ts                    # GitHub API client
│   ├── graph.ts                     # Graph utilities
│   └── markdown.ts                  # Markdown parsing
└── types/
    └── vault.ts                     # TypeScript types
```

---

## Color Scheme (Dark Theme)

```
Background: #1e1e1e
Panel:      #2a2a2a
Border:     #3a3a3a
Text:       #d4d4d4
Muted:      #a0a0a0
Dim:        #7f7f7f
Darker:     #5a5a5a

Node Groups:
- Default:  #7f7f7f
- Log:      #8a8a8a
- Diary:    #6f6f6f
- Sketch:   #959595
- Projects: #858585
- Database: #909090
- Phantom:  #5a5a5a (darker, dashed)
```

---

## Git Commits (Chronological)

1. `f429dca` - Add phantom nodes and orphan note creation (Obsidian-like features)
2. `81cd086` - Fix double-click detection using timestamp-based approach
3. `bac944a` - Add in-place editor with autosave and sync indicator
4. `4e0e548` - Fix phantom nodes display at all depth levels
5. `3979d27` - Improve autosave timing: 15s debounce with 5min max wait
6. `02a9633` - Add vault indexing with localStorage cache and wikilink search

---

## Known Issues / Future Improvements

### Path Matching
- Currently uses basename matching + partial match
- Could improve with fuzzy matching algorithm

### Performance
- Index rebuild on first load can take 5-10s for large vaults
- Could implement incremental indexing

### Editor
- No syntax highlighting in edit mode
- Could add CodeMirror or Monaco editor

### Graph
- No clustering/communities visualization
- Could add force-directed layout tuning
- No graph export (SVG/PNG)

---

## Decision Log

### Why localStorage over IndexedDB?
- Simpler API
- Sufficient for JSON index (~1-5MB for 1000+ notes)
- No async complexity

### Why 15s debounce?
- 2s was too aggressive (felt "jumpy")
- 15s gives time to finish thoughts
- 5min max ensures no data loss if user keeps typing

### Why BFS over full graph?
- Performance: O(V+E) for subgraph vs O(V²) for full graph
- UX: Users want to explore connections, not see everything at once
- Depth control gives users flexibility

### Why GitHub API over git clone?
- Serverless deployment friendly
- No local git state to manage
- Works with any GitHub repo via OAuth

---

## LLM Context Notes

### Key Abstractions
- **GraphNode**: Core node type with `exists: boolean` for phantom nodes
- **VaultIndex**: Cached structure with files + wikilinks
- **BFS traversal**: Depth-limited exploration from starting node

### Important Patterns
- **useRef for timing**: Avoid useState update delays in event handlers
- **localStorage TTL**: Check timestamp before using cached data
- **SHA tracking**: Required for GitHub update API (prevents conflicts)

### Search Keywords for Future LLM Sessions
- "basalt graph" - Graph visualization system
- "phantom nodes" - Wikilinks to non-existent notes
- "vault index" - Full vault caching system
- "autosave timing" - 15s debounce + 5min max
- "BFS depth" - Configurable graph depth (1-5)

---

## Next Steps (Potential)

1. **Syntax highlighting** in editor (CodeMirror/Monaco)
2. **Graph clustering** algorithm (communities)
3. **Incremental indexing** (only re-index changed files)
4. **Mobile responsive** graph view
5. **Keyboard shortcuts** (Obsidian-like)
6. **Tag support** (#tags in search)
7. **Graph export** (SVG/PNG/JSON)
