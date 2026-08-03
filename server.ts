import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // API Route: Download Python Telemetry Bridge script
  app.get('/api/download/python-bridge', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'lmu_telemetry_bridge.py');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/x-python');
      res.setHeader('Content-Disposition', 'attachment; filename="lmu_telemetry_bridge.py"');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Python bridge file not found.' });
    }
  });

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'LMU Telemetry Companion Server'
    });
  });

  // Attach WebSocket Server on /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Track connected clients
  const dashboardClients = new Set<WebSocket>();
  let activeBridgeSocket: WebSocket | null = null;
  let lastReceivedTelemetry: any = null;

  // Simulator state variables
  let simTime = 0;
  let simProgress = 0.0;
  let simLap = 1;
  let simFuelLiters = 88.5;
  let simVirtualEnergyMJ = 890.0;
  let simCarClass: 'Hypercar' | 'LMGT3' | 'LMP2' = 'Hypercar';
  let simCarId = 'ferrari_499p';
  let simTrackId = 'circuit_de_la_sarthe';
  let simWeather: 'DRY' | 'GREASY' | 'DAMP' | 'WET' | 'HEAVY_RAIN' = 'DRY';

  // Helper to generate simulated telemetry when no Python bridge is connected
  function generateSimulationFrame() {
    simTime += 0.066; // 15Hz
    simProgress += 0.00032;
    if (simProgress >= 1.0) {
      simProgress = 0.0;
      simLap += 1;
      simFuelLiters = Math.max(1, simFuelLiters - 2.85);
      simVirtualEnergyMJ = Math.max(10, simVirtualEnergyMJ - 28.5);
    }

    const distRad = simProgress * 2 * Math.PI;
    const speedBase = 220 + 95 * Math.sin(distRad * 3) + Math.sin(distRad * 7) * 35;
    const speedKmh = Math.max(65, Math.min(345, speedBase));
    const gear = Math.min(7, Math.max(1, 1 + Math.floor((speedKmh / 345) * 6)));
    const rpm = 4000 + Math.floor(((speedKmh % 50) / 50) * 4200);

    const isBraking = Math.sin(distRad * 3) < -0.3;
    const throttle = isBraking ? 0 : Math.min(1, speedKmh / 320 + 0.15);
    const brake = isBraking ? Math.min(1, Math.abs(Math.sin(distRad * 3))) : 0;

    return {
      timestampMs: Date.now(),
      sessionType: 'RACE',
      sessionTimeRemainingSeconds: Math.max(0, 21600 - Math.floor(simTime)),
      car: {
        id: simCarId,
        name: simCarId === 'ferrari_499p' ? 'Ferrari 499P' : 'Porsche 911 GT3 R',
        class: simCarClass,
        manufacturer: simCarId === 'ferrari_499p' ? 'Ferrari' : 'Porsche',
        fuelTankCapacityLiters: 90,
        virtualEnergyCapacityMJ: 910,
        maxRPM: 8500,
        shiftRPM: 8200,
        hasHybridSystem: simCarClass === 'Hypercar'
      },
      track: {
        id: simTrackId,
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
      speedKmh: Number(speedKmh.toFixed(1)),
      speedMph: Number((speedKmh * 0.621371).toFixed(1)),
      rpm,
      gear,
      inputs: {
        throttle: Number(throttle.toFixed(2)),
        brake: Number(brake.toFixed(2)),
        clutch: 0,
        steeringAngleDeg: Number((Math.sin(distRad * 5) * 42).toFixed(1))
      },
      fuelRemainingLiters: Number(simFuelLiters.toFixed(2)),
      fuelRemainingPercent: Number(((simFuelLiters / 90) * 100).toFixed(1)),
      fuelAvgPerLapLiters: 2.85,
      fuelLastLapLiters: 2.82,
      virtualEnergyRemainingMJ: Number(simVirtualEnergyMJ.toFixed(1)),
      virtualEnergyRemainingPercent: Number(((simVirtualEnergyMJ / 910) * 100).toFixed(1)),
      virtualEnergyAvgPerLapMJ: 28.5,
      virtualEnergyLastLapMJ: 28.1,
      estimatedLapsRemainingFuel: Number((simFuelLiters / 2.85).toFixed(1)),
      estimatedLapsRemainingVirtualEnergy: Number((simVirtualEnergyMJ / 28.5).toFixed(1)),
      lapNumber: simLap,
      currentLapTimeSeconds: Number((simProgress * 205.5).toFixed(2)),
      currentSector: simProgress < 0.28 ? 1 : simProgress < 0.65 ? 2 : 3,
      trackDistanceMeters: Math.round(simProgress * 13626),
      trackProgressPercent: Number((simProgress * 100).toFixed(2)),
      lastLapTimeSeconds: 205.42,
      bestLapTimeSeconds: 204.88,
      sectorDeltas: [
        { sector: 1, currentTimeSeconds: 52.05, bestTimeSeconds: 52.10, deltaSeconds: -0.05, isPersonalBest: true, isSessionBest: true },
        { sector: 2, currentTimeSeconds: 84.60, bestTimeSeconds: 84.40, deltaSeconds: 0.20, isPersonalBest: false, isSessionBest: false },
        { sector: 3, currentTimeSeconds: 68.90, bestTimeSeconds: 69.00, deltaSeconds: -0.10, isPersonalBest: true, isSessionBest: false }
      ],
      liveDeltaSeconds: Number((Math.sin(distRad) * 0.38).toFixed(3)),
      wheelSlip: {
        frontLeft: Number((0.01 + Math.random() * 0.02 + (isBraking ? 0.04 : 0)).toFixed(3)),
        frontRight: Number((0.01 + Math.random() * 0.02 + (isBraking ? 0.04 : 0)).toFixed(3)),
        rearLeft: Number((0.02 + Math.random() * 0.03 + throttle * 0.05).toFixed(3)),
        rearRight: Number((0.02 + Math.random() * 0.03 + throttle * 0.05).toFixed(3)),
      },
      damperVelocityMmS: {
        frontLeft: Math.round(-15 + Math.random() * 30),
        frontRight: Math.round(-15 + Math.random() * 30),
        rearLeft: Math.round(-12 + Math.random() * 25),
        rearRight: Math.round(-12 + Math.random() * 25),
      },
      diagnostics: {
        oilTempC: Number((105 + Math.sin(distRad) * 3).toFixed(1)),
        waterTempC: Number((92 + Math.cos(distRad) * 2).toFixed(1)),
        oilPressureBar: 5.4,
        boostBar: Number((1.2 + throttle * 0.75).toFixed(2)),
        torqueDemandPercent: Math.round(throttle * 100),
      },
      tires: {
        frontLeft: { tempCarcassC: 92, tempTreadInnerC: 94, tempTreadCenterC: 93, tempTreadOuterC: 91, pressureKPa: 202, wearPercent: 94, brakeTempC: 480 },
        frontRight: { tempCarcassC: 95, tempTreadInnerC: 97, tempTreadCenterC: 96, tempTreadOuterC: 94, pressureKPa: 205, wearPercent: 92, brakeTempC: 510 },
        rearLeft: { tempCarcassC: 90, tempTreadInnerC: 91, tempTreadCenterC: 90, tempTreadOuterC: 89, pressureKPa: 198, wearPercent: 95, brakeTempC: 420 },
        rearRight: { tempCarcassC: 93, tempTreadInnerC: 95, tempTreadCenterC: 94, tempTreadOuterC: 92, pressureKPa: 201, wearPercent: 93, brakeTempC: 450 }
      },
      electronics: {
        tc1: 4,
        tc2: 2,
        tc3: 2,
        abs: 3,
        engineMap: 1,
        brakeBiasPercent: 54.5,
        mguMode: 'Race Balanced',
        stateOfChargePercent: 84
      },
      ambientTempC: 22.5,
      trackTempC: 31.0,
      weatherCondition: simWeather,
      trackGripPercent: 98,
      inPitLane: false,
      pitLimiterActive: false,
      yellowFlagActive: false,
      lowFuelWarning: simFuelLiters < 10.0,
      lowEnergyWarning: simVirtualEnergyMJ < 80.0,
      highTireTempWarning: false
    };
  }

  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    dashboardClients.add(ws);

    // Send initial status
    ws.send(JSON.stringify({
      type: 'SERVER_STATUS',
      hasActiveBridge: activeBridgeSocket !== null && activeBridgeSocket.readyState === WebSocket.OPEN,
      connectedClients: dashboardClients.size
    }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        
        if (parsed.type === 'BRIDGE_HANDSHAKE') {
          activeBridgeSocket = ws;
          console.log('[WS] Python LMU Bridge connected successfully.');
          // Notify dashboards
          broadcastToDashboards({
            type: 'BRIDGE_STATUS',
            connected: true,
            clientName: parsed.clientName
          });
        } else if (parsed.type === 'TELEMETRY_UPDATE') {
          lastReceivedTelemetry = parsed.data;
          broadcastToDashboards({
            type: 'TELEMETRY_FRAME',
            source: 'PYTHON_BRIDGE',
            data: parsed.data
          });
        } else if (parsed.type === 'SIMULATOR_CONFIG') {
          if (parsed.weather) simWeather = parsed.weather;
          if (parsed.carClass) simCarClass = parsed.carClass;
          if (parsed.carId) simCarId = parsed.carId;
          if (parsed.trackId) simTrackId = parsed.trackId;
          if (parsed.refillFuel) {
            simFuelLiters = 90;
            simVirtualEnergyMJ = 910;
          }
        }
      } catch (err) {
        console.error('[WS Error] Error parsing message:', err);
      }
    });

    ws.on('close', () => {
      dashboardClients.delete(ws);
      if (ws === activeBridgeSocket) {
        activeBridgeSocket = null;
        console.log('[WS] Python LMU Bridge disconnected.');
        broadcastToDashboards({
          type: 'BRIDGE_STATUS',
          connected: false
        });
      }
    });
  });

  function broadcastToDashboards(payload: any) {
    const dataStr = JSON.stringify(payload);
    for (const client of dashboardClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(dataStr);
      }
    }
  }

  // 15Hz Broadcast loop for dashboards
  setInterval(() => {
    // If no active Python bridge is streaming telemetry, use simulated telemetry
    if (!activeBridgeSocket || activeBridgeSocket.readyState !== WebSocket.OPEN) {
      const simFrame = generateSimulationFrame();
      broadcastToDashboards({
        type: 'TELEMETRY_FRAME',
        source: 'SIMULATOR',
        data: simFrame
      });
    }
  }, 66); // ~15 Hz

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[LMU Telemetry Companion] Express + WebSocket server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
