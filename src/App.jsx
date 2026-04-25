import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, where, getDocs, 
  updateDoc, doc, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Calendar as CalendarIcon, MessageSquare, User, Clock, CheckCircle, 
  ChevronRight, Menu, X, Globe, Heart, Shield, Send, 
  MapPin, Mail, Phone, HelpCircle, ArrowRight, ExternalLink, 
  Lock, Search, RefreshCw, Clipboard, ChevronLeft, Award
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
const userFirebaseConfig = {
  apiKey: "AIzaSyAARehJ7GqdaZJFOfw1a-GJmVBf3LscN34",
  authDomain: "storefrontpsych.firebaseapp.com",
  projectId: "storefrontpsych",
  storageBucket: "storefrontpsych.firebasestorage.app",
  messagingSenderId: "782038460241",
  appId: "1:782038460241:web:a7bc3aa81ccf370d029570",
  measurementId: "G-QE551X53EM"
};

// Safely merge environment config with user config to ensure apiKey is never lost
const firebaseConfig = (() => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      const envConfig = JSON.parse(__firebase_config);
      return { ...userFirebaseConfig, ...envConfig };
    } catch (e) {
      return userFirebaseConfig;
    }
  }
  return userFirebaseConfig;
})();

const appId = typeof __app_id !== 'undefined' ? __app_id : 'lakshmi-psych-practice';

// Initialize Firebase services outside the component
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Configuration for other services
const GOOGLE_SHEET_WEBHOOK_URL = ""; 
const GEMINI_API_KEY = ""; 

const PRACTICE_DETAILS = {
  name: "Lakshmi Mupparthi, M.A., R.P.",
  title: "Registered Psychotherapist (Qualifying)",
  location: "Saint Catharines, ON",
  email: "connect@lakshmimupparthi.com",
  phone: "(905) 555-0198",
  languages: ["English", "Hindi", "Telugu"],
  specialties: [
    "Anxiety & Depression",
    "Relational Wounds",
    "Trauma & Attachment",
    "Neurodivergence (ADHD/ASD)",
    "Life Transitions",
    "Cultural & Identity Issues"
  ],
  qualifications: [
    "Registered Psychotherapist (Qualifying) with the CRPO",
    "Masters in Psychology",
    "Diploma in Clinical Psychology",
    "Registered member with the Rehabilitation Council of India",
    "Training in Neuropsychological Assessments"
  ],
  approach: "Integrative (Humanistic, Emotion-Focused (EFT), CBT, Psychodynamic)",
  bio: "I support adults and couples seeking change beyond surface-level patterns. My practice is shaped by clinical training and my own experience navigating tradition-bound cultural norms and neurodivergence. I believe in mapping the contours of your experience together to find meaning beneath anxiety, adapting to your needs as they unfold."
};

const TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  
  // AI Chat State
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Hello. I'm Lakshmi's virtual assistant. I can help you find an available slot or answer questions about the practice." }]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Booking State
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', service: 'individual', message: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [bookingResult, setBookingResult] = useState(null);
  
  // Tracking/Admin
  const [trackInfo, setTrackInfo] = useState({ email: '', refCode: '' });
  const [trackedAppointment, setTrackedAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [allAppointments, setAllAppointments] = useState([]);
  const SECRET_ADMIN_CODE = "Lakshmi2024";

  // --- MANDATORY AUTH PATTERN ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
        setAuthError(err.message);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch booked slots for the selected date - Guarded by User
  useEffect(() => {
    if (!user || !selectedDate) return;
    const fetchSlots = async () => {
      try {
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'appointments'),
          where("date", "==", selectedDate)
        );
        const querySnapshot = await getDocs(q);
        const booked = querySnapshot.docs.map(doc => doc.data().slot);
        setBookedSlots(booked);
      } catch (err) {
        console.error("Error fetching slots:", err);
      }
    };
    fetchSlots();
  }, [user, selectedDate, bookingResult]);

  // Admin Real-time Listener - Guarded by User and Admin state
  useEffect(() => {
    if (!isAdmin || !user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllAppointments(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      }, 
      (error) => {
        console.error("Admin listener error:", error);
      }
    );
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { 
      alert("Establishing secure connection... please try again in a second."); 
      return; 
    }
    if (!selectedSlot) { alert("Please select a time slot."); return; }
    setIsLoading(true);
    
    const refCode = "LM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const appointmentData = {
      ...bookingForm,
      date: selectedDate,
      slot: selectedSlot,
      refCode,
      status: 'Confirmed', 
      timestamp: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), appointmentData);
      
      if (GOOGLE_SHEET_WEBHOOK_URL) {
        fetch(GOOGLE_SHEET_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(appointmentData)
        }).catch(e => console.log("Sheet Sync Error:", e));
      }

      setBookingResult(refCode);
    } catch (err) {
      console.error(err);
      alert("Error booking slot. Please ensure your Firebase Firestore is in 'Test Mode' and Authentication is enabled.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    try {
      const snap = await getDocs(q);
      const found = snap.docs
        .map(d => d.data())
        .find(d => d.email === trackInfo.email && d.refCode === trackInfo.refCode);
      
      if (found) setTrackedAppointment(found);
      else alert("No appointment found. Please check your Email and Reference Code.");
    } catch (err) {
      console.error(err);
    } finally { setIsLoading(false); }
  };

  const handleAIChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `You are Lakshmi's personal assistant. Practice: ${PRACTICE_DETAILS.name}. Bio: ${PRACTICE_DETAILS.bio}. Specialties: ${PRACTICE_DETAILS.specialties.join(", ")}. Help users book time slots in the 'Book' tab or track existing ones. Date: ${new Date().toDateString()}.\nUser: ${text}` }] }] })
      });
      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble connecting right now.";
      setMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm experiencing a technical issue. Please email Lakshmi directly for support." }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] font-sans text-stone-800 selection:bg-emerald-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-40 border-b border-stone-100 h-20 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => {setActiveTab('home'); setIsAdmin(false)}}>
          <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center text-white font-serif text-xl">LM</div>
          <div className="flex flex-col">
            <span className="font-serif text-lg leading-none tracking-tight">Lakshmi Mupparthi</span>
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-1">Psychotherapy Practice</span>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          {['home', 'about', 'services', 'tracking'].map(t => (
            <button key={t} onClick={() => {setActiveTab(t); window.scrollTo(0,0)}} className={`text-[11px] uppercase tracking-widest font-bold transition-colors ${activeTab === t ? 'text-emerald-900 border-b-2 border-emerald-900 pb-1' : 'text-stone-400 hover:text-stone-600'}`}>
              {t}
            </button>
          ))}
          <button onClick={() => {setActiveTab('booking'); window.scrollTo(0,0)}} className="bg-emerald-900 text-white px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md">Book Slot</button>
        </div>
        <button className="md:hidden" onClick={() => setIsMenuOpen(true)}><Menu /></button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-white z-50 p-8 flex flex-col space-y-8 animate-in fade-in zoom-in-95">
          <div className="flex justify-end"><button onClick={() => setIsMenuOpen(false)}><X size={32} /></button></div>
          <div className="flex flex-col space-y-8 mt-12 text-3xl font-serif">
            {['home', 'about', 'services', 'tracking'].map(t => (
              <button key={t} className="text-left capitalize" onClick={() => {setActiveTab(t); setIsMenuOpen(false); window.scrollTo(0,0)}}>{t}</button>
            ))}
            <button className="text-left text-emerald-800" onClick={() => {setActiveTab('booking'); setIsMenuOpen(false); window.scrollTo(0,0)}}>Book Slot</button>
          </div>
        </div>
      )}

      <main className="pt-32 pb-24 px-6 max-w-6xl mx-auto min-h-screen">
        
        {authError && (
          <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm font-medium flex items-center gap-3">
            <Shield size={18} />
            Firebase Status: {authError}. (Ensure 'Anonymous' is enabled in Firebase Console &gt; Auth &gt; Sign-in method).
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-24">
            <section className="grid lg:grid-cols-2 gap-16 items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-8">
                <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-widest rounded-full border border-emerald-100 shadow-sm">Accepting New Clients</div>
                <h1 className="text-6xl md:text-7xl font-serif leading-[1.1] text-stone-900">Find meaning beneath the <span className="italic text-emerald-800">anxiety.</span></h1>
                <p className="text-xl text-stone-600 font-light leading-relaxed max-w-lg">{PRACTICE_DETAILS.bio}</p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button onClick={() => setActiveTab('booking')} className="bg-emerald-900 text-white px-10 py-5 rounded-full font-bold uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">Choose a Time Slot <ArrowRight size={16}/></button>
                  <button onClick={() => setIsChatOpen(true)} className="bg-white border border-stone-200 px-10 py-5 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-stone-50 transition-all flex items-center justify-center gap-2"><MessageSquare size={16}/> Ask Assistant</button>
                </div>
              </div>
              <div className="relative aspect-[3/4] bg-stone-100 rounded-[3rem] shadow-2xl overflow-hidden group">
                <img src="https://cfir.ca/wp-content/uploads/2023/12/Website-picture-800x914.jpg" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" alt="Lakshmi Mupparthi" />
                <div className="absolute inset-0 bg-emerald-900/5 transition-colors group-hover:bg-transparent"></div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-serif">The Therapeutic Journey</h2>
              <div className="w-16 h-1 bg-emerald-900 mx-auto rounded-full" />
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              <div className="md:col-span-2 space-y-8">
                <p className="text-2xl font-serif italic text-stone-700 leading-relaxed border-l-4 border-emerald-800 pl-8">
                  "I believe in mapping the contours of your experience together to find meaning beneath distress, adapting to your needs as they unfold."
                </p>
                <div className="prose prose-stone lg:prose-xl text-stone-600 space-y-6 leading-relaxed font-light">
                  <p>{PRACTICE_DETAILS.bio}</p>
                  <p>My work is deeply influenced by clinical excellence and a commitment to cultural humility. Navigating the intersections of identity and neurodivergence can be exhausting; my goal is to provide a space where you can finally set that weight down.</p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
                  <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-emerald-800 mb-6 flex items-center gap-2"><Award size={16}/> Qualifications</h4>
                  <ul className="space-y-4">
                    {PRACTICE_DETAILS.qualifications.map((q, i) => (
                      <li key={i} className="text-xs text-stone-500 flex gap-3 items-start font-medium">
                        <CheckCircle className="text-emerald-700 shrink-0" size={14} />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-emerald-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                  <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-emerald-200 mb-4">Therapeutic Approach</h4>
                  <p className="text-sm leading-relaxed font-light">{PRACTICE_DETAILS.approach}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-16 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-serif">Therapeutic Specialties</h2>
              <div className="w-16 h-1 bg-emerald-900 mx-auto rounded-full" />
              <p className="text-stone-500 max-w-2xl mx-auto font-light text-lg">Supporting adults and couples through evidence-based, integrative care.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {PRACTICE_DETAILS.specialties.map((s, i) => (
                <div key={i} className="p-10 bg-white border border-stone-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm"><Heart className="text-emerald-700" size={24} /></div>
                  <h3 className="text-xl font-serif text-stone-900 mb-3">{s}</h3>
                  <p className="text-stone-400 text-sm font-light leading-relaxed">Personalized support focused on understanding the root causes of distress and building lasting resilience.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'booking' && (
          <div className="max-w-5xl mx-auto py-12 animate-in fade-in">
            {bookingResult ? (
              <div className="bg-white p-16 rounded-[3rem] shadow-2xl text-center space-y-8 border border-stone-100">
                <CheckCircle size={64} className="text-emerald-700 mx-auto" />
                <h2 className="text-4xl font-serif">Booking Confirmed</h2>
                <p className="text-stone-500">Your unique reference code for tracking is:</p>
                <div className="text-3xl font-bold tracking-[0.3em] bg-stone-50 py-4 px-10 rounded-2xl inline-block border border-stone-200">{bookingResult}</div>
                <p className="text-stone-400 max-w-xs mx-auto text-sm">Please save this code. Our clinical calendar has been synced, and Lakshmi will contact you via email shortly.</p>
                <button onClick={() => setBookingResult(null)} className="text-emerald-800 font-bold underline block mx-auto uppercase tracking-widest text-[10px]">Back to calendar</button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-5 gap-8 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-stone-100 p-8">
                <div className="lg:col-span-2 space-y-8 border-r border-stone-50 pr-8">
                  <h3 className="text-2xl font-serif flex items-center gap-3"><CalendarIcon className="text-emerald-800" size={28}/> Select a Date</h3>
                  <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full bg-stone-50 p-5 rounded-2xl outline-none focus:ring-1 focus:ring-emerald-900 border border-stone-100 font-medium" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Available Slots for {selectedDate}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {TIME_SLOTS.map(slot => (
                        <button 
                          key={slot}
                          disabled={bookedSlots.includes(slot)}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-4 rounded-xl text-[11px] font-bold transition-all border shadow-sm ${bookedSlots.includes(slot) ? 'opacity-20 cursor-not-allowed bg-stone-50 text-stone-300' : selectedSlot === slot ? 'bg-emerald-900 text-white border-emerald-900 shadow-lg' : 'bg-white text-stone-600 border-stone-100 hover:border-emerald-200'}`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-6 pl-4">
                  <h3 className="text-2xl font-serif">Contact Information</h3>
                  <form onSubmit={handleBooking} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <input required className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900 font-light" placeholder="Full Name" value={bookingForm.name} onChange={(e) => setBookingForm({...bookingForm, name: e.target.value})} />
                      <input required type="email" className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900 font-light" placeholder="Email Address" value={bookingForm.email} onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})} />
                    </div>
                    <select className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900 font-medium" value={bookingForm.service} onChange={(e) => setBookingForm({...bookingForm, service: e.target.value})}>
                      <option value="individual">Individual Psychotherapy</option>
                      <option value="couples">Couples Therapy</option>
                      <option value="neurodivergence">Neurodivergence Support</option>
                    </select>
                    <textarea className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none h-32 resize-none font-light" placeholder="Is there anything specific you would like to address? (Optional)" value={bookingForm.message} onChange={(e) => setBookingForm({...bookingForm, message: e.target.value})} />
                    
                    <div className="bg-emerald-50 p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-inner">
                      <div className="text-emerald-900 text-center md:text-left">
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1">Appointment Summary</p>
                        <p className="font-serif text-xl">{selectedDate} @ {selectedSlot || '---'}</p>
                      </div>
                      <button disabled={!selectedSlot || isLoading} className="w-full md:w-auto bg-emerald-900 text-white px-12 py-5 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] disabled:opacity-20 shadow-lg hover:bg-black transition-all">
                        {isLoading ? "Processing..." : "Confirm My Slot"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="max-w-2xl mx-auto space-y-12 py-12 animate-in fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-serif">Track Booking</h2>
              <p className="text-stone-500 font-light">Verify the current status of your psychotherapy session.</p>
            </div>
            <form onSubmit={handleTrack} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-stone-100 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Account Email</label>
                <input required type="email" className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900 font-light" placeholder="e.g. client@email.com" value={trackInfo.email} onChange={(e) => setTrackInfo({...trackInfo, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Reference ID</label>
                <input required className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900 font-light" placeholder="e.g. LM-XXXXXX" value={trackInfo.refCode} onChange={(e) => setTrackInfo({...trackInfo, refCode: e.target.value})} />
              </div>
              <button disabled={isLoading} className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold uppercase text-[11px] tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3">
                {isLoading ? <RefreshCw className="animate-spin" size={16} /> : "Verify Tracking"}
              </button>
            </form>
            {trackedAppointment && (
              <div className="bg-emerald-900 text-white p-10 rounded-[2.5rem] shadow-2xl animate-in zoom-in">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-serif">{trackedAppointment.name}</h3>
                    <p className="text-emerald-200/60 font-mono text-[10px] mt-1 tracking-widest uppercase">ID: {trackedAppointment.refCode}</p>
                  </div>
                  <span className="bg-white text-emerald-950 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md">{trackedAppointment.status}</span>
                </div>
                <div className="space-y-4 border-t border-emerald-800 pt-8">
                  <div className="flex items-center gap-3 text-emerald-100/60"><Clock size={16}/> <span className="text-sm">Session Scheduled For:</span></div>
                  <p className="font-serif text-3xl">{trackedAppointment.date} <span className="text-emerald-300 mx-2">at</span> {trackedAppointment.slot}</p>
                  <p className="text-xs text-emerald-100/40 italic pt-4">"{trackedAppointment.status === 'Confirmed' ? 'We look forward to seeing you at our Saint Catharines location or via secure video link.' : 'Your request is currently being processed by Lakshmi.'}"</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden Admin Clinical Dashboard */}
        {isAdmin && (
          <div className="py-12 animate-in fade-in space-y-12">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <h2 className="text-5xl font-serif">Clinical Dashboard</h2>
                <p className="text-stone-400 text-sm font-medium tracking-widest uppercase">Management Portal</p>
              </div>
              <div className="flex gap-4">
                <a href={GOOGLE_SHEET_WEBHOOK_URL ? "https://docs.google.com/spreadsheets" : "#"} target="_blank" className="bg-green-50 text-green-700 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-green-100 transition-colors border border-green-100">
                  <ExternalLink size={14} /> Open Google Sheet
                </a>
                <button onClick={() => setIsAdmin(false)} className="bg-stone-100 p-3 rounded-2xl text-stone-400 hover:text-red-500 transition-colors"><X size={24}/></button>
              </div>
            </div>
            <div className="grid gap-6">
              {allAppointments.map((app) => (
                <div key={app.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100 flex flex-col md:flex-row justify-between items-center gap-8 group hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-[0.2em]">{app.date} • {app.slot}</p>
                    <p className="text-3xl font-serif text-stone-900">{app.name} <span className="text-xs text-stone-200 font-sans tracking-widest">#{app.refCode}</span></p>
                    <p className="text-stone-400 text-sm font-medium flex items-center gap-2"><Mail size={14}/> {app.email} • {app.service_type}</p>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <select 
                      value={app.status} 
                      onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', app.id), { status: e.target.value })} 
                      className={`w-full md:w-auto border-none rounded-2xl text-[11px] font-bold uppercase tracking-[0.1em] p-5 outline-none transition-all ${app.status === 'Confirmed' ? 'bg-green-50 text-green-700' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Completed">Completed</option>
                      <option value="No-Show">No-Show</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* AI Assistant Chat UI */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 transform origin-bottom-right ${isChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8 pointer-events-none'}`}>
        <div className="bg-white w-[calc(100vw-3rem)] max-w-[400px] h-[600px] rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] border border-stone-200 flex flex-col overflow-hidden">
          <div className="bg-emerald-900 p-7 text-white flex justify-between items-center shadow-lg relative z-10">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner"><MessageSquare size={20}/></div>
               <div>
                 <span className="font-serif text-lg block leading-none">Practice Assistant</span>
                 <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-300 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Personal Concierge</span>
               </div>
             </div>
             <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-7 space-y-5 bg-[#fcfbf9]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[15px] leading-relaxed ${m.role === 'user' ? 'bg-stone-800 text-white rounded-br-none font-light shadow-md' : 'bg-white border border-stone-200 shadow-sm rounded-bl-none text-stone-700 font-light'}`}>{m.text}</div>
              </div>
            ))}
            {isTyping && <div className="p-4 flex gap-2"><div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleAIChat} className="p-5 bg-white border-t border-stone-50 flex gap-3">
            <input className="flex-1 bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 text-sm outline-none font-light focus:ring-1 focus:ring-emerald-900 transition-all" placeholder="Ask about availability..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button className="bg-emerald-900 text-white p-4 rounded-2xl shadow-lg hover:bg-black transition-all"><Send size={20}/></button>
          </form>
        </div>
      </div>

      {/* Footer Area */}
      <footer className="bg-stone-50 py-32 border-t border-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-10 text-center px-6">
          <div className="flex items-center space-x-4 grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition-all duration-700 cursor-default">
            <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center text-white font-serif text-lg">LM</div>
            <span className="text-stone-900 font-serif text-2xl tracking-[0.1em] uppercase">{PRACTICE_DETAILS.name}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-12 text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400">
            <button onClick={() => setActiveTab('home')} className="hover:text-emerald-800 transition-colors">Home</button>
            <button onClick={() => setActiveTab('about')} className="hover:text-emerald-800 transition-colors">The Practice</button>
            <button onClick={() => setActiveTab('booking')} className="hover:text-emerald-800 transition-colors">Clinical Booking</button>
            <button onClick={() => setActiveTab('tracking')} className="hover:text-emerald-800 transition-colors">Session Portal</button>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold max-w-lg leading-loose">
            Lakshmi Mupparthi is a Registered Psychotherapist (Qualifying) with the CRPO.<br/>
            Located at the Centre for Interpersonal Relationships (CFIR) — Saint Catharines, Ontario.
          </p>
          
          {!isAdmin && (
            <div className="flex flex-col items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-1000 mt-12">
              <input type="password" placeholder="Admin Login" className="bg-transparent border-b border-stone-200 text-[10px] outline-none text-center py-2 uppercase tracking-widest" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
              <button onClick={() => adminKey === SECRET_ADMIN_CODE ? setIsAdmin(true) : null} className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 underline mt-2">Manage Clinical Schedule</button>
            </div>
          )}
        </div>
      </footer>

      {!isChatOpen && (
        <button onClick={() => setIsChatOpen(true)} className="fixed bottom-10 right-10 bg-emerald-900 text-white p-6 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white">
          <MessageSquare size={28} />
        </button>
      )}
    </div>
  );
}
