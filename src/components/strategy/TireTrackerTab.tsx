import React from 'react';
import { Disc } from 'lucide-react';
import { PhysicalTireSet } from '../PitStrategyPlanner';

interface TireTrackerTabProps {
  tireSets: PhysicalTireSet[];
  setTireSets: React.Dispatch<React.SetStateAction<PhysicalTireSet[]>>;
  handleUpdateTireSet: (id: number, field: keyof PhysicalTireSet, value: any) => void;
}

export const TireTrackerTab: React.FC<TireTrackerTabProps> = ({
  tireSets,
  setTireSets,
  handleUpdateTireSet,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Disc className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Multi-Stint Tire Allocation Tracker</h3>
            <p className="text-xs text-slate-400">
              Track physical tire set usage across practice, qualifying & race stints
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const newId = tireSets.length + 1;
            setTireSets((prev) => [
              ...prev,
              {
                id: newId,
                setName: `Set #${newId}`,
                compound: 'Medium',
                status: 'New',
                wearPercent: 100,
                stintsCompleted: 0,
              },
            ]);
          }}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition"
        >
          + Allocate New Set
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tireSets.map((s) => (
          <div key={s.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-bold text-white text-sm">{s.setName}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  s.status === 'New'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : s.status === 'Scuffed'
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                    : s.status === 'Used'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                }`}
              >
                {s.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>COMPOUND:</span>
                <select
                  value={s.compound}
                  onChange={(e) => handleUpdateTireSet(s.id, 'compound', e.target.value)}
                  className="bg-slate-900 text-amber-400 border border-slate-800 rounded px-1 py-0.5 font-bold"
                >
                  <option value="Soft">Soft Slick</option>
                  <option value="Medium">Medium Slick</option>
                  <option value="Hard">Hard Slick</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Wet">Full Wet</option>
                </select>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>LIFE REMAINING:</span>
                <strong className="text-white">{s.wearPercent}%</strong>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all ${
                    s.wearPercent > 60
                      ? 'bg-emerald-500'
                      : s.wearPercent > 30
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${s.wearPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>STINTS RUN:</span>
                <span className="font-bold text-sky-400">{s.stintsCompleted} Stint(s)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
