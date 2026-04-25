import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, where, getDocs, 
  updateDoc, doc, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Calendar as CalendarIcon, MessageSquare, User, Clock, CheckCircle, 
  ChevronRight, Menu, X, Globe, Heart, Shield, Send, 
  MapPin, Mail, Phone, HelpCircle, ArrowRight, ExternalLink, 
  Lock, Search, RefreshCw, Clipboard, ChevronLeft
} from 'lucide-react';

// --- CONFIGURATION ---
// These remain as placeholders for your final deployment
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const GOOGLE_SHEET_WEBHOOK_URL = ""; // Paste your Google Apps Script Web App URL here
const GEMINI_API_KEY = ""; 

const app = firebaseConfig.apiKey !== "YOUR_API_KEY" ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;
const appId = "lakshmi-psych-practice";

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
  approach: "Integrative (Humanistic, EFT, CBT, Psychodynamic)",
  bio: "I support adults and couples seeking change beyond surface-level patterns. My practice is shaped by clinical training and my own experience navigating tradition-bound cultural norms and neurodivergence. I believe in mapping the contours of your experience together to find meaning beneath anxiety."
};

const TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  // AI Chat State
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Hello. I'm Lakshmi's virtual assistant. I can help you find an available slot or check the status of an existing booking." }]);
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

  // Initialize Auth
  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch booked slots for the selected date to prevent double-booking
  useEffect(() => {
    if (!db || !selectedDate) return;
    const fetchSlots = async () => {
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'appointments'),
        where("date", "==", selectedDate)
      );
      const querySnapshot = await getDocs(q);
      const booked = querySnapshot.docs.map(doc => doc.data().slot);
      setBookedSlots(booked);
    };
    fetchSlots();
  }, [selectedDate, bookingResult]);

  // Admin Real-time Listener
  useEffect(() => {
    if (!isAdmin || !db) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllAppointments(data.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!db) { alert("Firebase is not configured yet."); return; }
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
      // 1. Save to Firestore
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), appointmentData);
      
      // 2. Sync to Google Sheets
      if (GOOGLE_SHEET_WEBHOOK_URL) {
        fetch(GOOGLE_SHEET_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(appointmentData)
        }).catch(e => console.log("Sheet Sync Error:", e));
      }

      setBookingResult(refCode);
    } catch (err) {
      alert("Error booking slot. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!db) return;
    setIsLoading(true);
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'appointments'),
      where("email", "==", trackInfo.email),
      where("refCode", "==", trackInfo.refCode)
    );
    try {
      const snap = await getDocs(q);
      if (!snap.empty) setTrackedAppointment(snap.docs[0].data());
      else alert("No appointment found with those details.");
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
        body: JSON.stringify({ contents: [{ parts: [{ text: `You are Lakshmi's personal assistant. Practice: ${PRACTICE_DETAILS.name}. Specialties: ${PRACTICE_DETAILS.specialties.join(", ")}. Help users book time slots in the 'Book' tab or track existing ones. Date: ${new Date().toDateString()}.\nUser: ${text}` }] }] })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.candidates[0].content.parts[0].text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm having a technical moment. Please try again soon." }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] font-sans text-stone-800">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>
      
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
          {['home', 'services', 'tracking'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`text-xs uppercase tracking-widest font-medium transition-colors ${activeTab === t ? 'text-emerald-900 border-b-2 border-emerald-900 pb-1' : 'text-stone-400 hover:text-stone-600'}`}>
              {t}
            </button>
          ))}
          <button onClick={() => setActiveTab('booking')} className="bg-emerald-900 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md">Book Slot</button>
        </div>
        <button className="md:hidden" onClick={() => setIsMenuOpen(true)}><Menu /></button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-white z-50 p-8 flex flex-col space-y-8">
          <div className="flex justify-end"><button onClick={() => setIsMenuOpen(false)}><X size={32} /></button></div>
          <div className="flex flex-col space-y-8 mt-12 text-3xl font-serif">
            {['home', 'services', 'tracking'].map(t => (
              <button key={t} className="text-left capitalize" onClick={() => {setActiveTab(t); setIsMenuOpen(false)}}>{t}</button>
            ))}
            <button className="text-left text-emerald-800" onClick={() => {setActiveTab('booking'); setIsMenuOpen(false)}}>Book Slot</button>
          </div>
        </div>
      )}

      <main className="pt-32 pb-24 px-6 max-w-6xl mx-auto min-h-screen">
        {activeTab === 'home' && (
          <div className="space-y-24">
            <section className="grid lg:grid-cols-2 gap-16 items-center animate-in fade-in duration-700">
              <div className="space-y-8">
                <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-widest rounded-full">Accepting New Clients</div>
                <h1 className="text-6xl font-serif leading-tight">Find meaning beneath the <span className="italic text-emerald-800">anxiety.</span></h1>
                <p className="text-xl text-stone-500 font-light leading-relaxed max-w-lg">{PRACTICE_DETAILS.bio}</p>
                <div className="flex gap-4">
                  <button onClick={() => setActiveTab('booking')} className="bg-emerald-900 text-white px-10 py-5 rounded-full font-bold uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">Pick a Time Slot</button>
                  <button onClick={() => setIsChatOpen(true)} className="bg-white border border-stone-200 px-10 py-5 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-stone-50 transition-all flex items-center gap-2"><MessageSquare size={16}/> Ask Assistant</button>
                </div>
              </div>
              <div className="relative aspect-[3/4] bg-stone-100 rounded-[3rem] shadow-2xl overflow-hidden">
                <img src="https://cfir.ca/wp-content/uploads/2023/12/Website-picture-800x914.jpg" className="w-full h-full object-cover" alt="Lakshmi" />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-16 animate-in fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-serif">Therapeutic Services</h2>
              <div className="w-12 h-1 bg-emerald-900 mx-auto rounded-full" />
              <p className="text-stone-500 max-w-2xl mx-auto">Integrative care focusing on your unique lived experience and attachment patterns.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {PRACTICE_DETAILS.specialties.map((s, i) => (
                <div key={i} className="p-10 bg-white border border-stone-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Heart className="text-emerald-700" size={24} /></div>
                  <h3 className="text-xl font-serif text-stone-900 mb-3">{s}</h3>
                  <p className="text-stone-400 text-sm font-light leading-relaxed">Evidence-based support tailored to your unique clinical needs and personal goals.</p>
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
                <p className="text-stone-500">Your unique reference code is:</p>
                <div className="text-3xl font-bold tracking-widest bg-stone-50 py-4 px-8 rounded-2xl inline-block border">{bookingResult}</div>
                <p className="text-stone-400 max-w-xs mx-auto">Please save this code to track your appointment. Our calendar has been synced.</p>
                <button onClick={() => setBookingResult(null)} className="text-emerald-800 font-bold underline block mx-auto">Close</button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-5 gap-8 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-stone-100 p-8">
                {/* Step 1: Calendar Selection */}
                <div className="lg:col-span-2 space-y-6 border-r border-stone-50 pr-8">
                  <h3 className="text-2xl font-serif flex items-center gap-2"><CalendarIcon size={24}/> Select Date</h3>
                  <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full bg-stone-50 p-4 rounded-2xl outline-none focus:ring-1 focus:ring-emerald-900" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Available Time Slots</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {TIME_SLOTS.map(slot => (
                        <button 
                          key={slot}
                          disabled={bookedSlots.includes(slot)}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-xl text-xs font-bold transition-all border ${bookedSlots.includes(slot) ? 'opacity-20 cursor-not-allowed bg-stone-50 text-stone-300' : selectedSlot === slot ? 'bg-emerald-900 text-white border-emerald-900 shadow-lg' : 'bg-white text-stone-600 border-stone-100 hover:border-emerald-200'}`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 2: Information Form */}
                <div className="lg:col-span-3 space-y-6 pl-4">
                  <h3 className="text-2xl font-serif">Patient Information</h3>
                  <form onSubmit={handleBooking} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <input required className="w-full bg-stone-50 border rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900" placeholder="Full Name" value={bookingForm.name} onChange={(e) => setBookingForm({...bookingForm, name: e.target.value})} />
                      <input required type="email" className="w-full bg-stone-50 border rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900" placeholder="Email Address" value={bookingForm.email} onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})} />
                    </div>
                    <select className="w-full bg-stone-50 border rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900" value={bookingForm.service} onChange={(e) => setBookingForm({...bookingForm, service: e.target.value})}>
                      <option value="individual">Individual Therapy</option>
                      <option value="couples">Couples Therapy</option>
                      <option value="neurodivergence">Neurodivergence Support</option>
                    </select>
                    <textarea className="w-full bg-stone-50 border rounded-2xl px-5 py-4 outline-none h-32 resize-none" placeholder="Is there anything specific you would like to address? (Optional)" value={bookingForm.message} onChange={(e) => setBookingForm({...bookingForm, message: e.target.value})} />
                    
                    <div className="bg-emerald-50 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="text-emerald-900 text-center md:text-left">
                        <p className="text-[10px] uppercase font-bold tracking-widest">Chosen Appointment</p>
                        <p className="font-serif text-lg">{selectedDate} at {selectedSlot || '---'}</p>
                      </div>
                      <button disabled={!selectedSlot || isLoading} className="w-full md:w-auto bg-emerald-900 text-white px-10 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest disabled:opacity-20 shadow-lg hover:bg-black transition-all">
                        {isLoading ? "Processing..." : "Confirm Booking"}
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
              <h2 className="text-4xl font-serif">Track Appointment</h2>
              <p className="text-stone-500">Check the current status of your session.</p>
            </div>
            <form onSubmit={handleTrack} className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-stone-100 space-y-4">
              <input required type="email" className="w-full bg-stone-50 border rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900" placeholder="Your Email" value={trackInfo.email} onChange={(e) => setTrackInfo({...trackInfo, email: e.target.value})} />
              <input required className="w-full bg-stone-50 border rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-emerald-900" placeholder="Reference Code (LM-XXXXXX)" value={trackInfo.refCode} onChange={(e) => setTrackInfo({...trackInfo, refCode: e.target.value})} />
              <button disabled={isLoading} className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-black transition-all">
                {isLoading ? <RefreshCw className="animate-spin" /> : "Verify Status"}
              </button>
            </form>
            {trackedAppointment && (
              <div className="bg-emerald-900 text-white p-10 rounded-[2.5rem] shadow-2xl animate-in zoom-in">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-serif">{trackedAppointment.name}</h3>
                    <p className="text-emerald-200/60 font-mono text-xs mt-1">{trackedAppointment.refCode}</p>
                  </div>
                  <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">{trackedAppointment.status}</span>
                </div>
                <div className="space-y-2 border-t border-emerald-800 pt-6">
                  <p className="text-emerald-100 text-sm">Scheduled For:</p>
                  <p className="font-serif text-2xl">{trackedAppointment.date} at {trackedAppointment.slot}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden Admin Clinical Section */}
        {isAdmin && (
          <div className="py-12 animate-in fade-in space-y-12">
            <div className="flex justify-between items-center">
              <h2 className="text-5xl font-serif">Clinical Dashboard</h2>
              <div className="flex gap-4">
                <a href={GOOGLE_SHEET_WEBHOOK_URL ? "https://docs.google.com/spreadsheets" : "#"} target="_blank" className="bg-green-100 text-green-700 px-5 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <ExternalLink size={14} /> Sync Sheet
                </a>
                <button onClick={() => setIsAdmin(false)} className="text-stone-300 hover:text-red-500 transition-colors"><X size={32}/></button>
              </div>
            </div>
            <div className="grid gap-6">
              {allAppointments.map((app) => (
                <div key={app.id} className="bg-white p-8 rounded-[2.5rem] shadow-md border border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-emerald-800 uppercase tracking-widest">{app.date} • {app.slot}</p>
                    <p className="text-2xl font-serif text-stone-900">{app.name}</p>
                    <p className="text-stone-400 text-sm">{app.email} • {app.service_type}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <select 
                      value={app.status} 
                      onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', app.id), { status: e.target.value })} 
                      className={`border-none rounded-2xl text-[10px] font-bold uppercase tracking-widest p-4 outline-none ${app.status === 'Confirmed' ? 'bg-green-50 text-green-700' : 'bg-stone-50 text-stone-500'}`}
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

      {/* Floating AI Assistant */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 ${isChatOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        <div className="bg-white w-[380px] h-[580px] rounded-[2.5rem] shadow-2xl border border-stone-100 flex flex-col overflow-hidden">
          <div className="bg-emerald-900 p-6 text-white flex justify-between items-center">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md"><MessageSquare size={16}/></div>
               <span className="font-serif">Assistant</span>
             </div>
             <button onClick={() => setIsChatOpen(false)}><X size={20}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-emerald-900 text-white rounded-br-none' : 'bg-white border shadow-sm rounded-bl-none text-stone-700'}`}>{m.text}</div>
              </div>
            ))}
            {isTyping && <div className="p-4 flex gap-2"><div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-2 h-2 bg-stone-200 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleAIChat} className="p-5 bg-white border-t flex gap-2">
            <input className="flex-1 bg-stone-50 rounded-2xl px-5 py-3 text-sm outline-none font-light" placeholder="Ask about availability..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button className="bg-emerald-900 text-white p-3 rounded-2xl shadow-md hover:bg-black transition-colors"><Send size={18}/></button>
          </form>
        </div>
      </div>

      {/* Footer Area */}
      <footer className="bg-stone-50 py-24 border-t border-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-8 text-center px-6">
          <div className="flex items-center space-x-3 grayscale opacity-30">
            <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center text-white font-serif text-sm">LM</div>
            <span className="text-stone-900 font-serif text-lg tracking-widest uppercase">{PRACTICE_DETAILS.name}</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Registered Psychotherapist — Saint Catharines, Ontario</p>
          
          {!isAdmin && (
            <div className="flex flex-col items-center gap-2 opacity-5 hover:opacity-100 transition-opacity">
              <input type="password" placeholder="Admin Login" className="bg-transparent border-b text-[10px] outline-none text-center py-2" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
              <button onClick={() => adminKey === SECRET_ADMIN_CODE ? setIsAdmin(true) : null} className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 underline">Enter Portal</button>
            </div>
          )}
        </div>
      </footer>

      {!isChatOpen && (
        <button onClick={() => setIsChatOpen(true)} className="fixed bottom-8 right-8 bg-emerald-900 text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white">
          <MessageSquare />
        </button>
      )}
    </div>
  );
}
