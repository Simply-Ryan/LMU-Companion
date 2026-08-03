import React from 'react';
import { Sliders, Sun, CloudRain, RotateCcw, Zap, Fuel, AlertOctagon } from 'lucide-react';

interface SimulatorControlsProps {
  onRefillEnergy: () => void;
  onSetWeather: (weather: 'DRY' | 'GREASY' | 'DAMP' | 'WET' | 'HEAVY_RAIN') => void;
  currentWeather: string;
  onTriggerLowFuel: () => void;
  onClose: () => void;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  onRefillEnergy,
  onSetWeather,
  currentWeather,
  onTriggerLowFuel,
  onClose,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-3 text-slate-100 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 font-bold text-amber-400">
          <Sliders className="w-4 h-4" />
          <span>Telemetry Simulator Sandbox Tweaks</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
        >
          Hide
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Refill Fuel & Energy */}
        <button
          onClick={onRefillEnergy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl font-bold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Pit Stop Refill (100% Fuel & VE)
        </button>

        {/* Low Fuel Trigger Test */}
        <button
          onClick={onTriggerLowFuel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-xl font-bold transition"
        >
          <AlertOctagon className="w-3.5 h-3.5" /> Simulate Low Energy Alert
        </button>

        {/* Weather Presets */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-semibold px-2">Weather:</span>
          <button
            onClick={() => onSetWeather('DRY')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              currentWeather === 'DRY'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5 inline mr-1" /> Dry
          </button>
          <button
            onClick={() => onSetWeather('DAMP')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              currentWeather === 'DAMP'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Damp
          </button>
          <button
            onClick={() => onSetWeather('WET')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              currentWeather === 'WET'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 inline mr-1" /> Rain
          </button>
        </div>
      </div>
    </div>
  );
};
