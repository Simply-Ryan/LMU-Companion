import React from 'react';
import { X, Fuel, Zap, Calculator, Table as TableIcon } from 'lucide-react';
import { TelemetryFrame, LapRecord } from '../types';

interface LapConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryFrame;
  lapRecords?: LapRecord[];
}

export const LapConsumptionModal: React.FC<LapConsumptionModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  lapRecords = [],
}) => {
  if (!isOpen) return null;

  const {
    fuelRemainingLiters,
    fuelAvgPerLapLiters,
    virtualEnergyRemainingMJ,
    virtualEnergyAvgPerLapMJ,
    car,
    lapNumber,
  } = telemetry;

  const fuelCap = car.fuelTankCapacityLiters || 90;
  const veCap = car.virtualEnergyCapacityMJ || 910;

  // Generate lap-by-lap breakdown from real uploaded lapRecords if available, or computed history
  const displayLaps = lapRecords.length > 0 ? lapRecords : Array.from({ length: Math.max(1, lapNumber) }, (_, i) => {
    const lNum = i + 1;
    const isCurrent = lNum === lapNumber;
    const fUsed = telemetry.fuelLastLapLiters || fuelAvgPerLapLiters || 2.82;
    const veUsed = telemetry.virtualEnergyLastLapMJ || virtualEnergyAvgPerLapMJ || 28.5;
    const remFuel = Math.max(0, fuelCap - lNum * fUsed);
    const remVE = Math.max(0, veCap - lNum * veUsed);

    return {
      lapNumber: lNum,
      lapTimeSeconds: telemetry.lastLapTimeSeconds || 205.4,
      lapTimeString: `${Math.floor((telemetry.lastLapTimeSeconds || 205.4) / 60)}:${((telemetry.lastLapTimeSeconds || 205.4) % 60).toFixed(3).padStart(6, '0')}`,
      sector1Seconds: 52.1,
      sector2Seconds: 84.4,
      sector3Seconds: 68.9,
      fuelUsedLiters: fUsed,
      virtualEnergyUsedMJ: veUsed,
      maxSpeedKmh: telemetry.speedKmh || 310,
      avgSpeedKmh: 220,
      isValid: true,
      isPersonalBest: i === 0,
      isSessionBest: i === 0,
      tireWearAvgPercent: Math.max(70, 100 - lNum * 2),
      trackTempC: telemetry.trackTempC || 31,
      remFuel,
      remVE,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Lap-by-Lap Fuel & Virtual Energy Consumption Log</h3>
              <p className="text-xs text-slate-400">
                Detailed consumption breakdown used for estimated stint length calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950 border-b border-slate-800 font-mono text-xs">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block">REMAINING FUEL</span>
            <span className="text-amber-400 font-bold text-sm">{fuelRemainingLiters} L</span>
            <span className="text-slate-400 text-[10px] block">
              ({((fuelRemainingLiters / fuelCap) * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block">AVG FUEL / LAP</span>
            <span className="text-white font-bold text-sm">{fuelAvgPerLapLiters} L/lap</span>
            <span className="text-amber-400 text-[10px] block">
              Est. {(fuelRemainingLiters / (fuelAvgPerLapLiters || 1)).toFixed(1)} Laps
            </span>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block">REMAINING VE</span>
            <span className="text-sky-400 font-bold text-sm">{virtualEnergyRemainingMJ} MJ</span>
            <span className="text-slate-400 text-[10px] block">
              ({((virtualEnergyRemainingMJ / veCap) * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block">AVG VE / LAP</span>
            <span className="text-white font-bold text-sm">{virtualEnergyAvgPerLapMJ} MJ/lap</span>
            <span className="text-sky-400 text-[10px] block">
              Est. {(virtualEnergyRemainingMJ / (virtualEnergyAvgPerLapMJ || 1)).toFixed(1)} Laps
            </span>
          </div>
        </div>

        {/* Table Log */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Lap</th>
                  <th className="py-3 px-4">Lap Time</th>
                  <th className="py-3 px-4 text-amber-400">Fuel Used (L)</th>
                  <th className="py-3 px-4 text-slate-300">Fuel Level (L)</th>
                  <th className="py-3 px-4 text-sky-400">VE Used (MJ)</th>
                  <th className="py-3 px-4 text-sky-300">VE Level (MJ)</th>
                  <th className="py-3 px-4 text-emerald-400">Est. Fuel Laps</th>
                  <th className="py-3 px-4 text-emerald-400">Est. VE Laps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {displayLaps.map((lap: any) => {
                  const remF = lap.remFuel ?? Math.max(0, fuelCap - lap.lapNumber * lap.fuelUsedLiters);
                  const remV = lap.remVE ?? Math.max(0, veCap - lap.lapNumber * lap.virtualEnergyUsedMJ);
                  const estFLaps = (remF / (lap.fuelUsedLiters || 1)).toFixed(1);
                  const estVELaps = (remV / (lap.virtualEnergyUsedMJ || 1)).toFixed(1);

                  return (
                    <tr key={lap.lapNumber} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-bold text-white">Lap {lap.lapNumber}</td>
                      <td className="py-2.5 px-4 text-slate-300">{lap.lapTimeString}</td>
                      <td className="py-2.5 px-4 text-amber-400 font-bold">-{lap.fuelUsedLiters?.toFixed(2)} L</td>
                      <td className="py-2.5 px-4 text-slate-300">{remF.toFixed(1)} L</td>
                      <td className="py-2.5 px-4 text-sky-400 font-bold">-{lap.virtualEnergyUsedMJ?.toFixed(1)} MJ</td>
                      <td className="py-2.5 px-4 text-sky-300">{remV.toFixed(1)} MJ</td>
                      <td className="py-2.5 px-4 text-amber-400 font-bold">{estFLaps}</td>
                      <td className="py-2.5 px-4 text-sky-400 font-bold">{estVELaps}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition"
          >
            Close Table
          </button>
        </div>
      </div>
    </div>
  );
};
