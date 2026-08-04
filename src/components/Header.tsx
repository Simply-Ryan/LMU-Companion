import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Gauge, 
  Zap, 
  Disc, 
  Timer, 
  LineChart, 
  Calculator, 
  Terminal, 
  Sliders, 
  Volume2, 
  VolumeX, 
  CloudRain, 
  Sun, 
  Wifi, 
  WifiOff, 
  Car, 
  Flag,
  Database,
  Smartphone,
  Compass,
  HelpCircle,
  Users,
  UserCircle
} from 'lucide-react';
import { TelemetryFrame, ConnectionSource } from '../types';
import { LMU_CARS, LMU_TRACKS } from '../data/lmuData';

export type TabType = 'hud' | 'telemetry' | 'sectors' | 'energy_tires' | 'mobile_pitwall' | 'coaching_bop';

interface HeaderProps {
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
  telemetry: TelemetryFrame;
  connectionSource: ConnectionSource;
  isPythonBridgeConnected: boolean;
  onOpenPythonBridgeModal: () => void;
  audioShiftBeep: boolean;
  setAudioShiftBeep: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectCar?: (carId: string) => void;
  onSelectTrack?: (trackId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  telemetry,
  connectionSource,
  isPythonBridgeConnected,
  onOpenPythonBridgeModal,
  audioShiftBeep,
  setAudioShiftBeep,
  onSelectCar,
  onSelectTrack,
}) => {
  const formatSecondsToMinutes = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const location = useLocation();

  return (
    <header className="bg-slate-950 border-b border-slate-800/80 sticky top-0 z-40 shadow-xl">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-900">
        {/* Left Brand Identity */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-black tracking-wider text-base text-white hover:opacity-80 transition">
            <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-red-500 text-slate-950 px-2 py-0.5 rounded font-black text-sm italic">
              LMU
            </span>
            <span className="hidden sm:inline">COMPANION</span>
          </Link>

          <div className="h-4 w-[1px] bg-slate-800 hidden md:block" />

          {/* Connection Status Pill */}
          <button
            onClick={onOpenPythonBridgeModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium text-[11px] transition ${
              isPythonBridgeConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            {isPythonBridgeConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>Live LMU Shared Memory</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline / File Replay</span>
              </>
            )}
          </button>
        </div>

        {/* Center Live Session Details */}
        <div className="hidden lg:flex items-center gap-4 text-slate-300 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Session:</span>
            <span className="text-white font-semibold">{telemetry.sessionType}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Timer className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Time Left:</span>
            <span className="text-white font-semibold">{formatSecondsToMinutes(telemetry.sessionTimeRemainingSeconds)}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            {telemetry.weatherCondition === 'DRY' ? (
              <Sun className="w-3.5 h-3.5 text-yellow-400" />
            ) : (
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="text-slate-400">Track Temp:</span>
            <span className="text-white font-semibold">{telemetry.trackTempC}°C</span>
          </div>
        </div>

        {/* Right Active Car & Track Badges & Controls */}
        <div className="flex items-center gap-2">
          
          <Link to="/help" className="flex items-center gap-1 text-slate-400 hover:text-white transition mr-2">
            <HelpCircle className="w-4 h-4" /> Help
          </Link>
          <Link to="/community" className="flex items-center gap-1 text-slate-400 hover:text-white transition mr-2">
            <Users className="w-4 h-4" /> Community
          </Link>
          <Link to="/account" className="flex items-center gap-1 text-slate-400 hover:text-white transition mr-2">
            <UserCircle className="w-4 h-4" /> Account
          </Link>

          <div className="h-4 w-[1px] bg-slate-800 hidden md:block mr-2" />

          {/* Active Car Badge */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1">
            <Car className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-white">{telemetry.car.name}</span>
            {telemetry.car.class && (
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.2 rounded border border-slate-700">
                {telemetry.car.class}
              </span>
            )}
          </div>

          {/* Active Track Badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1">
            <Flag className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-white">{telemetry.track.name}</span>
          </div>

          {/* Python script setup trigger */}
          <button
            onClick={onOpenPythonBridgeModal}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 rounded-lg transition"
            title="Python LMU Bridge Setup Instructions"
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* Audio shift beep toggle */}
          <button
            onClick={() => setAudioShiftBeep(!audioShiftBeep)}
            className={`p-1.5 border rounded-lg transition ${
              audioShiftBeep
                ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={audioShiftBeep ? 'Shift Beeper Enabled' : 'Shift Beeper Muted'}
          >
            {audioShiftBeep ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      {location.pathname === '/' && setActiveTab && activeTab && (
        <nav className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto gap-1.5 text-xs font-semibold py-2 scrollbar-hide">
          <button
            onClick={() => setActiveTab('hud')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'hud'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Gauge className="w-4 h-4" /> Live Cockpit
          </button>
          
          <button
            onClick={() => setActiveTab('data_studio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'data_studio'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4" /> Data Studio
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'telemetry'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LineChart className="w-4 h-4" /> Telemetry Lab
          </button>

          <button
            onClick={() => setActiveTab('sectors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'sectors'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Timer className="w-4 h-4" /> Strategy
          </button>

          <button
            onClick={() => setActiveTab('energy_tires')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'energy_tires'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Zap className="w-4 h-4" /> Energy & Tires
          </button>

          <button
            onClick={() => setActiveTab('mobile_pitwall')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'mobile_pitwall'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Pit Wall Mobile</span>
          </button>

          <button
            onClick={() => setActiveTab('coaching_bop')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'coaching_bop'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Driver Coaching</span>
          </button>
        </nav>
      )}
    </header>
  );
};

