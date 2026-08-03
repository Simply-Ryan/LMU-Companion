import React, { useState, useEffect } from 'react';
import { TelemetryFrame, ConnectionSource } from '../types';
import {
  Gauge,
  Fuel,
  Zap,
  Disc,
  Clock,
  Wifi,
  WifiOff,
  Sun,
  CloudRain,
  Flame,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Battery,
} from 'lucide-react';

interface MobilePitWallViewProps {
  telemetry: TelemetryFrame;
  connectionSource: ConnectionSource;
  isPythonBridgeConnected: boolean;
}

export const MobilePitWallView: React.FC<MobilePitWallViewProps> = ({
  telemetry,
  connectionSource,
  isPythonBridgeConnected,
}) => {
  const [mobileTab, setMobileTab] = useState<'hud' | 'energy' | 'tires' | 'pitbox'>('hud');
  const [isHighContrastSunlightMode, setIsHighContrastSunlightMode] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  // Monitor network online/offline state for trackside engineers
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatLapTime = (sec: number) => {
    if (!sec || sec <= 0) return '--:--.--';
    const mins = Math.floor(sec / 60);
    const remainder = (sec % 60).toFixed(2);
    return `${mins}:${remainder.padStart(5, '0')}`;
  };

  const isPitLimiterActive = telemetry.speedKmh > 0 && telemetry.speedKmh < 82 && telemetry.gear <= 1;

  return (
    <div
      className={`min-h-screen p-3 md:p-6 transition-colors duration-200 font-mono ${
        isHighContrastSunlightMode
          ? 'bg-slate-100 text-slate-950'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Mobile Top Status Header */}
      <div
        className={`p-3.5 rounded-2xl border mb-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isHighContrastSunlightMode
            ? 'bg-white border-slate-300'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base tracking-wider flex items-center gap-2">
                PIT WALL MOBILE HUD
                <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                  60Hz
                </span>
              </h2>
              <p className="text-[11px] opacity-70">High-Density Trackside Engineering Terminal</p>
            </div>
          </div>

          {/* Network & PWA Offline Pill */}
          <div
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
              isOffline
                ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                : 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
            }`}
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5" /> PWA Offline Cache
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" /> PWA Online
              </>
            )}
          </div>
        </div>

        {/* Sunlight High Contrast Mode Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsHighContrastSunlightMode(!isHighContrastSunlightMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              isHighContrastSunlightMode
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Sun className="w-4 h-4" />
            {isHighContrastSunlightMode ? 'Sunlight High Contrast Active' : 'Normal Dark Mode'}
          </button>
        </div>
      </div>

      {/* Touch Bar Segment Navigation */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { id: 'hud', label: 'COCKPIT', icon: Gauge },
          { id: 'energy', label: 'FUEL & VE', icon: Fuel },
          { id: 'tires', label: 'TIRES', icon: Disc },
          { id: 'pitbox', label: 'PIT BOX', icon: Clock },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = mobileTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setMobileTab(item.id as any)}
              className={`py-3 px-2 rounded-2xl border text-center font-black text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 min-h-[54px] ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                  : isHighContrastSunlightMode
                  ? 'bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: COCKPIT SPEED & DELTA READOUT */}
      {mobileTab === 'hud' && (
        <div className="space-y-4">
          {/* Main Giant Speed & Gear Screen */}
          <div
            className={`p-6 rounded-3xl border shadow-2xl space-y-4 text-center ${
              isHighContrastSunlightMode
                ? 'bg-white border-slate-300'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex justify-between items-center text-xs opacity-70 border-b border-slate-800/40 pb-2">
              <span>ACTIVE VEHICLE: {telemetry.car.name}</span>
              <span className="font-bold">{telemetry.track.name}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center my-2">
              {/* Gear Indicator */}
              <div
                className={`p-6 rounded-2xl border text-center ${
                  isHighContrastSunlightMode
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <span className="text-xs opacity-60 block mb-1">GEAR</span>
                <span className="text-7xl sm:text-8xl font-black text-amber-500 tracking-tighter">
                  {telemetry.gear === 0 ? 'N' : telemetry.gear === -1 ? 'R' : telemetry.gear}
                </span>
              </div>

              {/* Speed Readout */}
              <div
                className={`p-6 rounded-2xl border text-center col-span-1 sm:col-span-2 ${
                  isHighContrastSunlightMode
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <span className="text-xs opacity-60 block mb-1">LIVE SPEED</span>
                <div className="text-6xl sm:text-7xl font-black text-white tracking-tighter flex items-baseline justify-center gap-2">
                  <span>{Math.round(telemetry.speedKmh)}</span>
                  <span className="text-xl font-bold text-amber-400">KM/H</span>
                </div>
                <div className="text-xs opacity-60 mt-1 font-semibold">
                  {Math.round(telemetry.speedMph)} MPH | RPM: {telemetry.rpm}
                </div>
              </div>
            </div>

            {/* Live Lap Time & Live Delta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div
                className={`p-4 rounded-2xl border ${
                  isHighContrastSunlightMode
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <span className="text-xs opacity-60 block">CURRENT LAP TIME</span>
                <span className="text-3xl sm:text-4xl font-black text-white">
                  {formatLapTime(telemetry.currentLapTimeSeconds)}
                </span>
                <span className="text-xs opacity-60 block mt-1">
                  Lap {telemetry.lapNumber} | Best: {formatLapTime(telemetry.bestLapTimeSeconds)}
                </span>
              </div>

              <div
                className={`p-4 rounded-2xl border ${
                  telemetry.liveDeltaSeconds <= 0
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/40 text-red-400'
                }`}
              >
                <span className="text-xs opacity-70 block">LIVE DELTA TO BEST</span>
                <span className="text-3xl sm:text-4xl font-black tracking-tight">
                  {telemetry.liveDeltaSeconds <= 0 ? '' : '+'}
                  {telemetry.liveDeltaSeconds.toFixed(3)}s
                </span>
                <span className="text-xs opacity-70 block mt-1 font-semibold">
                  {telemetry.liveDeltaSeconds <= 0 ? 'Ahead of Best Pace' : 'Behind Best Pace'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: FUEL & VIRTUAL ENERGY */}
      {mobileTab === 'energy' && (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-3xl border shadow-2xl space-y-6 ${
              isHighContrastSunlightMode
                ? 'bg-white border-slate-300'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Fuel className="w-6 h-6 text-emerald-500" />
                <h3 className="font-black text-lg text-white">Fuel & Virtual Energy Status</h3>
              </div>
              <span className="text-xs font-bold text-amber-500">LMU BoP Compliance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fuel Card */}
              <div
                className={`p-5 rounded-2xl border space-y-3 ${
                  isHighContrastSunlightMode
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">PETROL REMAINING</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {telemetry.fuelRemainingPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="text-4xl font-black text-emerald-400">
                  {telemetry.fuelRemainingLiters.toFixed(1)}{' '}
                  <span className="text-lg text-slate-400 font-normal">Liters</span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${telemetry.fuelRemainingPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-800/40">
                  <span className="opacity-70">Est. Laps Left:</span>
                  <strong className="text-amber-400 text-sm">
                    ~{telemetry.estimatedLapsRemainingFuel.toFixed(1)} Laps
                  </strong>
                </div>
              </div>

              {/* Virtual Energy Card */}
              <div
                className={`p-5 rounded-2xl border space-y-3 ${
                  isHighContrastSunlightMode
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">VIRTUAL ENERGY (FIA)</span>
                  <span className="text-sky-400 font-bold text-sm">
                    {telemetry.virtualEnergyRemainingPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="text-4xl font-black text-sky-400">
                  {telemetry.virtualEnergyRemainingMJ.toFixed(1)}{' '}
                  <span className="text-lg text-slate-400 font-normal">MJ</span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full transition-all"
                    style={{ width: `${telemetry.virtualEnergyRemainingPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-800/40">
                  <span className="opacity-70">Est. VE Laps:</span>
                  <strong className="text-sky-400 text-sm">
                    ~{telemetry.estimatedLapsRemainingVirtualEnergy.toFixed(1)} Laps
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Pit Window Target */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-amber-400">PIT STOP WINDOW TARGET</h4>
                  <p className="text-xs text-slate-300">
                    Refuel required in approximately{' '}
                    <strong className="text-white">
                      {Math.floor(
                        Math.min(
                          telemetry.estimatedLapsRemainingFuel,
                          telemetry.estimatedLapsRemainingVirtualEnergy
                        )
                      )}{' '}
                      laps
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: TIRES MATRIX */}
      {mobileTab === 'tires' && (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-3xl border shadow-2xl space-y-4 ${
              isHighContrastSunlightMode
                ? 'bg-white border-slate-300'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Disc className="w-6 h-6 text-purple-400" />
                <h3 className="font-black text-lg text-white">4-Corner Tire Heat & Pressure Grid</h3>
              </div>
              <span className="text-xs font-bold text-purple-400">Trackside Telemetry</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'FRONT LEFT (FL)', data: telemetry.tires.frontLeft },
                { name: 'FRONT RIGHT (FR)', data: telemetry.tires.frontRight },
                { name: 'REAR LEFT (RL)', data: telemetry.tires.rearLeft },
                { name: 'REAR RIGHT (RR)', data: telemetry.tires.rearRight },
              ].map((corner, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border space-y-2 text-center ${
                    isHighContrastSunlightMode
                      ? 'bg-slate-100 border-slate-300'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-400 block">{corner.name}</span>
                  <div className="text-3xl font-black text-amber-400">
                    {Math.round(corner.data.tempCarcassC)}°C
                  </div>
                  <div className="text-xs font-semibold text-sky-400">
                    {corner.data.pressureKPa} kPa
                  </div>
                  <div className="text-xs opacity-70">
                    Wear: <strong className="text-white">{corner.data.wearPercent}%</strong> | Brake:{' '}
                    <strong className="text-red-400">{corner.data.brakeTempC}°C</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: PIT BOX COMMAND */}
      {mobileTab === 'pitbox' && (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-3xl border shadow-2xl space-y-5 ${
              isHighContrastSunlightMode
                ? 'bg-white border-slate-300'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-500" />
                <h3 className="font-black text-lg text-white">Pit Box & Refuel Strategy Control</h3>
              </div>
              <span className="text-xs font-bold text-emerald-400">Box Radio Active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-center">
                <span className="text-xs text-slate-400 block">PIT LIMITER STATUS</span>
                <div
                  className={`py-2 rounded-xl text-xl font-black uppercase border ${
                    isPitLimiterActive
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 animate-pulse'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {isPitLimiterActive ? 'LIMITER ACTIVE (80 KM/H)' : 'LIMITER INACTIVE'}
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-center">
                <span className="text-xs text-slate-400 block">ESTIMATED REFUEL LOSS</span>
                <div className="text-3xl font-black text-amber-400">34.2s</div>
                <span className="text-[11px] text-slate-400 block">Base Travel + Refuel + Tires</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
