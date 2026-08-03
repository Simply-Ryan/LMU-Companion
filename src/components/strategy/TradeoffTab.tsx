import React from 'react';
import { BarChart3, TrendingUp, ShieldCheck } from 'lucide-react';

interface TradeoffTabProps {
  doubleStintTires: boolean;
  setDoubleStintTires: (val: boolean) => void;
  tripleStintTires: boolean;
  setTripleStintTires: (val: boolean) => void;
  tradeoffAnalysis: {
    singleStintPitCount: number;
    doubleStintPitCount: number;
    tripleStintPitCount: number;
    pitTimeSavedDoubleSec: number;
    pitTimeSavedTripleSec: number;
    tireDegPaceDropDoubleSec: number;
    tireDegPaceDropTripleSec: number;
    netDoubleStintBenefitSec: number;
    netTripleStintBenefitSec: number;
    recommendation: string;
  };
}

export const TradeoffTab: React.FC<TradeoffTabProps> = ({
  doubleStintTires,
  setDoubleStintTires,
  tripleStintTires,
  setTripleStintTires,
  tradeoffAnalysis,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">
              Double & Triple Stint Tire Tradeoff Optimizer
            </h3>
            <p className="text-xs text-slate-400">
              Calculate pit time saved vs pace loss from thermal tire degradation over multi-stint runs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={doubleStintTires}
              onChange={(e) => {
                setDoubleStintTires(e.target.checked);
                if (e.target.checked) setTripleStintTires(false);
              }}
              className="accent-amber-500"
            />
            <span>Allow Double Stints</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={tripleStintTires}
              onChange={(e) => {
                setTripleStintTires(e.target.checked);
                if (e.target.checked) setDoubleStintTires(true);
              }}
              className="accent-purple-500"
            />
            <span>Allow Triple Stints</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Double Stint Card */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-bold text-amber-400 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4" /> Double Stinting Strategy
            </h4>
            <span className="text-slate-400 text-[11px]">2 Stints / Set</span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span>Pit Stops Saved:</span>
              <strong className="text-emerald-400">
                {tradeoffAnalysis.singleStintPitCount - tradeoffAnalysis.doubleStintPitCount} Stops
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Time Saved in Pit Lane:</span>
              <strong className="text-emerald-400">
                +{tradeoffAnalysis.pitTimeSavedDoubleSec}s
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Estimated Tire Degradation Pace Loss:</span>
              <strong className="text-rose-400">
                -{tradeoffAnalysis.tireDegPaceDropDoubleSec.toFixed(1)}s
              </strong>
            </div>
            <div className="border-t border-slate-800/80 pt-2 flex justify-between font-bold text-sm">
              <span>NET TIME BENEFIT:</span>
              <span
                className={
                  tradeoffAnalysis.netDoubleStintBenefitSec > 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }
              >
                {tradeoffAnalysis.netDoubleStintBenefitSec > 0 ? '+' : ''}
                {tradeoffAnalysis.netDoubleStintBenefitSec.toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        {/* Triple Stint Card */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-bold text-purple-400 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4" /> Triple Stinting Strategy
            </h4>
            <span className="text-slate-400 text-[11px]">3 Stints / Set</span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span>Pit Stops Saved:</span>
              <strong className="text-purple-400">
                {tradeoffAnalysis.singleStintPitCount - tradeoffAnalysis.tripleStintPitCount} Stops
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Time Saved in Pit Lane:</span>
              <strong className="text-purple-400">
                +{tradeoffAnalysis.pitTimeSavedTripleSec}s
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Estimated Tire Degradation Pace Loss:</span>
              <strong className="text-rose-400">
                -{tradeoffAnalysis.tireDegPaceDropTripleSec.toFixed(1)}s
              </strong>
            </div>
            <div className="border-t border-slate-800/80 pt-2 flex justify-between font-bold text-sm">
              <span>NET TIME BENEFIT:</span>
              <span
                className={
                  tradeoffAnalysis.netTripleStintBenefitSec > 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }
              >
                {tradeoffAnalysis.netTripleStintBenefitSec > 0 ? '+' : ''}
                {tradeoffAnalysis.netTripleStintBenefitSec.toFixed(1)}s
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3 text-amber-300">
        <ShieldCheck className="w-6 h-6 shrink-0 text-amber-400" />
        <div>
          <span className="font-bold block text-white text-xs">OFFICIAL CHIEF STRATEGIST RECOMMENDATION:</span>
          <span>{tradeoffAnalysis.recommendation}</span>
        </div>
      </div>
    </div>
  );
};
