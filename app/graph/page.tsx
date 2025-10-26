'use client';

import GraphView from '@/components/GraphView';
import { useEffect, useState } from 'react';

export default function GraphPage() {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-screen">
      <GraphView width={dimensions.width} height={dimensions.height} />
    </div>
  );
}
