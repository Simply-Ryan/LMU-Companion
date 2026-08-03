import React, { useState } from 'react';
import { TelemetryFrame } from '../types';
import { CanvasTracePlotter } from './common/CanvasTracePlotter';
import {
  LineChart as LineChartIcon,
  Activity,
  Download,
  Sliders,
  Maximize2,
  TrendingUp,
  Layers,
  Filter,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

interface TelemetryLabProps {
  telemetry: TelemetryFrame;
  uploadedTraceData?: any[];
}

export const TelemetryLab: React.FC<TelemetryLabProps> = ({ telemetry, uploadedTraceData }) => {
  // Channel Plotter Configuration States
  const [plotType, setPlotType] = useState<'line' | 'scatter'>('scatter');
  const [channelX, setChannelX] = useState<string>('steeringAngleDeg');
  const [channelY, setChannelY] = useState<string>('latAccelG');
  const [filterMinSpeed, setFilterMinSpeed] = useState<number>(50);

  // Generate distance trace points if no uploaded trace data
  const generateTraceData = () => {
    const points = [];
    const totalDistance = telemetry.track.lengthMeters || 13626;
    const numPoints = 80;

    for (let i = 0; i <= numPoints; i++) {
      const dist = Math.round((i / numPoints) * totalDistance);
      const rad = (i / numPoints) * 2 * Math.PI;

      const speedCurrent = Math.round(Math.max(65, Math.min(345, 220 + 90 * Math.sin(rad * 3) + Math.sin(rad * 7) * 35)));
      const speedBest = Math.round(Math.max(65, Math.min(345, 222 + 92 * Math.sin(rad * 3) + Math.sin(rad * 7) * 36)));

      const isBraking = Math.sin(rad * 3) < -0.3;
      const throttle = isBraking ? 0 : Math.min(100, Math.round((speedCurrent / 320) * 100));
      const brake = isBraking ? Math.min(100, Math.round(Math.abs(Math.sin(rad * 3)) * 100)) : 0;
      const steeringAngleDeg = Math.round(Math.sin(rad * 4) * 42);
      const latAccelG = Number((Math.sin(rad * 4) * 2.8).toFixed(2));
      const longAccelG = Number((isBraking ? -Math.sin(rad * 3) * 2.2 : (throttle / 100) * 1.5).toFixed(2));
      const rpm = Math.round(4200 + (speedCurrent / 345) * 4400);

      const frontSlip = Number((0.01 + Math.abs(latAccelG) * 0.02 + brake * 0.0005).toFixed(3));
      const rearSlip = Number((0.02 + (throttle / 100) * 0.04).toFixed(3));

      points.push({
        distanceMeters: dist,
        speedCurrent,
        speedBest,
        throttlePercent: throttle,
        brakePercent: brake,
        steeringAngleDeg,
        latAccelG,
        longAccelG,
        rpm,
        frontSlip,
        rearSlip,
        virtualEnergyMJ: Number((910 - (i / numPoints) * 28.5).toFixed(1)),
        deltaSec: Number((Math.sin(rad) * 0.35).toFixed(3)),
      });
    }
    return points;
  };

  const rawTraceData = uploadedTraceData && uploadedTraceData.length > 0 ? uploadedTraceData : generateTraceData();

  // Filtered dataset for Channel Plotter
  const filteredPlotData = rawTraceData.filter((pt) => {
    const spd = pt.speedCurrent || pt.speed_kmh || pt.speed || 0;
    return spd >= filterMinSpeed;
  });

  // Channel mapping definitions
  const channelLabels: Record<string, string> = {
    distanceMeters: 'Track Distance (m)',
    speedCurrent: 'Speed (km/h)',
    steeringAngleDeg: 'Steering Angle (°)',
    latAccelG: 'Lateral G-Force (G)',
    longAccelG: 'Longitudinal G-Force (G)',
    throttlePercent: 'Throttle Application (%)',
    brakePercent: 'Brake Pressure (%)',
    rpm: 'Engine RPM',
    frontSlip: 'Front Wheel Slip',
    rearSlip: 'Rear Wheel Slip',
    virtualEnergyMJ: 'Virtual Energy (MJ)',
  };

  // Helper to export dataset as MoTeC / CSV Log File
  const handleExportMoTeC = () => {
    if (!rawTraceData || rawTraceData.length === 0) return;
    const keys = Object.keys(rawTraceData[0]);
    const header = keys.join(',');
    const rows = rawTraceData.map((row) => keys.map((k) => row[k] ?? '').join(','));
    const content = [
      '# MoTeC i2 / LMU Telemetry Log Export',
      `# Car: ${telemetry.car.name}`,
      `# Track: ${telemetry.track.name}`,
      `# Export Timestamp: ${new Date().toISOString()}`,
      header,
      ...rows,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LMU_MoTeC_Telemetry_Log_${telemetry.track.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Custom Telemetry Channel Plotter (User-Definable X/Y Plots) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                Custom Telemetry Channel Plotter
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  X/Y SCATTER & LINE
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                User-definable channels (e.g. Steering Angle vs Lat G, Throttle vs RPM, Front Slip vs Rear Slip)
              </p>
            </div>
          </div>

          {/* Export & Plot Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handleExportMoTeC}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-xl transition flex items-center gap-1.5"
              title="Download processed lap traces as MoTeC i2 / CSV compatible log"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Export MoTeC CSV Log
            </button>
          </div>
        </div>

        {/* Channel Selector Controls Toolbar */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          {/* X-Axis Channel */}
          <div className="space-y-1">
            <label className="text-slate-400 block font-semibold">X-AXIS CHANNEL:</label>
            <select
              value={channelX}
              onChange={(e) => setChannelX(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-bold rounded-lg p-2 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {Object.entries(channelLabels).map(([k, label]) => (
                <option key={k} value={k} className="bg-slate-900 text-white">
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Y-Axis Channel */}
          <div className="space-y-1">
            <label className="text-slate-400 block font-semibold">Y-AXIS CHANNEL:</label>
            <select
              value={channelY}
              onChange={(e) => setChannelY(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-sky-400 font-bold rounded-lg p-2 focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              {Object.entries(channelLabels).map(([k, label]) => (
                <option key={k} value={k} className="bg-slate-900 text-white">
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Plot Type (Scatter vs Line) */}
          <div className="space-y-1">
            <label className="text-slate-400 block font-semibold">PLOT TYPE:</label>
            <div className="flex items-center gap-1 bg-slate-900 p-1 border border-slate-700 rounded-lg">
              <button
                onClick={() => setPlotType('scatter')}
                className={`flex-1 py-1 rounded font-bold transition ${
                  plotType === 'scatter' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Scatter
              </button>
              <button
                onClick={() => setPlotType('line')}
                className={`flex-1 py-1 rounded font-bold transition ${
                  plotType === 'line' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Line
              </button>
            </div>
          </div>

          {/* Min Speed Threshold Filter */}
          <div className="space-y-1">
            <label className="text-slate-400 block font-semibold">MIN SPEED FILTER ({filterMinSpeed} km/h):</label>
            <input
              type="range"
              min={0}
              max={200}
              step={10}
              value={filterMinSpeed}
              onChange={(e) => setFilterMinSpeed(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer mt-2"
            />
          </div>
        </div>

        {/* Preset Quick Channel Pair Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-mono font-medium">Presets:</span>
          <button
            onClick={() => {
              setChannelX('steeringAngleDeg');
              setChannelY('latAccelG');
              setPlotType('scatter');
            }}
            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 rounded-lg transition font-mono"
          >
            🌀 Steering Angle vs Lat G
          </button>
          <button
            onClick={() => {
              setChannelX('throttlePercent');
              setChannelY('rpm');
              setPlotType('scatter');
            }}
            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 rounded-lg transition font-mono"
          >
            ⛽ Throttle vs RPM
          </button>
          <button
            onClick={() => {
              setChannelX('frontSlip');
              setChannelY('rearSlip');
              setPlotType('scatter');
            }}
            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-400 rounded-lg transition font-mono"
          >
            🏎️ Front vs Rear Slip
          </button>
          <button
            onClick={() => {
              setChannelX('distanceMeters');
              setChannelY('virtualEnergyMJ');
              setPlotType('line');
            }}
            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-400 rounded-lg transition font-mono"
          >
            ⚡ Virtual Energy vs Distance
          </button>
        </div>

        {/* Interactive Chart Canvas */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {plotType === 'scatter' ? (
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  dataKey={channelX}
                  name={channelLabels[channelX] || channelX}
                  stroke="#64748b"
                  fontSize={11}
                />
                <YAxis
                  type="number"
                  dataKey={channelY}
                  name={channelLabels[channelY] || channelY}
                  stroke="#64748b"
                  fontSize={11}
                />
                <ZAxis type="number" dataKey="speedCurrent" range={[30, 120]} name="Speed" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Scatter name="Telemetry Samples" data={filteredPlotData} fill="#f59e0b" />
              </ScatterChart>
            ) : (
              <LineChart data={filteredPlotData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey={channelX} stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey={channelY}
                  name={channelLabels[channelY] || channelY}
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Canvas 2D High-Performance Multi-Lap Trace Overlays */}
      <CanvasTracePlotter
        data={rawTraceData}
        primaryChannel="speedCurrent"
        secondaryChannel="speedBest"
        title="High-Density Speed Overlay (Current Lap vs Best Lap)"
        height={260}
      />

      <CanvasTracePlotter
        data={rawTraceData}
        primaryChannel="throttlePercent"
        secondaryChannel="brakePercent"
        title="Driver Pedal Telemetry (Throttle & Brake Canvas Trace)"
        height={220}
      />
    </div>
  );
};
