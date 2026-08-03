import { WeatherMultipliers } from './weatherEngine';
import { PhysicalTireSet } from '../components/PitStrategyPlanner';

export interface StrategyScheduleInput {
  totalLaps: number;
  lapsPerStint: number;
  weatherMultipliers: WeatherMultipliers;
  raceDurationHours: number;
  trackTempC: number;
  tireSetsCount: number;
  pitLaneBaseLossSec: number;
  refuelRateLitersPerSec: number;
  tireChangeTimeSec: number;
  doubleStintTires: boolean;
  tripleStintTires: boolean;
}

export interface StintScheduleRow {
  stintNumber: number;
  startLap: number;
  endLap: number;
  stintLaps: number;
  hourOfDay: string;
  isNight: boolean;
  localTrackTemp: number;
  fuelNeededLiters: string;
  veNeededMJ: string;
  isTireChange: boolean;
  stintType: 'Fresh Tire' | 'Double Stint' | 'Triple Stint';
  assignedTireSet: number;
  estimatedPitDurationSec: number;
}

export interface TradeoffAnalysisResult {
  pitTimeSavedPerDoubleStint: number;
  totalDoubleStintsInRace: number;
  doubleStintPaceTimeLostTotal: number;
  totalPitTimeSavedDoubleStint: number;
  netDoubleStintAdvantage: number;
  recommendedStrategy: string;
}

export function generateStintSchedule(input: StrategyScheduleInput): StintScheduleRow[] {
  const {
    totalLaps,
    lapsPerStint,
    weatherMultipliers,
    raceDurationHours,
    trackTempC,
    tireSetsCount,
    pitLaneBaseLossSec,
    refuelRateLitersPerSec,
    tireChangeTimeSec,
    doubleStintTires,
    tripleStintTires,
  } = input;

  const totalStints = Math.ceil(totalLaps / Math.max(1, lapsPerStint));
  const list: StintScheduleRow[] = [];
  let currentLap = 1;

  for (let i = 1; i <= totalStints; i++) {
    const endLap = Math.min(totalLaps, currentLap + lapsPerStint - 1);
    const stintLaps = endLap - currentLap + 1;

    // Refueling duration calculation
    const stintFuelLiters = stintLaps * weatherMultipliers.fuelPerLap;
    const refuelTimeSec = Math.ceil(stintFuelLiters / Math.max(0.5, refuelRateLitersPerSec));

    // Tire strategy logic
    let isTireChange = true;
    let stintType: 'Fresh Tire' | 'Double Stint' | 'Triple Stint' = 'Fresh Tire';
    let pitStopDuration = pitLaneBaseLossSec + refuelTimeSec + tireChangeTimeSec;

    if (tripleStintTires && i % 3 !== 1) {
      isTireChange = false;
      stintType = i % 3 === 2 ? 'Double Stint' : 'Triple Stint';
      pitStopDuration = pitLaneBaseLossSec + refuelTimeSec; // Refuel only
    } else if (doubleStintTires && !tripleStintTires && i % 2 === 0) {
      isTireChange = false;
      stintType = 'Double Stint';
      pitStopDuration = pitLaneBaseLossSec + refuelTimeSec; // Refuel only
    }

    // Track temp shifts across race duration (Day -> Night -> Day)
    const raceProgress = (i - 1) / Math.max(1, totalStints - 1);
    const hourOfDay = (16 + raceProgress * raceDurationHours) % 24;
    const isNight = hourOfDay >= 21 || hourOfDay < 6;
    const localTrackTemp = isNight ? Math.max(14, trackTempC - 12) : trackTempC;

    list.push({
      stintNumber: i,
      startLap: currentLap,
      endLap,
      stintLaps,
      hourOfDay: `${Math.floor(hourOfDay).toString().padStart(2, '0')}:00`,
      isNight,
      localTrackTemp,
      fuelNeededLiters: stintFuelLiters.toFixed(1),
      veNeededMJ: (stintLaps * weatherMultipliers.vePerLap).toFixed(1),
      isTireChange,
      stintType,
      assignedTireSet: Math.min(
        tireSetsCount,
        Math.ceil(i / (tripleStintTires ? 3 : doubleStintTires ? 2 : 1))
      ),
      estimatedPitDurationSec: pitStopDuration,
    });

    currentLap = endLap + 1;
  }
  return list;
}

export function calculateTradeoffAnalysis(
  totalStints: number,
  lapsPerStint: number,
  tireChangeTimeSec: number
): TradeoffAnalysisResult {
  const doubleStintPacePenaltyAvg = 0.65;
  const pitTimeSavedPerDoubleStint = tireChangeTimeSec;
  const totalDoubleStintsInRace = Math.floor(totalStints / 2);

  const doubleStintPaceTimeLostTotal = totalDoubleStintsInRace * lapsPerStint * doubleStintPacePenaltyAvg;
  const totalPitTimeSavedDoubleStint = totalDoubleStintsInRace * pitTimeSavedPerDoubleStint;
  const netDoubleStintAdvantage = totalPitTimeSavedDoubleStint - doubleStintPaceTimeLostTotal;

  return {
    pitTimeSavedPerDoubleStint,
    totalDoubleStintsInRace,
    doubleStintPaceTimeLostTotal: Number(doubleStintPaceTimeLostTotal.toFixed(1)),
    totalPitTimeSavedDoubleStint: Number(totalPitTimeSavedDoubleStint.toFixed(1)),
    netDoubleStintAdvantage: Number(netDoubleStintAdvantage.toFixed(1)),
    recommendedStrategy:
      netDoubleStintAdvantage > 0
        ? 'DOUBLE-STINT TIRES (Favorable net race time saved in pit lane)'
        : 'FRESH TIRES EVERY STINT (High tire degradation circuit penalty)',
  };
}
