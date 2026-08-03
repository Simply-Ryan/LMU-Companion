/**
 * Le Mans Ultimate (LMU) Telemetry Companion Types
 */

export type CarClass = 'Hypercar' | 'LMGT3' | 'LMP2' | 'LMP3';

export interface CarInfo {
  id: string;
  name: string;
  class: CarClass;
  manufacturer: string;
  fuelTankCapacityLiters: number;
  virtualEnergyCapacityMJ: number; // Virtual Energy capacity in Megajoules (for Hypercars & LMGT3)
  maxRPM: number;
  shiftRPM: number;
  hasHybridSystem: boolean;
}

export interface TrackSector {
  number: number;
  name: string;
  distanceMeter: number;
  idealTimeSeconds: number;
}

export interface TrackInfo {
  id: string;
  name: string;
  country: string;
  lengthMeters: number;
  sectors: TrackSector[];
  typicalLapTimeSeconds: number;
}

export interface TireCornerData {
  tempCarcassC: number;
  tempTreadInnerC: number;
  tempTreadCenterC: number;
  tempTreadOuterC: number;
  pressureKPa: number;
  wearPercent: number; // 100% = fresh, 0% = worn out
  brakeTempC: number;
}

export interface TireSetData {
  frontLeft: TireCornerData;
  frontRight: TireCornerData;
  rearLeft: TireCornerData;
  rearRight: TireCornerData;
}

export interface VehicleElectronics {
  tc1: number; // Traction Control 1 (Overall)
  tc2: number; // Traction Control 2 (TC Cut / Ignition)
  tc3: number; // Traction Control 3 (TC Slip / Power)
  abs: number; // Anti-lock Braking System
  engineMap: number;
  brakeBiasPercent: number; // e.g. 54.5%
  mguMode?: string; // e.g., 'Quali', 'Race Balanced', 'Save', 'Attack'
  stateOfChargePercent?: number; // Hybrid battery %
}

export interface UploadedFileState {
  fileName: string;
  totalRows: number;
  availableLaps: number[];
  selectedLap: number;
  currentSampleIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  frames: TelemetryFrame[];
  traceData: any[];
  lapRecords: LapRecord[];
}

export interface LiveInputs {
  throttle: number; // 0.0 - 1.0
  brake: number; // 0.0 - 1.0
  clutch: number; // 0.0 - 1.0
  steeringAngleDeg: number; // -180 to +180
}

export interface SectorDelta {
  sector: 1 | 2 | 3;
  currentTimeSeconds: number;
  bestTimeSeconds: number;
  deltaSeconds: number; // negative = faster (green/purple), positive = slower (red)
  isPersonalBest: boolean;
  isSessionBest: boolean;
}

export interface LapTelemetryPoint {
  distanceMeters: number;
  speedKmh: number;
  throttlePercent: number;
  brakePercent: number;
  gear: number;
  rpm: number;
  deltaSeconds: number;
}

export interface LapRecord {
  lapNumber: number;
  lapTimeSeconds: number;
  lapTimeString: string;
  sector1Seconds: number;
  sector2Seconds: number;
  sector3Seconds: number;
  fuelUsedLiters: number;
  virtualEnergyUsedMJ: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  isValid: boolean;
  isPersonalBest: boolean;
  isSessionBest: boolean;
  tireWearAvgPercent: number;
  trackTempC: number;
}

export interface StintRecord {
  stintNumber: number;
  compound: string;
  lapsCount: number;
  totalTimeSeconds: number;
  startFuelLiters: number;
  endFuelLiters: number;
  startVirtualEnergyMJ: number;
  endVirtualEnergyMJ: number;
  avgLapTimeSeconds: number;
  bestLapTimeSeconds: number;
  laps: LapRecord[];
}

export interface TelemetryFrame {
  timestampMs: number;
  sessionType: 'PRACTICE' | 'QUALIFYING' | 'RACE';
  sessionTimeRemainingSeconds: number;
  track: TrackInfo;
  car: CarInfo;
  
  // Dynamics
  speedKmh: number;
  speedMph: number;
  rpm: number;
  gear: number; // -1 = Reverse, 0 = Neutral, 1-7 = Forward
  inputs: LiveInputs;
  
  // Fuel & Energy
  fuelRemainingLiters: number;
  fuelRemainingPercent: number;
  fuelAvgPerLapLiters: number;
  fuelLastLapLiters: number;
  virtualEnergyRemainingMJ: number;
  virtualEnergyRemainingPercent: number;
  virtualEnergyAvgPerLapMJ: number;
  virtualEnergyLastLapMJ: number;
  estimatedLapsRemainingFuel: number;
  estimatedLapsRemainingVirtualEnergy: number;
  
  // Timing & Position
  worldPosition?: { x: number; y: number; z?: number };
  lapNumber: number;
  currentLapTimeSeconds: number;
  currentSector: 1 | 2 | 3;
  trackDistanceMeters: number;
  trackProgressPercent: number;
  lastLapTimeSeconds: number;
  bestLapTimeSeconds: number;
  sector1TimeSeconds?: number;
  sector2TimeSeconds?: number;
  sector3TimeSeconds?: number;
  sectorDeltas: SectorDelta[];
  liveDeltaSeconds: number;
  
  // Tires & Electronics
  tires: TireSetData;
  electronics: VehicleElectronics;
  
  // Environment
  ambientTempC: number;
  trackTempC: number;
  weatherCondition: 'DRY' | 'GREASY' | 'DAMP' | 'WET' | 'HEAVY_RAIN';
  trackGripPercent: number;
  
  // High-Frequency Dynamics & Telemetry Bridge Extensions
  wheelSlip?: {
    frontLeft: number;
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  damperVelocityMmS?: {
    frontLeft: number;
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  diagnostics?: {
    oilTempC: number;
    waterTempC: number;
    oilPressureBar: number;
    boostBar: number;
    torqueDemandPercent: number;
  };
  referenceTelemetry?: {
    speedKmh: number;
    deltaSeconds: number;
    throttle: number;
    brake: number;
    gear: number;
    lapTimeString?: string;
  };

  // Warnings / Status
  inPitLane: boolean;
  pitLimiterActive: boolean;
  yellowFlagActive: boolean;
  lowFuelWarning: boolean;
  lowEnergyWarning: boolean;
  highTireTempWarning: boolean;
}

export type ConnectionSource = 'SIMULATOR' | 'PYTHON_BRIDGE' | 'REPLAY';

export interface PitStrategyCalculation {
  targetStintLaps: number;
  totalRaceLaps: number;
  totalRaceMinutes: number;
  requiredFuelLiters: number;
  requiredVirtualEnergyMJ: number;
  fuelRefillAtPitLiters: number;
  virtualEnergyRefillAtPitMJ: number;
  pitStopCount: number;
  pitWindowStartLap: number;
  pitWindowEndLap: number;
  estimatedPitStopDurationSeconds: number;
  tireChangeNeeded: boolean;
}
