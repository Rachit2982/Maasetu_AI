import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  getDoc,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { db, auth } from './firebase';
import { PatientData, Alert, Message } from './types';
import { 
  Users, 
  Bell, 
  Plus, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Heart,
  Activity,
  Calendar,
  Phone,
  User as UserIcon,
  LogOut,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setHasError(true);
      setError(e.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg m-4">
        <h2 className="text-red-800 font-bold mb-2">Something went wrong</h2>
        <pre className="text-xs bg-white p-4 rounded border overflow-auto max-h-64">
          {error?.message || JSON.stringify(error, null, 2)}
        </pre>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reload App
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [hospitalName, setHospitalName] = useState('City Hospital');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<'patients' | 'alerts' | 'simulator'>('patients');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Auth ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Login cancelled by user.");
      } else {
        console.error("Login failed", error);
        alert("Login failed: " + error.message);
      }
    }
  };

  const handleLogout = () => auth.signOut();

  // --- Data Fetching ---
  useEffect(() => {
    if (!user || !isAuthReady) return;

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Firebase is offline. Check configuration.");
        }
      }
    };
    testConnection();

    const patientsUnsub = onSnapshot(query(collection(db, 'patients'), orderBy('name')), (snapshot) => {
      setPatients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PatientData)));
    }, (error) => handleFirestoreError(error, 'get', 'patients'));

    const alertsUnsub = onSnapshot(query(collection(db, 'alerts'), orderBy('timestamp', 'desc')), (snapshot) => {
      setAlerts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Alert)));
    }, (error) => handleFirestoreError(error, 'get', 'alerts'));

    return () => {
      patientsUnsub();
      alertsUnsub();
    };
  }, [user, isAuthReady]);

  const handleFirestoreError = (error: any, op: string, path: string) => {
    const errInfo = {
      error: error.message,
      operationType: op,
      path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  // --- Actions ---
  const registerPatient = async (data: Omit<PatientData, 'id' | 'risk'>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Registration failed');
      
      const result = await response.json();
      
      if (result.messages && (!result.messages.whatsapp || !result.messages.sms)) {
        let warning = "✅ Patient registered successfully!\n\n⚠️ Note: Some Twilio messages could not be sent:\n";
        if (!result.messages.whatsapp) warning += "- WhatsApp failed\n";
        if (!result.messages.sms) warning += "- SMS failed\n";
        warning += "\nThis usually happens if the phone number is not verified in your Twilio Trial account. You can verify it at twilio.com/user/account/phone-numbers/verified.";
        alert(warning);
      }
      
      setShowAddModal(false);
    } catch (error) {
      console.error("Registration failed", error);
      alert("Registration failed. Please check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  const markAlertHandled = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), { handled: true });
    } catch (error) {
      console.error("Failed to update alert", error);
    }
  };

  if (!isAuthReady) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-stone-50">
        <div className="p-8 bg-white rounded-2xl shadow-xl border border-stone-200 text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="text-emerald-600 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">MaaSetu</h1>
          <p className="text-stone-500 mb-8 italic serif">Empowering maternal health through AI-driven triage and monitoring.</p>
          <button 
            onClick={handleLogin}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
          >
            <UserIcon size={18} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-stone-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Heart className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">MaaSetu Dashboard</h1>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{hospitalName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-stone-900">{user.displayName}</p>
              <p className="text-xs text-stone-500">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-stone-400 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="w-64 bg-white border-r border-stone-200 p-4 flex flex-col gap-2">
            <NavButton 
              active={activeTab === 'patients'} 
              onClick={() => setActiveTab('patients')}
              icon={<Users size={18} />}
              label="Patients"
              count={patients.length}
            />
            <NavButton 
              active={activeTab === 'alerts'} 
              onClick={() => setActiveTab('alerts')}
              icon={<Bell size={18} />}
              label="Alerts"
              count={alerts.filter(a => !a.handled).length}
              urgent={alerts.some(a => !a.handled && a.risk === 'HIGH')}
            />
            <NavButton 
              active={activeTab === 'simulator'} 
              onClick={() => setActiveTab('simulator')}
              icon={<MessageSquare size={18} />}
              label="Simulator"
            />
          </nav>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'patients' && (
                <motion.div 
                  key="patients"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-stone-900">Registered Patients</h2>
                      <p className="text-stone-500">Manage and monitor all active maternal health records.</p>
                    </div>
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Plus size={18} />
                      Register Patient
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {patients.map(patient => (
                      <PatientCard key={patient.id} patient={patient} />
                    ))}
                    {patients.length === 0 && (
                      <div className="col-span-full py-20 text-center border-2 border-dashed border-stone-200 rounded-2xl">
                        <Users className="mx-auto text-stone-300 mb-4 w-12 h-12" />
                        <p className="text-stone-500">No patients registered yet.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'alerts' && (
                <motion.div 
                  key="alerts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-stone-900">Health Alerts</h2>
                    <p className="text-stone-500">Real-time notifications based on AI triage of patient messages.</p>
                  </div>

                  <div className="space-y-4">
                    {alerts.map(alert => (
                      <AlertItem key={alert.id} alert={alert} onHandle={() => markAlertHandled(alert.id!)} />
                    ))}
                    {alerts.length === 0 && (
                      <div className="py-20 text-center border-2 border-dashed border-stone-200 rounded-2xl">
                        <Bell className="mx-auto text-stone-300 mb-4 w-12 h-12" />
                        <p className="text-stone-500">No active alerts.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'simulator' && (
                <motion.div 
                  key="simulator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <WhatsAppSimulator patients={patients} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Add Patient Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                  <h3 className="text-lg font-bold text-stone-900">Register New Patient</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600">
                    <LogOut size={20} className="rotate-180" />
                  </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                  <RegistrationForm onSubmit={registerPatient} loading={loading} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

// --- Sub-components ---

function NavButton({ active, onClick, icon, label, count, urgent }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  count?: number; 
  urgent?: boolean; 
}) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center justify-between px-4 py-3 rounded-xl transition-all
        ${active ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-stone-500 hover:bg-stone-50'}
      `}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={`
          text-xs px-2 py-0.5 rounded-full
          ${urgent ? 'bg-red-500 text-white animate-pulse' : active ? 'bg-emerald-200 text-emerald-800' : 'bg-stone-100 text-stone-500'}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}

function PatientCard({ patient }: any) {
  const riskColors = {
    LOW: 'bg-emerald-100 text-emerald-700',
    MEDIUM: 'bg-orange-100 text-orange-700',
    HIGH: 'bg-red-100 text-red-700'
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 font-bold text-lg">
            {patient.name[0]}
          </div>
          <div>
            <h4 className="font-bold text-stone-900">{patient.name}</h4>
            <p className="text-xs text-stone-500">Age: {patient.age} • Month: {patient.month}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${riskColors[patient.risk]}`}>
          {patient.risk} RISK
        </span>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Calendar size={14} className="text-stone-400" />
          <span>EDD: {format(new Date(patient.expectedDelivery), 'MMM dd, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Phone size={14} className="text-stone-400" />
          <span>Wife: {patient.patientPhone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Phone size={14} className="text-stone-400" />
          <span>Husband: {patient.husbandPhone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <AlertTriangle size={14} className="text-red-400" />
          <span className="text-red-700 font-medium">Emergency: {patient.emergencyContactName} ({patient.emergencyContactPhone})</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Activity size={14} className="text-stone-400" />
          <span>Band: {patient.bandId}</span>
        </div>
        {patient.lastBandData && (
          <div className="mt-2 p-2 bg-stone-50 rounded-lg border border-stone-100">
            <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Live Band Data</p>
            <div className="flex justify-between text-xs">
              <span>❤️ {patient.lastBandData.heartRate} bpm</span>
              <span>🌡️ {patient.lastBandData.temperature}°C</span>
              {patient.lastBandData.faintDetected && <span className="text-red-500 font-bold">⚠️ FAINT</span>}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-stone-100 flex flex-wrap gap-2">
        {patient.history.bp && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">BP History</span>}
        {patient.history.diabetes && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">Diabetes</span>}
        {patient.history.previousPregnancy && <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200">Prev. Pregnancy</span>}
      </div>

      <div className="mt-4 flex gap-2">
        <button 
          onClick={async () => {
            const data = {
              heartRate: 110 + Math.floor(Math.random() * 20),
              temperature: 38.5 + Math.random(),
              faintDetected: Math.random() > 0.8,
              timestamp: new Date().toISOString()
            };
            await updateDoc(doc(db, 'patients', patient.id!), { lastBandData: data });
            if (data.faintDetected || data.heartRate > 120) {
              await addDoc(collection(db, 'alerts'), {
                patientId: patient.id,
                patientName: patient.name,
                risk: 'HIGH',
                summary: data.faintDetected ? 'Faint Detected by Band' : 'High Heart Rate Detected',
                message: `Band Data: HR ${data.heartRate}, Temp ${data.temperature.toFixed(1)}`,
                timestamp: new Date().toISOString(),
                handled: false
              });
            }
          }}
          className="flex-1 py-2 bg-stone-900 text-white text-xs rounded-lg hover:bg-stone-800 transition-colors"
        >
          Simulate Band Data
        </button>
      </div>
    </div>
  );
}

function AlertItem({ alert, onHandle }: any) {
  const riskColors = {
    LOW: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    MEDIUM: 'border-orange-200 bg-orange-50 text-orange-800',
    HIGH: 'border-red-200 bg-red-50 text-red-800'
  };

  return (
    <div className={`
      p-4 rounded-xl border flex items-start justify-between gap-4 transition-all
      ${alert.handled ? 'opacity-50 grayscale bg-stone-50 border-stone-200' : riskColors[alert.risk]}
    `}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${alert.risk === 'HIGH' ? 'bg-red-500 text-white animate-pulse' : 'bg-white/50'}`}>
          <AlertTriangle size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold">{alert.patientName}</h4>
            <span className="text-[10px] opacity-70">• {format(new Date(alert.timestamp), 'HH:mm, MMM dd')}</span>
          </div>
          <p className="text-sm font-medium mb-1">{alert.summary}</p>
          <p className="text-xs opacity-80 italic">"{alert.message}"</p>
        </div>
      </div>
      {!alert.handled && (
        <button 
          onClick={onHandle}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-current"
        >
          <CheckCircle size={14} />
          Handle
        </button>
      )}
    </div>
  );
}

function RegistrationForm({ onSubmit, loading }: { 
  onSubmit: (data: any) => void; 
  loading: boolean; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    month: 6,
    patientPhone: '+91',
    husbandPhone: '+91',
    emergencyContactName: '',
    emergencyContactPhone: '+91',
    hospitalId: 'City Hospital',
    hospitalName: 'City Hospital',
    bandId: 'BAND-' + Math.floor(Math.random() * 1000),
    history: {
      diabetes: false,
      bp: false,
      previousPregnancy: false,
      abortions: 0
    },
    skipTwilio: false,
    expectedDelivery: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Full Name</label>
          <input 
            required
            type="text" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="e.g. Rani Devi"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Wife's Phone (WhatsApp)</label>
          <input 
            required
            type="tel" 
            value={formData.patientPhone}
            onChange={e => setFormData({...formData, patientPhone: e.target.value})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="+91 9876543210"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Husband's Phone (SMS)</label>
          <input 
            required
            type="tel" 
            value={formData.husbandPhone}
            onChange={e => setFormData({...formData, husbandPhone: e.target.value})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="+91 9876543210"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Emergency Contact Name</label>
          <input 
            required
            type="text" 
            value={formData.emergencyContactName}
            onChange={e => setFormData({...formData, emergencyContactName: e.target.value})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="e.g. Ramesh Kumar"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Emergency Contact Phone</label>
          <input 
            required
            type="tel" 
            value={formData.emergencyContactPhone}
            onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="+91 9876543210"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Hospital Name</label>
          <input 
            required
            type="text" 
            value={formData.hospitalName}
            onChange={e => setFormData({...formData, hospitalName: e.target.value})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Band ID (Mandatory)</label>
          <input 
            required
            type="text" 
            value={formData.bandId}
            onChange={e => setFormData({...formData, bandId: e.target.value})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Age</label>
          <input 
            required
            type="number" 
            value={formData.age}
            onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Pregnancy Month</label>
          <input 
            required
            type="number" 
            min="1" max="9"
            value={formData.month}
            onChange={e => setFormData({...formData, month: parseInt(e.target.value)})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Expected Delivery</label>
          <input 
            required
            type="date" 
            value={formData.expectedDelivery}
            onChange={e => setFormData({...formData, expectedDelivery: e.target.value})}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Medical History</label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
            <input 
              type="checkbox" 
              checked={formData.history.diabetes}
              onChange={e => setFormData({...formData, history: {...formData.history, diabetes: e.target.checked}})}
              className="w-4 h-4 text-emerald-600"
            />
            <span className="text-sm">Diabetes</span>
          </label>
          <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
            <input 
              type="checkbox" 
              checked={formData.history.bp}
              onChange={e => setFormData({...formData, history: {...formData.history, bp: e.target.checked}})}
              className="w-4 h-4 text-emerald-600"
            />
            <span className="text-sm">High BP</span>
          </label>
          <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
            <input 
              type="checkbox" 
              checked={formData.history.previousPregnancy}
              onChange={e => setFormData({...formData, history: {...formData.history, previousPregnancy: e.target.checked}})}
              className="w-4 h-4 text-emerald-600"
            />
            <span className="text-sm">Prev. Pregnancy</span>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Abortions</span>
            <input 
              type="number" 
              value={formData.history.abortions}
              onChange={e => setFormData({...formData, history: {...formData.history, abortions: parseInt(e.target.value)}})}
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Notification Settings</label>
        <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
          <input 
            type="checkbox" 
            checked={formData.skipTwilio}
            onChange={e => setFormData({...formData, skipTwilio: e.target.checked})}
            className="w-4 h-4 text-emerald-600"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold">Skip Twilio Notifications</span>
            <span className="text-[10px] text-stone-500">Enable this if you are using a Twilio Trial account and haven't verified these numbers.</span>
          </div>
        </label>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50"
      >
        {loading ? 'Registering...' : 'Register Patient'}
      </button>
    </form>
  );
}

function WhatsAppSimulator({ patients }: { patients: PatientData[] }) {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPatientId) return;
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Message))
        .filter(m => m.patientId === selectedPatientId);
      setChat(msgs);
    });
    return () => unsub();
  }, [selectedPatientId]);

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!selectedPatientId || !message.trim() || loading) return;

    setLoading(true);
    try {
      const patient = patients.find(p => p.id === selectedPatientId)!;
      
      // Call the real webhook endpoint as if it came from Twilio
      const response = await fetch('/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          Body: message,
          From: `whatsapp:${patient.patientPhone}`
        })
      });

      if (!response.ok) throw new Error('Webhook failed');

      setMessage('');
    } catch (error) {
      console.error("Simulation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          Body: "Test message from Dashboard",
          From: "whatsapp:+910000000000"
        })
      });
      if (response.ok) {
        alert("Webhook test sent! Check the logs at /api/webhook/logs");
      } else {
        alert("Webhook test failed.");
      }
    } catch (error) {
      console.error("Test failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">WhatsApp Simulator</h2>
          <p className="text-stone-500 italic serif">Simulate a patient sending a message to test the AI triage logic.</p>
        </div>
        <div className="flex gap-2">
          <a 
            href="/api/webhook/logs" 
            target="_blank" 
            className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg text-sm font-bold hover:bg-stone-200 transition-colors"
          >
            View Debug Logs
          </a>
          <button 
            onClick={testWebhook}
            className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors"
          >
            Test Webhook Connection
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Selector */}
        <div className="md:col-span-1 space-y-4">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Select Patient</label>
          <div className="space-y-2 overflow-y-auto max-h-[500px]">
            {patients.map(p => (
              <button 
                key={p.id}
                onClick={() => setSelectedPatientId(p.id!)}
                className={`
                  w-full p-4 rounded-xl border text-left transition-all
                  ${selectedPatientId === p.id ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-stone-200 hover:bg-stone-50'}
                `}
              >
                <p className="font-bold text-stone-900">{p.name}</p>
                <p className="text-xs text-stone-500">Risk: {p.risk}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xl flex flex-col h-[600px]">
          <div className="p-4 border-b border-stone-100 flex items-center gap-3 bg-stone-50 rounded-t-2xl">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900">WhatsApp Chat</h3>
              <p className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">MaaSetu AI Assistant</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f0f2f5]">
            {selectedPatientId ? (
              <>
                {chat.map((m, i) => (
                  <div key={i} className={`flex ${m.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      max-w-[80%] p-3 rounded-2xl shadow-sm text-sm
                      ${m.sender === 'patient' ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}
                    `}>
                      <p className="text-stone-800 leading-relaxed">{m.text}</p>
                      <p className="text-[9px] text-stone-400 text-right mt-1">{format(new Date(m.timestamp), 'HH:mm')}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 opacity-50">
                <MessageSquare size={48} className="mb-4" />
                <p>Select a patient to start simulation</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-stone-50 border-t border-stone-100 rounded-b-2xl flex gap-2">
            <input 
              disabled={!selectedPatientId || loading}
              type="text" 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a symptom (e.g. 'Mujhe chakkar aa rahe hain')"
              className="flex-1 p-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <button 
              disabled={!selectedPatientId || !message.trim() || loading}
              type="submit"
              className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
