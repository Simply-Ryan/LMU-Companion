import React, { useState } from 'react';
import { Download, Terminal, CheckCircle2, Copy, AlertTriangle, X, Shield, Cpu, ExternalLink } from 'lucide-react';

interface PythonBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
}

export const PythonBridgeModal: React.FC<PythonBridgeModalProps> = ({
  isOpen,
  onClose,
  isConnected,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const bridgeScriptCode = `#!/usr/bin/env python3
# Le Mans Ultimate (LMU) Telemetry Bridge Script
import asyncio, json, math, sys, time, argparse
import websockets

# Install dependencies: pip install websockets pywin32
# Usage: python lmu_telemetry_bridge.py --server ws://localhost:3000/ws
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText("pip install websockets pywin32\npython lmu_telemetry_bridge.py --server ws://localhost:3000/ws");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
              LMU Python Telemetry Bridge
              {isConnected ? (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live LMU Active
                </span>
              ) : (
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-medium">
                  Disconnected (No Live Feed)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Connect Le Mans Ultimate on your Windows PC to this dashboard via shared memory
            </p>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="space-y-4 text-sm">
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-2">
            <h3 className="font-semibold text-amber-400 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> 1. Enable Shared Memory in Le Mans Ultimate
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ensure Le Mans Ultimate is installed on Windows. LMU uses the standard rFactor 2 shared memory layout. No extra in-game plugin is required for standard telemetry!
            </p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-3">
            <h3 className="font-semibold text-amber-400 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> 2. Install Python Dependencies & Run Script
            </h3>
            <p className="text-xs text-slate-300">
              Open Windows Command Prompt or PowerShell and run:
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between gap-2 overflow-x-auto">
              <span>pip install websockets pywin32</span>
              <button
                onClick={copyToClipboard}
                className="text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700 text-[11px]"
              >
                <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-3">
            <h3 className="font-semibold text-amber-400 flex items-center gap-2">
              <Download className="w-4 h-4" /> 3. Download & Launch Bridge Script
            </h3>
            <p className="text-xs text-slate-300">
              Download the python bridge script directly and launch it on your racing PC:
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="/api/download/python-bridge"
                download="lmu_telemetry_bridge.py"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20"
              >
                <Download className="w-4 h-4" /> Download lmu_telemetry_bridge.py
              </a>
              <span className="text-xs text-slate-400">or run: <code className="text-slate-200">python lmu_telemetry_bridge.py</code></span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-200">Local Network Telemetry:</strong> To view telemetry on a mobile device or tablet on the same Wi-Fi network, launch the Python script with your local server IP: <code className="text-sky-300">--server ws://192.168.x.x:3000/ws</code>.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
