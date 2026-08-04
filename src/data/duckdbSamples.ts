/**
 * Le Mans Ultimate - DuckDB Sample Telemetry Generator & Datasets
 */

export interface SampleTelemetryPoint {
  sample_id: number;
  timestamp_ms: number;
  lap_number: number;
  sector_number: number;
  track_distance_m: number;
  speed_kmh: number;
  rpm: number;
  gear: number;
  throttle_pct: number;
  brake_pct: number;
  steering_angle_deg: number;
  fuel_remaining_l: number;
  virtual_energy_mj: number;
  mgu_soc_pct: number;
  tire_temp_fl_c: number;
  tire_temp_fr_c: number;
  tire_temp_rl_c: number;
  tire_temp_rr_c: number;
  tire_wear_fl_pct: number;
  tire_wear_fr_pct: number;
  tire_wear_rl_pct: number;
  tire_wear_rr_pct: number;
  lat_accel_g: number;
  long_accel_g: number;
}

export function generateLMUSampleTelemetry(carName: string, trackName: string, laps: number = 4): SampleTelemetryPoint[] {
  const points: SampleTelemetryPoint[] = [];
  const trackLengthM = 5412; // Bahrain International Circuit
  const samplesPerLap = 150;
  let sampleId = 1;
  let startTimestamp = Date.now() - laps * 120000;

  for (let lap = 1; lap <= laps; lap++) {
    let fuelLiters = 13.0 - (lap - 1) * 2.85;
    let virtualEnergyMJ = 100.0 - (lap - 1) * 25.0;
    let mguSoC = 85.0;

    for (let i = 0; i < samplesPerLap; i++) {
      const progress = i / samplesPerLap;
      const trackDist = Math.round(progress * trackLengthM);
      const sector = progress < 0.35 ? 1 : progress < 0.7 ? 2 : 3;

      const timeDeltaMs = Math.round(progress * 115300); // ~1:55.30 lap time
      const currentTimestamp = startTimestamp + (lap - 1) * 115300 + timeDeltaMs;

      const rad = progress * Math.PI * 8;
      const straightFactor = Math.sin(progress * Math.PI * 4);
      let speedKmh = 140 + straightFactor * 100 + Math.cos(rad) * 35;
      speedKmh = Math.max(70, Math.min(260, Math.round(speedKmh)));

      const isBraking = Math.sin(rad * 2) < -0.4;
      const throttle = isBraking ? 0 : Math.min(100, Math.round((speedKmh / 260) * 100));
      const brake = isBraking ? Math.min(100, Math.round(Math.abs(Math.sin(rad * 2)) * 100)) : 0;

      const rpm = Math.round(5000 + (speedKmh / 260) * 3800);
      const gear = speedKmh < 90 ? 2 : speedKmh < 140 ? 3 : speedKmh < 180 ? 4 : speedKmh < 220 ? 5 : 6;
      const steeringAngle = Math.round(Math.sin(rad) * 45);

      fuelLiters -= 0.019;
      virtualEnergyMJ -= 0.16;
      mguSoC = Math.max(20, Math.min(100, mguSoC + (isBraking ? 1.5 : -0.4)));

      const baseTireTemp = 88 + (lap * 1.5);
      const tireTempFL = Math.round(baseTireTemp + Math.sin(rad) * 8);
      const tireTempFR = Math.round(baseTireTemp + Math.cos(rad) * 9);
      const tireTempRL = Math.round(baseTireTemp - 2 + Math.sin(rad) * 6);
      const tireTempRR = Math.round(baseTireTemp - 1 + Math.cos(rad) * 7);

      const latG = Number((Math.sin(rad * 2) * 2.8).toFixed(2));
      const longG = isBraking ? Number((-1 * (brake / 100) * 3.5).toFixed(2)) : Number(((throttle / 100) * 1.8).toFixed(2));

      points.push({
        sample_id: sampleId++,
        timestamp_ms: currentTimestamp,
        lap_number: lap,
        sector_number: sector,
        track_distance_m: trackDist,
        speed_kmh: speedKmh,
        rpm,
        gear,
        throttle_pct: throttle,
        brake_pct: brake,
        steering_angle_deg: steeringAngle,
        fuel_remaining_l: Number(Math.max(0, fuelLiters).toFixed(2)),
        virtual_energy_mj: Number(Math.max(0, virtualEnergyMJ).toFixed(2)),
        mgu_soc_pct: Number(mguSoC.toFixed(1)),
        tire_temp_fl_c: tireTempFL,
        tire_temp_fr_c: tireTempFR,
        tire_temp_rl_c: tireTempRL,
        tire_temp_rr_c: tireTempRR,
        tire_wear_fl_pct: Number((100 - lap * 1.2 - (i / samplesPerLap)).toFixed(1)),
        tire_wear_fr_pct: Number((100 - lap * 1.4 - (i / samplesPerLap)).toFixed(1)),
        tire_wear_rl_pct: Number((100 - lap * 0.9 - (i / samplesPerLap)).toFixed(1)),
        tire_wear_rr_pct: Number((100 - lap * 1.1 - (i / samplesPerLap)).toFixed(1)),
        lat_accel_g: latG,
        long_accel_g: longG,
      });
    }
  }

  return points;
}

export const SAMPLE_PRESETS = [
  {
    id: 'bahrain_ginetta_lmp3',
    name: 'Ginetta LMP3 - Bahrain (Qualifying Session Real File)',
    car: 'Ginetta LMP3',
    track: 'Bahrain International Circuit',
    filename: 'Ginetta-LMP3-1_55.309-Ryan.duckdb',
    isRealFile: false,
    fileUrl: '/samples/Ginetta-LMP3-1_55.309-Ryan.duckdb',
    laps: 4,
  },
];
