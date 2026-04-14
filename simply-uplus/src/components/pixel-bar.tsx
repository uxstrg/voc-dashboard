import { useRef, useState, useEffect } from 'react'

export function PixelBar({
  value,
  color,
  height = 8,
  blockSize = 12,
  gap = 3,
}: {
  value: number; // 0-100
  color: string;
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
  }, []);

  const filledCount = Math.round((value / 100) * blockCount);

  // Get dimmed version of the color
  const getDimColor = (hex: string) => {
    // Convert hex to RGB and apply opacity
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
      {Array.from({ length: blockCount }).map((_, i) => (
        <div
          key={i}
          style={{
            width: blockSize,
            height: height,
            backgroundColor: i < filledCount ? color : getDimColor(color),
          }}
        />
      ))}
    </div>
  );
}
