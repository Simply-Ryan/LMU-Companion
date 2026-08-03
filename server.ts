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
