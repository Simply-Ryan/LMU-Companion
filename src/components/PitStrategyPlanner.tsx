import React, { useState, useMemo, useEffect } from 'react';
import { TelemetryFrame, CarClass, LapRecord } from '../types';
import { LMU_TRACKS } from '../data/lmuData';
import { calculateWeatherMultipliers } from '../lib/weatherEngine';
import { generateStintSchedule, calculateTradeoffAnalysis } from '../lib/strategyEngine';
import {
  Calculator,
  Flag,
  Clock,
  Fuel,
  Zap,
  Disc,
  CloudRain,
  BarChart3,
  CheckCircle2,
  Sliders,
  MapPin,
  FileSpreadsheet,
  RefreshCw,
  Gauge,
} from 'lucide-react';
import { ScheduleTab } from './strategy/ScheduleTab';
import { InputsTab } from './strategy/InputsTab';
import { WeatherSimTab } from './strategy/WeatherSimTab';
import { TireTrackerTab } from './strategy/TireTrackerTab';
import { TradeoffTab } from './strategy/TradeoffTab';

interface PitStrategyPlannerProps {
  telemetry: TelemetryFrame;
  uploadedLaps?: LapRecord[];
}

export interface PhysicalTireSet {
  id: number;
  setName: string;
  compound: 'Soft' | 'Medium' | 'Hard' | 'Intermediate' | 'Wet';
  status: 'New' | 'Scuffed' | 'Used' | 'Worn' | 'Expired';
  wearPercent: number;
  stintsCompleted: number;
  assignedStint?: number;
}

export const PitStrategyPlanner: React.FC<PitStrategyPlannerProps> = ({
  telemetry,
  uploadedLaps,
}) => {
  // Navigation Tabs inside Strategy Planner
  const [activeTab, setActiveTab] = useState<'schedule' | 'weather' | 'tireSets' | 'tradeoff' | 'inputs'>('schedule');

  // Selected Circuit State
  const [selectedTrackId, setSelectedTrackId] = useState<string>(telemetry.track.id || 'circuit_de_la_sarthe');
  const [customTrackName, setCustomTrackName] = useState<string>('Custom Circuit');
  const [customTrackLengthMeters, setCustomTrackLengthMeters] = useState<number>(5500);

  // Active Track details derived or custom
  const currentTrackInfo = useMemo(() => {
    if (selectedTrackId === 'custom') {
      return {
        id: 'custom',
        name: customTrackName || 'Custom Endurance Circuit',
        country: 'Global',
        lengthMeters: customTrackLengthMeters,
        typicalLapTimeSeconds: 110,
      };
    }
    const found = LMU_TRACKS.find((t) => t.id === selectedTrackId);
    return found || LMU_TRACKS[0];
  }, [selectedTrackId, customTrackName, customTrackLengthMeters]);

  // Race Event & Duration Settings
  const [raceDurationMode, setRaceDurationMode] = useState<'HOURS' | 'LAPS'>('HOURS');
  const [raceDurationHours, setRaceDurationHours] = useState<number>(24);
  const [raceDurationLapsInput, setRaceDurationLapsInput] = useState<number>(380);
  const [carClass, setCarClass] = useState<CarClass>(telemetry.car.class || 'Hypercar');

  // Pace & Fuel Consumption Inputs
  const [targetLapTimeSec, setTargetLapTimeSec] = useState<number>(() => {
    return telemetry.track.typicalLapTimeSeconds || 205.5;
  });
  const [fuelPerLapLiters, setFuelPerLapLiters] = useState<number>(() => {
    return telemetry.fuelAvgPerLapLiters || 2.85;
  });
  const [vePerLapMJ, setVePerLapMJ] = useState<number>(() => {
    return telemetry.virtualEnergyAvgPerLapMJ || 28.5;
  });

  // Capacities & BoP Limits
  const [fuelTankCapacityLiters, setFuelTankCapacityLiters] = useState<number>(() => {
    return telemetry.car.fuelTankCapacityLiters || 90;
  });
  const [virtualEnergyCapacityMJ, setVirtualEnergyCapacityMJ] = useState<number>(() => {
    return telemetry.car.virtualEnergyCapacityMJ || 910;
  });

  // Strategy & Pit Lane Loss
  const [pitLaneBaseLossSec, setPitLaneBaseLossSec] = useState<number>(22);
  const [refuelRateLitersPerSec, setRefuelRateLitersPerSec] = useState<number>(2.6);
  const [tireChangeTimeSec, setTireChangeTimeSec] = useState<number>(12);
  const [doubleStintTires, setDoubleStintTires] = useState<boolean>(true);
  const [tripleStintTires, setTripleStintTires] = useState<boolean>(false);

  // Weather & Track Simulation State
  const [trackTempC, setTrackTempC] = useState<number>(32);
  const [ambientTempC, setAmbientTempC] = useState<number>(22);
  const [rubberLevel, setRubberLevel] = useState<'GREEN' | 'EVOLVING' | 'HEAVY' | 'WASHED'>('HEAVY');
  const [rainIntensityMm, setRainIntensityMm] = useState<number>(0);

  // Telemetry File Analysis Alert State
  const [telemetryAnalysisNotice, setTelemetryAnalysisNotice] = useState<string | null>(null);

  // Sync circuit default when telemetry or track selection changes
  useEffect(() => {
    if (selectedTrackId !== 'custom') {
      const match = LMU_TRACKS.find((t) => t.id === selectedTrackId);
      if (match) {
        setTargetLapTimeSec(match.typicalLapTimeSeconds);
      }
    }
  }, [selectedTrackId]);

  // Handler to analyze and extract empirical metrics from loaded telemetry file
  const handleAnalyzeUploadedTelemetry = () => {
    let extractedLapCount = 0;
    let avgLap = 0;
    let avgFuel = 0;
    let avgVE = 0;

    if (uploadedLaps && uploadedLaps.length > 0) {
      const validLaps = uploadedLaps.filter((l) => l.lapTimeSeconds > 30);
      if (validLaps.length > 0) {
        extractedLapCount = validLaps.length;
        avgLap = validLaps.reduce((sum, l) => sum + l.lapTimeSeconds, 0) / validLaps.length;
        const fuels = validLaps.filter((l) => l.fuelUsedLiters > 0);
        if (fuels.length > 0) {
          avgFuel = fuels.reduce((sum, l) => sum + l.fuelUsedLiters, 0) / fuels.length;
        }
        const ves = validLaps.filter((l) => l.virtualEnergyUsedMJ > 0);
        if (ves.length > 0) {
          avgVE = ves.reduce((sum, l) => sum + l.virtualEnergyUsedMJ, 0) / ves.length;
        }
      }
    }

    if (extractedLapCount > 0) {
      if (avgLap > 30) setTargetLapTimeSec(Number(avgLap.toFixed(2)));
      if (avgFuel > 0.5) setFuelPerLapLiters(Number(avgFuel.toFixed(2)));
      if (avgVE > 2) setVePerLapMJ(Number(avgVE.toFixed(2)));

      setTelemetryAnalysisNotice(
        `Analyzed ${extractedLapCount} lap(s) from telemetry file: Lap time set to ${Math.floor(
          avgLap / 60
        )}m ${(avgLap % 60).toFixed(1)}s, Fuel/Lap: ${avgFuel.toFixed(2)}L, Virtual Energy/Lap: ${avgVE.toFixed(
          1
        )}MJ.`
      );
    } else {
      setTelemetryAnalysisNotice('No completed lap records found in the current telemetry file to analyze.');
    }
  };

  // Max Laps per stint based on Fuel & VE capacity limits
  const maxLapsByFuel = Math.floor(fuelTankCapacityLiters / Math.max(0.1, fuelPerLapLiters));
  const maxLapsByVE =
    virtualEnergyCapacityMJ > 0
      ? Math.floor(virtualEnergyCapacityMJ / Math.max(0.1, vePerLapMJ))
      : 999;
  const maxLapsPerStintCapacity = Math.max(1, Math.min(maxLapsByFuel, maxLapsByVE));

  // Actual Stint Length selected (defaults to capacity max or user adjusted)
  const [lapsPerStintInput, setLapsPerStintInput] = useState<number>(maxLapsPerStintCapacity);

  // Auto update laps per stint if fuel/VE inputs change and capacity drops
  useEffect(() => {
    setLapsPerStintInput((prev) => Math.min(prev, maxLapsPerStintCapacity));
  }, [maxLapsPerStintCapacity]);

  const lapsPerStint = Math.max(1, lapsPerStintInput);

  // Total Laps in Race
  const totalLaps = useMemo(() => {
    if (raceDurationMode === 'LAPS') return Math.max(1, raceDurationLapsInput);
    return Math.ceil((raceDurationHours * 3600) / Math.max(10, targetLapTimeSec));
  }, [raceDurationMode, raceDurationHours, raceDurationLapsInput, targetLapTimeSec]);

  // Weather & Track Multipliers
  const weatherMultipliers = useMemo(() => {
    return calculateWeatherMultipliers(
      targetLapTimeSec,
      fuelPerLapLiters,
      vePerLapMJ,
      trackTempC,
      rubberLevel,
      rainIntensityMm
    );
  }, [targetLapTimeSec, fuelPerLapLiters, vePerLapMJ, trackTempC, rubberLevel, rainIntensityMm]);

  // Tire Allocation State
  const defaultSetsCount = raceDurationHours >= 24 ? 8 : raceDurationHours >= 12 ? 6 : 4;
  const [tireSets, setTireSets] = useState<PhysicalTireSet[]>(() => {
    return Array.from({ length: defaultSetsCount }, (_, i) => ({
      id: i + 1,
      setName: `Set #${i + 1}`,
      compound: i === 0 ? 'Soft' : 'Medium',
      status: i === 0 ? 'Scuffed' : 'New',
      wearPercent: i === 0 ? 92 : 100,
      stintsCompleted: i === 0 ? 1 : 0,
    }));
  });

  // Derived Stint Totals
  const totalStints = Math.ceil(totalLaps / lapsPerStint);
  const totalPitStops = totalStints - 1;

  // Fuel to Virtual Energy Ratio
  const fuelVERatio = useMemo(() => {
    if (fuelPerLapLiters <= 0) return '0.00';
    return (vePerLapMJ / fuelPerLapLiters).toFixed(2);
  }, [vePerLapMJ, fuelPerLapLiters]);

  // Stint Schedule Array Generation
  const stintsSchedule = useMemo(() => {
    return generateStintSchedule({
      totalLaps,
      lapsPerStint,
      weatherMultipliers,
      raceDurationHours,
      trackTempC,
      tireSetsCount: tireSets.length,
      pitLaneBaseLossSec,
      refuelRateLitersPerSec,
      tireChangeTimeSec,
      doubleStintTires,
      tripleStintTires,
    });
  }, [
    totalLaps,
    lapsPerStint,
    weatherMultipliers,
    raceDurationHours,
    trackTempC,
    tireSets.length,
    pitLaneBaseLossSec,
    refuelRateLitersPerSec,
    tireChangeTimeSec,
    doubleStintTires,
    tripleStintTires,
  ]);

  // Double/Triple Stint Tradeoff Analysis Calculation
  const tradeoffAnalysis = useMemo(() => {
    return calculateTradeoffAnalysis(totalStints, lapsPerStint, tireChangeTimeSec);
  }, [totalStints, lapsPerStint, tireChangeTimeSec]);

  // Handler to update physical tire set details
  const handleUpdateTireSet = (id: number, field: keyof PhysicalTireSet, value: any) => {
    setTireSets((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Primary Header & Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Endurance Race Strategy Planner
                <span className="text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  UNIVERSAL CIRCUIT & TELEMETRY ENGINE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Plan endurance races for any circuit using telemetry file analytics or custom fuel/energy inputs
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'schedule' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flag className="w-4 h-4" /> Stint Schedule
            </button>
            <button
              onClick={() => setActiveTab('inputs')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'inputs' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" /> Circuit & Fuel Inputs
            </button>
            <button
              onClick={() => setActiveTab('weather')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'weather' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CloudRain className="w-4 h-4" /> Weather & Track
            </button>
            <button
              onClick={() => setActiveTab('tireSets')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'tireSets' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Disc className="w-4 h-4" /> Tire Allocation
            </button>
            <button
              onClick={() => setActiveTab('tradeoff')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'tradeoff' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Tradeoff
            </button>
          </div>
        </div>

        {/* Telemetry Sync & Empirical Analysis Banner */}
        {uploadedLaps && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <FileSpreadsheet className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Active Telemetry Dataset Available:</span>
              <span className="text-white font-mono font-semibold">
                {`${uploadedLaps.length} Lap Records`}
              </span>
            </div>
            <button
              onClick={handleAnalyzeUploadedTelemetry}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition flex items-center gap-1.5 font-sans"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Auto-Fill Inputs From Telemetry File
            </button>
          </div>
        )}

        {telemetryAnalysisNotice && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-3 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{telemetryAnalysisNotice}</span>
          </div>
        )}

        {/* Global Key Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Circuit Selection Dropdown */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center justify-between text-[11px]">
              <span>TARGET CIRCUIT</span>
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
            </label>
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-bold rounded-lg p-1.5 text-xs focus:outline-none focus:border-amber-500"
            >
              {LMU_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({(t.lengthMeters / 1000).toFixed(1)}km)
                </option>
              ))}
              <option value="custom">-- Custom Circuit --</option>
            </select>
          </div>

          {/* Race Duration Hours */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center justify-between text-[11px]">
              <span>RACE DURATION</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </label>
            <div className="flex items-center gap-1">
              {[3, 6, 12, 24].map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    setRaceDurationMode('HOURS');
                    setRaceDurationHours(h);
                  }}
                  className={`flex-1 py-1 rounded-lg border font-bold text-[10px] ${
                    raceDurationMode === 'HOURS' && raceDurationHours === h
                      ? 'bg-amber-500 border-amber-400 text-slate-950'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {h}H
                </button>
              ))}
            </div>
          </div>

          {/* Target Pace per Lap */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center justify-between text-[11px]">
              <span>TARGET LAP TIME</span>
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={targetLapTimeSec}
                onChange={(e) => setTargetLapTimeSec(Math.max(10, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-800 text-white font-bold rounded px-2 py-0.5"
              />
              <span className="text-slate-400 text-[10px]">
                {Math.floor(targetLapTimeSec / 60)}:
                {(targetLapTimeSec % 60).toFixed(1).padStart(4, '0')}
              </span>
            </div>
          </div>

          {/* Fuel & VE per Lap */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center justify-between text-[11px]">
              <span>FUEL / VE PER LAP</span>
              <Fuel className="w-3.5 h-3.5 text-emerald-400" />
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.05"
                value={fuelPerLapLiters}
                onChange={(e) => setFuelPerLapLiters(Math.max(0.1, Number(e.target.value)))}
                className="w-1/2 bg-slate-900 border border-slate-800 text-emerald-400 font-bold rounded px-1.5 py-0.5 text-center"
              />
              <span className="text-slate-500 text-[10px]">L</span>
              <input
                type="number"
                step="0.5"
                value={vePerLapMJ}
                onChange={(e) => setVePerLapMJ(Math.max(0, Number(e.target.value)))}
                className="w-1/2 bg-slate-900 border border-slate-800 text-sky-400 font-bold rounded px-1.5 py-0.5 text-center"
              />
              <span className="text-slate-500 text-[10px]">MJ</span>
            </div>
          </div>

          {/* Stint Length */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-slate-400 font-semibold flex items-center justify-between text-[11px]">
              <span>STINT LAPS (MAX {maxLapsPerStintCapacity})</span>
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={maxLapsPerStintCapacity}
                value={lapsPerStintInput}
                onChange={(e) =>
                  setLapsPerStintInput(Math.min(maxLapsPerStintCapacity, Math.max(1, Number(e.target.value))))
                }
                className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-bold rounded px-2 py-0.5"
              />
              <span className="text-slate-400 text-[10px]">Laps</span>
            </div>
          </div>
        </div>

        {/* Global Strategy Highlights Bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">CIRCUIT LENGTH</span>
            <span className="text-base font-bold text-white">
              {(currentTrackInfo.lengthMeters / 1000).toFixed(2)} km
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">ESTIMATED TOTAL LAPS</span>
            <span className="text-base font-bold text-white">{totalLaps} Laps</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">REQUIRED STINTS</span>
            <span className="text-base font-bold text-amber-400">{totalStints} Stints</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">TOTAL PIT STOPS</span>
            <span className="text-base font-bold text-amber-400">{totalPitStops} Stops</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">FUEL/VE RATIO</span>
            <span className="text-base font-bold text-sky-400">{fuelVERatio} MJ/L</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">RECOMMENDED COMPOUND</span>
            <span className="text-base font-bold text-purple-400">{weatherMultipliers.recommendedCompound}</span>
          </div>
        </div>
      </div>

      {/* TAB 1: RACE STINT SCHEDULE */}
      {activeTab === 'schedule' && (
        <ScheduleTab
          stintsSchedule={stintsSchedule}
          currentTrackName={currentTrackInfo.name}
          totalStints={totalStints}
          raceDurationHours={raceDurationHours}
          totalLaps={totalLaps}
        />
      )}

      {/* TAB 2: DETAILED CIRCUIT & FUEL/ENERGY INPUT PARAMETERS */}
      {activeTab === 'inputs' && (
        <InputsTab
          selectedTrackId={selectedTrackId}
          customTrackName={customTrackName}
          setCustomTrackName={setCustomTrackName}
          customTrackLengthMeters={customTrackLengthMeters}
          setCustomTrackLengthMeters={setCustomTrackLengthMeters}
          targetLapTimeSec={targetLapTimeSec}
          setTargetLapTimeSec={setTargetLapTimeSec}
          carClass={carClass}
          setCarClass={setCarClass}
          fuelTankCapacityLiters={fuelTankCapacityLiters}
          setFuelTankCapacityLiters={setFuelTankCapacityLiters}
          fuelPerLapLiters={fuelPerLapLiters}
          setFuelPerLapLiters={setFuelPerLapLiters}
          virtualEnergyCapacityMJ={virtualEnergyCapacityMJ}
          setVirtualEnergyCapacityMJ={setVirtualEnergyCapacityMJ}
          vePerLapMJ={vePerLapMJ}
          setVePerLapMJ={setVePerLapMJ}
          fuelVERatio={fuelVERatio}
          pitLaneBaseLossSec={pitLaneBaseLossSec}
          setPitLaneBaseLossSec={setPitLaneBaseLossSec}
          refuelRateLitersPerSec={refuelRateLitersPerSec}
          setRefuelRateLitersPerSec={setRefuelRateLitersPerSec}
          tireChangeTimeSec={tireChangeTimeSec}
          setTireChangeTimeSec={setTireChangeTimeSec}
        />
      )}

      {/* TAB 3: WEATHER & TRACK MODELING */}
      {activeTab === 'weather' && (
        <WeatherSimTab
          rainIntensityMm={rainIntensityMm}
          setRainIntensityMm={setRainIntensityMm}
          trackTempC={trackTempC}
          setTrackTempC={setTrackTempC}
          rubberLevel={rubberLevel}
          setRubberLevel={setRubberLevel}
          weatherMultipliers={weatherMultipliers}
        />
      )}

      {/* TAB 4: TIRE ALLOCATION TRACKER */}
      {activeTab === 'tireSets' && (
        <TireTrackerTab
          tireSets={tireSets}
          setTireSets={setTireSets}
          handleUpdateTireSet={handleUpdateTireSet}
        />
      )}

      {/* TAB 5: TRADEOFF ANALYSIS */}
      {activeTab === 'tradeoff' && (
        <TradeoffTab
          doubleStintTires={doubleStintTires}
          setDoubleStintTires={setDoubleStintTires}
          tripleStintTires={tripleStintTires}
          setTripleStintTires={setTripleStintTires}
          tradeoffAnalysis={tradeoffAnalysis}
        />
      )}
    </div>
  );
};
