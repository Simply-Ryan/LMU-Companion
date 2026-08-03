import { PhysicalTireSet } from '../components/PitStrategyPlanner';

export interface WeatherMultipliers {
  lapTimeDeltaSec: number;
  effectiveLapSec: number;
  fuelPerLap: number;
  vePerLap: number;
  gripPercent: number;
  recommendedCompound: 'Soft' | 'Medium' | 'Hard' | 'Intermediate' | 'Wet';
}

export function calculateWeatherMultipliers(
  targetLapTimeSec: number,
  fuelPerLapLiters: number,
  vePerLapMJ: number,
  trackTempC: number,
  rubberLevel: 'GREEN' | 'EVOLVING' | 'HEAVY' | 'WASHED',
  rainIntensityMm: number
): WeatherMultipliers {
  let lapTimeDeltaSec = 0;
  let fuelMultiplier = 1.0;
  let veMultiplier = 1.0;
  let gripPercent = 100;
  let recommendedCompound: 'Soft' | 'Medium' | 'Hard' | 'Intermediate' | 'Wet' = 'Medium';

  // Rubber evolution grip
  if (rubberLevel === 'GREEN') gripPercent -= 4;
  if (rubberLevel === 'EVOLVING') gripPercent -= 1.5;
  if (rubberLevel === 'HEAVY') gripPercent += 2;
  if (rubberLevel === 'WASHED') gripPercent -= 8;

  // Rain Intensity
  if (rainIntensityMm === 0) {
    if (trackTempC < 20) recommendedCompound = 'Soft';
    else if (trackTempC > 35) recommendedCompound = 'Hard';
    else recommendedCompound = 'Medium';
  } else if (rainIntensityMm <= 3) {
    lapTimeDeltaSec = 4.2;
    fuelMultiplier = 0.96;
    veMultiplier = 1.02;
    gripPercent -= 12;
    recommendedCompound = 'Intermediate';
  } else if (rainIntensityMm <= 8) {
    lapTimeDeltaSec = 17.5;
    fuelMultiplier = 0.92;
    veMultiplier = 1.08;
    gripPercent -= 28;
    recommendedCompound = 'Wet';
  } else {
    lapTimeDeltaSec = 34.0;
    fuelMultiplier = 0.88;
    veMultiplier = 1.15;
    gripPercent -= 45;
    recommendedCompound = 'Wet';
  }

  return {
    lapTimeDeltaSec,
    effectiveLapSec: targetLapTimeSec + lapTimeDeltaSec,
    fuelPerLap: fuelPerLapLiters * fuelMultiplier,
    vePerLap: vePerLapMJ * veMultiplier,
    gripPercent,
    recommendedCompound,
  };
}
