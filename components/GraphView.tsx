'use client';

import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphData, GraphNode, GraphLink } from '@/types/vault';
import { useRouter } from 'next/navigation';

interface GraphViewProps {
  width?: number;
  height?: number;
}

const GROUP_COLORS: Record<number, string> = {
  0: '#7f7f7f', // Default - Gray
  1: '#8a8a8a', // Log - Light Gray
  2: '#6f6f6f', // Diary - Dark Gray
  3: '#959595', // Sketch - Lighter Gray
  4: '#858585', // Projects - Medium Gray
  5: '#909090', // Database - Gray
};

export default function GraphView({ width = 1200, height = 800 }: GraphViewProps) {
  const [fullGraphData, setFullGraphData] = useState<GraphData | null>(null);
  const [filteredGraphData, setFilteredGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [proximityDepth, setProximityDepth] = useState<number>(0); // 0 means show all
  const router = useRouter();
  const graphRef = useRef<any>(null);

  useEffect(() => {
    async function fetchGraphData() {
      try {
        setLoading(true);
        const response = await fetch('/api/graph/data');

        if (!response.ok) {
          throw new Error('Failed to fetch graph data');
        }

        const data = await response.json();
        console.log('Graph data loaded:', data.nodes.length, 'nodes', data.links.length, 'links');
        setFullGraphData(data);
        setFilteredGraphData(data);
      } catch (err) {
        console.error('Error fetching graph:', err);
        setError(err instanceof Error ? err.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    }

    fetchGraphData();
  }, []);

  // Filter graph based on selected node and proximity depth
  useEffect(() => {
    if (!fullGraphData || !selectedNode || proximityDepth === 0) {
      setFilteredGraphData(fullGraphData);
      return;
    }

    // Build adjacency map
    const adjacency = new Map<string, Set<string>>();
    fullGraphData.links.forEach((link) => {
      const source = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const target = typeof link.target === 'string' ? link.target : (link.target as any).id;

      if (!adjacency.has(source)) adjacency.set(source, new Set());
      if (!adjacency.has(target)) adjacency.set(target, new Set());

      adjacency.get(source)!.add(target);
      adjacency.get(target)!.add(source);
    });

    // BFS to find nodes within proximity depth
    const visibleNodes = new Set<string>([selectedNode]);
    const queue: Array<{ id: string; depth: number }> = [{ id: selectedNode, depth: 0 }];
    const visited = new Set<string>([selectedNode]);

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (depth >= proximityDepth) continue;

      const neighbors = adjacency.get(id) || new Set();
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          visibleNodes.add(neighbor);
          queue.push({ id: neighbor, depth: depth + 1 });
        }
      });
    }

    // Filter nodes and links
    const filteredNodes = fullGraphData.nodes.filter((node) => visibleNodes.has(node.id));
    const filteredLinks = fullGraphData.links.filter((link) => {
      const source = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const target = typeof link.target === 'string' ? link.target : (link.target as any).id;
      return visibleNodes.has(source) && visibleNodes.has(target);
    });

    console.log(`Filtered to ${filteredNodes.length} nodes within ${proximityDepth} steps of ${selectedNode}`);
    setFilteredGraphData({ nodes: filteredNodes, links: filteredLinks });
  }, [fullGraphData, selectedNode, proximityDepth]);

  // Track clicks for double-click detection
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [clickCount, setClickCount] = useState(0);

  const handleNodeClick = (node: any) => {
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    const currentCount = clickCount + 1;
    setClickCount(currentCount);

    if (currentCount === 1) {
      // Wait to see if it's a double-click
      clickTimeoutRef.current = setTimeout(() => {
        // Single click - select node
        setSelectedNode(node.id);
        console.log('Node selected:', node.id, node.name);
        setClickCount(0);
      }, 300);
    } else if (currentCount === 2) {
      // Double click - navigate to note
      const slug = node.path.replace(/\.md$/, '').replace(/\//g, '__');
      console.log('Opening note:', slug);
      router.push(`/note/${slug}`);
      setClickCount(0);
    }
  };

  const handleNodeHover = (node: any) => {
    if (graphRef.current && filteredGraphData) {
      // Highlight connected nodes
      const connectedNodeIds = new Set<string>();
      if (node) {
        filteredGraphData.links.forEach(link => {
          if (link.source === node.id || (link.source as any).id === node.id) {
            connectedNodeIds.add(typeof link.target === 'string' ? link.target : (link.target as any).id);
          }
          if (link.target === node.id || (link.target as any).id === node.id) {
            connectedNodeIds.add(typeof link.source === 'string' ? link.source : (link.source as any).id);
          }
        });
      }

      // Update node colors based on hover
      graphRef.current.nodeColor((n: any) => {
        if (!node) return GROUP_COLORS[n.group] || GROUP_COLORS[0];
        if (n.id === node.id) return '#a0a0a0'; // Lighter gray for hovered node
        if (connectedNodeIds.has(n.id)) return '#909090'; // Medium gray for connected
        return GROUP_COLORS[n.group] || GROUP_COLORS[0];
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7f7f7f] mx-auto mb-4"></div>
          <p className="text-[#a0a0a0]">Building graph...</p>
          <p className="text-sm text-[#7f7f7f] mt-2">
            This may take a minute for large vaults
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-[#d4d4d4] mb-2">
            Failed to Load Graph
          </h3>
          <p className="text-[#a0a0a0]">{error}</p>
        </div>
      </div>
    );
  }

  if (!filteredGraphData || filteredGraphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center text-[#a0a0a0]">
          <p>No graph data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#1e1e1e]">
      {/* Controls */}
      <div className="absolute top-4 left-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-4 z-10 min-w-[250px]">
        <h3 className="text-sm font-semibold mb-3 text-[#d4d4d4]">Graph Controls</h3>

        {/* Proximity Depth Slider */}
        <div className="mb-4">
          <label className="text-xs text-[#a0a0a0] block mb-2">
            Proximity Filter: {proximityDepth === 0 ? 'All nodes' : `${proximityDepth} step${proximityDepth > 1 ? 's' : ''}`}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            value={proximityDepth}
            onChange={(e) => setProximityDepth(parseInt(e.target.value))}
            disabled={!selectedNode}
            className="w-full h-1 bg-[#3a3a3a] rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              accentColor: '#7f7f7f'
            }}
          />
          <div className="flex justify-between text-xs text-[#7f7f7f] mt-1">
            <span>All</span>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
          {!selectedNode && (
            <p className="text-xs text-[#7f7f7f] mt-2">Click a node to enable filtering</p>
          )}
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="pt-3 border-t border-[#3a3a3a]">
            <div className="text-xs text-[#a0a0a0]">
              <div className="font-medium text-[#d4d4d4] mb-1">Selected:</div>
              <div className="truncate">{fullGraphData?.nodes.find(n => n.id === selectedNode)?.name || selectedNode}</div>
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setProximityDepth(0);
                }}
                className="mt-2 text-xs text-[#7f7f7f] hover:text-[#a0a0a0] underline"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-4 z-10">
        <div className="text-sm">
          <div className="font-semibold mb-1 text-[#d4d4d4]">Graph Stats</div>
          <div className="text-[#a0a0a0] space-y-1 text-xs">
            <div>Showing: {filteredGraphData.nodes.length} nodes</div>
            <div>{filteredGraphData.links.length} links</div>
            {fullGraphData && filteredGraphData.nodes.length !== fullGraphData.nodes.length && (
              <div className="text-[#7f7f7f] pt-1 border-t border-[#3a3a3a] mt-1">
                Total: {fullGraphData.nodes.length} nodes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={filteredGraphData}
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

          // Draw node circle
          const nodeColor = GROUP_COLORS[node.group] || GROUP_COLORS[0];
          const isSelected = selectedNode === node.id;
          ctx.fillStyle = isSelected ? '#a0a0a0' : nodeColor;
          ctx.beginPath();
          const radius = (node.val || 4) * (isSelected ? 1.3 : 1);
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fill();

          // Draw selection ring
          if (isSelected) {
            ctx.strokeStyle = '#d4d4d4';
            ctx.lineWidth = 2 / globalScale;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
            ctx.stroke();
          }

          // Draw label (always visible but smaller when zoomed out)
          if (globalScale > 1) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isSelected ? '#d4d4d4' : '#a0a0a0';
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
        <div>Click: Select • Double-click: Open note • Drag: Pan • Scroll: Zoom</div>
      </div>
    </div>
  );
}
