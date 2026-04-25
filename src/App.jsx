import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, User, Mail, Search, ChevronRight, 
  MapPin, Phone, CheckCircle, AlertCircle, Loader2,
  CalendarCheck, Shield, Filter, LogOut, Check, X, ShieldCheck
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';

// ============================================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ============================================================================
const getFirebaseConfig = () => {
  // First, check for environment-provided config (e.g., standard preview environments)
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    return JSON.parse(__firebase_config);
  }
  // Fallback configuration
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

// Use global environment app ID or a unique string for isolation
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'lakshmi-clinical-portal';

// Admin code fallback for preview environments where env vars might not be set
const ADMIN_CODE = 'CLINICAL2026';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg border-l-4 ${isError ? 'bg-red-50 border-red-500 text-red-800' : 'bg-emerald-50 border-emerald-500 text-emerald-800'} transition-all duration-300 ease-in-out`}>
      {isError ? <AlertCircle className="w-5 h-5 mr-3" /> : <CheckCircle className="w-5 h-5 mr-3" />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // State: Core & Auth
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'admin'
  const [dbError, setDbError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });
  
  // State: Data
  const [bookings, setBookings] = useState([]);
  
  // State: Booking Form
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingForm, setBookingForm] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // State: Tracking Form
  const [trackEmail, setTrackEmail] = useState('');
  const [trackRef, setTrackRef] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  
  // State: Admin Secret Clicker
  const [footerClickCount, setFooterClickCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

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
        if (isMounted) showToast("Authentication failed. Database features may not work.", "error");
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
      // Sort in memory as per rule
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

  // Get next 14 weekdays for calendar
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
    
    // Client-side double check for double booking
    const isTaken = bookings.some(b => b.date === dateStr && b.time === selectedTime && b.status !== 'Cancelled');
    if (isTaken) {
      showToast("Sorry, this slot just got taken. Please select another.", "error");
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
      showToast("Appointment request submitted successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to book appointment. Try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackAppointment = (e) => {
    e.preventDefault();
    const found = bookings.find(b => b.email.toLowerCase() === trackEmail.toLowerCase() && b.refId === trackRef.toUpperCase());
    if (found) {
      setTrackResult(found);
    } else {
      setTrackResult('not_found');
    }
  };

  const handleAdminStatusChange = async (id, newStatus) => {
    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'bookings', id);
      await updateDoc(docRef, { status: newStatus });
      showToast(`Status updated to ${newStatus}`);
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
      showToast("Secure Dashboard Access Granted");
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
      <div className="min-h-screen bg-stone-100 p-6 md:p-12 font-sans text-stone-800">
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
        
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
          <div className="bg-stone-900 text-stone-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <div>
                <h1 className="text-2xl font-bold">Clinical Dashboard</h1>
                <p className="text-sm text-stone-400">Lakshmi Mupparthi • Restricted Access</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${dbError ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <span>DB Status: {dbError ? 'Disconnected' : 'Connected'}</span>
              </div>
              <button 
                onClick={() => setCurrentView('home')}
                className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Return to Site
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-sm uppercase text-stone-500">
                    <th className="p-4 font-semibold">Date & Time</th>
                    <th className="p-4 font-semibold">Patient</th>
                    <th className="p-4 font-semibold">Ref ID</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-stone-800">{b.date}</div>
                        <div className="text-sm text-stone-500">{b.time}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-stone-800">{b.name}</div>
                        <div className="text-sm text-stone-500">{b.email}</div>
                      </td>
                      <td className="p-4 font-mono text-sm">{b.refId}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${b.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 
                            b.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 
                            'bg-amber-100 text-amber-800'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <select 
                          value={b.status}
                          onChange={(e) => handleAdminStatusChange(b.id, e.target.value)}
                          className="bg-white border border-stone-300 text-stone-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2"
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
                      <td colSpan="5" className="p-8 text-center text-stone-500">
                        No appointments found.
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
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800 flex flex-col">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      {/* --- Navigation --- */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-900">Lakshmi Mupparthi</h1>
            <p className="text-xs text-stone-500 font-medium">M.A., R.P. (Qualifying)</p>
          </div>
          <div className="hidden md:flex space-x-8 text-sm font-medium text-stone-600">
            <a href="#about" className="hover:text-emerald-800 transition-colors">About</a>
            <a href="#services" className="hover:text-emerald-800 transition-colors">Services</a>
            <a href="#tracking" className="hover:text-emerald-800 transition-colors">Track Status</a>
          </div>
          <a href="#booking" className="bg-emerald-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-emerald-900 transition-colors shadow-md">
            Request Consult
          </a>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <header className="max-w-6xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
        <div className="md:w-1/2 space-y-6">
          <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wider uppercase">
            Clinical Psychology Practice
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 leading-tight">
            Evidence-Based Therapy <br/><span className="text-emerald-800">for a Grounded Life.</span>
          </h2>
          <p className="text-lg text-stone-600 leading-relaxed max-w-lg">
            Navigating trauma, anxiety, and relationship dynamics requires a compassionate, empirically supported approach. Let's work together to foster resilience and meaningful change.
          </p>
          <div className="flex gap-4 pt-4">
            <a href="#booking" className="bg-emerald-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-900 transition-colors shadow-md flex items-center">
              Book Appointment <ChevronRight className="w-5 h-5 ml-1" />
            </a>
            <a href="#about" className="bg-white border border-stone-300 text-stone-700 px-6 py-3 rounded-lg font-semibold hover:bg-stone-50 transition-colors">
              Learn More
            </a>
          </div>
        </div>
        <div className="md:w-1/2">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-800 rounded-2xl transform translate-x-4 translate-y-4 opacity-20"></div>
            <img 
              src="https://cfir.ca/wp-content/uploads/2023/12/Website-picture-800x914.jpg" 
              alt="Lakshmi Mupparthi" 
              className="relative rounded-2xl shadow-xl w-full max-w-md mx-auto object-cover border border-stone-100"
            />
          </div>
        </div>
      </header>

      {/* --- About Section --- */}
      <section id="about" className="bg-white py-20 border-y border-stone-200">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h3 className="text-3xl font-bold text-stone-900">About Lakshmi</h3>
          <p className="text-lg text-stone-600 leading-relaxed text-left md:text-center">
            As a clinical practitioner affiliated with the Centre for Interpersonal Relationships (CFIR) across Toronto and Ottawa, I specialize in providing an integrative, trauma-informed approach to mental health. Drawing primarily from Cognitive Behavioural Therapy (CBT), Dialectical Behaviour Therapy (DBT), and Emotion-Focused Therapy (EFT), I tailor interventions to your unique psychological landscape.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-8 pt-6">
            <div className="flex flex-col items-center p-4">
              <MapPin className="w-8 h-8 text-emerald-700 mb-3" />
              <span className="font-semibold text-stone-800">CFIR Clinics</span>
              <span className="text-sm text-stone-500 text-center">Toronto, Ottawa & <br/>St. Catharines</span>
            </div>
            <div className="flex flex-col items-center p-4">
              <Shield className="w-8 h-8 text-emerald-700 mb-3" />
              <span className="font-semibold text-stone-800">Evidence-Based</span>
              <span className="text-sm text-stone-500 text-center">CBT, DBT, EFT & <br/>Trauma-Informed</span>
            </div>
            <div className="flex flex-col items-center p-4">
              <User className="w-8 h-8 text-emerald-700 mb-3" />
              <span className="font-semibold text-stone-800">Specializations</span>
              <span className="text-sm text-stone-500 text-center">Anxiety, Trauma & <br/>Relational Dynamics</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- Services Section --- */}
      <section id="services" className="py-20 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-stone-900 mb-4">Practice Streams</h3>
            <p className="text-stone-600 max-w-2xl mx-auto">Providing structured, goal-oriented support tailored to clinical needs or professional development.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Service 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-7 h-7 text-emerald-800" />
              </div>
              <h4 className="text-2xl font-bold text-stone-900 mb-3">Individual Psychotherapy</h4>
              <p className="text-stone-600 leading-relaxed mb-6">
                Deep, exploratory work focused on alleviating distress, processing trauma, and breaking chronic patterns. Utilizing CBT and DBT frameworks to establish emotional regulation and resilience.
              </p>
              <ul className="space-y-2 text-sm text-stone-700 font-medium">
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Anxiety & Depressive Disorders</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Trauma & PTSD Processing</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Emotion Regulation & Coping</li>
              </ul>
            </div>

            {/* Service 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center mb-6">
                <Filter className="w-7 h-7 text-stone-800" />
              </div>
              <h4 className="text-2xl font-bold text-stone-900 mb-3">Life & Professional Coaching</h4>
              <p className="text-stone-600 leading-relaxed mb-6">
                Action-oriented sessions designed for individuals seeking to navigate life transitions, manage professional burnout, and optimize interpersonal effectiveness in the workplace.
              </p>
              <ul className="space-y-2 text-sm text-stone-700 font-medium">
                <li className="flex items-center"><Check className="w-4 h-4 text-stone-600 mr-2" /> Career Transitions & Burnout</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-stone-600 mr-2" /> Interpersonal Skills Development</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-stone-600 mr-2" /> Goal Setting & Accountability</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- Booking Section --- */}
      <section id="booking" className="py-20 bg-emerald-900 text-stone-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">Request a Consultation</h3>
            <p className="text-emerald-100/80">Select an available date and time to begin the intake process.</p>
          </div>

          {bookingSuccess ? (
            <div className="bg-white text-stone-800 p-8 rounded-2xl shadow-2xl max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="text-2xl font-bold mb-2">Request Submitted</h4>
              <p className="text-stone-600 mb-6">Your appointment request for <strong>{bookingSuccess.date}</strong> at <strong>{bookingSuccess.time}</strong> has been received.</p>
              <div className="bg-stone-100 p-4 rounded-lg inline-block border border-stone-200 mb-6">
                <p className="text-sm text-stone-500 uppercase tracking-wide font-semibold mb-1">Reference ID</p>
                <p className="text-2xl font-mono font-bold text-stone-800">{bookingSuccess.refId}</p>
              </div>
              <p className="text-sm text-stone-500 mb-8">Please save this Reference ID to track your appointment status.</p>
              <button 
                onClick={() => setBookingSuccess(null)}
                className="bg-emerald-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-900"
              >
                Book Another Session
              </button>
            </div>
          ) : (
            <div className="bg-white text-stone-800 rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-stone-200/20">
              
              {/* Left: Date Selection */}
              <div className="lg:w-1/2 p-8 border-b lg:border-b-0 lg:border-r border-stone-200 bg-stone-50">
                <h4 className="font-bold text-lg mb-6 flex items-center text-stone-800">
                  <Calendar className="w-5 h-5 mr-2 text-emerald-700" /> Select a Date
                </h4>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {upcomingDays.map((date, i) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = selectedDate?.getTime() === date.getTime();
                    
                    return (
                      <button
                        key={i}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? 'border-emerald-600 bg-emerald-50 shadow-sm ring-1 ring-emerald-600' 
                            : 'border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className={`font-semibold text-sm ${isSelected ? 'text-emerald-900' : 'text-stone-700'}`}>
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-lg font-bold ${isSelected ? 'text-emerald-700' : 'text-stone-900'}`}>
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right: Time & Form */}
              <div className="lg:w-1/2 p-8">
                {selectedDate ? (
                  <form onSubmit={handleBookAppointment} className="space-y-6 flex flex-col h-full">
                    <div>
                      <h4 className="font-bold text-lg mb-4 flex items-center text-stone-800">
                        <Clock className="w-5 h-5 mr-2 text-emerald-700" /> Select a Time
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
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
                              className={`py-2 px-1 text-sm rounded-lg border font-medium transition-all ${
                                isBooked 
                                  ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed opacity-60' 
                                  : isSelected
                                    ? 'bg-emerald-700 border-emerald-700 text-white shadow-sm'
                                    : 'bg-white border-stone-300 text-stone-700 hover:border-emerald-500 hover:text-emerald-700'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-stone-100 mt-auto">
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Full Name</label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                          <input 
                            type="text" 
                            required
                            value={bookingForm.name}
                            onChange={e => setBookingForm({...bookingForm, name: e.target.value})}
                            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow" 
                            placeholder="Jane Doe"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Email Address</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                          <input 
                            type="email" 
                            required
                            value={bookingForm.email}
                            onChange={e => setBookingForm({...bookingForm, email: e.target.value})}
                            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow" 
                            placeholder="jane@example.com"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting || !selectedTime}
                      className="w-full bg-emerald-800 text-white font-bold py-3 rounded-lg hover:bg-emerald-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center mt-4 shadow-md"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Request'}
                    </button>
                  </form>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
                    <CalendarCheck className="w-16 h-16 opacity-20" />
                    <p className="text-center font-medium">Please select a date from the calendar<br/>to view available times.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --- Tracking Section --- */}
      <section id="tracking" className="py-20 bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Search className="w-8 h-8 text-stone-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-stone-900 mb-2">Track Your Appointment</h3>
          <p className="text-stone-600 mb-8">Enter your email and Reference ID to check the status of your request.</p>

          <form onSubmit={handleTrackAppointment} className="flex flex-col md:flex-row gap-4 justify-center">
            <input 
              type="email" 
              required
              value={trackEmail}
              onChange={e => setTrackEmail(e.target.value)}
              placeholder="Email Address" 
              className="px-4 py-3 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none flex-1 max-w-xs"
            />
            <input 
              type="text" 
              required
              value={trackRef}
              onChange={e => setTrackRef(e.target.value)}
              placeholder="Ref ID (e.g. LM-XXXXXX)" 
              className="px-4 py-3 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none flex-1 max-w-xs uppercase"
            />
            <button type="submit" className="bg-stone-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-stone-900 transition-colors">
              Lookup
            </button>
          </form>

          {trackResult && (
            <div className="mt-8 p-6 bg-stone-50 rounded-xl border border-stone-200 text-left max-w-md mx-auto shadow-sm">
              {trackResult === 'not_found' ? (
                <div className="text-red-700 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">No appointment found with those details.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <h5 className="font-bold text-stone-900 border-b border-stone-200 pb-2">Appointment Details</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-stone-500 font-medium">Status:</div>
                    <div className="font-bold">
                      <span className={`px-2 py-1 rounded-md text-xs
                        ${trackResult.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 
                          trackResult.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-amber-100 text-amber-800'}`}>
                        {trackResult.status}
                      </span>
                    </div>
                    <div className="text-stone-500 font-medium">Date:</div>
                    <div className="text-stone-900 font-semibold">{trackResult.date}</div>
                    <div className="text-stone-500 font-medium">Time:</div>
                    <div className="text-stone-900 font-semibold">{trackResult.time}</div>
                    <div className="text-stone-500 font-medium">Patient:</div>
                    <div className="text-stone-900">{trackResult.name}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* --- Footer & Hidden Admin Trigger --- */}
      <footer className="bg-stone-900 text-stone-400 py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h4 className="text-white font-bold text-lg mb-2">Lakshmi Mupparthi</h4>
            <p className="text-sm text-stone-500">M.A., R.P. (Qualifying)</p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 opacity-70" /> CFIR St. Catharines / Toronto / Ottawa</p>
              <p className="flex items-center"><Phone className="w-4 h-4 mr-2 opacity-70" /> Contact via CFIR intake</p>
            </div>
          </div>
          <div className="md:text-right text-sm">
            <p 
              className="cursor-pointer select-none opacity-50 hover:opacity-100 transition-opacity"
              onClick={handleFooterClick}
            >
              &copy; {new Date().getFullYear()} Clinical Practice Portal. All rights reserved.
            </p>
            <p className="mt-2 text-xs opacity-40">Built with React & Firebase.</p>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative">
            <button 
              onClick={() => { setShowAdminLogin(false); setFooterClickCount(0); }}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"
            >
              <X className="w-5 h-5" />
            </button>
            <ShieldCheck className="w-12 h-12 text-emerald-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-center text-stone-900 mb-6">Admin Authorization</h3>
            <form onSubmit={handleAdminLogin}>
              <input 
                type="password" 
                autoFocus
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Enter Authorization Code"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none mb-4 text-center tracking-widest"
              />
              <button 
                type="submit"
                className="w-full bg-stone-900 text-white font-bold py-3 rounded-lg hover:bg-stone-800 transition-colors shadow-md"
              >
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSS overrides for scrollbar inside the component to keep it single-file */}
      <style dangerouslySetInnerHTML={{__html: `
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
      `}} />
    </div>
  );
}
