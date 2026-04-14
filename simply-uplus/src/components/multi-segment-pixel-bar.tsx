import { useRef, useState, useEffect } from 'react'

interface Segment {
  value: number; // 0-100
  color: string;
  label?: string;
}

export function MultiSegmentPixelBar({
  segments,
  height = 8,
  blockSize = 8,
  gap = 2,
}: {
  segments: Segment[];
  height?: number;
  blockSize?: number;
  gap?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [blockCount, setBlockCount] = useState(0);

  useEffect(() => {
    const updateBlocks = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const count = Math.floor(width / (blockSize + gap));
        setBlockCount(count);
      }
    };

    updateBlocks();
    window.addEventListener('resize', updateBlocks);
    return () => window.removeEventListener('resize', updateBlocks);
  }, [blockSize, gap]);

  // Calculate block distribution for each segment
  const blocks: Array<{ color: string; filled: boolean }> = [];
  let currentIndex = 0;

  segments.forEach((segment) => {
    const segmentBlocks = Math.round((segment.value / 100) * blockCount);
    for (let i = 0; i < segmentBlocks; i++) {
      blocks.push({ color: segment.color, filled: true });
    }
  });

  // Fill remaining blocks with empty blocks using the last segment's color
  const totalFilled = blocks.length;
  const lastColor = segments[segments.length - 1]?.color || '#2E3329';
  for (let i = totalFilled; i < blockCount; i++) {
    blocks.push({ color: lastColor, filled: false });
  }

  // Get dimmed version of the color for empty blocks
  const getDimColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center"
      style={{ height, gap: `${gap}px` }}
    >
      {blocks.map((block, i) => (
        <div
          key={i}
          style={{
            width: blockSize,
            height: height,
            backgroundColor: block.filled ? block.color : getDimColor(block.color),
          }}
        />
      ))}
    </div>
  );
}
