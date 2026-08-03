import React, { useMemo } from 'react';
import { TelemetryFrame, LiveInputs, TrackInfo } from '../types';
import { Flag, Navigation, Activity, Gauge, Zap, Disc, ArrowRightLeft } from 'lucide-react';

interface TrackMap2DProps {
  telemetry: TelemetryFrame;
  frames?: TelemetryFrame[];
  traceData?: any[];
  className?: string;
  showInputsOverlay?: boolean;
}

interface Point2D {
  x: number;
  y: number;
  distMeters?: number;
  speedKmh?: number;
  sector?: number;
}

export const TrackMap2D: React.FC<TrackMap2DProps> = ({
  telemetry,
  frames = [],
  traceData = [],
  className = '',
  showInputsOverlay = true,
}) => {
  const { track, trackProgressPercent, trackDistanceMeters, inputs, speedKmh, speedMph, gear, rpm, car } = telemetry;

  // Extract or generate 2D track points
  const trackPathPoints: Point2D[] = useMemo(() => {
    // 1. Try extracting actual coordinate points from loaded frames if available
    if (frames && frames.length > 5) {
      const extracted: Point2D[] = [];
      let hasValidCoords = false;

      frames.forEach((f, idx) => {
        if (f.worldPosition && typeof f.worldPosition.x === 'number' && typeof f.worldPosition.y === 'number') {
          hasValidCoords = true;
          extracted.push({
            x: f.worldPosition.x,
            y: f.worldPosition.y,
            distMeters: f.trackDistanceMeters,
            speedKmh: f.speedKmh,
            sector: f.currentSector,
          });
        }
      });

      if (hasValidCoords && extracted.length > 5) {
        return extracted;
      }
    }

    // 2. Generate smooth 2D procedural circuit outline tailored to track length & sector geometry
    const numPoints = 120;
    const points: Point2D[] = [];
    const trackLen = track.lengthMeters || 13626;

    // Use a classic circuit path parametric formula (resembles Spa/Le Mans endurance style layout)
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * 2 * Math.PI;
      const dist = (i / numPoints) * trackLen;

      // Parametric shape with turns and straights
      const rx = 350 * Math.cos(t) + 120 * Math.cos(2 * t) - 40 * Math.sin(3 * t);
      const ry = 220 * Math.sin(t) + 90 * Math.sin(2 * t) + 30 * Math.cos(3 * t);

      // Determine sector from distance
      let sector: number = 1;
      if (track.sectors && track.sectors.length >= 3) {
        if (dist > track.sectors[1].distanceMeter) sector = 3;
        else if (dist > track.sectors[0].distanceMeter) sector = 2;
      } else {
        if (i > numPoints * 0.66) sector = 3;
        else if (i > numPoints * 0.33) sector = 2;
      }

      points.push({
        x: rx,
        y: ry,
        distMeters: dist,
        sector,
        speedKmh: 120 + 160 * Math.abs(Math.sin(t * 1.5)),
      });
    }

    return points;
  }, [frames, track]);

  // Compute bounding box and normalize points into SVG viewBox (800 x 500)
  const svgWidth = 800;
  const svgHeight = 480;
  const padding = 50;

  // Static Map Geometry memoization - ONLY recalculates when track or frames change, NOT on 60Hz telemetry ticks
  const staticMapData = useMemo(() => {
    if (trackPathPoints.length === 0) {
      return {
        normalizedPoints: [],
        totalPathString: '',
        scale: 1,
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
        offsetX: padding,
        offsetY: padding,
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    trackPathPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Scale to fit within SVG padding
    const usableW = svgWidth - padding * 2;
    const usableH = svgHeight - padding * 2;
    const scale = Math.min(usableW / rangeX, usableH / rangeY);

    const offsetX = padding + (usableW - rangeX * scale) / 2;
    const offsetY = padding + (usableH - rangeY * scale) / 2;

    const normalized = trackPathPoints.map((p) => ({
      ...p,
      svgX: offsetX + (p.x - minX) * scale,
      svgY: offsetY + (maxY - p.y) * scale, // Flip Y for SVG coords
    }));

    // SVG path string
    const totalPathString = normalized.reduce((acc, p, i) => {
      return `${acc} ${i === 0 ? 'M' : 'L'} ${p.svgX.toFixed(1)},${p.svgY.toFixed(1)}`;
    }, '');

    return {
      normalizedPoints: normalized,
      totalPathString,
      scale,
      minX,
      maxX,
      minY,
      maxY,
      offsetX,
      offsetY,
    };
  }, [trackPathPoints]);

  const { normalizedPoints, totalPathString } = staticMapData;

  // Dynamic Car Position & Angle - Recalculates lightweight 2D point on 60Hz telemetry ticks
  const currentCarPoint = useMemo(() => {
    if (normalizedPoints.length === 0) {
      return { x: 400, y: 240, angleDeg: 0 };
    }

    const { minX, maxY, scale, offsetX, offsetY } = staticMapData;
    let currX = 0;
    let currY = 0;
    let angleDeg = 0;

    if (telemetry.worldPosition && typeof telemetry.worldPosition.x === 'number' && typeof telemetry.worldPosition.y === 'number') {
      currX = offsetX + (telemetry.worldPosition.x - minX) * scale;
      currY = offsetY + (maxY - telemetry.worldPosition.y) * scale;

      // Estimate heading angle from next frame or progress
      const progressFrac = Math.max(0, Math.min(100, trackProgressPercent || 0)) / 100;
      const targetIdx = Math.min(normalizedPoints.length - 1, Math.floor(progressFrac * (normalizedPoints.length - 1)));
      const nextIdx = (targetIdx + 1) % normalizedPoints.length;
      const nextP = normalizedPoints[nextIdx] || normalizedPoints[0];
      const dx = nextP.svgX - currX;
      const dy = nextP.svgY - currY;
      angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    } else {
      const progressFrac = Math.max(0, Math.min(100, trackProgressPercent || 0)) / 100;
      const targetIdx = Math.min(normalizedPoints.length - 1, Math.floor(progressFrac * (normalizedPoints.length - 1)));
      const currP = normalizedPoints[targetIdx] || normalizedPoints[0];
      const nextIdx = (targetIdx + 1) % normalizedPoints.length;
      const nextP = normalizedPoints[nextIdx] || currP;
      const dx = nextP.svgX - currP.svgX;
      const dy = nextP.svgY - currP.svgY;
      currX = currP.svgX;
      currY = currP.svgY;
      angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    }

    return { x: currX, y: currY, angleDeg };
  }, [staticMapData, trackProgressPercent, telemetry.worldPosition]);


  // Sector path segments
  const sectorPaths = useMemo(() => {
    if (normalizedPoints.length === 0) return [];
    const s1: typeof normalizedPoints = [];
    const s2: typeof normalizedPoints = [];
    const s3: typeof normalizedPoints = [];

    normalizedPoints.forEach((p) => {
      if (p.sector === 1) s1.push(p);
      else if (p.sector === 2) s2.push(p);
      else s3.push(p);
    });

    const createPath = (pts: typeof normalizedPoints) => {
      if (pts.length === 0) return '';
      return pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.svgX.toFixed(1)},${p.svgY.toFixed(1)}`, '');
    };

    return [
      { sector: 1, name: 'S1', color: '#f59e0b', stroke: '#f59e0b', path: createPath(s1) },
      { sector: 2, name: 'S2', color: '#38bdf8', stroke: '#38bdf8', path: createPath(s2) },
      { sector: 3, name: 'S3', color: '#c084fc', stroke: '#c084fc', path: createPath(s3) },
    ];
  }, [normalizedPoints]);

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              2D CIRCUIT TELEMETRY MAP
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30">
                LIVE POSITION
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {track.name} • {track.lengthMeters ? (track.lengthMeters / 1000).toFixed(3) : '13.626'} km
            </p>
          </div>
        </div>

        {/* Legend Badges */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Sector 1
          </span>
          <span className="flex items-center gap-1.5 text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Sector 2
          </span>
          <span className="flex items-center gap-1.5 text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> Sector 3
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* SVG Track Canvas */}
        <div className="lg:col-span-8 relative bg-slate-950/80 border border-slate-800/80 rounded-xl p-2 flex items-center justify-center min-h-[320px] shadow-inner">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[420px] drop-shadow-md select-none"
          >
            {/* Background Glow Effect */}
            <filter id="trackGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="carGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Main Outer Dark Track Shadow Line */}
            <path
              d={totalPathString}
              fill="none"
              stroke="#0f172a"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={totalPathString}
              fill="none"
              stroke="#1e293b"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Sector Segment Paths */}
            {sectorPaths.map((sec) => (
              <path
                key={sec.sector}
                d={sec.path}
                fill="none"
                stroke={sec.stroke}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-90 transition-all duration-300"
              />
            ))}

            {/* Start / Finish Line Banner */}
            {normalizedPoints.length > 0 && (
              <g transform={`translate(${normalizedPoints[0].svgX}, ${normalizedPoints[0].svgY})`}>
                <line x1="-10" y1="-10" x2="10" y2="10" stroke="#f8fafc" strokeWidth="3" />
                <circle r="4" fill="#f8fafc" />
              </g>
            )}

            {/* Car Position Marker */}
            <g
              transform={`translate(${currentCarPoint.x}, ${currentCarPoint.y})`}
              className="transition-transform duration-100 ease-linear"
            >
              {/* Pulsing Outer Radar Ring */}
              <circle r="16" fill="none" stroke="#ef4444" strokeWidth="2" className="animate-ping opacity-75" />
              <circle r="12" fill="rgba(239, 68, 68, 0.25)" stroke="#f87171" strokeWidth="2" filter="url(#carGlow)" />
              <circle r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />

              {/* Direction Heading Pointer */}
              <g transform={`rotate(${currentCarPoint.angleDeg})`}>
                <polygon points="10,0 -4,-5 -2,0 -4,5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
              </g>
            </g>
          </svg>

          {/* Map Footer Overlay Stats */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-4 text-xs font-mono text-slate-300 backdrop-blur-md">
            <div>
              <span className="text-slate-500 text-[10px] block">LAP DISTANCE</span>
              <span className="font-bold text-amber-400">
                {trackDistanceMeters.toLocaleString()} <span className="text-slate-400 text-[10px]">m</span>
              </span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-slate-500 text-[10px] block">PROGRESS</span>
              <span className="font-bold text-emerald-400">{trackProgressPercent.toFixed(1)}%</span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-slate-500 text-[10px] block">SECTOR</span>
              <span className="font-bold text-sky-400">S{telemetry.currentSector}</span>
            </div>
          </div>
        </div>

        {/* Live Telemetry Inputs & Controls Panel */}
        {showInputsOverlay && (
          <div className="lg:col-span-4 space-y-4 bg-slate-950/60 border border-slate-800/90 rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-sky-400" /> LIVE DRIVER INPUTS
              </span>
              <span className="text-xs font-mono text-slate-400">
                LAP <strong className="text-white">#{telemetry.lapNumber}</strong>
              </span>
            </div>

            {/* Gear, Speed & RPM Row */}
            <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block">GEAR</span>
                <span className="text-3xl font-black font-mono text-amber-400">
                  {gear === -1 ? 'R' : gear === 0 ? 'N' : gear}
                </span>
              </div>
              <div className="border-x border-slate-800 px-1">
                <span className="text-[10px] font-mono text-slate-500 block">SPEED</span>
                <span className="text-2xl font-black font-mono text-white">{Math.round(speedKmh)}</span>
                <span className="text-[9px] font-mono text-slate-400 block">km/h</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 block">RPM</span>
                <span className="text-lg font-black font-mono text-emerald-400">{rpm}</span>
                <span className="text-[9px] font-mono text-slate-400 block">/ {car.maxRPM || 8500}</span>
              </div>
            </div>

            {/* Pedal Input Bars (Throttle, Brake, Clutch) */}
            <div className="space-y-2 font-mono text-xs">
              {/* Throttle */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    THROTTLE
                  </span>
                  <span className="font-bold text-white">{Math.round((inputs.throttle || 0) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-75 shadow-lg shadow-emerald-500/50"
                    style={{ width: `${Math.min(100, Math.max(0, (inputs.throttle || 0) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Brake */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    BRAKE
                  </span>
                  <span className="font-bold text-white">{Math.round((inputs.brake || 0) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-75 shadow-lg shadow-red-500/50"
                    style={{ width: `${Math.min(100, Math.max(0, (inputs.brake || 0) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Clutch */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="text-sky-400 font-bold flex items-center gap-1">
                    CLUTCH
                  </span>
                  <span className="font-bold text-white">{Math.round((inputs.clutch || 0) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, (inputs.clutch || 0) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Steering Wheel Rotation Visualizer */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block">STEERING ANGLE</span>
                <span className="text-sm font-bold font-mono text-amber-300">
                  {inputs.steeringAngleDeg ? inputs.steeringAngleDeg.toFixed(1) : '0.0'}°
                </span>
              </div>

              <div className="relative w-12 h-12 flex items-center justify-center bg-slate-950 rounded-full border border-slate-700 shadow-inner">
                <div
                  className="w-9 h-9 border-2 border-amber-400 rounded-full flex items-center justify-center transition-transform duration-75"
                  style={{ transform: `rotate(${inputs.steeringAngleDeg || 0}deg)` }}
                >
                  <div className="w-1 h-3 bg-red-500 rounded-full absolute -top-1" />
                  <div className="w-4 h-0.5 bg-amber-400" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
