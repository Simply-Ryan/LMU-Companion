import React from 'react';
import { Flag } from 'lucide-react';

interface StintScheduleItem {
  stintNumber: number;
  startLap: number;
  endLap: number;
  stintLaps: number;
  fuelNeededLiters: string;
  veNeededMJ: string;
  assignedTireSet: number;
  stintType: string;
  estimatedPitDurationSec: number;
  localTrackTemp: number;
  isNight: boolean;
  hourOfDay: string;
}

interface ScheduleTabProps {
  stintsSchedule: StintScheduleItem[];
  currentTrackName: string;
  totalStints: number;
  raceDurationHours: number;
  totalLaps: number;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  stintsSchedule,
  currentTrackName,
  totalStints,
  raceDurationHours,
  totalLaps,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-base text-white">
            Race Stint Timeline — {currentTrackName}
          </h3>
        </div>
        <span className="text-slate-400">
          {totalStints} Stints ({raceDurationHours} Hours / {totalLaps} Laps)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3">Stint</th>
              <th className="py-3 px-3">Time Window</th>
              <th className="py-3 px-3">Lap Window</th>
              <th className="py-3 px-3">Refill Fuel</th>
              <th className="py-3 px-3">Refill VE</th>
              <th className="py-3 px-3">Track Temp</th>
              <th className="py-3 px-3">Assigned Tire Set</th>
              <th className="py-3 px-3">Tire Strategy</th>
              <th className="py-3 px-3">Pit Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {stintsSchedule.map((s) => (
              <tr key={s.stintNumber} className="hover:bg-slate-800/40 transition">
                <td className="py-3 px-3 font-bold text-amber-400">Stint {s.stintNumber}</td>
                <td className="py-3 px-3">
                  <span className="flex items-center gap-1.5">
                    {s.isNight ? '🌙' : '☀️'} {s.hourOfDay}
                  </span>
                </td>
                <td className="py-3 px-3 font-bold text-white">
                  Laps {s.startLap} - {s.endLap} ({s.stintLaps}L)
                </td>
                <td className="py-3 px-3 text-emerald-400 font-bold">{s.fuelNeededLiters} L</td>
                <td className="py-3 px-3 text-sky-400 font-bold">{s.veNeededMJ} MJ</td>
                <td className="py-3 px-3 text-amber-300">{s.localTrackTemp}°C</td>
                <td className="py-3 px-3 font-bold text-purple-300">Set #{s.assignedTireSet}</td>
                <td className="py-3 px-3">
                  {s.stintType === 'Fresh Tire' ? (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold text-[10px]">
                      Fresh Set
                    </span>
                  ) : s.stintType === 'Double Stint' ? (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold text-[10px]">
                      Double Stint
                    </span>
                  ) : (
                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded font-bold text-[10px]">
                      Triple Stint
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 font-bold text-white">{s.estimatedPitDurationSec}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
