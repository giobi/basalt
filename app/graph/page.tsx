import GraphView from '@/components/GraphView';

export const metadata = {
  title: 'Graph View - Basalt',
  description: 'Visualize connections between notes in the vault',
};

export default function GraphPage() {
  return (
    <div className="w-full h-screen">
      <GraphView width={typeof window !== 'undefined' ? window.innerWidth : 1200} height={typeof window !== 'undefined' ? window.innerHeight : 800} />
    </div>
  );
}
