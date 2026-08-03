import React, { useState, useMemo } from 'react';
import { TelemetryFrame, TrackInfo } from '../types';
import { extractCornerMetrics, CornerAnalysis } from '../lib/coachingEngine';
import {
  calculateLiftAndCoastRecommendations,
  calculateHypercarHybridDeployment,
  LiftAndCoastRecommendation,
} from '../lib/bopOptimizer';
import { CanvasTracePlotter } from './common/CanvasTracePlotter';
import { MetricCard } from './common/MetricCard';
import { StatBadge } from './common/StatBadge';
import {
  Compass,
  Zap,
  Target,
  Gauge,
  Sliders,
  Award,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface DriverCoachingLabProps {
  telemetry: TelemetryFrame;
  rawTraceData?: any[];
}

export const DriverCoachingLab: React.FC<DriverCoachingLabProps> = ({
  telemetry,
  rawTraceData = [],
}) => {
  const [coastingMeters, setCoastingMeters] = useState<number>(150);
  const [selectedCornerId, setSelectedCornerId] = useState<number | null>(null);

  // Extract corner analytics
  const cornerMetrics = useMemo(() => {
    return extractCornerMetrics(rawTraceData, telemetry?.track?.lengthMeters ?? 13626);
  }, [rawTraceData, telemetry?.track?.lengthMeters]);

  // Selected corner object
  const selectedCorner = useMemo(() => {
    if (!cornerMetrics.length) return null;
    return selectedCornerId !== null
      ? cornerMetrics.find((c) => c.cornerId === selectedCornerId) || cornerMetrics[0]
      : cornerMetrics[0];
  }, [cornerMetrics, selectedCornerId]);

  // Lift & Coast Recommendations
  const liftCoastRecs = useMemo(() => {
    return calculateLiftAndCoastRecommendations(telemetry?.track?.lengthMeters ?? 13626, coastingMeters);
  }, [telemetry?.track?.lengthMeters, coastingMeters]);

  // Aggregate Lift & Coast Totals per lap
  const aggregateLiftCoast = useMemo(() => {
    const totalVeSaved = liftCoastRecs.reduce((acc, r) => acc + r.virtualEnergySavedMJPerLap, 0);
    const totalFuelSaved = liftCoastRecs.reduce((acc, r) => acc + r.fuelSavedLitersPerLap, 0);
    const totalTimePenalty = liftCoastRecs.reduce((acc, r) => acc + r.lapTimePenaltySecPerLap, 0);

    return {
      totalVeSavedMJ: Number(totalVeSaved.toFixed(2)),
      totalFuelSavedLiters: Number(totalFuelSaved.toFixed(2)),
      totalTimePenaltySec: Number(totalTimePenalty.toFixed(3)),
    };
  }, [liftCoastRecs]);

  // Hybrid Deployment Status
  const hybridStatus = useMemo(() => {
    return calculateHypercarHybridDeployment(
      telemetry?.speedKmh ?? 0,
      (telemetry?.inputs?.throttle ?? 0) * 100,
      telemetry?.car?.class ?? 'Hypercar',
      telemetry?.electronics?.stateOfChargePercent ?? 85
    );
  }, [
    telemetry?.speedKmh,
    telemetry?.inputs?.throttle,
    telemetry?.car?.class,
    telemetry?.electronics?.stateOfChargePercent,
  ]);

  // Total corner time lost across all detected corners
  const totalCornerTimeLostSec = useMemo(() => {
    return Number(cornerMetrics.reduce((acc, c) => acc + c.timeDeltaLostSec, 0).toFixed(3));
  }, [cornerMetrics]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Driver Coaching & BoP Virtual Energy Lab
            </h2>
            <StatBadge label="FIA BoP Compliant" variant="emerald" icon={CheckCircle2} />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            Corner-by-corner braking delta extraction, ghost lap overlays & Le Mans Virtual Energy optimization
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">CORNER DELTA LOST</span>
            <span className="text-amber-400 font-black text-base">+{totalCornerTimeLostSec}s / lap</span>
          </div>
          <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">VE REGEN POTENTIAL</span>
            <span className="text-emerald-400 font-black text-base">
              +{aggregateLiftCoast.totalVeSavedMJ} MJ / lap
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: CORNER-BY-CORNER BRAKE POINT & APEX ANALYSIS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Corner-by-Corner Telemetry Extraction</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Detected {cornerMetrics.length} Sector Corners ({telemetry.track.name})
          </span>
        </div>

        {/* Selected Corner Deep Dive Card */}
        {selectedCorner && (
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
              <span className="text-xs font-mono text-amber-400 font-bold block mb-1 uppercase">
                Selected Focus
              </span>
              <h4 className="text-2xl font-black text-white font-mono">{selectedCorner.cornerName}</h4>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Apex Marker: {selectedCorner.apexDistanceMeter}m
              </p>
              <div className="mt-3 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-xs font-mono text-amber-300">
                <span className="font-bold block mb-0.5">ENGINEER ADVICE:</span>
                {selectedCorner.coachingTip}
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                title="Braking Point"
                value={`${selectedCorner.driverBrakePointMeter}m`}
                unit={`Ref: ${selectedCorner.benchmarkBrakePointMeter}m`}
                subtitle={`Delta: ${selectedCorner.brakeDistanceDeltaMeter > 0 ? '+' : ''}${selectedCorner.brakeDistanceDeltaMeter}m`}
                badge={selectedCorner.brakeDistanceDeltaMeter > 8 ? 'LATE' : selectedCorner.brakeDistanceDeltaMeter < -8 ? 'EARLY' : 'OPTIMAL'}
                badgeColorClass={selectedCorner.brakeDistanceDeltaMeter > 8 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}
              />
              <MetricCard
                title="Apex Min Speed"
                value={`${selectedCorner.driverApexSpeedKmh} km/h`}
                unit={`Ref: ${selectedCorner.benchmarkApexSpeedKmh}`}
                subtitle={`Delta: ${selectedCorner.apexSpeedDeltaKmh > 0 ? '+' : ''}${selectedCorner.apexSpeedDeltaKmh} km/h`}
                icon={Gauge}
                highlighted={selectedCorner.apexSpeedDeltaKmh < -3}
              />
              <MetricCard
                title="Throttle Pickup"
                value={`${selectedCorner.driverThrottlePointMeter}m`}
                unit={`Ref: ${selectedCorner.benchmarkThrottlePointMeter}m`}
                subtitle={`Delta: ${selectedCorner.throttleDistanceDeltaMeter > 0 ? '+' : ''}${selectedCorner.throttleDistanceDeltaMeter}m`}
                badge={selectedCorner.throttleDistanceDeltaMeter > 5 ? 'DELAYED' : 'ON TIME'}
                badgeColorClass="bg-sky-500/20 text-sky-400 border-sky-500/30"
              />
              <MetricCard
                title="Apex Min Gear"
                value={`G${selectedCorner.driverMinGear}`}
                unit={`Ref: G${selectedCorner.benchmarkMinGear}`}
                subtitle={`Est Time Lost: +${selectedCorner.timeDeltaLostSec}s`}
                icon={TrendingDown}
                iconColorClass="text-red-400"
              />
            </div>
          </div>
        )}

        {/* Corners Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
                  <th className="py-3 px-4">Corner</th>
                  <th className="py-3 px-4">Driver Brake Pt</th>
                  <th className="py-3 px-4">Ghost Ref Brake</th>
                  <th className="py-3 px-4">Brake Delta</th>
                  <th className="py-3 px-4">Driver Apex Speed</th>
                  <th className="py-3 px-4">Ghost Apex Speed</th>
                  <th className="py-3 px-4">Apex Delta</th>
                  <th className="py-3 px-4">Throttle Pickup</th>
                  <th className="py-3 px-4">Time Delta</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {cornerMetrics.map((c) => {
                  const isSelected = selectedCorner?.cornerId === c.cornerId;
                  return (
                    <tr
                      key={c.cornerId}
                      onClick={() => setSelectedCornerId(c.cornerId)}
                      className={`cursor-pointer transition hover:bg-slate-800/60 ${
                        isSelected ? 'bg-amber-500/10 text-white font-bold' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-amber-400">{c.cornerName}</td>
                      <td className="py-3 px-4">{c.driverBrakePointMeter}m</td>
                      <td className="py-3 px-4 text-slate-400">{c.benchmarkBrakePointMeter}m</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            c.brakeDistanceDeltaMeter > 6
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : c.brakeDistanceDeltaMeter < -6
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {c.brakeDistanceDeltaMeter > 0 ? '+' : ''}
                          {c.brakeDistanceDeltaMeter}m
                        </span>
                      </td>
                      <td className="py-3 px-4">{c.driverApexSpeedKmh} km/h</td>
                      <td className="py-3 px-4 text-slate-400">{c.benchmarkApexSpeedKmh} km/h</td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            c.apexSpeedDeltaKmh < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'
                          }
                        >
                          {c.apexSpeedDeltaKmh > 0 ? '+' : ''}
                          {c.apexSpeedDeltaKmh} km/h
                        </span>
                      </td>
                      <td className="py-3 px-4">{c.driverThrottlePointMeter}m</td>
                      <td className="py-3 px-4">
                        <span className={c.timeDeltaLostSec > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                          +{c.timeDeltaLostSec}s
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCornerId(c.cornerId);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg text-[11px] transition font-bold"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: GHOST LAP TELEMETRY OVERLAY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white">Ghost Lap Telemetry Trace Overlay</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Solid = Driver Lap | Dashed Sky = Benchmark Ghost Lap
          </span>
        </div>

        <CanvasTracePlotter
          data={rawTraceData}
          primaryChannel="speedCurrent"
          secondaryChannel="speedBest"
          title="Speed & Braking Delta vs Reference Ghost Lap"
          height={260}
        />
      </div>

      {/* SECTION 3: BoP & VIRTUAL ENERGY ALLOCATION OPTIMIZER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lift-and-Coast Advisor (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Lift-and-Coast Energy Optimizer</h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Calculate Virtual Energy regen and fuel savings vs lap time penalty
              </p>
            </div>

            <StatBadge
              label={`Efficiency: ${aggregateLiftCoast.totalVeSavedMJ > 0 ? (aggregateLiftCoast.totalVeSavedMJ / Math.max(0.01, aggregateLiftCoast.totalTimePenaltySec)).toFixed(1) : 0} MJ / sec`}
              variant="emerald"
            />
          </div>

          {/* Slider Control */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                Coasting Distance Before Braking Zone:
              </span>
              <span className="text-amber-400 font-black text-sm">{coastingMeters} Meters</span>
            </div>
            <input
              type="range"
              min="0"
              max="350"
              step="10"
              value={coastingMeters}
              onChange={(e) => setCoastingMeters(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0m (Full Attack)</span>
              <span>150m (Balanced BoP)</span>
              <span>350m (Heavy Saving)</span>
            </div>
          </div>

          {/* Aggregated Impact Grid */}
          <div className="grid grid-cols-3 gap-3 font-mono">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Virtual Energy Saved</span>
              <span className="text-lg font-black text-emerald-400">+{aggregateLiftCoast.totalVeSavedMJ} MJ</span>
              <span className="text-[10px] text-slate-500 block">Per Lap</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Fuel Regenerated</span>
              <span className="text-lg font-black text-sky-400">+{aggregateLiftCoast.totalFuelSavedLiters} L</span>
              <span className="text-[10px] text-slate-500 block">Per Lap</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Lap Time Penalty</span>
              <span className="text-lg font-black text-amber-400">+{aggregateLiftCoast.totalTimePenaltySec}s</span>
              <span className="text-[10px] text-slate-500 block">Minimal Loss</span>
            </div>
          </div>

          {/* Straights Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 uppercase font-bold block">
              Circuit Straights Marker Guide
            </span>
            <div className="space-y-2">
              {liftCoastRecs.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                >
                  <div>
                    <span className="text-white font-bold block">{rec.straightName}</span>
                    <span className="text-slate-400 text-[11px]">
                      Recommended Lift Marker:{' '}
                      <strong className="text-amber-400">{rec.suggestedLiftMarkerMeter}m</strong> ({rec.coastingDistanceMeter}m before braking)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">+{rec.virtualEnergySavedMJPerLap} MJ</span>
                    <span className="text-amber-400 font-bold">+{rec.lapTimePenaltySecPerLap}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hypercar Hybrid Deployment Mapping (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Hypercar Hybrid MGU-K</h3>
              </div>
              <StatBadge label="FIA 190km/h Rule" variant="purple" />
            </div>

            {/* Live FIA Compliance Badge */}
            <div
              className={`p-3 rounded-xl border text-xs font-mono mb-4 flex items-center gap-2.5 ${
                hybridStatus.isFIAHybridActive
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {hybridStatus.isFIAHybridActive ? (
                <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-slate-500" />
              )}
              <div>
                <span className="font-bold block">
                  {hybridStatus.isFIAHybridActive ? 'MGU-K ELECTRIC DEPLOYED' : 'ICE COMBUSTION ONLY'}
                </span>
                <span className="text-[10px] block opacity-80">
                  Speed: {hybridStatus.currentSpeedKmh} km/h (Rule Limit: 190 km/h)
                </span>
              </div>
            </div>

            {/* Power Split Bars */}
            <div className="space-y-4 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">ICE Combustion Power</span>
                  <span className="text-white font-bold">{hybridStatus.icePowerKw} kW</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${(hybridStatus.icePowerKw / hybridStatus.maxPowerCapKw) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Electric MGU-K Assist</span>
                  <span className="text-purple-400 font-bold">{hybridStatus.electricMotorPowerKw} kW</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-purple-500 h-full transition-all duration-300"
                    style={{ width: `${(hybridStatus.electricMotorPowerKw / 200) * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Total Combined BoP Output</span>
                <span className="text-emerald-400 font-black text-base">
                  {hybridStatus.totalPowerKw} / {hybridStatus.maxPowerCapKw} kW
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>
              FIA WEC Article 3.2: Hypercar front-axle electric deployment permitted exclusively above 190 km/h.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
