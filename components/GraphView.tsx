'use client';

import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphData } from '@/types/vault';
import { useRouter } from 'next/navigation';

interface GraphViewProps {
  width?: number;
  height?: number;
}

interface SearchResult {
  path: string;
  name: string;
}

const GROUP_COLORS: Record<number, string> = {
  0: '#7f7f7f', // Default - Gray
  1: '#8a8a8a', // Log - Light Gray
  2: '#6f6f6f', // Diary - Dark Gray
  3: '#959595', // Sketch - Lighter Gray
  4: '#858585', // Projects - Medium Gray
  5: '#909090', // Database - Gray
  6: '#5a5a5a', // Phantom - Darker gray (non-existent notes)
};

export default function GraphView({ width = 1200, height = 800 }: GraphViewProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [depth, setDepth] = useState<number>(2);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const router = useRouter();
  const graphRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search for notes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(`/api/graph/search?q=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        setSearchResults(data.results || []);
        setShowResults(true);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Load graph for selected note
  const loadNodeGraph = async (path: string, selectedDepth: number) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Loading graph for ${path} with depth ${selectedDepth}`);

      const response = await fetch(`/api/graph/node?path=${encodeURIComponent(path)}&depth=${selectedDepth}`);

      if (!response.ok) {
        throw new Error('Failed to fetch graph data');
      }

      const data = await response.json();
      console.log('Graph loaded:', data.nodes.length, 'nodes', data.links.length, 'links');

      setGraphData(data);
      setSelectedPath(path);
      setSelectedNode(path.replace(/\.md$/, '').toLowerCase());
    } catch (err) {
      console.error('Error fetching graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  };

  // Handle search result selection
  const handleSelectNote = (result: SearchResult) => {
    setSearchQuery(result.name);
    setShowResults(false);
    loadNodeGraph(result.path, depth);
  };

  // Handle depth change
  const handleDepthChange = (newDepth: number) => {
    setDepth(newDepth);
    if (selectedPath) {
      loadNodeGraph(selectedPath, newDepth);
    }
  };

  // Node click handlers - using refs for reliable double-click detection
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickedNodeRef = useRef<string | null>(null);

  const handleNodeClick = async (node: any) => {
    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;
    const isSameNode = lastClickedNodeRef.current === node.id;

    // Double click: within 300ms and same node
    if (timeDiff < 300 && isSameNode) {
      // Clear any pending timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      // Reset refs
      lastClickTimeRef.current = 0;
      lastClickedNodeRef.current = null;

      // Check if phantom node (non-existent)
      if (!node.exists) {
        console.log('Creating phantom note:', node.path);

        // Ask for confirmation
        if (!confirm(`Create note "${node.name}"?`)) {
          return;
        }

        try {
          const response = await fetch('/api/note/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: node.path,
              content: `# ${node.name}\n\n`,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create note');
          }

          // Redirect to newly created note
          const slug = node.path.replace(/\.md$/, '').replace(/\//g, '__');
          router.push(`/note/${slug}`);
        } catch (error) {
          console.error('Failed to create note:', error);
          alert('Failed to create note. Check console for details.');
        }
      } else {
        // Existing note - open it
        const slug = node.path.replace(/\.md$/, '').replace(/\//g, '__');
        console.log('Opening note:', slug);
        router.push(`/note/${slug}`);
      }
    } else {
      // Single click - update selection after delay
      lastClickTimeRef.current = now;
      lastClickedNodeRef.current = node.id;

      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      clickTimeoutRef.current = setTimeout(() => {
        setSelectedNode(node.id);
        console.log('Node selected:', node.id, node.name);
      }, 300);
    }
  };

  const handleNodeHover = (node: any) => {
    if (graphRef.current && graphData) {
      const connectedNodeIds = new Set<string>();
      if (node) {
        graphData.links.forEach(link => {
          if (link.source === node.id || (link.source as any).id === node.id) {
            connectedNodeIds.add(typeof link.target === 'string' ? link.target : (link.target as any).id);
          }
          if (link.target === node.id || (link.target as any).id === node.id) {
            connectedNodeIds.add(typeof link.source === 'string' ? link.source : (link.source as any).id);
          }
        });
      }

      graphRef.current.nodeColor((n: any) => {
        if (!node) return GROUP_COLORS[n.group] || GROUP_COLORS[0];
        if (n.id === node.id) return '#a0a0a0';
        if (connectedNodeIds.has(n.id)) return '#909090';
        return GROUP_COLORS[n.group] || GROUP_COLORS[0];
      });
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#1e1e1e]">
      {/* Search Box */}
      <div className="absolute top-4 left-4 z-20 w-96">
        <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded shadow-lg">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Search notes..."
              className="w-full px-4 py-3 bg-transparent text-[#d4d4d4] placeholder-[#7f7f7f] outline-none"
            />
            {searching && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#7f7f7f]"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="border-t border-[#3a3a3a] max-h-96 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectNote(result)}
                  className="w-full px-4 py-2 text-left hover:bg-[#3a3a3a] text-[#a0a0a0] hover:text-[#d4d4d4] transition-colors"
                >
                  <div className="font-medium text-sm">{result.name}</div>
                  <div className="text-xs text-[#7f7f7f] truncate">{result.path}</div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
            <button
              onClick={async () => {
                const notePath = `${searchQuery}.md`;
                if (!confirm(`Create new note "${searchQuery}"?`)) return;

                try {
                  const response = await fetch('/api/note/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      path: notePath,
                      content: `# ${searchQuery}\n\n`,
                    }),
                  });

                  if (!response.ok) throw new Error('Failed to create note');

                  // Redirect to new note
                  const slug = notePath.replace(/\.md$/, '').replace(/\//g, '__');
                  router.push(`/note/${slug}`);
                } catch (error) {
                  console.error('Failed to create note:', error);
                  alert('Failed to create note');
                }
              }}
              className="w-full border-t border-[#3a3a3a] px-4 py-3 text-left hover:bg-[#3a3a3a] transition-colors"
            >
              <div className="text-[#7f7f7f] text-sm">No notes found</div>
              <div className="text-[#a0a0a0] text-sm mt-1">
                → Click to create "<span className="font-medium">{searchQuery}</span>"
              </div>
            </button>
          )}
        </div>

        {/* Depth Control (only when graph loaded) */}
        {graphData && (
          <div className="mt-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-4">
            <label className="text-xs text-[#a0a0a0] block mb-2">
              Connection Depth: {depth} step{depth > 1 ? 's' : ''}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={depth}
              onChange={(e) => handleDepthChange(parseInt(e.target.value))}
              className="w-full h-1 bg-[#3a3a3a] rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: '#7f7f7f' }}
            />
            <div className="flex justify-between text-xs text-[#7f7f7f] mt-1">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats (only when graph loaded) */}
      {graphData && (
        <div className="absolute top-4 right-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-4 z-10">
          <div className="text-sm">
            <div className="font-semibold mb-1 text-[#d4d4d4]">Graph Stats</div>
            <div className="text-[#a0a0a0] space-y-1 text-xs">
              <div>{graphData.nodes.length} nodes</div>
              <div>{graphData.links.length} links</div>
              {selectedPath && (
                <div className="text-[#7f7f7f] pt-1 border-t border-[#3a3a3a] mt-1">
                  Depth: {depth}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7f7f7f] mx-auto mb-4"></div>
            <p className="text-[#a0a0a0]">Loading graph...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center justify-center h-screen">
          <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-[#d4d4d4] mb-2">Failed to Load Graph</h3>
            <p className="text-[#a0a0a0]">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!graphData && !loading && !error && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md">
            <div className="text-[#a0a0a0] mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 text-[#7f7f7f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg mb-2">Search to explore your notes</p>
              <p className="text-sm text-[#7f7f7f]">
                Enter a note name in the search box above to visualize its connections
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Graph */}
      {graphData && !loading && (
        <>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={width}
            height={height}
            nodeLabel="name"
            nodeVal="val"
            backgroundColor="#1e1e1e"
            nodeColor={(node: any) => GROUP_COLORS[node.group] || GROUP_COLORS[0]}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 10 / globalScale;
              ctx.font = `${fontSize}px monospace`;

              const nodeColor = GROUP_COLORS[node.group] || GROUP_COLORS[0];
              const isSelected = selectedNode === node.id;
              const isPhantom = !node.exists;

              // Draw node circle
              ctx.fillStyle = isSelected ? '#a0a0a0' : nodeColor;
              ctx.beginPath();
              const radius = (node.val || 4) * (isSelected ? 1.3 : 1);
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              ctx.fill();

              // Phantom nodes: dashed outline
              if (isPhantom) {
                ctx.strokeStyle = '#7f7f7f';
                ctx.lineWidth = 1.5 / globalScale;
                ctx.setLineDash([2 / globalScale, 2 / globalScale]);
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + 1, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.setLineDash([]); // Reset dash
              }

              // Selected ring
              if (isSelected) {
                ctx.strokeStyle = '#d4d4d4';
                ctx.lineWidth = 2 / globalScale;
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
                ctx.stroke();
              }

              // Label
              if (globalScale > 1) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = isSelected ? '#d4d4d4' : (isPhantom ? '#7f7f7f' : '#a0a0a0');
                if (isPhantom) {
                  ctx.font = `italic ${fontSize}px monospace`; // Italic for phantom
                }
                ctx.fillText(label, node.x, node.y + radius + fontSize + 2);
              }
            }}
            linkColor={() => '#3a3a3a'}
            linkWidth={0.5}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            d3VelocityDecay={0.3}
            cooldownTicks={0}
            warmupTicks={0}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            onEngineStop={() => {
              if (graphRef.current) {
                graphRef.current.zoomToFit(200, 50);
              }
            }}
          />

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-3 z-10 text-xs text-[#a0a0a0]">
            <div className="mb-1">Click: Select • Double-click: Open • Drag: Pan • Scroll: Zoom</div>
            <div className="text-[#7f7f7f] italic">Dashed nodes: non-existent notes (double-click to create)</div>
          </div>
        </>
      )}
    </div>
  );
}
