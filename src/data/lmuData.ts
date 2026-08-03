import { CarInfo, TrackInfo } from '../types';

export const LMU_CARS: CarInfo[] = [
  {
    id: 'ginetta_lmp3',
    name: 'Ginetta LMP3',
    class: 'LMP3',
    manufacturer: 'Ginetta',
    fuelTankCapacityLiters: 90,
    virtualEnergyCapacityMJ: 0,
    maxRPM: 7500,
    shiftRPM: 7200,
    hasHybridSystem: false,
  },
  // Hypercars (LMH / LMDh)
  {
    id: 'ferrari_499p',
    name: 'Ferrari 499P',
    class: 'Hypercar',
    manufacturer: 'Ferrari',
    fuelTankCapacityLiters: 90,
    virtualEnergyCapacityMJ: 910,
    maxRPM: 8500,
    shiftRPM: 8200,
    hasHybridSystem: true,
  },
  {
    id: 'porsche_963',
    name: 'Porsche 963 LMDh',
    class: 'Hypercar',
    manufacturer: 'Porsche',
    fuelTankCapacityLiters: 90,
    virtualEnergyCapacityMJ: 905,
    maxRPM: 8200,
    shiftRPM: 7900,
    hasHybridSystem: true,
  },
  {
    id: 'toyota_gr010',
    name: 'Toyota GR010 Hybrid',
    class: 'Hypercar',
    manufacturer: 'Toyota',
    fuelTankCapacityLiters: 90,
    virtualEnergyCapacityMJ: 915,
    maxRPM: 8800,
    shiftRPM: 8450,
    hasHybridSystem: true,
  },
  {
    id: 'cadillac_v_series_r',
    name: 'Cadillac V-Series.R',
    class: 'Hypercar',
    manufacturer: 'Cadillac',
    fuelTankCapacityLiters: 90,
    virtualEnergyCapacityMJ: 908,
    maxRPM: 8800,
    shiftRPM: 8500,
    hasHybridSystem: true,
  },
  {
    id: 'bmw_m_hybrid_v8',
    name: 'BMW M Hybrid V8',
    class: 'Hypercar',
    manufacturer: 'BMW',
    fuelTankCapacityLiters: 90,
    virtualEnergyCapacityMJ: 912,
    maxRPM: 8200,
    shiftRPM: 7850,
    hasHybridSystem: true,
  },
  // LMGT3
  {
    id: 'porsche_911_gt3_r',
    name: 'Porsche 911 GT3 R (992)',
    class: 'LMGT3',
    manufacturer: 'Porsche',
    fuelTankCapacityLiters: 110,
    virtualEnergyCapacityMJ: 1250,
    maxRPM: 9200,
    shiftRPM: 8900,
    hasHybridSystem: false,
  },
  {
    id: 'ferrari_296_gt3',
    name: 'Ferrari 296 GT3',
    class: 'LMGT3',
    manufacturer: 'Ferrari',
    fuelTankCapacityLiters: 105,
    virtualEnergyCapacityMJ: 1240,
    maxRPM: 8200,
    shiftRPM: 7900,
    hasHybridSystem: false,
  },
  // LMP2
  {
    id: 'oreca_07_gibson',
    name: 'Oreca 07 Gibson',
    class: 'LMP2',
    manufacturer: 'Oreca',
    fuelTankCapacityLiters: 75,
    virtualEnergyCapacityMJ: 0,
    maxRPM: 8500,
    shiftRPM: 8250,
    hasHybridSystem: false,
  }
];

export const LMU_TRACKS: TrackInfo[] = [
  {
    id: 'bahrain_international_circuit',
    name: 'Bahrain International Circuit',
    country: 'Bahrain',
    lengthMeters: 5412,
    typicalLapTimeSeconds: 115.309, // 1:55.309 pole lap
    sectors: [
      { number: 1, name: 'S1: Turn 1 to Turn 4', distanceMeter: 1800, idealTimeSeconds: 30.5 },
      { number: 2, name: 'S2: Technical Sector Turn 5-13', distanceMeter: 3800, idealTimeSeconds: 48.0 },
      { number: 3, name: 'S3: Turn 14 to Finish Straight', distanceMeter: 5412, idealTimeSeconds: 36.8 }
    ]
  },
  {
    id: 'circuit_de_la_sarthe',
    name: 'Circuit de la Sarthe (Le Mans)',
    country: 'France',
    lengthMeters: 13626,
    typicalLapTimeSeconds: 205.5,
    sectors: [
      { number: 1, name: 'S1: Dunlop Curve to Tetre Rouge', distanceMeter: 3800, idealTimeSeconds: 52.1 },
      { number: 2, name: 'S2: Mulsanne Chicanes to Mulsanne Corner', distanceMeter: 8900, idealTimeSeconds: 84.4 },
      { number: 3, name: 'S3: Indianapolis, Porsche Curves to Finish', distanceMeter: 13626, idealTimeSeconds: 69.0 }
    ]
  },
  {
    id: 'spa_francorchamps',
    name: 'Circuit de Spa-Francorchamps',
    country: 'Belgium',
    lengthMeters: 7004,
    typicalLapTimeSeconds: 122.0,
    sectors: [
      { number: 1, name: 'S1: La Source, Eau Rouge & Kemmel Straight', distanceMeter: 2200, idealTimeSeconds: 38.2 },
      { number: 2, name: 'S2: Les Combes to Stavelot', distanceMeter: 5300, idealTimeSeconds: 47.5 },
      { number: 3, name: 'S3: Blanchimont to Bus Stop Chicane', distanceMeter: 7004, idealTimeSeconds: 36.3 }
    ]
  },
  {
    id: 'fuji_speedway',
    name: 'Fuji Speedway',
    country: 'Japan',
    lengthMeters: 4563,
    typicalLapTimeSeconds: 88.5,
    sectors: [
      { number: 1, name: 'S1: 1.5km Main Straight & T1 TGR Corner', distanceMeter: 1600, idealTimeSeconds: 23.8 },
      { number: 2, name: 'S2: Coca-Cola, 100R & Hairpin', distanceMeter: 3200, idealTimeSeconds: 32.1 },
      { number: 3, name: 'S3: Technical Dunlop & Sector 3 Chicane', distanceMeter: 4563, idealTimeSeconds: 32.6 }
    ]
  }
];

export const OPTIMAL_TIRE_TEMP = {
  minC: 75,
  optimalC: 92,
  maxC: 110,
  overheatC: 120
};

export const OPTIMAL_TIRE_PRESSURE_KPA = 200;
