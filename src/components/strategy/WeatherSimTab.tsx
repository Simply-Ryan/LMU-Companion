import React from 'react';
import { CloudRain } from 'lucide-react';

interface WeatherSimTabProps {
  rainIntensityMm: number;
  setRainIntensityMm: (val: number) => void;
  trackTempC: number;
  setTrackTempC: (val: number) => void;
  rubberLevel: 'GREEN' | 'EVOLVING' | 'HEAVY' | 'WASHED';
  setRubberLevel: (val: 'GREEN' | 'EVOLVING' | 'HEAVY' | 'WASHED') => void;
  weatherMultipliers: {
    effectiveLapSec: number;
    lapTimeDeltaSec: number;
    fuelPerLap: number;
    vePerLap: number;
    recommendedCompound: string;
  };
}

export const WeatherSimTab: React.FC<WeatherSimTabProps> = ({
  rainIntensityMm,
  setRainIntensityMm,
  trackTempC,
  setTrackTempC,
  rubberLevel,
  setRubberLevel,
  weatherMultipliers,
}) => {
  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Weather & Track Surface Condition Modeling
              </h3>
              <p className="text-xs text-slate-400">
                Model track temperature shifts, rubber evolution, and rain intensity on lap times & consumption
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="text-slate-300 font-semibold block flex justify-between">
              <span>RAIN INTENSITY:</span>
              <strong className="text-sky-400">
                {rainIntensityMm === 0
                  ? '0mm (DRY)'
                  : rainIntensityMm <= 3
                  ? `${rainIntensityMm}mm (DAMP / GREASY)`
                  : rainIntensityMm <= 8
                  ? `${rainIntensityMm}mm (WET)`
                  : `${rainIntensityMm}mm (TORRENTIAL)`}
              </strong>
            </label>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={rainIntensityMm}
              onChange={(e) => setRainIntensityMm(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="text-slate-300 font-semibold block flex justify-between">
              <span>TRACK TEMP (°C):</span>
              <strong className="text-amber-400">{trackTempC}°C</strong>
            </label>
            <input
              type="range"
              min={10}
              max={55}
              step={1}
              value={trackTempC}
              onChange={(e) => setTrackTempC(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="text-slate-300 font-semibold block">TRACK RUBBER EVOLUTION:</label>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {[
                { id: 'GREEN', label: 'Green Track' },
                { id: 'EVOLVING', label: 'Evolving' },
                { id: 'HEAVY', label: 'Heavy Rubber' },
                { id: 'WASHED', label: 'Wet Washed' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRubberLevel(r.id as any)}
                  className={`p-1.5 rounded-lg border font-bold transition ${
                    rubberLevel === r.id
                      ? 'bg-amber-500 border-amber-400 text-slate-950'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px]">EFFECTIVE LAP TIME</span>
            <span className="text-xl font-bold text-white">
              {Math.floor(weatherMultipliers.effectiveLapSec / 60)}m{' '}
              {(weatherMultipliers.effectiveLapSec % 60).toFixed(1)}s
            </span>
            <span className="text-[10px] text-amber-400 block">
              Delta: +{weatherMultipliers.lapTimeDeltaSec.toFixed(1)}s / lap
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px]">FUEL BURN / LAP</span>
            <span className="text-xl font-bold text-emerald-400">
              {weatherMultipliers.fuelPerLap.toFixed(2)} L
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px]">VIRTUAL ENERGY / LAP</span>
            <span className="text-xl font-bold text-sky-400">
              {weatherMultipliers.vePerLap.toFixed(2)} MJ
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px]">RECOMMENDED COMPOUND</span>
            <span className="text-xl font-bold text-purple-400">
              {weatherMultipliers.recommendedCompound}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
