import React from 'react';
import { TelemetryFrame, LapRecord } from '../types';
import { Timer, Flag, TrendingUp, TrendingDown, Award, Zap, Fuel, Activity } from 'lucide-react';

interface SessionStintViewProps {
  telemetry: TelemetryFrame;
  uploadedLaps?: LapRecord[];
}

export const SessionStintView: React.FC<SessionStintViewProps> = ({ telemetry, uploadedLaps }) => {
  const { sectorDeltas, liveDeltaSeconds, currentLapTimeSeconds, bestLapTimeSeconds, lapNumber } = telemetry;

  const formatLapTime = (sec: number) => {
    if (!sec || sec <= 0) return '--:--.---';
    const mins = Math.floor(sec / 60);
    const secs = (sec % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Simulated lap history
  const sampleLaps: LapRecord[] = [
    {
      lapNumber: lapNumber - 1 || 1,
      lapTimeSeconds: 205.42,
      lapTimeString: '3:25.420',
      sector1Seconds: 52.05,
      sector2Seconds: 84.60,
      sector3Seconds: 68.77,
      fuelUsedLiters: 2.82,
      virtualEnergyUsedMJ: 28.1,
      maxSpeedKmh: 342.5,
      avgSpeedKmh: 238.4,
      isValid: true,
      isPersonalBest: true,
      isSessionBest: false,
      tireWearAvgPercent: 95,
      trackTempC: 31.0
    },
    {
      lapNumber: Math.max(1, lapNumber - 2),
      lapTimeSeconds: 206.15,
      lapTimeString: '3:26.150',
      sector1Seconds: 52.30,
      sector2Seconds: 84.90,
      sector3Seconds: 68.95,
      fuelUsedLiters: 2.85,
      virtualEnergyUsedMJ: 28.4,
      maxSpeedKmh: 340.2,
      avgSpeedKmh: 236.8,
      isValid: true,
      isPersonalBest: false,
      isSessionBest: false,
      tireWearAvgPercent: 96,
      trackTempC: 31.0
    },
    {
      lapNumber: Math.max(1, lapNumber - 3),
      lapTimeSeconds: 207.02,
      lapTimeString: '3:27.020',
      sector1Seconds: 52.60,
      sector2Seconds: 85.10,
      sector3Seconds: 69.32,
      fuelUsedLiters: 2.88,
      virtualEnergyUsedMJ: 28.6,
      maxSpeedKmh: 338.5,
      avgSpeedKmh: 235.1,
      isValid: true,
      isPersonalBest: false,
      isSessionBest: false,
      tireWearAvgPercent: 98,
      trackTempC: 31.2
    }
  ];

  const activeLaps = (uploadedLaps && uploadedLaps.length > 0) ? uploadedLaps : sampleLaps;

  return (
    <div className="space-y-6">
      {/* Live Sector Deltas Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 font-bold text-base text-white">
            <Timer className="w-5 h-5 text-amber-400" />
            <span>LIVE SECTOR TIMES & DELTAS</span>
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span>LIVE DELTA:</span>
            <span className={`font-bold text-sm px-2.5 py-0.5 rounded-lg ${
              liveDeltaSeconds <= 0 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}>
              {liveDeltaSeconds <= 0 ? `${liveDeltaSeconds.toFixed(3)}s` : `+${liveDeltaSeconds.toFixed(3)}s`}
            </span>
          </div>
        </div>

        {/* 3 Sector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sectorDeltas.map((s) => (
            <div
              key={s.sector}
              className={`p-4 rounded-xl border ${
                s.isSessionBest
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                  : s.deltaSeconds <= 0
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-300'
              } space-y-2`}
            >
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>SECTOR {s.sector}</span>
                {s.isSessionBest && (
                  <span className="bg-purple-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-black">
                    SESSION BEST
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-white">
                  {s.currentTimeSeconds.toFixed(2)}s
                </span>
                <span className="text-xs font-mono font-bold">
                  {s.deltaSeconds <= 0 ? `${s.deltaSeconds.toFixed(3)}s` : `+${s.deltaSeconds.toFixed(3)}s`}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex justify-between pt-1">
                <span>Ref Best: {s.bestTimeSeconds.toFixed(2)}s</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stint Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-1">
          <span className="text-slate-400 block">CURRENT LAP</span>
          <span className="text-xl font-bold text-white">{formatLapTime(currentLapTimeSeconds)}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-1">
          <span className="text-slate-400 block">BEST LAP TIME</span>
          <span className="text-xl font-bold text-amber-400">{formatLapTime(bestLapTimeSeconds)}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-1">
          <span className="text-slate-400 block">STINT LAPS COMPLETED</span>
          <span className="text-xl font-bold text-sky-400">{lapNumber - 1} Laps</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-1">
          <span className="text-slate-400 block">CONSISTENCY SCORE</span>
          <span className="text-xl font-bold text-emerald-400">98.4%</span>
        </div>
      </div>

      {/* Lap History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-400" />
            <span>Stint Lap History</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{activeLaps.length} Laps Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Lap</th>
                <th className="py-3 px-3">Lap Time</th>
                <th className="py-3 px-3">S1</th>
                <th className="py-3 px-3">S2</th>
                <th className="py-3 px-3">S3</th>
                <th className="py-3 px-3">Fuel Used</th>
                <th className="py-3 px-3">VE Used</th>
                <th className="py-3 px-3">Max Speed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {activeLaps.map((lap) => (
                <tr key={lap.lapNumber} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-bold text-amber-400">Lap {lap.lapNumber}</td>
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                    {lap.lapTimeString}
                    {lap.isPersonalBest && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded font-medium">
                        PB
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">{lap.sector1Seconds}s</td>
                  <td className="py-3 px-3">{lap.sector2Seconds}s</td>
                  <td className="py-3 px-3">{lap.sector3Seconds}s</td>
                  <td className="py-3 px-3 text-amber-300">{lap.fuelUsedLiters} L</td>
                  <td className="py-3 px-3 text-sky-300">{lap.virtualEnergyUsedMJ} MJ</td>
                  <td className="py-3 px-3">{lap.maxSpeedKmh} km/h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
