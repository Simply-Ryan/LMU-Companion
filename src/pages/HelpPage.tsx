import React from 'react';
import { Header } from '../components/Header';
import { TelemetryFrame, ConnectionSource } from '../types';
import { LMU_CARS, LMU_TRACKS } from '../data/lmuData';
import { HelpCircle, Terminal, FileCode, CheckCircle, Database } from 'lucide-react';

export default function HelpPage() {
  const dummyTelemetry: TelemetryFrame = {
    timestampMs: Date.now(),
    sessionType: 'PRACTICE',
    sessionTimeRemainingSeconds: 0,
    car: LMU_CARS[0],
    track: LMU_TRACKS[0],
    speedKmh: 0,
    speedMph: 0,
    rpm: 0,
    gear: 0,
    inputs: { throttle: 0, brake: 0, clutch: 0, steeringAngleDeg: 0 },
    fuelRemainingLiters: 0,
    fuelRemainingPercent: 0,
    fuelAvgPerLapLiters: 0,
    fuelLastLapLiters: 0,
    virtualEnergyRemainingMJ: 0,
    virtualEnergyRemainingPercent: 0,
    virtualEnergyAvgPerLapMJ: 0,
    virtualEnergyLastLapMJ: 0,
    estimatedLapsRemainingFuel: 0,
    estimatedLapsRemainingVirtualEnergy: 0,
    lapNumber: 0,
    currentLapTimeSeconds: 0,
    currentSector: 1,
    trackDistanceMeters: 0,
    trackProgressPercent: 0,
    lastLapTimeSeconds: 0,
    bestLapTimeSeconds: 0,
    sectorDeltas: [],
    liveDeltaSeconds: 0,
    tires: {
      frontLeft: { tempCarcassC: 0, tempTreadInnerC: 0, tempTreadCenterC: 0, tempTreadOuterC: 0, pressureKPa: 0, wearPercent: 100, brakeTempC: 0 },
      frontRight: { tempCarcassC: 0, tempTreadInnerC: 0, tempTreadCenterC: 0, tempTreadOuterC: 0, pressureKPa: 0, wearPercent: 100, brakeTempC: 0 },
      rearLeft: { tempCarcassC: 0, tempTreadInnerC: 0, tempTreadCenterC: 0, tempTreadOuterC: 0, pressureKPa: 0, wearPercent: 100, brakeTempC: 0 },
      rearRight: { tempCarcassC: 0, tempTreadInnerC: 0, tempTreadCenterC: 0, tempTreadOuterC: 0, pressureKPa: 0, wearPercent: 100, brakeTempC: 0 },
    },
    electronics: { tc1: 0, tc2: 0, tc3: 0, abs: 0, engineMap: 0, brakeBiasPercent: 50, mguMode: '', stateOfChargePercent: 0 },
    ambientTempC: 0,
    trackTempC: 0,
    weatherCondition: 'DRY',
    trackGripPercent: 0,
    inPitLane: true,
    pitLimiterActive: false,
    yellowFlagActive: false,
    lowFuelWarning: false,
    lowEnergyWarning: false,
    highTireTempWarning: false,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header
        telemetry={dummyTelemetry}
        connectionSource="NO_DATA"
        isPythonBridgeConnected={false}
        onOpenPythonBridgeModal={() => {}}
        audioShiftBeep={false}
        setAudioShiftBeep={() => {}}
      />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">
        <div className="text-center space-y-4">
          <HelpCircle className="w-16 h-16 text-sky-400 mx-auto" />
          <h1 className="text-4xl font-black text-white">Help & Guides</h1>
          <p className="text-slate-400 text-lg">Everything you need to set up and use LMU Companion.</p>
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Terminal className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl font-bold text-white">Live Python Bridge Setup</h2>
          </div>
          <div className="space-y-4 text-slate-300">
            <p>To view live telemetry from Le Mans Ultimate, you need to run the Python Bridge on the same PC where the game is running.</p>
            <ol className="list-decimal pl-6 space-y-3">
              <li>
                <strong>Download the script:</strong> <br/>
                Download the <code className="text-amber-400 bg-slate-950 px-1 rounded">lmu_telemetry_bridge.py</code> file from the root of this app.
              </li>
              <li>
                <strong>Install requirements:</strong> <br/>
                You will need Python 3 installed. Open a command prompt and run: <br/>
                <code className="text-amber-400 bg-slate-950 px-2 py-1 rounded block mt-1">pip install websockets pyvjoy</code> (if using vJoy)
              </li>
              <li>
                <strong>Run the script:</strong> <br/>
                Execute the script while Le Mans Ultimate is open and you are on track: <br/>
                <code className="text-amber-400 bg-slate-950 px-2 py-1 rounded block mt-1">python lmu_telemetry_bridge.py</code>
              </li>
              <li>
                <strong>Connect:</strong> <br/>
                Once the script is running, the app will automatically connect to it via WebSockets. The connection indicator in the top header will turn green.
              </li>
            </ol>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Database className="w-6 h-6 text-sky-400" />
            <h2 className="text-2xl font-bold text-white">Using DuckDB Analyzer</h2>
          </div>
          <div className="space-y-4 text-slate-300">
            <p>You can upload logged telemetry files to analyze them locally in your browser.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Supported formats include <strong>.duckdb</strong>, <strong>.db</strong>, <strong>.csv</strong>, and <strong>.parquet</strong>.</li>
              <li>Le Mans Ultimate native <code>.duckdb</code> files are fully supported. The app will automatically flatten and join all the different sensor tables inside the file into one unified table called <code>lmu_telemetry</code>.</li>
              <li>Simply drag and drop the file into the upload zone on the Dashboard.</li>
              <li>The engine runs entirely in your browser using WASM, ensuring complete privacy and fast query times.</li>
            </ul>

            <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800">
              <h3 className="font-bold text-slate-200 mb-2">Offline DuckDB Conversion Tool</h3>
              <p className="text-sm text-slate-400 mb-2">If you have a very large <code>.duckdb</code> file and the browser struggles to join all the multi-channel tables, you can use our offline Python tool to convert the file into a flat CSV before uploading:</p>
              <code className="text-amber-400 bg-slate-900 px-2 py-1 rounded block text-sm">python lmu_duckdb_converter.py my_session.duckdb output.csv</code>
              <p className="text-sm text-slate-400 mt-2">Download the script: <code>/lmu_duckdb_converter.py</code></p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-4">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-200">Why does it say "No Telemetry Data Available"?</h3>
              <p className="text-slate-400 mt-1">This means neither the live Python bridge is connected, nor a telemetry file has been loaded. Follow the guide above to connect the bridge.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-200">How accurate is the Virtual Energy calculator?</h3>
              <p className="text-slate-400 mt-1">The calculator uses your exact telemetry inputs from the game's shared memory. It provides lap-by-lap averages, but is an estimate based on recent driving style.</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
