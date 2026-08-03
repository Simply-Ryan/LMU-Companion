import React from 'react';
import { Play, Pause, RotateCcw, FastForward, FileSpreadsheet, ChevronLeft, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';

interface UploadedFileReplayBarProps {
  fileName: string;
  totalRows: number;
  availableLaps: number[];
  selectedLap: number;
  currentSampleIndex: number;
  isPlaying: boolean;
  onSelectLap: (lap: number) => void;
  onSampleChange: (index: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onClearFile: () => void;
  currentSpeedKmh: number;
  currentRpm: number;
  currentGear: number;
  currentLapTimeSec: number;
  playbackSpeed: number;
  onChangePlaybackSpeed: (speed: number) => void;
  onOpenConsumptionModal?: () => void;
}

export const UploadedFileReplayBar: React.FC<UploadedFileReplayBarProps> = ({
  fileName,
  totalRows,
  availableLaps,
  selectedLap,
  currentSampleIndex,
  isPlaying,
  onSelectLap,
  onSampleChange,
  onTogglePlay,
  onReset,
  onClearFile,
  currentSpeedKmh,
  currentRpm,
  currentGear,
  currentLapTimeSec,
  playbackSpeed,
  onChangePlaybackSpeed,
  onOpenConsumptionModal,
}) => {
  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00.000';
    const mins = Math.floor(sec / 60);
    const secs = (sec % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const progressPct = totalRows > 1 ? (currentSampleIndex / (totalRows - 1)) * 100 : 0;

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 backdrop-blur-md rounded-2xl p-4 shadow-2xl space-y-3">
      {/* Top row: File Info & Quick Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
            <FileSpreadsheet className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{fileName}</span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ACTIVE FILE REPLAY
              </span>
            </div>
            <p className="text-slate-400 font-mono text-[11px]">
              {totalRows.toLocaleString()} samples • {availableLaps.length} Laps detected
            </p>
          </div>
        </div>

        {/* Real-time values readout from file */}
        <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block">LAP</span>
            <span className="text-amber-400 font-bold">{selectedLap}</span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-slate-500 text-[10px] block">TIME</span>
            <span className="text-white font-bold">{formatTime(currentLapTimeSec)}</span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-slate-500 text-[10px] block">SPEED</span>
            <span className="text-sky-400 font-bold">{currentSpeedKmh} <span className="text-[10px] text-slate-500">km/h</span></span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-slate-500 text-[10px] block">GEAR / RPM</span>
            <span className="text-emerald-400 font-bold">G{currentGear} / {currentRpm}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onOpenConsumptionModal && (
            <button
              onClick={onOpenConsumptionModal}
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 font-bold px-2.5 py-1.5 rounded-lg border border-amber-500/30 transition flex items-center gap-1"
              title="View lap-by-lap fuel and virtual energy consumption table"
            >
              📊 Consumption Log
            </button>
          )}

          {availableLaps.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <span className="text-slate-400 font-medium text-[11px]">Lap:</span>
              <select
                value={selectedLap}
                onChange={(e) => onSelectLap(Number(e.target.value))}
                className="bg-transparent text-amber-400 font-bold font-mono focus:outline-none cursor-pointer"
              >
                {availableLaps.map((l) => (
                  <option key={l} value={l} className="bg-slate-900 text-white">
                    Lap {l}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onClearFile}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
            title="Switch to Live Simulator feed (File remains saved in memory)"
          >
            Switch to Live
          </button>
        </div>
      </div>

      {/* Playback Controls & Scrubber Slider */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Play/Pause/Rewind */}
        <div className="flex items-center gap-1">
          <button
            onClick={onReset}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Reset to sample 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSampleChange(Math.max(0, currentSampleIndex - 1))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Step Back 1 sample"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTogglePlay}
            className={`p-2 rounded-xl border transition flex items-center gap-1 font-bold text-xs ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Replay Telemetry
              </>
            )}
          </button>
          <button
            onClick={() => onSampleChange(Math.min(totalRows - 1, currentSampleIndex + 1))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Step Forward 1 sample"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Custom integer speed multiplier selector */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-[11px]">
          <span className="text-slate-500 font-mono font-medium px-1">Speed:</span>
          {[1, 2, 5, 10, 20].map((spd) => (
            <button
              key={spd}
              onClick={() => onChangePlaybackSpeed(spd)}
              className={`px-2 py-0.5 rounded font-mono font-bold transition ${
                playbackSpeed === spd
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}

          {/* Editable Custom Integer Speed Input */}
          <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5 ml-0.5">
            <input
              type="number"
              min={1}
              max={100}
              value={playbackSpeed}
              onChange={(e) => {
                const val = Math.max(1, Math.min(100, Math.round(Number(e.target.value) || 1)));
                onChangePlaybackSpeed(val);
              }}
              className="w-12 bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold text-center text-xs rounded px-1 py-0.5 focus:outline-none focus:border-amber-400"
              title="Enter custom integer speed multiplier (e.g. 3, 7, 15, 50)"
            />
            <span className="text-slate-400 font-mono font-bold">x</span>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 min-w-[200px] flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalRows - 1)}
            value={currentSampleIndex}
            onChange={(e) => onSampleChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <span className="text-[11px] font-mono text-slate-400 min-w-[70px] text-right">
            {currentSampleIndex + 1} / {totalRows} ({progressPct.toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  );
};
