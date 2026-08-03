export interface StraightSegment {
  straightName: string;
  startDistanceMeter: number;
  endDistanceMeter: number;
  lengthMeter: number;
  topSpeedKmh: number;
  brakingZoneStartMeter: number;
}

export interface LiftAndCoastRecommendation {
  straightName: string;
  suggestedLiftMarkerMeter: number;
  distanceBeforeBrakingMeter: number;
  coastingDistanceMeter: number;
  virtualEnergySavedMJPerLap: number;
  lapTimePenaltySecPerLap: number;
  fuelSavedLitersPerLap: number;
  efficiencyRatio: number; // MJ saved per 0.1s time loss
}

export interface HybridDeploymentStatus {
  currentSpeedKmh: number;
  isFIAHybridActive: boolean; // True if speed >= 190 km/h FIA speed limit constraint
  fiaspeedLimitKmh: number;
  icePowerKw: number;
  electricMotorPowerKw: number;
  totalPowerKw: number;
  maxPowerCapKw: number;
  stateOfChargePercent: number;
  fiaComplianceStatus: 'COMPLIANT' | 'MGU_INACTIVE_UNDER_SPEED' | 'POWER_LIMIT_OVERRUN';
}

export function calculateStraightSegments(trackLengthMeters: number): StraightSegment[] {
  // Extract major straights based on track length
  if (trackLengthMeters > 10000) {
    // Le Mans Sarthe
    return [
      { straightName: 'Mulsanne Straight 1 (To Chicane 1)', startDistanceMeter: 3900, endDistanceMeter: 5500, lengthMeter: 1600, topSpeedKmh: 335, brakingZoneStartMeter: 5400 },
      { straightName: 'Mulsanne Straight 2 (To Chicane 2)', startDistanceMeter: 5800, endDistanceMeter: 7300, lengthMeter: 1500, topSpeedKmh: 332, brakingZoneStartMeter: 7200 },
      { straightName: 'Mulsanne Straight 3 (To Mulsanne Corner)', startDistanceMeter: 7600, endDistanceMeter: 8800, lengthMeter: 1200, topSpeedKmh: 328, brakingZoneStartMeter: 8700 },
      { straightName: 'Indianapolis Straight', startDistanceMeter: 9200, endDistanceMeter: 10400, lengthMeter: 1200, topSpeedKmh: 315, brakingZoneStartMeter: 10300 },
    ];
  } else if (trackLengthMeters > 6500) {
    // Spa Francorchamps
    return [
      { straightName: 'Kemmel Straight', startDistanceMeter: 900, endDistanceMeter: 2100, lengthMeter: 1200, topSpeedKmh: 318, brakingZoneStartMeter: 2000 },
      { straightName: 'Blanchimont Straight', startDistanceMeter: 5800, endDistanceMeter: 6900, lengthMeter: 1100, topSpeedKmh: 312, brakingZoneStartMeter: 6800 },
    ];
  } else {
    // Standard Circuit (Monza, Fuji, Imola, etc.)
    return [
      { straightName: 'Main Finish Straight', startDistanceMeter: 0, endDistanceMeter: 1100, lengthMeter: 1100, topSpeedKmh: 310, brakingZoneStartMeter: 1000 },
      { straightName: 'Back Straight', startDistanceMeter: Math.floor(trackLengthMeters * 0.45), endDistanceMeter: Math.floor(trackLengthMeters * 0.6), lengthMeter: 850, topSpeedKmh: 295, brakingZoneStartMeter: Math.floor(trackLengthMeters * 0.58) },
    ];
  }
}

export function calculateLiftAndCoastRecommendations(
  trackLengthMeters: number,
  coastingMetersPerStraight: number = 150
): LiftAndCoastRecommendation[] {
  const straights = calculateStraightSegments(trackLengthMeters);

  return straights.map((st) => {
    const suggestedLiftMarkerMeter = st.brakingZoneStartMeter - coastingMetersPerStraight;
    const distanceBeforeBrakingMeter = coastingMetersPerStraight;

    // Energy regen & fuel saved formulas
    const veSavedMJ = (coastingMetersPerStraight / 100) * 0.38; // ~0.57 MJ for 150m lift
    const fuelSaved = (coastingMetersPerStraight / 100) * 0.08; // ~0.12 L
    const timePenaltySec = (coastingMetersPerStraight / 100) * 0.075; // ~0.11s time loss

    const efficiencyRatio = timePenaltySec > 0 ? Number((veSavedMJ / timePenaltySec).toFixed(2)) : 0;

    return {
      straightName: st.straightName,
      suggestedLiftMarkerMeter,
      distanceBeforeBrakingMeter,
      coastingDistanceMeter: coastingMetersPerStraight,
      virtualEnergySavedMJPerLap: Number(veSavedMJ.toFixed(2)),
      lapTimePenaltySecPerLap: Number(timePenaltySec.toFixed(3)),
      fuelSavedLitersPerLap: Number(fuelSaved.toFixed(2)),
      efficiencyRatio,
    };
  });
}

export function calculateHypercarHybridDeployment(
  speedKmh: number,
  throttlePercent: number,
  carClass: string = 'Hypercar',
  batterySoC: number = 82
): HybridDeploymentStatus {
  const fiaspeedLimitKmh = 190; // FIA Hypercar MGU-K Speed Threshold
  const maxPowerCapKw = 520; // ~700 HP FIA BoP Power Cap

  if (carClass !== 'Hypercar') {
    const icePowerKw = Math.round((throttlePercent / 100) * maxPowerCapKw);
    return {
      currentSpeedKmh: Math.round(speedKmh),
      isFIAHybridActive: false,
      fiaspeedLimitKmh: 0,
      icePowerKw,
      electricMotorPowerKw: 0,
      totalPowerKw: icePowerKw,
      maxPowerCapKw,
      stateOfChargePercent: batterySoC,
      fiaComplianceStatus: 'COMPLIANT',
    };
  }

  const isFIAHybridActive = speedKmh >= fiaspeedLimitKmh && throttlePercent > 10;

  let icePowerKw = 0;
  let electricMotorPowerKw = 0;

  if (isFIAHybridActive) {
    // Hybrid Mode: Electric Motor supplies up to 200 kW, ICE supplies balance to max cap
    electricMotorPowerKw = Math.round((throttlePercent / 100) * 200);
    icePowerKw = Math.round((throttlePercent / 100) * (maxPowerCapKw - 200));
  } else {
    // Pure ICE Mode (under 190 km/h)
    icePowerKw = Math.round((throttlePercent / 100) * maxPowerCapKw);
    electricMotorPowerKw = 0;
  }

  const totalPowerKw = icePowerKw + electricMotorPowerKw;

  let fiaComplianceStatus: 'COMPLIANT' | 'MGU_INACTIVE_UNDER_SPEED' | 'POWER_LIMIT_OVERRUN' = 'COMPLIANT';

  if (speedKmh < fiaspeedLimitKmh && electricMotorPowerKw > 0) {
    fiaComplianceStatus = 'MGU_INACTIVE_UNDER_SPEED';
  } else if (totalPowerKw > maxPowerCapKw) {
    fiaComplianceStatus = 'POWER_LIMIT_OVERRUN';
  }

  return {
    currentSpeedKmh: Math.round(speedKmh),
    isFIAHybridActive,
    fiaspeedLimitKmh,
    icePowerKw,
    electricMotorPowerKw,
    totalPowerKw,
    maxPowerCapKw,
    stateOfChargePercent: batterySoC,
    fiaComplianceStatus,
  };
}
