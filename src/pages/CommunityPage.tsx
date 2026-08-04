import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { TelemetryFrame, ConnectionSource } from '../types';
import { LMU_CARS, LMU_TRACKS } from '../data/lmuData';
import { Users, MessageSquare, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, doc, increment, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'forum' | 'features'>('features');
  const [featureRequests, setFeatureRequests] = useState<any[]>([]);
  const [newRequestTitle, setNewRequestTitle] = useState('');
  const [newRequestDesc, setNewRequestDesc] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'featureRequests'), orderBy('votes', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: any[] = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      setFeatureRequests(requests);
    });
    return () => unsubscribe();
  }, []);

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestTitle.trim() || !newRequestDesc.trim()) return;
    try {
      await addDoc(collection(db, 'featureRequests'), {
        title: newRequestTitle,
        description: newRequestDesc,
        votes: 1,
        author: auth.currentUser?.displayName || 'Anonymous',
        createdAt: new Date().toISOString()
      });
      setNewRequestTitle('');
      setNewRequestDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (id: string, value: number) => {
    try {
      await updateDoc(doc(db, 'featureRequests', id), {
        votes: increment(value)
      });
    } catch (err) {
      console.error(err);
    }
  };

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
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <Users className="w-12 h-12 text-sky-400" />
            <div>
              <h1 className="text-3xl font-black text-white">Community</h1>
              <p className="text-slate-400">Join the discussion and help shape the future.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('features')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'features' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              Feature Requests
            </button>
            <button
              onClick={() => setActiveTab('forum')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'forum' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              General Forum
            </button>
          </div>
        </div>

        {activeTab === 'features' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" /> Top Feature Requests
              </h2>
              {featureRequests.length === 0 ? (
                <div className="text-slate-400 p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800">
                  No requests yet. Be the first to suggest one!
                </div>
              ) : (
                <div className="space-y-3">
                  {featureRequests.map((req) => (
                    <div key={req.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex gap-4 hover:border-slate-700 transition">
                      <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                        <button onClick={() => handleVote(req.id, 1)} className="p-1 hover:text-amber-500 hover:bg-amber-500/10 rounded transition text-slate-400"><ArrowUp className="w-5 h-5" /></button>
                        <span className="font-bold text-white">{req.votes}</span>
                        <button onClick={() => handleVote(req.id, -1)} className="p-1 hover:text-sky-500 hover:bg-sky-500/10 rounded transition text-slate-400"><ArrowDown className="w-5 h-5" /></button>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-200">{req.title}</h3>
                        <p className="text-slate-400 text-sm mt-1">{req.description}</p>
                        <p className="text-xs text-slate-500 mt-3 font-mono">Suggested by {req.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit sticky top-24">
              <h3 className="font-bold text-lg text-white mb-4">Submit a Request</h3>
              <form onSubmit={handleAddRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title</label>
                  <input
                    type="text"
                    value={newRequestTitle}
                    onChange={(e) => setNewRequestTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                    placeholder="E.g., Add Motec Export"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    value={newRequestDesc}
                    onChange={(e) => setNewRequestDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white h-24 focus:outline-none focus:border-amber-500"
                    placeholder="Describe how this feature would work..."
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={!auth.currentUser}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  {auth.currentUser ? 'Submit Request' : 'Sign in to Submit'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'forum' && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
            <h2 className="text-2xl font-bold text-white">General Forum</h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              The full forum system is coming soon. For now, please use the Feature Requests tab to suggest ideas!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
