'use client';

import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphData } from '@/types/vault';
import { useRouter } from 'next/navigation';

interface GraphViewProps {
  width?: number;
  height?: number;
}

const GROUP_COLORS: Record<number, string> = {
  0: '#6366f1', // Default - Indigo
  1: '#22c55e', // Log - Green
  2: '#f59e0b', // Diary - Amber
  3: '#ec4899', // Sketch - Pink
  4: '#8b5cf6', // Projects - Purple
  5: '#06b6d4', // Database - Cyan
};

export default function GraphView({ width = 1200, height = 800 }: GraphViewProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const router = useRouter();
  const graphRef = useRef<any>();

  useEffect(() => {
    async function fetchGraphData() {
      try {
        setLoading(true);
        const response = await fetch('/api/graph/data');

        if (!response.ok) {
          throw new Error('Failed to fetch graph data');
        }

        const data = await response.json();
        setGraphData(data);
      } catch (err) {
        console.error('Error fetching graph:', err);
        setError(err instanceof Error ? err.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    }

    fetchGraphData();
  }, []);

  const handleNodeClick = (node: any) => {
    setSelectedNode(node.id);

    // Navigate to note
    const slug = node.path.replace(/\.md$/, '').replace(/\//g, '__');
    router.push(`/note/${slug}`);
  };

  const handleNodeHover = (node: any) => {
    if (graphRef.current) {
      // Highlight connected nodes
      const connectedNodeIds = new Set<string>();
      if (node && graphData) {
        graphData.links.forEach(link => {
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
        if (n.id === node.id) return '#ef4444'; // Red for hovered node
        if (connectedNodeIds.has(n.id)) return '#fbbf24'; // Yellow for connected
        return GROUP_COLORS[n.group] || GROUP_COLORS[0];
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Building graph...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            This may take a minute for large vaults
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Failed to Load Graph
          </h3>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>No graph data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-50 dark:bg-gray-900">
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-10">
        <h3 className="text-sm font-semibold mb-2">Graph Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GROUP_COLORS[0] }}></div>
            <span>Other</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GROUP_COLORS[1] }}></div>
            <span>Log</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GROUP_COLORS[2] }}></div>
            <span>Diary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GROUP_COLORS[3] }}></div>
            <span>Sketch</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GROUP_COLORS[4] }}></div>
            <span>Projects</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GROUP_COLORS[5] }}></div>
            <span>Database</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-10">
        <div className="text-sm">
          <div className="font-semibold mb-1">Graph Stats</div>
          <div className="text-gray-600 dark:text-gray-400 space-y-1">
            <div>{graphData.nodes.length} nodes</div>
            <div>{graphData.links.length} links</div>
          </div>
        </div>
      </div>

      {/* Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={width}
        height={height}
        nodeLabel="name"
        nodeVal="val"
        nodeColor={(node: any) => GROUP_COLORS[node.group] || GROUP_COLORS[0]}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;

          // Draw node circle
          const nodeColor = GROUP_COLORS[node.group] || GROUP_COLORS[0];
          ctx.fillStyle = selectedNode === node.id ? '#ef4444' : nodeColor;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val || 4, 0, 2 * Math.PI);
          ctx.fill();

          // Draw label (only if zoomed in enough)
          if (globalScale > 1.5) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#374151';
            ctx.fillText(label, node.x, node.y + (node.val || 4) + fontSize);
          }
        }}
        linkColor={() => '#cbd5e1'}
        linkWidth={1}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        cooldownTicks={100}
        onEngineStop={() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 20);
          }
        }}
      />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-10 text-xs text-gray-600 dark:text-gray-400">
        <div>🖱️ Drag to pan • Scroll to zoom • Click node to open</div>
      </div>
    </div>
  );
}
