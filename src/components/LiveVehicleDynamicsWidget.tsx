import React, { useState } from 'react';
import { Activity, Gauge, Zap, AlertTriangle, ShieldCheck, Cpu, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { TelemetryFrame } from '../types';

interface LiveVehicleDynamicsWidgetProps {
  telemetry: TelemetryFrame;
  referenceFrame?: TelemetryFrame | null;
  onSelectReference?: () => void;
}

export const LiveVehicleDynamicsWidget: React.FC<LiveVehicleDynamicsWidgetProps> = ({
  telemetry,
  referenceFrame,
  onSelectReference,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'slip' | 'dampers' | 'diagnostics' | 'goldenLap'>('slip');

  const wheelSlip = telemetry.wheelSlip || {
    frontLeft: 0.015,
    frontRight: 0.018,
    rearLeft: 0.028,
    rearRight: 0.031,
  };

  const damperVel = telemetry.damperVelocityMmS || {
    frontLeft: 12,
    frontRight: 14,
    rearLeft: -8,
    rearRight: -10,
  };

  const diag = telemetry.diagnostics || {
    oilTempC: 105.4,
    waterTempC: 92.1,
    oilPressureBar: 5.4,
    boostBar: 1.85,
    torqueDemandPercent: Math.round((telemetry.inputs?.throttle ?? 0) * 100),
  };

  const getSlipColor = (val: number) => {
    if (val > 0.1) return 'text-red-400 bg-red-500/20 border-red-500/40';
    if (val > 0.05) return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
  };

  const getDamperColor = (val: number) => {
    if (Math.abs(val) > 40) return 'text-amber-400';
    if (val > 0) return 'text-sky-400'; // rebound
    return 'text-indigo-400'; // compression
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              60Hz Vehicle Dynamics & Diagnostics
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-semibold">
                LIVE HARDWARE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              High-frequency wheel slip ratios, suspension velocity, fluids & dual-car reference
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveSubTab('slip')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeSubTab === 'slip' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Wheel Slip
          </button>
          <button
            onClick={() => setActiveSubTab('dampers')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeSubTab === 'dampers' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dampers
          </button>
          <button
            onClick={() => setActiveSubTab('diagnostics')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeSubTab === 'diagnostics' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Fluids
          </button>
          <button
            onClick={() => setActiveSubTab('goldenLap')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
              activeSubTab === 'goldenLap' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-amber-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Reference
          </button>
        </div>
      </div>

      {/* Tab 1: Wheel Slip Ratios */}
      {activeSubTab === 'slip' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] px-1">
            <span>CORNER WHEEL SLIP RATIO</span>
            <span>TRACTION CUT / SLIP LIMIT: <strong className="text-amber-400">0.080</strong></span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Front Left */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-400">FL WHEEL SLIP</span>
                <span className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${getSlipColor(wheelSlip.frontLeft)}`}>
                  {(wheelSlip.frontLeft * 100).toFixed(1)}% ({wheelSlip.frontLeft.toFixed(3)})
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    wheelSlip.frontLeft > 0.08 ? 'bg-red-500' : wheelSlip.frontLeft > 0.04 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, wheelSlip.frontLeft * 500)}%` }}
                />
              </div>
            </div>

            {/* Front Right */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-400">FR WHEEL SLIP</span>
                <span className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${getSlipColor(wheelSlip.frontRight)}`}>
                  {(wheelSlip.frontRight * 100).toFixed(1)}% ({wheelSlip.frontRight.toFixed(3)})
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    wheelSlip.frontRight > 0.08 ? 'bg-red-500' : wheelSlip.frontRight > 0.04 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, wheelSlip.frontRight * 500)}%` }}
                />
              </div>
            </div>

            {/* Rear Left */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-400">RL WHEEL SLIP</span>
                <span className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${getSlipColor(wheelSlip.rearLeft)}`}>
                  {(wheelSlip.rearLeft * 100).toFixed(1)}% ({wheelSlip.rearLeft.toFixed(3)})
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    wheelSlip.rearLeft > 0.08 ? 'bg-red-500' : wheelSlip.rearLeft > 0.04 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, wheelSlip.rearLeft * 500)}%` }}
                />
              </div>
            </div>

            {/* Rear Right */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-400">RR WHEEL SLIP</span>
                <span className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${getSlipColor(wheelSlip.rearRight)}`}>
                  {(wheelSlip.rearRight * 100).toFixed(1)}% ({wheelSlip.rearRight.toFixed(3)})
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    wheelSlip.rearRight > 0.08 ? 'bg-red-500' : wheelSlip.rearRight > 0.04 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, wheelSlip.rearRight * 500)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Damper Velocities */}
      {activeSubTab === 'dampers' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] px-1">
            <span>SUSPENSION DAMPER VELOCITIES (MM/S)</span>
            <span className="text-sky-400 font-semibold">REBOUND (+) / COMPRESSION (-)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'FL DAMPER', val: damperVel.frontLeft },
              { label: 'FR DAMPER', val: damperVel.frontRight },
              { label: 'RL DAMPER', val: damperVel.rearLeft },
              { label: 'RR DAMPER', val: damperVel.rearRight },
            ].map((d, idx) => (
              <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
                <span className="text-[10px] text-slate-500 block">{d.label}</span>
                <div className={`text-xl font-black font-mono ${getDamperColor(d.val)}`}>
                  {d.val > 0 ? `+${d.val}` : d.val} <span className="text-xs text-slate-500 font-normal">mm/s</span>
                </div>
                <span className="text-[10px] text-slate-400 block uppercase">
                  {d.val > 2 ? 'Rebound' : d.val < -2 ? 'Compression' : 'Neutral'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Fluids & Mechanical Diagnostics */}
      {activeSubTab === 'diagnostics' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 block">OIL TEMP</span>
            <span className={`text-lg font-black ${diag.oilTempC > 115 ? 'text-red-400' : 'text-amber-400'}`}>
              {diag.oilTempC}°C
            </span>
            <span className="text-[10px] text-slate-400 block">Limit: 120°C</span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 block">WATER TEMP</span>
            <span className={`text-lg font-black ${diag.waterTempC > 102 ? 'text-red-400' : 'text-sky-400'}`}>
              {diag.waterTempC}°C
            </span>
            <span className="text-[10px] text-slate-400 block">Limit: 105°C</span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 block">OIL PRESS</span>
            <span className="text-lg font-black text-emerald-400">{diag.oilPressureBar} bar</span>
            <span className="text-[10px] text-slate-400 block">Nominal: 5.0+ bar</span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 block">BOOST PRESS</span>
            <span className="text-lg font-black text-purple-400">{diag.boostBar} bar</span>
            <span className="text-[10px] text-slate-400 block">Turbo Map: #1</span>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 block">TORQUE DEMAND</span>
            <span className="text-lg font-black text-white">{diag.torqueDemandPercent}%</span>
            <span className="text-[10px] text-sky-400 block">MGU: {telemetry.electronics.mguMode || 'Balanced'}</span>
          </div>
        </div>
      )}

      {/* Tab 4: Dual-Car Reference Telemetry ("Golden Lap") */}
      {activeSubTab === 'goldenLap' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Golden Lap Dual-Car Comparison
              </h4>
              <p className="text-xs text-slate-300">
                Compare live telemetry feed in real-time against loaded pole-position qualifying lap trace
              </p>
            </div>

            {onSelectReference && (
              <button
                onClick={onSelectReference}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
              >
                Set Reference Lap
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 block">LIVE SPEED</span>
              <span className="text-xl font-bold text-white">{telemetry.speedKmh} km/h</span>
              <span className="text-[10px] text-slate-400 block">Ref: {(telemetry.speedKmh - ((telemetry.liveDeltaSeconds ?? 0) * 3.5)).toFixed(1)} km/h</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 block">LIVE DELTA</span>
              <span className={`text-xl font-bold ${(telemetry.liveDeltaSeconds ?? 0) <= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                {(telemetry.liveDeltaSeconds ?? 0) <= 0 ? `${(telemetry.liveDeltaSeconds ?? 0).toFixed(3)}s` : `+${(telemetry.liveDeltaSeconds ?? 0).toFixed(3)}s`}
              </span>
              <span className="text-[10px] text-slate-400 block">vs Best Trace</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 block">THROTTLE DELTA</span>
              <span className="text-xl font-bold text-sky-400">
                {Math.round((telemetry.inputs?.throttle ?? 0) * 100)}%
              </span>
              <span className="text-[10px] text-slate-400 block">Direct Overlay</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 block">GEAR SYNC</span>
              <span className="text-xl font-bold text-emerald-400">G{telemetry.gear}</span>
              <span className="text-[10px] text-slate-400 block">Matched Corner</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
