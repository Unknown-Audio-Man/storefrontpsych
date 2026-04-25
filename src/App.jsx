import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, User, Mail, Search, ChevronRight, 
  MapPin, Phone, CheckCircle, AlertCircle, Loader2,
  CalendarCheck, Shield, Filter, LogOut, Check, X, ShieldCheck,
  ArrowRight, Heart
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';

// ============================================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ============================================================================
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    return JSON.parse(__firebase_config);
  }
  return {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  };
};

const app = initializeApp(getFirebaseConfig());
const auth = getAuth(app);
const db = getFirestore(app);

const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'lakshmi-clinical-portal';
const ADMIN_CODE = 'CLINICAL2026';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border ${isError ? 'bg-red-50 border-red-100 text-red-800' : 'bg-teal-50 border-teal-100 text-teal-900'} transition-all duration-500 ease-out animate-slide-in-right backdrop-blur-sm`}>
      {isError ? <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
      <span className="font-medium text-sm pr-2">{message}</span>
      <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100 transition-opacity p-1 hover:bg-black/5 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [dbError, setDbError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });
  
  const [bookings, setBookings] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingForm, setBookingForm] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const [trackEmail, setTrackEmail] = useState('');
  const [trackRef, setTrackRef] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  
  const [footerClickCount, setFooterClickCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [scrolled, setScrolled] = useState(false);

  // Scroll listener for navbar glass effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --------------------------------------------------------------------------
  // FIREBASE INITIALIZATION & SUBSCRIPTIONS
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (isMounted) showToast("Authentication issue. Some features may be offline.", "error");
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) setUser(currentUser);
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', 'bookings');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setBookings(data);
      setDbError(null);
    }, (error) => {
      console.error("Firestore Subscription Error:", error);
      setDbError(error.message);
    });

    return () => unsubscribe();
  }, [user]);

  // --------------------------------------------------------------------------
  // LOGIC: UTILITIES
  // --------------------------------------------------------------------------
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 5000);
  };

  const generateRefId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'LM-';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

  const upcomingDays = useMemo(() => {
    const days = [];
    let current = new Date();
    current.setHours(0,0,0,0);
    
    while(days.length < 14) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        days.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, []);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !bookingForm.name || !bookingForm.email) {
      showToast("Please complete all fields and select a time slot.", "error");
      return;
    }
    if (!user) {
      showToast("System not initialized. Please refresh the page.", "error");
      return;
    }

    setIsSubmitting(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const isTaken = bookings.some(b => b.date === dateStr && b.time === selectedTime && b.status !== 'Cancelled');
    if (isTaken) {
      showToast("This slot is no longer available. Please select another.", "error");
      setIsSubmitting(false);
      return;
    }

    const refId = generateRefId();
    const newBooking = {
      date: dateStr,
      time: selectedTime,
      name: bookingForm.name,
      email: bookingForm.email,
      refId: refId,
      status: 'Pending',
      createdAt: Date.now(),
      userId: user.uid
    };

    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'bookings'), newBooking);
      setBookingSuccess(newBooking);
      setBookingForm({ name: '', email: '' });
      setSelectedTime(null);
      setSelectedDate(null);
      showToast("Appointment requested successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to book appointment. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackAppointment = (e) => {
    e.preventDefault();
    setIsTrackLoading(true);
    setTimeout(() => {
      const found = bookings.find(b => b.email.toLowerCase() === trackEmail.toLowerCase() && b.refId === trackRef.toUpperCase());
      setTrackResult(found || 'not_found');
      setIsTrackLoading(false);
    }, 600); // Artificial delay for UX
  };

  const handleAdminStatusChange = async (id, newStatus) => {
    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'bookings', id);
      await updateDoc(docRef, { status: newStatus });
      showToast(`Status beautifully updated to ${newStatus}`);
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  const handleFooterClick = () => {
    const newCount = footerClickCount + 1;
    setFooterClickCount(newCount);
    if (newCount === 3) {
      setShowAdminLogin(true);
      setFooterClickCount(0);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput === ADMIN_CODE) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setCurrentView('admin');
      showToast("Dashboard Access Granted");
    } else {
      showToast("Invalid authorization code.", "error");
    }
    setAdminPasswordInput('');
  };

  // --------------------------------------------------------------------------
  // RENDER: Admin Dashboard
  // --------------------------------------------------------------------------
  if (currentView === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] font-body text-stone-800 p-6 md:p-10">
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
        
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Admin Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100">
                <ShieldCheck className="w-7 h-7 text-teal-700" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-semibold text-stone-900">Clinical Dashboard</h1>
                <p className="text-stone-500 font-medium">Lakshmi Mupparthi • Restricted Access</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-stone-50 rounded-full border border-stone-100">
                <div className={`w-2.5 h-2.5 rounded-full ${dbError ? 'bg-red-500 animate-pulse' : 'bg-teal-500'}`} />
                <span className="text-stone-600">{dbError ? 'DB Disconnected' : 'System Online'}</span>
              </div>
              <button 
                onClick={() => setCurrentView('home')}
                className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-full transition-all text-sm font-medium shadow-md hover:shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                Exit Portal
              </button>
            </div>
          </div>

          {/* Admin Table */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h2 className="text-lg font-heading font-semibold text-stone-900">Recent Appointments</h2>
              <span className="bg-white border border-stone-200 text-stone-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">{bookings.length} Total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-xs uppercase tracking-wider text-stone-400 border-b border-stone-100">
                    <th className="p-6 font-medium">Date & Time</th>
                    <th className="p-6 font-medium">Patient Details</th>
                    <th className="p-6 font-medium">Reference ID</th>
                    <th className="p-6 font-medium">Status</th>
                    <th className="p-6 font-medium">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="font-semibold text-stone-800 mb-1">{b.date}</div>
                        <div className="text-sm text-teal-700 font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {b.time}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="font-semibold text-stone-800 mb-1">{b.name}</div>
                        <div className="text-sm text-stone-500 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> {b.email}
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="font-mono text-sm px-3 py-1 bg-stone-100 text-stone-600 rounded-lg border border-stone-200">{b.refId}</span>
                      </td>
                      <td className="p-6">
                        <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide flex w-max items-center gap-1.5
                          ${b.status === 'Confirmed' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 
                            b.status === 'Cancelled' ? 'bg-red-50 text-red-700 border border-red-100' : 
                            'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {b.status === 'Confirmed' && <CheckCircle className="w-3 h-3" />}
                          {b.status === 'Pending' && <Clock className="w-3 h-3" />}
                          {b.status}
                        </span>
                      </td>
                      <td className="p-6">
                        <select 
                          value={b.status}
                          onChange={(e) => handleAdminStatusChange(b.id, e.target.value)}
                          className="bg-white border border-stone-200 text-stone-700 text-sm rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block p-2.5 shadow-sm font-medium outline-none cursor-pointer hover:border-teal-300 transition-colors"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Rescheduled">Rescheduled</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-16 text-center text-stone-400">
                        <div className="flex flex-col items-center justify-center">
                          <CalendarCheck className="w-12 h-12 mb-4 opacity-20" />
                          <p className="font-medium">No appointments found in the system.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Main Public Site
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAFAFA] font-body text-stone-800 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* --- Navigation --- */}
      <nav className={`fixed w-full top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/85 backdrop-blur-lg border-b border-stone-200/50 shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-heading font-bold tracking-tight text-stone-900">Lakshmi Mupparthi</h1>
            <p className="text-[11px] uppercase tracking-widest text-teal-800 font-bold mt-0.5">M.A., R.P. (Qualifying)</p>
          </div>
          <div className="hidden md:flex space-x-10 text-sm font-semibold text-stone-500">
            <a href="#about" className="hover:text-teal-700 transition-colors">About</a>
            <a href="#services" className="hover:text-teal-700 transition-colors">Practice Areas</a>
            <a href="#tracking" className="hover:text-teal-700 transition-colors">Patient Portal</a>
          </div>
          <a href="#booking" className="hidden md:flex items-center gap-2 bg-stone-900 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-teal-900 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
            Book Session <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-teal-50/50 blur-3xl -z-10"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-stone-100/50 blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <div className="lg:w-1/2 space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-teal-50 border border-teal-100 text-teal-800 text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              Accepting New Clients
            </div>
            <h2 className="text-5xl lg:text-7xl font-heading font-medium text-stone-900 leading-[1.1] tracking-tight">
              Evidence-Based <br />
              <span className="text-teal-800 italic">Therapy</span> for a <br />
              Grounded Life.
            </h2>
            <p className="text-lg lg:text-xl text-stone-500 leading-relaxed max-w-lg font-light">
              Navigating trauma, anxiety, and relationship dynamics requires a compassionate, empirically supported approach. Let's foster resilience together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a href="#booking" className="bg-teal-800 text-white px-8 py-4 rounded-full font-semibold hover:bg-teal-900 transition-all shadow-lg shadow-teal-900/20 hover:shadow-xl hover:-translate-y-1 flex items-center justify-center text-center">
                Schedule a Consultation
              </a>
              <a href="#about" className="bg-white border border-stone-200 text-stone-700 px-8 py-4 rounded-full font-semibold hover:bg-stone-50 transition-all hover:border-stone-300 text-center">
                Learn My Approach
              </a>
            </div>
          </div>

          <div className="lg:w-1/2 relative w-full max-w-md mx-auto lg:max-w-none animate-fade-in-up delay-150">
            {/* Image Wrapper with elegant offset border */}
            <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-stone-900/10 border-8 border-white">
              <div className="absolute inset-0 bg-stone-900/10 z-20 mix-blend-overlay"></div>
              <img 
                src="https://cfir.ca/wp-content/uploads/2023/12/Website-picture-800x914.jpg" 
                alt="Lakshmi Mupparthi" 
                className="w-full h-auto object-cover object-top hover:scale-105 transition-transform duration-700 ease-out"
              />
            </div>
            {/* Decorative blob behind image */}
            <div className="absolute -inset-4 bg-teal-800/10 rounded-[3rem] -z-10 translate-x-4 translate-y-6"></div>
          </div>
        </div>
      </header>

      {/* --- About Section --- */}
      <section id="about" className="py-24 bg-white border-y border-stone-100">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="md:w-5/12 space-y-6">
              <h3 className="text-4xl font-heading font-semibold text-stone-900">Clinical Philosophy</h3>
              <div className="w-16 h-1 bg-teal-600 rounded-full"></div>
              <p className="text-lg text-stone-600 leading-relaxed font-light">
                As a clinical practitioner affiliated with the Centre for Interpersonal Relationships (CFIR) across Toronto, Ottawa, and St. Catharines, I provide an integrative, trauma-informed approach to mental wellness.
              </p>
              <p className="text-lg text-stone-600 leading-relaxed font-light">
                Drawing primarily from Cognitive Behavioural Therapy (CBT), Dialectical Behaviour Therapy (DBT), and Emotion-Focused Therapy (EFT), my goal is to tailor interventions precisely to your unique psychological landscape.
              </p>
            </div>
            
            <div className="md:w-7/12 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              {/* Feature Cards */}
              <div className="bg-[#FAFAFA] p-8 rounded-3xl border border-stone-100 hover:border-teal-100 transition-colors group">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-teal-700" />
                </div>
                <h4 className="font-heading font-semibold text-xl text-stone-900 mb-2">CFIR Clinics</h4>
                <p className="text-stone-500 text-sm leading-relaxed">Available in-person and virtually across Toronto, Ottawa & St. Catharines.</p>
              </div>

              <div className="bg-[#FAFAFA] p-8 rounded-3xl border border-stone-100 hover:border-teal-100 transition-colors group">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-teal-700" />
                </div>
                <h4 className="font-heading font-semibold text-xl text-stone-900 mb-2">Evidence-Based</h4>
                <p className="text-stone-500 text-sm leading-relaxed">Rigorous frameworks including CBT, DBT, EFT & Trauma-Informed care.</p>
              </div>

              <div className="bg-teal-50 p-8 rounded-3xl border border-teal-100 hover:border-teal-200 transition-colors sm:col-span-2 group flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">
                    <Heart className="w-6 h-6 text-teal-700" />
                  </div>
                  <h4 className="font-heading font-semibold text-xl text-stone-900 mb-2">Clinical Specializations</h4>
                  <p className="text-stone-600 text-sm leading-relaxed max-w-md">Dedicated support for Anxiety Disorders, Trauma Processing, and complex Relational Dynamics.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Services Section --- */}
      <section id="services" className="py-24 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h3 className="text-4xl font-heading font-semibold text-stone-900 mb-6">Practice Streams</h3>
            <p className="text-lg text-stone-500 font-light leading-relaxed">Providing structured, goal-oriented support tailored to specific clinical needs or high-level professional development.</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Service 1 */}
            <div className="bg-white p-10 md:p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-stone-100 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center mb-8">
                  <ShieldCheck className="w-8 h-8 text-teal-800" />
                </div>
                <h4 className="text-3xl font-heading font-semibold text-stone-900 mb-4">Individual Psychotherapy</h4>
                <p className="text-stone-500 leading-relaxed mb-8 font-light text-lg">
                  Deep, exploratory work focused on alleviating distress, processing trauma, and breaking chronic patterns. Utilizing proven frameworks to establish long-term emotional regulation and resilience.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start"><Check className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" /> <span className="text-stone-700 font-medium">Anxiety & Depressive Disorders</span></li>
                  <li className="flex items-start"><Check className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" /> <span className="text-stone-700 font-medium">Trauma & PTSD Processing</span></li>
                  <li className="flex items-start"><Check className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" /> <span className="text-stone-700 font-medium">Emotion Regulation & Coping Mechanisms</span></li>
                </ul>
              </div>
            </div>

            {/* Service 2 */}
            <div className="bg-stone-900 p-10 md:p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-stone-800 hover:shadow-[0_20px_40px_rgb(0,0,0,0.2)] transition-all duration-500 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-stone-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-stone-800 border border-stone-700 rounded-2xl flex items-center justify-center mb-8">
                  <Filter className="w-8 h-8 text-stone-300" />
                </div>
                <h4 className="text-3xl font-heading font-semibold text-white mb-4">Life & Professional Coaching</h4>
                <p className="text-stone-400 leading-relaxed mb-8 font-light text-lg">
                  Action-oriented sessions designed for individuals seeking to successfully navigate major life transitions, manage professional burnout, and optimize interpersonal effectiveness.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start"><Check className="w-5 h-5 text-teal-400 mr-3 mt-0.5 flex-shrink-0" /> <span className="text-stone-300 font-medium">Career Transitions & Burnout Recovery</span></li>
                  <li className="flex items-start"><Check className="w-5 h-5 text-teal-400 mr-3 mt-0.5 flex-shrink-0" /> <span className="text-stone-300 font-medium">Interpersonal Skills Development</span></li>
                  <li className="flex items-start"><Check className="w-5 h-5 text-teal-400 mr-3 mt-0.5 flex-shrink-0" /> <span className="text-stone-300 font-medium">Goal Setting & Strategic Accountability</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Booking Section --- */}
      <section id="booking" className="py-24 bg-white relative overflow-hidden">
        {/* Soft abstract BG */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent"></div>
        <div className="max-w-6xl mx-auto px-6 md:px-10 relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-heading font-semibold text-stone-900 mb-4">Request a Consultation</h3>
            <p className="text-lg text-stone-500 font-light">Select a date and time to begin the secure intake process.</p>
          </div>

          {bookingSuccess ? (
            <div className="bg-[#FAFAFA] border border-stone-100 p-10 md:p-16 rounded-[2.5rem] shadow-xl max-w-2xl mx-auto text-center animate-fade-in-up">
              <div className="w-20 h-20 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-20"></div>
                <CheckCircle className="w-10 h-10 text-teal-600 relative z-10" />
              </div>
              <h4 className="text-3xl font-heading font-semibold text-stone-900 mb-4">Request Submitted</h4>
              <p className="text-lg text-stone-500 mb-8 font-light">
                Your appointment request for <strong className="text-stone-800">{bookingSuccess.date}</strong> at <strong className="text-stone-800">{bookingSuccess.time}</strong> has been securely received.
              </p>
              
              <div className="bg-white p-6 rounded-2xl border border-stone-200 mb-10 shadow-sm inline-block">
                <p className="text-xs text-stone-400 uppercase tracking-widest font-bold mb-2">Secure Reference ID</p>
                <p className="text-3xl font-mono font-bold text-teal-800 tracking-wider">{bookingSuccess.refId}</p>
              </div>
              
              <p className="text-sm text-stone-400 mb-10">Please save this Reference ID. You can use it below to track your status.</p>
              <button 
                onClick={() => setBookingSuccess(null)}
                className="bg-stone-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-teal-900 transition-all shadow-md"
              >
                Schedule Another Session
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col lg:flex-row overflow-hidden border border-stone-100">
              
              {/* Left: Date Selection */}
              <div className="lg:w-5/12 p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-stone-100 bg-[#FAFAFA]">
                <h4 className="font-heading font-semibold text-xl mb-8 flex items-center text-stone-900">
                  <Calendar className="w-5 h-5 mr-3 text-teal-700" /> Select a Date
                </h4>
                <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar pb-4">
                  {upcomingDays.map((date, i) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = selectedDate?.getTime() === date.getTime();
                    
                    return (
                      <button
                        key={i}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        className={`p-4 rounded-2xl border text-center transition-all duration-300 ${
                          isSelected 
                            ? 'border-teal-600 bg-teal-50/50 shadow-md ring-1 ring-teal-600 scale-[1.02]' 
                            : 'border-stone-200 bg-white hover:border-teal-300 hover:shadow-sm'
                        }`}
                      >
                        <div className={`text-xs uppercase tracking-wider font-bold mb-1 ${isSelected ? 'text-teal-800' : 'text-stone-400'}`}>
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-2xl font-heading font-semibold ${isSelected ? 'text-teal-900' : 'text-stone-800'}`}>
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right: Time & Form */}
              <div className="lg:w-7/12 p-8 md:p-12 bg-white">
                {selectedDate ? (
                  <form onSubmit={handleBookAppointment} className="space-y-8 flex flex-col h-full animate-fade-in">
                    <div>
                      <h4 className="font-heading font-semibold text-xl mb-6 flex items-center text-stone-900">
                        <Clock className="w-5 h-5 mr-3 text-teal-700" /> Available Times
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {timeSlots.map(time => {
                          const dateStr = selectedDate.toISOString().split('T')[0];
                          const isBooked = bookings.some(b => b.date === dateStr && b.time === time && b.status !== 'Cancelled');
                          const isSelected = selectedTime === time;
                          
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setSelectedTime(time)}
                              className={`py-3 px-2 text-sm rounded-xl border font-bold transition-all duration-200 ${
                                isBooked 
                                  ? 'bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed line-through' 
                                  : isSelected
                                    ? 'bg-teal-800 border-teal-800 text-white shadow-md transform scale-[1.05]'
                                    : 'bg-white border-stone-200 text-stone-600 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/30'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-5 pt-8 border-t border-stone-100 mt-auto">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">Full Legal Name</label>
                        <div className="relative group">
                          <User className="w-5 h-5 absolute left-4 top-3.5 text-stone-400 group-focus-within:text-teal-600 transition-colors" />
                          <input 
                            type="text" 
                            required
                            value={bookingForm.name}
                            onChange={e => setBookingForm({...bookingForm, name: e.target.value})}
                            className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium text-stone-800" 
                            placeholder="e.g. Jane Doe"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">Contact Email</label>
                        <div className="relative group">
                          <Mail className="w-5 h-5 absolute left-4 top-3.5 text-stone-400 group-focus-within:text-teal-600 transition-colors" />
                          <input 
                            type="email" 
                            required
                            value={bookingForm.email}
                            onChange={e => setBookingForm({...bookingForm, email: e.target.value})}
                            className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium text-stone-800" 
                            placeholder="jane@example.com"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting || !selectedTime || !bookingForm.name || !bookingForm.email}
                      className="w-full bg-stone-900 text-white font-bold py-4 rounded-2xl hover:bg-teal-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center mt-6 shadow-lg shadow-stone-900/10"
                    >
                      {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Secure Request'}
                    </button>
                  </form>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-6 min-h-[400px]">
                    <div className="w-24 h-24 bg-stone-50 rounded-full flex items-center justify-center">
                      <CalendarCheck className="w-10 h-10 text-stone-300" />
                    </div>
                    <p className="text-center font-medium text-lg max-w-xs leading-relaxed">Select a date from the calendar to view availability.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --- Tracking Section --- */}
      <section id="tracking" className="py-24 bg-teal-900 text-white border-y border-stone-200/10">
        <div className="max-w-4xl mx-auto px-6 md:px-10 text-center">
          <div className="w-16 h-16 bg-teal-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-teal-300" />
          </div>
          <h3 className="text-3xl font-heading font-semibold text-white mb-4">Patient Portal Status</h3>
          <p className="text-teal-100/80 mb-10 font-light text-lg">Enter your email and Reference ID to securely check your appointment status.</p>

          <form onSubmit={handleTrackAppointment} className="flex flex-col md:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
            <input 
              type="email" 
              required
              value={trackEmail}
              onChange={e => setTrackEmail(e.target.value)}
              placeholder="Email Address" 
              className="w-full px-5 py-4 bg-teal-950/50 border border-teal-800 rounded-2xl focus:bg-teal-950 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none text-white placeholder-teal-600/50 transition-all font-medium"
            />
            <input 
              type="text" 
              required
              value={trackRef}
              onChange={e => setTrackRef(e.target.value)}
              placeholder="Ref ID (LM-XXXXXX)" 
              className="w-full px-5 py-4 bg-teal-950/50 border border-teal-800 rounded-2xl focus:bg-teal-950 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none text-white placeholder-teal-600/50 transition-all font-medium uppercase tracking-wider"
            />
            <button type="submit" disabled={isTrackLoading} className="w-full md:w-auto bg-white text-teal-900 px-8 py-4 rounded-2xl font-bold hover:bg-stone-100 transition-all flex justify-center items-center flex-shrink-0 disabled:opacity-80">
              {isTrackLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lookup'}
            </button>
          </form>

          {trackResult && !isTrackLoading && (
            <div className="mt-12 p-8 bg-white text-stone-800 rounded-[2rem] text-left max-w-xl mx-auto shadow-2xl animate-fade-in-up">
              {trackResult === 'not_found' ? (
                <div className="text-red-600 flex flex-col items-center justify-center text-center p-4">
                  <AlertCircle className="w-10 h-10 mb-4 text-red-500" />
                  <span className="font-semibold text-lg">No records found.</span>
                  <p className="text-stone-500 text-sm mt-2">Please ensure your Email and Reference ID are entered exactly as provided.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <h5 className="font-heading font-semibold text-2xl text-stone-900 border-b border-stone-100 pb-4">Appointment Details</h5>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-stone-50">
                      <span className="text-stone-400 font-medium text-sm uppercase tracking-wider">Status</span>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide
                        ${trackResult.status === 'Confirmed' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 
                          trackResult.status === 'Cancelled' ? 'bg-red-50 text-red-700 border border-red-100' : 
                          'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                        {trackResult.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-stone-50">
                      <span className="text-stone-400 font-medium text-sm uppercase tracking-wider">Date</span>
                      <span className="text-stone-900 font-semibold">{trackResult.date}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-stone-50">
                      <span className="text-stone-400 font-medium text-sm uppercase tracking-wider">Time</span>
                      <span className="text-stone-900 font-semibold">{trackResult.time}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-stone-400 font-medium text-sm uppercase tracking-wider">Patient</span>
                      <span className="text-stone-900 font-semibold">{trackResult.name}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* --- Footer & Hidden Admin Trigger --- */}
      <footer className="bg-stone-950 text-stone-400 py-16 mt-auto">
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h4 className="text-white font-heading font-semibold text-2xl mb-2">Lakshmi Mupparthi</h4>
            <p className="text-sm text-teal-500 font-bold tracking-widest uppercase mb-6">M.A., R.P. (Qualifying)</p>
            <div className="space-y-4 text-sm font-medium">
              <p className="flex items-center"><MapPin className="w-5 h-5 mr-3 opacity-60 text-teal-400" /> CFIR St. Catharines / Toronto / Ottawa</p>
              <p className="flex items-center"><Phone className="w-5 h-5 mr-3 opacity-60 text-teal-400" /> Contact via CFIR secure intake</p>
            </div>
          </div>
          <div className="md:text-right flex flex-col md:items-end justify-between h-full">
            <div className="flex gap-4 mb-8 md:mb-0">
               {/* Decorative footer elements */}
               <div className="w-10 h-10 rounded-full border border-stone-800 flex items-center justify-center hover:bg-stone-800 transition-colors cursor-pointer">
                 <Shield className="w-4 h-4 text-stone-500" />
               </div>
               <div className="w-10 h-10 rounded-full border border-stone-800 flex items-center justify-center hover:bg-stone-800 transition-colors cursor-pointer">
                 <Mail className="w-4 h-4 text-stone-500" />
               </div>
            </div>
            <div>
              <p 
                className="cursor-pointer select-none opacity-40 hover:opacity-100 transition-opacity text-sm mb-1"
                onClick={handleFooterClick}
              >
                &copy; {new Date().getFullYear()} Clinical Practice Portal. All rights reserved.
              </p>
              <p className="text-xs opacity-30">Powered by React & Secure Firestore Auth.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl p-10 max-w-sm w-full relative transform scale-100 animate-slide-up">
            <button 
              onClick={() => { setShowAdminLogin(false); setFooterClickCount(0); }}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 hover:bg-stone-100 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-teal-800" />
            </div>
            <h3 className="text-2xl font-heading font-semibold text-center text-stone-900 mb-2">Portal Access</h3>
            <p className="text-center text-stone-500 text-sm mb-8">Enter the secure administrative code to proceed.</p>
            <form onSubmit={handleAdminLogin}>
              <input 
                type="password" 
                autoFocus
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none mb-6 text-center tracking-[0.5em] text-xl font-mono text-stone-800"
              />
              <button 
                type="submit"
                className="w-full bg-stone-900 text-white font-bold py-4 rounded-2xl hover:bg-teal-900 transition-colors shadow-lg"
              >
                Authenticate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Embedded CSS for custom fonts, scrollbars, and animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

        .font-heading {
          font-family: 'Cormorant Garamond', serif;
        }
        .font-body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f5f5f4; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d6d3d1; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a29e; 
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .delay-150 {
          animation-delay: 150ms;
        }
      `}} />
    </div>
  );
}
