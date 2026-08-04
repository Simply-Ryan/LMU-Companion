import React, { useEffect } from 'react';
import { TelemetryFrame } from '../types';
import { Zap, Disc, AlertTriangle, ChevronUp, ChevronDown, Flame, Compass, Activity } from 'lucide-react';
import { OPTIMAL_TIRE_TEMP } from '../data/lmuData';
import { TrackMap2D } from './TrackMap2D';
import { LiveVehicleDynamicsWidget } from './LiveVehicleDynamicsWidget';

interface DashboardHUDProps {
  telemetry: TelemetryFrame;
  audioShiftBeep: boolean;
  traceData?: any[];
  onOpenConsumptionModal?: () => void;
}

export const DashboardHUD: React.FC<DashboardHUDProps> = ({
  telemetry,
  audioShiftBeep,
  traceData,
  onOpenConsumptionModal
}) => {
  const { rpm, gear, speedKmh, speedMph, car, inputs, tires, electronics } = telemetry;
  const maxRpm = car.maxRPM || 8500;
  const shiftRpm = car.shiftRPM || 8200;
  const isShiftPoint = rpm >= shiftRpm;

  // Sound generator for optimal shift point
  useEffect(() => {
    if (audioShiftBeep && isShiftPoint && typeof window !== 'undefined') {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch (err) {
        // Ignore audio context autoplay restrictions
      }
    }
  }, [isShiftPoint, audioShiftBeep]);

  // Generate rev LEDs
  const numLeds = 12;
  const rpmPercent = Math.max(0, Math.min(1, rpm / maxRpm));
  const leds = Array.from({ length: numLeds }).map((_, i) => {
    const threshold = (i + 1) / numLeds;
    const isActive = rpmPercent >= threshold;
    let color = 'bg-slate-800 border-slate-700';

    if (isActive) {
      if (i < 4) color = 'bg-emerald-500 shadow-lg shadow-emerald-500/50 border-emerald-400';
      else if (i < 8) color = 'bg-amber-400 shadow-lg shadow-amber-400/50 border-amber-300';
      else color = 'bg-red-500 shadow-lg shadow-red-500/50 border-red-400';
    }

    if (isShiftPoint && isActive && i >= 8) {
      color = 'bg-sky-400 animate-ping border-white';
    }

    return { id: i, color };
  });

  // Helper function for tire temperature colors
  const getTireTempColor = (tempC: number) => {
    if (tempC < OPTIMAL_TIRE_TEMP.minC) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    if (tempC <= OPTIMAL_TIRE_TEMP.maxC) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Top Tachometer & Shift Light LED Strip */}
      <div className="bg-slate-900/60 p-2 sm:p-3 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        {/* 12 RGB LEDs */}
        <div className="grid grid-cols-12 gap-1.5 sm:gap-2">
          {leds.map((led) => (
            <div
              key={led.id}
              className={`h-4 sm:h-5 rounded-md border transition-all duration-75 ${led.color}`}
            />
          ))}
        </div>
      </div>

      {/* 2D Top View Circuit Map with Live Car Marker & Inputs */}
      <TrackMap2D
        telemetry={telemetry}
        traceData={traceData}
      />

      {/* Main Cockpit HUD Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Fuel, Energy, Electronics, and Tires */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Zap className="w-4 h-4 text-amber-400" />
                ENERGY & FUEL
              </div>
              <span className="text-xs text-slate-400 font-mono">
                P/L: {telemetry.fuelConsumedPerLapLiters.toFixed(2)}L
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Gasoline Fuel */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                <span className="text-xs text-slate-400 font-medium block">GASOLINE FUEL</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white font-mono">{telemetry.fuelRemainingLiters}</span>
                  <span className="text-xs text-slate-400">Liters ({telemetry.fuelRemainingPercent}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${telemetry.fuelRemainingPercent}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex justify-between items-center pt-1">
                  {onOpenConsumptionModal ? (
                    <button
                      onClick={onOpenConsumptionModal}
                      className="text-amber-400 font-bold hover:underline hover:text-amber-300 transition flex items-center gap-1"
                    >
                      <Activity className="w-3 h-3" /> Data
                    </button>
                  ) : (
                    <span className="text-amber-400 font-bold">{telemetry.estimatedLapsRemainingFuel} Laps</span>
                  )}
                  <span>Cap: {telemetry.fuelCapacityLiters}L</span>
                </div>
              </div>

              {/* Virtual Energy (Hypercar/LMP1) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                <span className="text-xs text-slate-400 font-medium block flex items-center justify-between">
                  VIRTUAL ENERGY
                  <span className="text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded">VE</span>
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-sky-400 font-mono">{telemetry.virtualEnergyRemainingMJ}</span>
                  <span className="text-xs text-slate-400">MJ ({telemetry.virtualEnergyRemainingPercent}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-400 h-full rounded-full transition-all"
                    style={{ width: `${telemetry.virtualEnergyRemainingPercent}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex justify-between items-center pt-1">
                  {onOpenConsumptionModal ? (
                    <button
                      onClick={onOpenConsumptionModal}
                      className="text-sky-400 font-bold hover:underline hover:text-sky-300 transition flex items-center gap-1"
                    >
                      <Activity className="w-3 h-3" /> Data
                    </button>
                  ) : (
                    <span className="text-sky-400 font-bold">{telemetry.estimatedLapsRemainingVirtualEnergy} Laps</span>
                  )}
                  <span>Max: {telemetry.virtualEnergyMaxMJ}MJ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Electronics (TC, ABS, Map) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="font-bold text-sm text-white">VEHICLE ELECTRONICS</span>
              <span className="text-xs text-slate-400 font-mono">MAP: {electronics.engineMap}</span>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold">TC 1</span>
                <span className="text-lg font-bold font-mono text-amber-400">{electronics.tc1}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold">TC 2 (CUT)</span>
                <span className="text-lg font-bold font-mono text-amber-400">{electronics.tc2}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold">TC 3 (SLIP)</span>
                <span className="text-lg font-bold font-mono text-amber-400">{electronics.tc3 ?? 2}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold">ABS</span>
                <span className="text-lg font-bold font-mono text-sky-400">{electronics.abs}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold">BIAS</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{electronics.brakeBiasPercent}%</span>
              </div>
            </div>
          </div>

          {/* Tire Telemetry */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Disc className="w-4 h-4 text-emerald-400" />
                TIRE DYNAMICS
              </div>
              <span className="text-xs text-slate-400 font-mono">Target: ~92°C</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Front Left */}
              <div className={`p-3 rounded-xl border ${getTireTempColor(tires.frontLeft.tempCarcassC)} space-y-1`}>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-200">FL</span>
                  <span>{tires.frontLeft.tempCarcassC}°C <span className="text-[10px] text-slate-400 font-normal">(Brake: {tires.frontLeft.brakeTempC}°C)</span></span>
                </div>
                <div className="text-[11px] font-mono flex justify-between opacity-80">
                  <span>{tires.frontLeft.pressureKPa} kPa</span>
                  <span>Wear: {tires.frontLeft.wearPercent}%</span>
                </div>
              </div>

              {/* Front Right */}
              <div className={`p-3 rounded-xl border ${getTireTempColor(tires.frontRight.tempCarcassC)} space-y-1`}>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-200">FR</span>
                  <span>{tires.frontRight.tempCarcassC}°C <span className="text-[10px] text-slate-400 font-normal">(Brake: {tires.frontRight.brakeTempC}°C)</span></span>
                </div>
                <div className="text-[11px] font-mono flex justify-between opacity-80">
                  <span>{tires.frontRight.pressureKPa} kPa</span>
                  <span>Wear: {tires.frontRight.wearPercent}%</span>
                </div>
              </div>

              {/* Rear Left */}
              <div className={`p-3 rounded-xl border ${getTireTempColor(tires.rearLeft.tempCarcassC)} space-y-1`}>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-200">RL</span>
                  <span>{tires.rearLeft.tempCarcassC}°C <span className="text-[10px] text-slate-400 font-normal">(Brake: {tires.rearLeft.brakeTempC}°C)</span></span>
                </div>
                <div className="text-[11px] font-mono flex justify-between opacity-80">
                  <span>{tires.rearLeft.pressureKPa} kPa</span>
                  <span>Wear: {tires.rearLeft.wearPercent}%</span>
                </div>
              </div>

              {/* Rear Right */}
              <div className={`p-3 rounded-xl border ${getTireTempColor(tires.rearRight.tempCarcassC)} space-y-1`}>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-200">RR</span>
                  <span>{tires.rearRight.tempCarcassC}°C <span className="text-[10px] text-slate-400 font-normal">(Brake: {tires.rearRight.brakeTempC}°C)</span></span>
                </div>
                <div className="text-[11px] font-mono flex justify-between opacity-80">
                  <span>{tires.rearRight.pressureKPa} kPa</span>
                  <span>Wear: {tires.rearRight.wearPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Vehicle Dynamics */}
        <div className="xl:col-span-7">
          <LiveVehicleDynamicsWidget telemetry={telemetry} />
        </div>
      </div>
    </div>
  );
};
