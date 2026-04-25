import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, getDocs, 
  updateDoc, doc, onSnapshot 
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

// --- SECURE FIREBASE INITIALIZATION ---
const firebaseConfig = (() => {
  // 1. Try Canvas Environment (for preview purposes)
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try { return JSON.parse(__firebase_config); } catch (e) {}
  }
  // 2. Read from Local Vite Environment Variables (.env)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }
  return {}; 
})();

const appId = typeof __app_id !== 'undefined' ? __app_id : 'lakshmi-psych-practice-v1';

// Initialize Firebase services securely
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

// Pulling sensitive values from environment variables
const SECRET_ADMIN_CODE = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_ADMIN_CODE : null) || "Lakshmi2024";
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
  bio: "I support adults and couples seeking change beyond surface-level patterns. My practice is shaped by clinical training and my own experience navigating tradition-bound cultural norms and neurodivergence. I believe in mapping the contours of your experience together to find meaning beneath anxiety."
};

const TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  
  // Chat State
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Hello. I'm Lakshmi's virtual assistant. How can I support you today?" }]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Booking/Tracking State
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', service: 'individual', message: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [bookingResult, setBookingResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trackInfo, setTrackInfo] = useState({ email: '', refCode: '' });
  const [trackedAppointment, setTrackedAppointment] = useState(null);

  // Admin Dashboard State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [allAppointments, setAllAppointments] = useState([]);

  // Auth Effect
  useEffect(() => {
    if (!auth) return;
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

  // Fetch Booked Slots
  useEffect(() => {
    if (!user || !selectedDate || !db) return;
    const fetchSlots = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'));
        const booked = querySnapshot.docs
          .map(doc => doc.data())
          .filter(data => data.date === selectedDate)
          .map(data => data.slot);
        setBookedSlots(booked);
      } catch (err) {
        console.error("Error fetching slots:", err);
      }
    };
    fetchSlots();
  }, [user, selectedDate, bookingResult]);

  // Admin Real-time Listener
  useEffect(() => {
    if (!isAdmin || !user || !db) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllAppointments(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });
    return () => unsubscribe();
  }, [isAdmin, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!db) { alert("System not configured."); return; }
    if (!user) { alert("Please wait a moment for the connection to secure."); return; }
    if (!selectedSlot) { alert("Please select a time slot."); return; }
    setIsLoading(true);
    
    const refCode = "LM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const appointmentData = {
      ...bookingForm,
      date: selectedDate,
      slot: selectedSlot,
      refCode,
      status: 'Confirmed', 
      timestamp: Date.now() 
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), appointmentData);
      setBookingResult(refCode);
    } catch (err) {
      alert("Error saving your booking. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!user || !db) return;
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'));
      const found = querySnapshot.docs
        .map(d => d.data())
        .find(d => d.email === trackInfo.email && d.refCode === trackInfo.refCode);
      if (found) setTrackedAppointment(found);
      else alert("No appointment found with those details.");
    } finally { setIsLoading(false); }
  };

  const handleSendMessage = async (e) => {
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
        body: JSON.stringify({ contents: [{ parts: [{ text: `You are Lakshmi's personal assistant. Help users book time slots in the 'Book' tab or track sessions. Practice: ${PRACTICE_DETAILS.name}.\nUser: ${text}` }] }] })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble connecting right now." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm having a technical moment. Please try again later." }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] font-sans text-stone-800">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>
      
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
            <button key={t} onClick={() => setActiveTab(t)} className={`text-[11px] uppercase tracking-widest font-bold transition-colors ${activeTab === t ? 'text-emerald-900 border-b-2 border-emerald-900 pb-1' : 'text-stone-400 hover:text-stone-600'}`}>
              {t}
            </button>
          ))}
          <button onClick={() => setActiveTab('booking')} className="bg-emerald-900 text-white px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md">Book Slot</button>
        </div>
        <button className="md:hidden" onClick={() => setIsMenuOpen(true)}><Menu /></button>
      </nav>

      <main className="pt-32 pb-24 px-6 max-w-6xl mx-auto min-h-screen">
        {activeTab === 'home' && (
          <section className="grid lg:grid-cols-2 gap-16 items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-8">
              <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-widest rounded-full border border-emerald-100">Accepting New Clients</div>
              <h1 className="text-6xl md:text-7xl font-serif leading-[1.1]">Find meaning beneath the <span className="italic text-emerald-800">anxiety.</span></h1>
              <p className="text-xl text-stone-600 font-light leading-relaxed max-w-lg">{PRACTICE_DETAILS.bio}</p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button onClick={() => setActiveTab('booking')} className="bg-emerald-900 text-white px-10 py-5 rounded-full font-bold uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">Choose a Time Slot <ArrowRight size={16}/></button>
                <button onClick={() => setIsChatOpen(true)} className="bg-white border border-stone-200 px-10 py-5 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-stone-50 transition-all flex items-center justify-center gap-2"><MessageSquare size={16}/> Ask Assistant</button>
              </div>
            </div>
            <div className="relative aspect-[3/4] bg-stone-100 rounded-[3rem] shadow-2xl overflow-hidden group">
              <img src="https://cfir.ca/wp-content/uploads/2023/12/Website-picture-800x914.jpg" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" alt="Lakshmi Mupparthi" />
            </div>
          </section>
        )}

        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-serif">The Practice</h2>
              <div className="w-16 h-1 bg-emerald-900 mx-auto rounded-full" />
            </div>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="md:col-span-2 space-y-8">
                <p className="text-2xl font-serif italic text-stone-700 leading-relaxed border-l-4 border-emerald-800 pl-8">"I believe in mapping the contours of your experience together to find meaning beneath anxiety."</p>
                <div className="prose prose-stone text-stone-600 space-y-6 leading-relaxed font-light">
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
                        <CheckCircle className="text-emerald-700 shrink-0" size={14} /> {q}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'booking' && (
          <div className="max-w-5xl mx-auto py-12 animate-in fade-in">
            {bookingResult ? (
              <div className="bg-white p-16 rounded-[3rem] shadow-2xl text-center space-y-8 border border-stone-100">
                <CheckCircle size={64} className="text-emerald-700 mx-auto" />
                <h2 className="text-4xl font-serif">Booking Confirmed</h2>
                <div className="text-3xl font-bold tracking-[0.3em] bg-stone-50 py-4 px-10 rounded-2xl inline-block border border-stone-200">{bookingResult}</div>
                <p className="text-stone-400 max-w-xs mx-auto text-sm">Save this code. Lakshmi will contact you via email shortly.</p>
                <button onClick={() => setBookingResult(null)} className="text-emerald-800 font-bold underline block mx-auto uppercase tracking-widest text-[10px]">Close</button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-5 gap-8 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-stone-100 p-8">
                <div className="lg:col-span-2 space-y-8 border-r border-stone-50 pr-8">
                  <h3 className="text-2xl font-serif flex items-center gap-3"><CalendarIcon className="text-emerald-800" size={28}/> Select Date</h3>
                  <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full bg-stone-50 p-5 rounded-2xl outline-none focus:ring-1 focus:ring-emerald-900 border border-stone-100 font-medium" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Available Slots</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {TIME_SLOTS.map(slot => (
                        <button key={slot} disabled={bookedSlots.includes(slot)} onClick={() => setSelectedSlot(slot)} className={`p-4 rounded-xl text-[11px] font-bold transition-all border ${bookedSlots.includes(slot) ? 'opacity-20 cursor-not-allowed bg-stone-50' : selectedSlot === slot ? 'bg-emerald-900 text-white border-emerald-900 shadow-lg' : 'bg-white text-stone-600 border-stone-100 hover:border-emerald-200'}`}>{slot}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-3 space-y-6 pl-4">
                  <h3 className="text-2xl font-serif">Patient Information</h3>
                  <form onSubmit={handleBooking} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <input required className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900 font-light" placeholder="Full Name" value={bookingForm.name} onChange={(e) => setBookingForm({...bookingForm, name: e.target.value})} />
                      <input required type="email" className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900 font-light" placeholder="Email Address" value={bookingForm.email} onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})} />
                    </div>
                    <select className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900 font-medium" value={bookingForm.service} onChange={(e) => setBookingForm({...bookingForm, service: e.target.value})}>
                      <option value="individual">Individual Psychotherapy</option>
                      <option value="couples">Couples Therapy</option>
                    </select>
                    <textarea className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none h-32 resize-none font-light" placeholder="Notes..." value={bookingForm.message} onChange={(e) => setBookingForm({...bookingForm, message: e.target.value})} />
                    <button disabled={!selectedSlot || isLoading} className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-lg">Confirm My Slot</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="max-w-2xl mx-auto space-y-12 py-12 animate-in fade-in">
            <h2 className="text-4xl font-serif text-center">Track Booking</h2>
            <form onSubmit={handleTrack} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-stone-100 space-y-6">
              <input required type="email" className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none font-light" placeholder="Email Address" value={trackInfo.email} onChange={(e) => setTrackInfo({...trackInfo, email: e.target.value})} />
              <input required className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 outline-none font-light" placeholder="Reference ID (LM-XXXXXX)" value={trackInfo.refCode} onChange={(e) => setTrackInfo({...trackInfo, refCode: e.target.value})} />
              <button disabled={isLoading} className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3">
                {isLoading ? <RefreshCw className="animate-spin" size={16} /> : "Verify Status"}
              </button>
            </form>
            {trackedAppointment && (
              <div className="bg-emerald-900 text-white p-10 rounded-[2.5rem] shadow-2xl animate-in zoom-in">
                <h3 className="text-2xl font-serif mb-4">{trackedAppointment.name}</h3>
                <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">{trackedAppointment.status}</span>
                <p className="font-serif text-3xl mt-6">{trackedAppointment.date} at {trackedAppointment.slot}</p>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="py-12 animate-in fade-in space-y-12">
            <div className="flex justify-between items-center">
              <h2 className="text-5xl font-serif">Clinical Dashboard</h2>
              <button onClick={() => setIsAdmin(false)} className="bg-stone-100 p-3 rounded-2xl text-stone-400 hover:text-red-500"><X size={24}/></button>
            </div>
            <div className="grid gap-6">
              {allAppointments.map((app) => (
                <div key={app.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-[0.2em]">{app.date} • {app.slot}</p>
                    <p className="text-3xl font-serif text-stone-900">{app.name} <span className="text-xs text-stone-200">#{app.refCode}</span></p>
                    <p className="text-stone-400 text-sm">{app.email} • {app.service_type}</p>
                  </div>
                  <select value={app.status} onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', app.id), { status: e.target.value })} className="border-none rounded-2xl text-[11px] font-bold uppercase p-5 outline-none bg-stone-50">
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating AI Assistant */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 ${isChatOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 translate-y-8 pointer-events-none'}`}>
        <div className="bg-white w-[380px] h-[550px] rounded-[2.5rem] shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
          <div className="bg-emerald-900 p-6 text-white flex justify-between items-center">
            <span className="font-serif text-lg">Practice Assistant</span>
            <button onClick={() => setIsChatOpen(false)}><X size={20}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[15px] ${m.role === 'user' ? 'bg-stone-800 text-white rounded-br-none' : 'bg-white border text-stone-700 rounded-bl-none shadow-sm'}`}>{m.text}</div>
              </div>
            ))}
            {isTyping && <div className="p-4 italic text-stone-300">...</div>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex gap-2">
            <input className="flex-1 bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4 text-sm outline-none" placeholder="Message assistant..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button className="bg-emerald-900 text-white p-4 rounded-2xl shadow-lg hover:bg-black transition-all"><Send size={20}/></button>
          </form>
        </div>
      </div>

      <footer className="bg-stone-50 py-32 border-t border-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-10 text-center px-6">
          <div className="flex items-center space-x-4 grayscale opacity-40 hover:opacity-100 transition-all duration-700">
            <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center text-white font-serif text-lg">LM</div>
            <span className="text-stone-900 font-serif text-2xl tracking-[0.1em] uppercase">{PRACTICE_DETAILS.name}</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold max-w-lg leading-loose">Registered Psychotherapist (Qualifying) — Saint Catharines, Ontario.</p>
          {!isAdmin && (
            <div className="flex flex-col items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-1000 mt-12">
              <input type="password" placeholder="Admin Code" className="bg-transparent border-b border-stone-200 text-[10px] outline-none text-center py-2 uppercase tracking-widest" value={adminKeyInput} onChange={(e) => setAdminKeyInput(e.target.value)} />
              <button onClick={() => adminKeyInput === SECRET_ADMIN_CODE ? setIsAdmin(true) : alert("Invalid Code")} className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 underline mt-2">Manage Schedule</button>
            </div>
          )}
        </div>
      </footer>

      {!isChatOpen && (
        <button onClick={() => setIsChatOpen(true)} className="fixed bottom-10 right-10 bg-emerald-900 text-white p-6 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white">
          <MessageSquare size={28} />
        </button>
      )}
    </div>
  );
}
