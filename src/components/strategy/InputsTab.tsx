import React from 'react';
import { Sliders, MapPin, Fuel, Zap, Clock } from 'lucide-react';
import { CarClass } from '../../types';

interface InputsTabProps {
  selectedTrackId: string;
  customTrackName: string;
  setCustomTrackName: (val: string) => void;
  customTrackLengthMeters: number;
  setCustomTrackLengthMeters: (val: number) => void;
  targetLapTimeSec: number;
  setTargetLapTimeSec: (val: number) => void;
  carClass: CarClass;
  setCarClass: (val: CarClass) => void;
  fuelTankCapacityLiters: number;
  setFuelTankCapacityLiters: (val: number) => void;
  fuelPerLapLiters: number;
  setFuelPerLapLiters: (val: number) => void;
  virtualEnergyCapacityMJ: number;
  setVirtualEnergyCapacityMJ: (val: number) => void;
  vePerLapMJ: number;
  setVePerLapMJ: (val: number) => void;
  fuelVERatio: string;
  pitLaneBaseLossSec: number;
  setPitLaneBaseLossSec: (val: number) => void;
  refuelRateLitersPerSec: number;
  setRefuelRateLitersPerSec: (val: number) => void;
  tireChangeTimeSec: number;
  setTireChangeTimeSec: (val: number) => void;
}

export const InputsTab: React.FC<InputsTabProps> = ({
  selectedTrackId,
  customTrackName,
  setCustomTrackName,
  customTrackLengthMeters,
  setCustomTrackLengthMeters,
  targetLapTimeSec,
  setTargetLapTimeSec,
  carClass,
  setCarClass,
  fuelTankCapacityLiters,
  setFuelTankCapacityLiters,
  fuelPerLapLiters,
  setFuelPerLapLiters,
  virtualEnergyCapacityMJ,
  setVirtualEnergyCapacityMJ,
  vePerLapMJ,
  setVePerLapMJ,
  fuelVERatio,
  pitLaneBaseLossSec,
  setPitLaneBaseLossSec,
  refuelRateLitersPerSec,
  setRefuelRateLitersPerSec,
  tireChangeTimeSec,
  setTireChangeTimeSec,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Detailed Endurance Parameters & Technical Inputs</h3>
            <p className="text-xs text-slate-400">
              Configure custom track parameters, fuel tank specs, Virtual Energy BoP allocation limits, and pit lane loss
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Custom Track Details */}
        {selectedTrackId === 'custom' && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 col-span-1 md:col-span-2 lg:col-span-3">
            <h4 className="font-bold text-amber-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Custom Circuit Configuration
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">Circuit Name:</label>
                <input
                  type="text"
                  value={customTrackName}
                  onChange={(e) => setCustomTrackName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded p-2"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Track Length (Meters):</label>
                <input
                  type="number"
                  value={customTrackLengthMeters}
                  onChange={(e) => setCustomTrackLengthMeters(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-bold rounded p-2"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Typical Lap Time (Seconds):</label>
                <input
                  type="number"
                  step="0.1"
                  value={targetLapTimeSec}
                  onChange={(e) => setTargetLapTimeSec(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded p-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Car Class & Fuel Capacity */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <h4 className="font-bold text-emerald-400 flex items-center gap-2">
            <Fuel className="w-4 h-4" /> Fuel & Tank Capacity
          </h4>
          <div className="space-y-2">
            <div>
              <label className="text-slate-400 block mb-1">Car Class:</label>
              <select
                value={carClass}
                onChange={(e) => setCarClass(e.target.value as CarClass)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1.5 font-bold"
              >
                <option value="Hypercar">Hypercar (LMH / LMDh)</option>
                <option value="LMGT3">LMGT3 (GT3 Spec)</option>
                <option value="LMP2">LMP2 (Le Mans Spec)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Fuel Tank Capacity (Liters):</label>
              <input
                type="number"
                value={fuelTankCapacityLiters}
                onChange={(e) => setFuelTankCapacityLiters(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-bold rounded p-1.5"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Fuel Burn / Lap (Liters):</label>
              <input
                type="number"
                step="0.05"
                value={fuelPerLapLiters}
                onChange={(e) => setFuelPerLapLiters(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-bold rounded p-1.5"
              />
            </div>
          </div>
        </div>

        {/* Virtual Energy BoP Specs */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <h4 className="font-bold text-sky-400 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Virtual Energy Allocation (FIA BoP)
          </h4>
          <div className="space-y-2">
            <div>
              <label className="text-slate-400 block mb-1">Virtual Energy Limit / Stint (MJ):</label>
              <input
                type="number"
                value={virtualEnergyCapacityMJ}
                onChange={(e) => setVirtualEnergyCapacityMJ(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 text-sky-400 font-bold rounded p-1.5"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Virtual Energy Burn / Lap (MJ):</label>
              <input
                type="number"
                step="0.5"
                value={vePerLapMJ}
                onChange={(e) => setVePerLapMJ(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 text-sky-400 font-bold rounded p-1.5"
              />
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-400">
              Virtual Energy / Fuel Ratio:{' '}
              <strong className="text-white font-mono">{fuelVERatio} MJ / Liter</strong>
            </div>
          </div>
        </div>

        {/* Pit Stop Loss & Refuel Rate */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <h4 className="font-bold text-purple-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pit Lane Loss & Refuel Speeds
          </h4>
          <div className="space-y-2">
            <div>
              <label className="text-slate-400 block mb-1">Pit Lane In/Out Travel Loss (sec):</label>
              <input
                type="number"
                value={pitLaneBaseLossSec}
                onChange={(e) => setPitLaneBaseLossSec(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded p-1.5"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Refuel Rate (Liters / sec):</label>
              <input
                type="number"
                step="0.1"
                value={refuelRateLitersPerSec}
                onChange={(e) => setRefuelRateLitersPerSec(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-bold rounded p-1.5"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">4-Wheel Tire Change Time (sec):</label>
              <input
                type="number"
                value={tireChangeTimeSec}
                onChange={(e) => setTireChangeTimeSec(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 text-purple-400 font-bold rounded p-1.5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
