import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { TelemetryFrame, ConnectionSource } from '../types';
import { LMU_CARS, LMU_TRACKS } from '../data/lmuData';
import { UserCircle, Mail, Key, LogOut, Settings, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase';

export default function AccountPage() {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setEditName(currentUser.displayName || '');
        setEditPhotoURL(currentUser.photoURL || '');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
        setUser({ ...cred.user, displayName: username } as any);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, {
        displayName: editName,
        photoURL: editPhotoURL
      });
      setUser({ ...auth.currentUser, displayName: editName, photoURL: editPhotoURL } as any);
      setEditingProfile(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

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
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!user ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <UserCircle className="w-16 h-16 text-amber-500 mx-auto" />
              <h1 className="text-2xl font-black text-white">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
              <p className="text-slate-400 text-sm">Sign in to save telemetry files and participate in the community.</p>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                    placeholder="E.g., RacerX"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-amber-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-amber-500"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg transition">
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="relative flex items-center justify-center border-t border-slate-800 pt-6">
              <span className="absolute bg-slate-900 px-3 text-xs text-slate-500 uppercase font-bold tracking-wider -top-2">Or continue with</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleGoogleAuth} className="w-full bg-white hover:bg-slate-200 text-slate-900 font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Google
              </button>
              
              <button onClick={() => setError('Apple Auth requires provisioning an App ID in Apple Developer Console.')} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.41.03 2.53.64 3.28 1.7-2.7 1.67-2.24 5.71.56 6.84-.71 1.77-1.64 3.43-2.51 4.39zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Apple
              </button>

              <button onClick={() => setError('Discord Auth requires OAuth credentials setup in Discord Developer Portal.')} className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                Discord
              </button>
              
              <button onClick={() => setError('Facebook Auth requires App ID provisioning in Meta Developer Portal.')} className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </button>
            </div>

            <p className="text-center text-sm text-slate-400 pt-4">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button onClick={() => setIsLogin(!isLogin)} className="text-amber-500 font-bold hover:underline">
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-800"></div>
            
            <div className="px-8 pb-8">
              <div className="flex justify-between items-end -mt-12 mb-6">
                <div className="relative group">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-900 bg-slate-800 object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center text-4xl font-bold text-slate-400 uppercase">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                    </div>
                  )}
                  {editingProfile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full border-4 border-transparent cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                
                <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium text-sm">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>

              {!editingProfile ? (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black text-white">{user.displayName || 'Anonymous User'}</h1>
                    <p className="text-slate-400">{user.email}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Account ID</p>
                      <p className="text-sm font-mono text-slate-300 truncate">{user.uid}</p>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                      <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Active
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setEditingProfile(true)} 
                    className="flex items-center gap-2 text-amber-500 hover:text-amber-400 font-bold transition"
                  >
                    <Settings className="w-4 h-4" /> Edit Profile
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-w-md">
                  <h2 className="text-xl font-bold text-white mb-4">Edit Profile</h2>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                      placeholder="Username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avatar URL</label>
                    <input
                      type="text"
                      value={editPhotoURL}
                      onChange={(e) => setEditPhotoURL(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button 
                      onClick={handleUpdateProfile} 
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
                    >
                      Save Changes
                    </button>
                    <button 
                      onClick={() => setEditingProfile(false)} 
                      className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
