export interface TireDegradationInput {
  compound: 'Soft' | 'Medium' | 'Hard' | 'Intermediate' | 'Wet';
  trackTempC: number;
  lapsDriven: number;
  aggressiveDriving: boolean;
}

export interface TireDegradationOutput {
  wearPercentRemaining: number;
  pacePenaltySecPerLap: number;
  thermalGripFactor: number;
  estimatedMaxStintLaps: number;
}

export function calculateTireDegradation(input: TireDegradationInput): TireDegradationOutput {
  const { compound, trackTempC, lapsDriven, aggressiveDriving } = input;

  // Base wear per lap by compound
  let baseWearPerLap = 2.5; // Medium default
  let optimalTempRange = [25, 45];
  let baseMaxLaps = 30;

  switch (compound) {
    case 'Soft':
      baseWearPerLap = 4.2;
      optimalTempRange = [15, 30];
      baseMaxLaps = 20;
      break;
    case 'Medium':
      baseWearPerLap = 2.5;
      optimalTempRange = [25, 45];
      baseMaxLaps = 32;
      break;
    case 'Hard':
      baseWearPerLap = 1.6;
      optimalTempRange = [35, 55];
      baseMaxLaps = 48;
      break;
    case 'Intermediate':
      baseWearPerLap = 3.0;
      optimalTempRange = [10, 25];
      baseMaxLaps = 25;
      break;
    case 'Wet':
      baseWearPerLap = 3.5;
      optimalTempRange = [10, 22];
      baseMaxLaps = 22;
      break;
  }

  // Thermal factor penalty if outside optimal window
  let thermalFactor = 1.0;
  if (trackTempC < optimalTempRange[0]) {
    thermalFactor += (optimalTempRange[0] - trackTempC) * 0.02; // Cold graining
  } else if (trackTempC > optimalTempRange[1]) {
    thermalFactor += (trackTempC - optimalTempRange[1]) * 0.035; // Overheating blistering
  }

  if (aggressiveDriving) {
    thermalFactor *= 1.25;
  }

  const effectiveWearPerLap = baseWearPerLap * thermalFactor;
  const totalWear = Math.min(100, lapsDriven * effectiveWearPerLap);
  const wearPercentRemaining = Math.max(0, 100 - totalWear);

  // Progressive pace penalty as tire wears out
  let pacePenaltySecPerLap = 0;
  if (wearPercentRemaining < 70) {
    pacePenaltySecPerLap += (70 - wearPercentRemaining) * 0.025;
  }
  if (wearPercentRemaining < 30) {
    pacePenaltySecPerLap += (30 - wearPercentRemaining) * 0.08; // Steep cliff
  }

  return {
    wearPercentRemaining: Number(wearPercentRemaining.toFixed(1)),
    pacePenaltySecPerLap: Number(pacePenaltySecPerLap.toFixed(2)),
    thermalGripFactor: Number(thermalFactor.toFixed(2)),
    estimatedMaxStintLaps: Math.floor(100 / Math.max(0.5, effectiveWearPerLap)),
  };
}
