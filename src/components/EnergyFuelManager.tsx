import React, { useState } from 'react';
import { TelemetryFrame } from '../types';
import { Zap, Fuel, Calculator, Clock, AlertTriangle, ShieldCheck, ArrowRight, Gauge, Layers } from 'lucide-react';

interface EnergyFuelManagerProps {
  telemetry: TelemetryFrame;
}

export const EnergyFuelManager: React.FC<EnergyFuelManagerProps> = ({ telemetry }) => {
  const { fuelRemainingLiters, fuelAvgPerLapLiters, fuelLastLapLiters, virtualEnergyRemainingMJ, virtualEnergyAvgPerLapMJ, virtualEnergyLastLapMJ, car, lapNumber } = telemetry;

  const [targetStintLaps, setTargetStintLaps] = useState<number>(14);
  const [raceDurationMinutes, setRaceDurationMinutes] = useState<number>(360); // 6 Hours default
  const [customLapTimeSec, setCustomLapTimeSec] = useState<number>(Math.round(telemetry.track.typicalLapTimeSeconds || 205));

  // Calculated values
  const fuelCapacity = car.fuelTankCapacityLiters || 90;
  const veCapacity = car.virtualEnergyCapacityMJ || 910;

  const requiredFuelForStint = (targetStintLaps * fuelAvgPerLapLiters).toFixed(1);
  const requiredVEForStint = (targetStintLaps * virtualEnergyAvgPerLapMJ).toFixed(1);

  // Remaining stint laps
  const fuelStintLaps = (fuelRemainingLiters / (fuelAvgPerLapLiters || 1)).toFixed(1);
  const veStintLaps = (virtualEnergyRemainingMJ / (virtualEnergyAvgPerLapMJ || 1)).toFixed(1);
  const bottleneck = Number(fuelStintLaps) < Number(veStintLaps) ? 'FUEL' : 'VIRTUAL_ENERGY';

  // Full race pit calculations
  const totalRaceLaps = Math.ceil((raceDurationMinutes * 60) / customLapTimeSec);
  const totalRaceFuelNeeded = Math.ceil(totalRaceLaps * fuelAvgPerLapLiters);
  const totalRaceVENeeded = Math.ceil(totalRaceLaps * virtualEnergyAvgPerLapMJ);
  
  const pitStopsNeeded = Math.ceil(totalRaceLaps / Math.min(Number(fuelStintLaps) || 12, 14)) - 1;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fuel Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Gasoline Fuel Tank</h3>
                <p className="text-xs text-slate-400">Max Tank Capacity: {fuelCapacity} Liters</p>
              </div>
            </div>
            <span className="text-2xl font-black font-mono text-amber-400">
              {((fuelRemainingLiters / fuelCapacity) * 100).toFixed(0)}%
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-mono">
              <span>{fuelRemainingLiters} Liters Remaining</span>
              <span>Capacity: {fuelCapacity} L</span>
            </div>
            <div className="h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300 shadow-lg shadow-amber-500/30"
                style={{ width: `${(fuelRemainingLiters / fuelCapacity) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Avg Fuel / Lap</span>
              <span className="text-base font-bold text-white">{fuelAvgPerLapLiters} L</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Last Lap Fuel</span>
              <span className="text-base font-bold text-amber-400">{fuelLastLapLiters} L</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Estimated Fuel Stint Laps:</span>
            <span className="text-amber-400 font-bold font-mono text-sm">{fuelStintLaps} Laps</span>
          </div>
        </div>

        {/* Virtual Energy Card (LMU Hypercars / LMGT3) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Virtual Energy (VE)</h3>
                <p className="text-xs text-slate-400">Max Stint VE Capacity: {veCapacity} MJ</p>
              </div>
            </div>
            <span className="text-2xl font-black font-mono text-sky-400">
              {((virtualEnergyRemainingMJ / veCapacity) * 100).toFixed(0)}%
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-mono">
              <span>{virtualEnergyRemainingMJ} MJ Remaining</span>
              <span>Capacity: {veCapacity} MJ</span>
            </div>
            <div className="h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-300 shadow-lg shadow-sky-500/30"
                style={{ width: `${(virtualEnergyRemainingMJ / veCapacity) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Avg VE / Lap</span>
              <span className="text-base font-bold text-white">{virtualEnergyAvgPerLapMJ} MJ</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Last Lap VE</span>
              <span className="text-base font-bold text-sky-400">{virtualEnergyLastLapMJ} MJ</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Estimated VE Stint Laps:</span>
            <span className="text-sky-400 font-bold font-mono text-sm">{veStintLaps} Laps</span>
          </div>
        </div>
      </div>

      {/* Bottleneck Warning / Pit Window Indicator */}
      <div className={`p-4 rounded-2xl border ${
        bottleneck === 'FUEL' 
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
          : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
      } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block">
              Stint Limiter: {bottleneck === 'FUEL' ? 'Gasoline Fuel' : 'Virtual Energy'}
            </span>
            <p className="opacity-90">
              You will run out of {bottleneck === 'FUEL' ? 'Fuel' : 'Virtual Energy'} first on Lap {lapNumber + Math.floor(Math.min(Number(fuelStintLaps), Number(veStintLaps)))}.
            </p>
          </div>
        </div>
        <span className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 font-mono font-bold text-white whitespace-nowrap">
          PIT WINDOW: Laps {lapNumber + Math.floor(Math.min(Number(fuelStintLaps), Number(veStintLaps))) - 2} - {lapNumber + Math.floor(Math.min(Number(fuelStintLaps), Number(veStintLaps)))}
        </span>
      </div>

      {/* Pit Stop Calculator Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 font-bold text-base text-white">
            <Calculator className="w-5 h-5 text-amber-400" />
            <span>Pit Stop & Fuel / Virtual Energy Refill Target Calculator</span>
          </div>
          <span className="text-xs text-slate-400">LMU Race Engineer Tool</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls column */}
          <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Target Stint Length (Laps)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={targetStintLaps}
                onChange={(e) => setTargetStintLaps(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Total Race Duration (Minutes)</label>
              <input
                type="number"
                step={30}
                min={30}
                max={1440}
                value={raceDurationMinutes}
                onChange={(e) => setRaceDurationMinutes(Math.max(30, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-slate-500 font-mono block">({raceDurationMinutes / 60} Hours)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Avg Lap Time (Seconds)</label>
              <input
                type="number"
                value={customLapTimeSec}
                onChange={(e) => setCustomLapTimeSec(Math.max(60, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Results column 1 */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs">
            <h4 className="font-bold text-amber-400 text-xs tracking-wider uppercase border-b border-slate-800 pb-2">
              Requirements for {targetStintLaps} Lap Stint
            </h4>

            <div className="flex justify-between py-1.5 border-b border-slate-900">
              <span className="text-slate-400">Required Fuel:</span>
              <span className="text-white font-bold">{requiredFuelForStint} L</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-900">
              <span className="text-slate-400">Required Virtual Energy:</span>
              <span className="text-sky-400 font-bold">{requiredVEForStint} MJ</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-900">
              <span className="text-slate-400">Pit Stop Refill Fuel:</span>
              <span className="text-amber-400 font-bold">
                +{Math.max(0, Number(requiredFuelForStint) - fuelRemainingLiters).toFixed(1)} L
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Pit Stop Refill VE:</span>
              <span className="text-sky-400 font-bold">
                +{Math.max(0, Number(requiredVEForStint) - virtualEnergyRemainingMJ).toFixed(1)} MJ
              </span>
            </div>
          </div>

          {/* Results column 2 */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs">
            <h4 className="font-bold text-sky-400 text-xs tracking-wider uppercase border-b border-slate-800 pb-2">
              Full {raceDurationMinutes / 60}H Race Overview
            </h4>

            <div className="flex justify-between py-1.5 border-b border-slate-900">
              <span className="text-slate-400">Total Estimated Laps:</span>
              <span className="text-white font-bold">{totalRaceLaps} Laps</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-900">
              <span className="text-slate-400">Total Race Fuel:</span>
              <span className="text-white font-bold">{totalRaceFuelNeeded} L</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-900">
              <span className="text-slate-400">Total Race VE:</span>
              <span className="text-sky-400 font-bold">{totalRaceVENeeded} MJ</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Min Pit Stops Needed:</span>
              <span className="text-emerald-400 font-bold">{pitStopsNeeded} Stops</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
