import React, { useRef, useEffect, useState } from 'react';
import { Activity, ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';

interface TraceDataPoint {
  distanceMeters: number;
  speedCurrent?: number;
  speedBest?: number;
  throttlePercent?: number;
  brakePercent?: number;
  steeringAngleDeg?: number;
  latAccelG?: number;
  longAccelG?: number;
  rpm?: number;
  [key: string]: any;
}

interface CanvasTracePlotterProps {
  data: TraceDataPoint[];
  primaryChannel: string;
  secondaryChannel?: string;
  title: string;
  height?: number;
}

export const CanvasTracePlotter: React.FC<CanvasTracePlotterProps> = ({
  data,
  primaryChannel = 'speedCurrent',
  secondaryChannel = 'speedBest',
  title,
  height = 260,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);

  // Resize canvas according to container
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = height * dpr;
      renderCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, primaryChannel, secondaryChannel, zoomLevel, panOffset, hoveredIndex, height]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    ctx.scale(dpr, dpr);

    const cssW = w / dpr;
    const cssH = h / dpr;

    // Clear background
    ctx.fillStyle = '#090d16'; // slate-950
    ctx.fillRect(0, 0, cssW, cssH);

    // Grid lines
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;

    const numYGrid = 5;
    for (let i = 0; i <= numYGrid; i++) {
      const y = (cssH / numYGrid) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();
    }

    const numXGrid = 8;
    for (let i = 0; i <= numXGrid; i++) {
      const x = (cssW / numXGrid) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
      ctx.stroke();
    }

    // Min & Max Y values
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pt of data) {
      const val1 = Number(pt[primaryChannel] ?? 0);
      const val2 = secondaryChannel ? Number(pt[secondaryChannel] ?? 0) : val1;
      if (val1 < minY) minY = val1;
      if (val1 > maxY) maxY = val1;
      if (val2 < minY) minY = val2;
      if (val2 > maxY) maxY = val2;
    }

    if (minY === maxY) {
      minY = 0;
      maxY = 100;
    }

    const padding = (maxY - minY) * 0.1 || 10;
    minY -= padding;
    maxY += padding;

    const visibleCount = Math.max(10, Math.floor(data.length / zoomLevel));
    const startIdx = Math.max(
      0,
      Math.min(data.length - visibleCount, Math.floor(panOffset))
    );
    const endIdx = Math.min(data.length, startIdx + visibleCount);

    const getX = (index: number) => {
      const norm = (index - startIdx) / (visibleCount - 1);
      return norm * cssW;
    };

    const getY = (val: number) => {
      const norm = (val - minY) / (maxY - minY);
      return cssH - norm * cssH;
    };

    // Draw secondary channel trace (dashed / sky blue)
    if (secondaryChannel) {
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();

      for (let i = startIdx; i < endIdx; i++) {
        const x = getX(i);
        const y = getY(Number(data[i][secondaryChannel] ?? 0));
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
    }

    // Draw primary channel trace (solid amber / emerald)
    const isPedal = primaryChannel === 'throttlePercent' || primaryChannel === 'brakePercent';
    ctx.strokeStyle = isPedal ? '#10b981' : '#f59e0b'; // emerald or amber
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let i = startIdx; i < endIdx; i++) {
      const x = getX(i);
      const y = getY(Number(data[i][primaryChannel] ?? 0));
      if (i === startIdx) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Hover Crosshair & Data Indicator
    if (hoveredIndex !== null && hoveredIndex >= startIdx && hoveredIndex < endIdx) {
      const hX = getX(hoveredIndex);
      const pt = data[hoveredIndex];
      const val1 = Number(pt[primaryChannel] ?? 0);
      const hY = getY(val1);

      // Vertical line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hX, 0);
      ctx.lineTo(hX, cssH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(hX, hY, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.restore();
  };

  useEffect(() => {
    renderCanvas();
  }, [data, primaryChannel, secondaryChannel, zoomLevel, panOffset, hoveredIndex]);

  // Handle Mouse Events for Pan & Hover Cursor
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || data.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const visibleCount = Math.max(10, Math.floor(data.length / zoomLevel));
    const startIdx = Math.max(
      0,
      Math.min(data.length - visibleCount, Math.floor(panOffset))
    );

    const normX = Math.max(0, Math.min(1, x / rect.width));
    const hoverIdx = Math.round(startIdx + normX * (visibleCount - 1));
    setHoveredIndex(Math.min(data.length - 1, Math.max(0, hoverIdx)));

    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const indexShift = (deltaX / rect.width) * visibleCount;
      setPanOffset((prev) => Math.max(0, Math.min(data.length - visibleCount, prev - indexShift)));
      setDragStartX(e.clientX);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(10, prev * 1.25));
    } else {
      setZoomLevel((prev) => Math.max(1, prev / 1.25));
    }
  };

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <Activity className="w-4 h-4 text-amber-400" />
          <span>{title}</span>
          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
            CANVAS 2D 60FPS
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {hoveredData && (
            <div className="text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span>Dist: {hoveredData.distanceMeters ?? hoveredIndex}m</span>
              <span className="text-amber-400 font-bold">
                {primaryChannel}: {hoveredData[primaryChannel]}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg">
            <button
              onClick={() => setZoomLevel((z) => Math.min(10, z * 1.5))}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(1, z / 1.5))}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanOffset(0);
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Box */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoveredIndex(null);
        }}
        onWheel={handleWheel}
        className="w-full relative rounded-xl overflow-hidden cursor-crosshair select-none border border-slate-800"
        style={{ height }}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
