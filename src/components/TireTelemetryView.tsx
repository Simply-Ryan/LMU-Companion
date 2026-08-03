import React from 'react';
import { TelemetryFrame, TireCornerData } from '../types';
import { Disc, Flame, Gauge, AlertCircle, Thermometer, ShieldAlert } from 'lucide-react';
import { OPTIMAL_TIRE_TEMP, OPTIMAL_TIRE_PRESSURE_KPA } from '../data/lmuData';

interface TireTelemetryViewProps {
  telemetry: TelemetryFrame;
}

export const TireTelemetryView: React.FC<TireTelemetryViewProps> = ({ telemetry }) => {
  const { tires } = telemetry;

  const renderCornerCard = (cornerName: string, label: string, data: TireCornerData) => {
    const psi = (data.pressureKPa * 0.145038).toFixed(1);
    const pressureDelta = data.pressureKPa - OPTIMAL_TIRE_PRESSURE_KPA;

    // Helper for tread zone color
    const getZoneColor = (temp: number) => {
      if (temp < OPTIMAL_TIRE_TEMP.minC) return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      if (temp <= OPTIMAL_TIRE_TEMP.maxC) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      return 'bg-red-500/20 text-red-400 border-red-500/40';
    };

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-base text-white">
            <span className="p-1.5 bg-slate-800 rounded-lg text-amber-400 font-mono text-xs">{cornerName}</span>
            <span>{label}</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Carcass: <strong className="text-white">{data.tempCarcassC}°C</strong>
          </span>
        </div>

        {/* 3-Zone Tread Temperature Gradient (Inner, Center, Outer) */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-400 font-mono block">3-ZONE TREAD TEMPERATURES</span>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold">
            <div className={`p-2.5 rounded-xl border ${getZoneColor(data.tempTreadInnerC)}`}>
              <span className="text-[10px] text-slate-400 block font-normal">INNER</span>
              <span>{data.tempTreadInnerC}°C</span>
            </div>
            <div className={`p-2.5 rounded-xl border ${getZoneColor(data.tempTreadCenterC)}`}>
              <span className="text-[10px] text-slate-400 block font-normal">CENTER</span>
              <span>{data.tempTreadCenterC}°C</span>
            </div>
            <div className={`p-2.5 rounded-xl border ${getZoneColor(data.tempTreadOuterC)}`}>
              <span className="text-[10px] text-slate-400 block font-normal">OUTER</span>
              <span>{data.tempTreadOuterC}°C</span>
            </div>
          </div>
        </div>

        {/* Pressure & Wear */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 block text-[11px]">HOT PRESSURE</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-white">{data.pressureKPa}</span>
              <span className="text-[10px] text-slate-400">kPa ({psi} PSI)</span>
            </div>
            <span className={`text-[10px] font-semibold ${pressureDelta > 0 ? 'text-amber-400' : 'text-sky-400'}`}>
              {pressureDelta >= 0 ? `+${pressureDelta}` : pressureDelta} kPa vs Target
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
            <span className="text-slate-400 block text-[11px]">TIRE WEAR</span>
            <span className="text-base font-bold text-emerald-400">{data.wearPercent}%</span>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${data.wearPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Brake Disc Temp */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-400" /> Brake Disc:
          </span>
          <span className="text-white font-bold">{data.brakeTempC}°C</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Target Legend Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Disc className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white">OPTIMAL TIRE WINDOW:</span>
          <span className="text-slate-300">75°C - 110°C (Target: ~92°C)</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-sky-500 rounded-sm" /> Cold (&lt;75°C)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Optimal (75-110°C)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-500 rounded-sm" /> Hot (&gt;110°C)
          </span>
        </div>
      </div>

      {/* 4-Corner Grid Layout simulating Car chassis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderCornerCard('FL', 'Front Left Tire', tires.frontLeft)}
        {renderCornerCard('FR', 'Front Right Tire', tires.frontRight)}
        {renderCornerCard('RL', 'Rear Left Tire', tires.rearLeft)}
        {renderCornerCard('RR', 'Rear Right Tire', tires.rearRight)}
      </div>
    </div>
  );
};
