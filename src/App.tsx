import React, { useState, useEffect, useRef } from 'react';
import { TelemetryFrame, ConnectionSource, LapRecord, TrackInfo, CarInfo } from './types';
import { LMU_CARS, LMU_TRACKS } from './data/lmuData';
import { Header, TabType } from './components/Header';
import { DashboardHUD } from './components/DashboardHUD';
import { EnergyFuelManager } from './components/EnergyFuelManager';
import { TireTelemetryView } from './components/TireTelemetryView';
import { SessionStintView } from './components/SessionStintView';
import { TelemetryLab } from './components/TelemetryLab';
import { PitStrategyPlanner } from './components/PitStrategyPlanner';
import { DuckDBAnalyzer } from './components/DuckDBAnalyzer';
import { PythonBridgeModal } from './components/PythonBridgeModal';
import { UploadedFileReplayBar } from './components/UploadedFileReplayBar';
import { LapConsumptionModal } from './components/LapConsumptionModal';
import { MobilePitWallView } from './components/MobilePitWallView';
import { DriverCoachingLab } from './components/DriverCoachingLab';
import { parseRowsToLapRecords, parseRowsToTracePoints, rowToTelemetryFrame } from './lib/telemetryParser';
import { executeDuckDBQuery } from './lib/duckdb';

interface ActiveUploadedState {
  fileName: string;
  tableName: string;
  totalRows: number;
  laps: number[];
  lapRecords: LapRecord[];
  traceData: any[];
  currentSampleIndex: number;
  selectedLap: number;
  isPlaying: boolean;
  playbackSpeed: number;
  track: TrackInfo;
  car: CarInfo;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('hud');
  const [isPythonBridgeModalOpen, setIsPythonBridgeModalOpen] = useState<boolean>(false);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState<boolean>(false);
  const [audioShiftBeep, setAudioShiftBeep] = useState<boolean>(false);

  // Connection & telemetry state
  const [connectionSource, setConnectionSource] = useState<ConnectionSource>('NO_DATA');
  const [isPythonBridgeConnected, setIsPythonBridgeConnected] = useState<boolean>(false);

  // Default initial telemetry frame
  const defaultTrack = LMU_TRACKS[0]; // Bahrain International Circuit
  const defaultCar = LMU_CARS[0]; // Ginetta LMP3

  const [telemetry, setTelemetry] = useState<TelemetryFrame>({
    timestampMs: Date.now(),
    sessionType: 'QUALIFYING',
    sessionTimeRemainingSeconds: 900,
    car: defaultCar,
    track: defaultTrack,
    speedKmh: 226.5,
    speedMph: 140.7,
    rpm: 6276,
    gear: 5,
    inputs: {
      throttle: 1.0,
      brake: 0.0,
      clutch: 0.0,
      steeringAngleDeg: 0.0,
    },
    fuelRemainingLiters: 13.0,
    fuelRemainingPercent: 100,
    fuelAvgPerLapLiters: 2.85,
    fuelLastLapLiters: 2.85,
    virtualEnergyRemainingMJ: 0,
    virtualEnergyRemainingPercent: 0,
    virtualEnergyAvgPerLapMJ: 0,
    virtualEnergyLastLapMJ: 0,
    estimatedLapsRemainingFuel: 4.5,
    estimatedLapsRemainingVirtualEnergy: 0,
    lapNumber: 3,
    currentLapTimeSeconds: 115.309,
    currentSector: 3,
    trackDistanceMeters: 5412,
    trackProgressPercent: 100.0,
    lastLapTimeSeconds: 116.35,
    bestLapTimeSeconds: 115.309,
    sectorDeltas: [
      { sector: 1, currentTimeSeconds: 30.5, bestTimeSeconds: 30.5, deltaSeconds: 0.0, isPersonalBest: true, isSessionBest: true },
      { sector: 2, currentTimeSeconds: 48.0, bestTimeSeconds: 48.0, deltaSeconds: 0.0, isPersonalBest: true, isSessionBest: true },
      { sector: 3, currentTimeSeconds: 36.809, bestTimeSeconds: 36.809, deltaSeconds: 0.0, isPersonalBest: true, isSessionBest: true },
    ],
    liveDeltaSeconds: 0.0,
    tires: {
      frontLeft: { tempCarcassC: 92, tempTreadInnerC: 94, tempTreadCenterC: 93, tempTreadOuterC: 91, pressureKPa: 202, wearPercent: 94, brakeTempC: 480 },
      frontRight: { tempCarcassC: 95, tempTreadInnerC: 97, tempTreadCenterC: 96, tempTreadOuterC: 94, pressureKPa: 205, wearPercent: 92, brakeTempC: 510 },
      rearLeft: { tempCarcassC: 90, tempTreadInnerC: 91, tempTreadCenterC: 90, tempTreadOuterC: 89, pressureKPa: 198, wearPercent: 95, brakeTempC: 420 },
      rearRight: { tempCarcassC: 93, tempTreadInnerC: 95, tempTreadCenterC: 94, tempTreadOuterC: 92, pressureKPa: 201, wearPercent: 93, brakeTempC: 450 },
    },
    electronics: {
      tc1: 4,
      tc2: 2,
      abs: 3,
      engineMap: 1,
      brakeBiasPercent: 54.5,
      mguMode: 'Race Balanced',
      stateOfChargePercent: 84,
    },
    ambientTempC: 22.5,
    trackTempC: 31.0,
    weatherCondition: 'DRY',
    trackGripPercent: 98,
    inPitLane: false,
    pitLimiterActive: false,
    yellowFlagActive: false,
    lowFuelWarning: false,
    lowEnergyWarning: false,
    highTireTempWarning: false,
  });

  // Active uploaded telemetry file state
  const [uploadedFileState, setUploadedFileState] = useState<ActiveUploadedState | null>(null);
  const uploadedFileStateRef = useRef<ActiveUploadedState | null>(null);

  useEffect(() => {
    uploadedFileStateRef.current = uploadedFileState;
  }, [uploadedFileState]);

  // Helper to fetch a single frame from DuckDB
  const fetchReplayFrame = async (tableName: string, index: number, totalRows: number, customTrack?: TrackInfo, customCar?: CarInfo) => {
    try {
      const res = await executeDuckDBQuery(`SELECT * FROM "${tableName}" WHERE sample_id >= ${index} LIMIT 1;`);
      if (res.rows && res.rows.length > 0) {
        const frame = rowToTelemetryFrame(res.rows[0], index, totalRows, customTrack, customCar);
        setTelemetry(frame);
      }
    } catch (err) {
      console.warn('Failed to fetch replay frame:', err);
    }
  };

  // Replay playback timer loop
  useEffect(() => {
    if (!uploadedFileState || !uploadedFileState.isPlaying) return;

    let isFetching = false;
    const interval = setInterval(async () => {
      if (isFetching || !uploadedFileStateRef.current) return;
      const currentState = uploadedFileStateRef.current;
      if (!currentState.isPlaying) return;

      isFetching = true;
      const nextIndex = (currentState.currentSampleIndex + currentState.playbackSpeed) % currentState.totalRows;
      
      setUploadedFileState((prev) => prev ? { ...prev, currentSampleIndex: nextIndex } : prev);
      
      await fetchReplayFrame(currentState.tableName, nextIndex, currentState.totalRows, currentState.track, currentState.car);
      
      isFetching = false;
    }, 100);

    return () => clearInterval(interval);
  }, [uploadedFileState?.isPlaying, uploadedFileState?.playbackSpeed, uploadedFileState?.totalRows]);

  // Handler when telemetry is loaded from file / DuckDB
  const handleLoadTelemetryToHUD = async (
    tableName: string,
    fileName: string,
    totalRows: number,
    laps: number[],
    lapRecords: LapRecord[],
    traceData: any[],
    track: TrackInfo,
    car: CarInfo
  ) => {
    if (totalRows === 0) return;

    const activeState: ActiveUploadedState = {
      fileName: fileName || 'Uploaded Telemetry File',
      tableName,
      totalRows,
      laps: laps.length > 0 ? laps : [1],
      lapRecords,
      traceData,
      currentSampleIndex: 0,
      selectedLap: laps[0] || 1,
      isPlaying: false,
      playbackSpeed: 1,
      track,
      car
    };

    // Synchronously update ref immediately to prevent race conditions with WebSocket
    uploadedFileStateRef.current = activeState;
    setUploadedFileState(activeState);
    setConnectionSource('REPLAY');
    await fetchReplayFrame(tableName, 0, totalRows, track, car);
  };

  const handleSampleChange = (index: number) => {
    if (!uploadedFileState) return;
    const clampedIndex = Math.max(0, Math.min(uploadedFileState.totalRows - 1, index));
    setUploadedFileState((prev) => {
      if (!prev) return null;
      const updated = { ...prev, currentSampleIndex: clampedIndex };
      uploadedFileStateRef.current = updated;
      return updated;
    });
    fetchReplayFrame(uploadedFileState.tableName, clampedIndex, uploadedFileState.totalRows, uploadedFileState.track, uploadedFileState.car);
  };

  const handleSelectLap = async (lapNum: number) => {
    if (!uploadedFileState) return;
    try {
      const res = await executeDuckDBQuery(`SELECT MIN(sample_id) as min_id FROM "${uploadedFileState.tableName}" WHERE lap_number = ${lapNum} OR lap = ${lapNum} OR Lap = ${lapNum};`);
      const targetIdx = Number(res.rows[0]?.min_id || 0);
      setUploadedFileState((prev) => {
        if (!prev) return null;
        const updated = { ...prev, selectedLap: lapNum, currentSampleIndex: targetIdx };
        uploadedFileStateRef.current = updated;
        return updated;
      });
      fetchReplayFrame(uploadedFileState.tableName, targetIdx, uploadedFileState.totalRows, uploadedFileState.track, uploadedFileState.car);
    } catch (e) {
      console.warn("Could not jump to lap:", e);
    }
  };

  const handleTogglePlay = () => {
    setUploadedFileState((prev) => {
      if (!prev) return null;
      const updated = { ...prev, isPlaying: !prev.isPlaying };
      uploadedFileStateRef.current = updated;
      return updated;
    });
  };

  const handleResetReplay = () => {
    if (!uploadedFileState) return;
    setUploadedFileState((prev) => {
      if (!prev) return null;
      const updated = { ...prev, currentSampleIndex: 0, isPlaying: false };
      uploadedFileStateRef.current = updated;
      return updated;
    });
    fetchReplayFrame(uploadedFileState.tableName, 0, uploadedFileState.totalRows, uploadedFileState.track, uploadedFileState.car);
  };

  const handleClearUploadedFile = () => {
    uploadedFileStateRef.current = null;
    setUploadedFileState(null);
    setConnectionSource('NO_DATA');
  };

  // Telemetry RAF Buffer to prevent UI thrashing at 60Hz+
  const pendingTelemetryRef = useRef<Partial<TelemetryFrame> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const scheduleTelemetryUpdate = (data: Partial<TelemetryFrame>) => {
    pendingTelemetryRef.current = { ...pendingTelemetryRef.current, ...data };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingTelemetryRef.current) {
          setTelemetry((prev) => ({ ...prev, ...pendingTelemetryRef.current }));
          pendingTelemetryRef.current = null;
        }
        rafIdRef.current = null;
      });
    }
  };

  // WebSocket Connection Handler
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[Dashboard] WebSocket connected to backend:', wsUrl);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'TELEMETRY_FRAME' && payload.data) {
              // Ignore background simulator updates when a local telemetry file is uploaded/active
              if (uploadedFileStateRef.current && payload.source !== 'PYTHON_BRIDGE') {
                return;
              }

              scheduleTelemetryUpdate(payload.data);
              setConnectionSource(payload.source === 'PYTHON_BRIDGE' ? 'PYTHON_BRIDGE' : (uploadedFileStateRef.current ? 'REPLAY' : 'NO_DATA'));
              if (payload.source === 'PYTHON_BRIDGE') {
                setIsPythonBridgeConnected(true);
              }
            } else if (payload.type === 'BRIDGE_STATUS') {
              setIsPythonBridgeConnected(payload.connected);
            }
          } catch (err) {
            console.error('Error parsing WS message:', err);
          }
        };

        ws.onclose = () => {
          setIsPythonBridgeConnected(false);
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          ws?.close();
        };
      } catch (e) {
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Handler to manually select car
  const handleSelectCar = (carId: string) => {
    const selected = LMU_CARS.find((c) => c.id === carId);
    if (selected) {
      setTelemetry((prev) => ({
        ...prev,
        car: selected,
      }));
    }
  };

  // Handler to manually select track
  const handleSelectTrack = (trackId: string) => {
    const selected = LMU_TRACKS.find((t) => t.id === trackId);
    if (selected) {
      setTelemetry((prev) => ({
        ...prev,
        track: selected,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        telemetry={telemetry}
        connectionSource={connectionSource}
        isPythonBridgeConnected={isPythonBridgeConnected}
        onOpenPythonBridgeModal={() => setIsPythonBridgeModalOpen(true)}
        audioShiftBeep={audioShiftBeep}
        setAudioShiftBeep={setAudioShiftBeep}
        onSelectCar={handleSelectCar}
        onSelectTrack={handleSelectTrack}
      />

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Uploaded Telemetry File Replay Bar */}
        {uploadedFileState && (
          <UploadedFileReplayBar
            fileName={uploadedFileState.fileName}
            totalRows={uploadedFileState.totalRows}
            availableLaps={uploadedFileState.laps}
            selectedLap={uploadedFileState.selectedLap}
            currentSampleIndex={uploadedFileState.currentSampleIndex}
            isPlaying={uploadedFileState.isPlaying}
            onSelectLap={handleSelectLap}
            onSampleChange={handleSampleChange}
            onTogglePlay={handleTogglePlay}
            onReset={handleResetReplay}
            onClearFile={handleClearUploadedFile}
            currentSpeedKmh={telemetry.speedKmh}
            currentRpm={telemetry.rpm}
            currentGear={telemetry.gear}
            currentLapTimeSec={telemetry.currentLapTimeSeconds}
            playbackSpeed={uploadedFileState.playbackSpeed}
            onChangePlaybackSpeed={(spd) => setUploadedFileState((prev) => (prev ? { ...prev, playbackSpeed: spd } : null))}
            onOpenConsumptionModal={() => setIsConsumptionModalOpen(true)}
          />
        )}

        {/* Tab Views */}
        {connectionSource === 'NO_DATA' && (
          <div className="mb-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
            <h2 className="text-xl font-bold text-white">No Telemetry Data Available</h2>
            <p className="text-slate-400 max-w-lg">
              Connect the live Python Bridge to stream real-time shared memory data from Le Mans Ultimate, or scroll down and use the DuckDB Analyzer to upload a saved telemetry file.
            </p>
            <div className="flex space-x-4 mt-2">
              <button onClick={() => setIsPythonBridgeModalOpen(true)} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition">Connect Live Bridge</button>
            </div>
          </div>
        )}
        {activeTab === 'hud' && (
          <div className="space-y-6">
            <DashboardHUD
              telemetry={telemetry}
              audioShiftBeep={audioShiftBeep}
              traceData={uploadedFileState?.traceData}
              onOpenConsumptionModal={() => setIsConsumptionModalOpen(true)}
            />
            {/* Embedded DuckDB File & SQL Explorer directly inside Main Cockpit Tab */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <DuckDBAnalyzer onLoadTelemetryToHUD={handleLoadTelemetryToHUD} />
            </div>
          </div>
        )}

        {activeTab === 'telemetry' && (
          <TelemetryLab telemetry={telemetry} uploadedTraceData={uploadedFileState?.traceData} />
        )}

        {activeTab === 'sectors' && (
          <div className="space-y-6">
            <SessionStintView telemetry={telemetry} uploadedLaps={uploadedFileState?.lapRecords} />
            <PitStrategyPlanner
              telemetry={telemetry}
              uploadedLaps={uploadedFileState?.lapRecords}
            />
          </div>
        )}

        {activeTab === 'energy_tires' && (
          <div className="space-y-6">
            <EnergyFuelManager telemetry={telemetry} />
            <TireTelemetryView telemetry={telemetry} />
          </div>
        )}

        {activeTab === 'mobile_pitwall' && (
          <MobilePitWallView
            telemetry={telemetry}
            connectionSource={connectionSource}
            isPythonBridgeConnected={isPythonBridgeConnected}
          />
        )}

        {activeTab === 'coaching_bop' && (
          <DriverCoachingLab
            telemetry={telemetry}
            rawTraceData={uploadedFileState?.traceData}
          />
        )}
      </main>

      {/* Consumption Breakdown Table Modal */}
      <LapConsumptionModal
        isOpen={isConsumptionModalOpen}
        onClose={() => setIsConsumptionModalOpen(false)}
        telemetry={telemetry}
        lapRecords={uploadedFileState?.lapRecords}
      />

      {/* Python Bridge Modal */}
      <PythonBridgeModal
        isOpen={isPythonBridgeModalOpen}
        onClose={() => setIsPythonBridgeModalOpen(false)}
        isConnected={isPythonBridgeConnected}
      />
    </div>
  );
}
