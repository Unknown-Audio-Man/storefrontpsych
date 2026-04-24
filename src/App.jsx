import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  MessageSquare, 
  User, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  Menu, 
  X, 
  Globe, 
  Heart,
  Shield,
  Send
} from 'lucide-react';

const apiKey = ""; // API key is handled by the environment or needs to be provided in production

const PRACTICE_DETAILS = {
  name: "Lakshmi Mupparthi, M.A., R.P.",
  title: "Registered Psychotherapist (Qualifying)",
  location: "Saint Catharines, ON",
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

const SYSTEM_PROMPT = `
You are the AI Assistant for Lakshmi Mupparthi's Psychotherapy practice. 
Your goal is to be professional, empathetic, and helpful.
Practice Info: ${JSON.stringify(PRACTICE_DETAILS)}
Context: Lakshmi is a therapist at CFIR (Centre for Interpersonal Relationships).
Task: Answer questions about the practice, specialties, and help with booking inquiries. 
Keep responses concise, warm, and professional.
`;

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello. I'm Lakshmi's virtual assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
        try {
          const res = await fetch(url, options);
          if (!res.ok && retries > 0) throw new Error();
          return res;
        } catch (err) {
          if (retries === 0) throw err;
          await new Promise(r => setTimeout(r, backoff));
          return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
      };

      const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Context: ${SYSTEM_PROMPT}\n\nUser: ${userMsg.text}` }] }]
        })
      });
      
      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I'm having trouble connecting right now. Please try again or email us directly.";
      setMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Service is temporarily unavailable due to a technical error. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] font-sans text-stone-800 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-40 border-b border-stone-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center text-white font-serif text-xl group-hover:bg-emerald-800 transition-colors">LM</div>
            <div className="flex flex-col">
              <span className="font-serif text-lg leading-none tracking-tight">Lakshmi Mupparthi</span>
              <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-1">Psychotherapy</span>
            </div>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {['home', 'about', 'services'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`text-sm tracking-wide capitalize transition-colors hover:text-emerald-700 ${activeTab === tab ? 'text-emerald-900 font-semibold border-b-2 border-emerald-800 pb-1' : 'text-stone-500'}`}
              >
                {tab}
              </button>
            ))}
            <button 
              onClick={() => setActiveTab('booking')} 
              className="ml-2 bg-emerald-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-emerald-800 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              Book Session
            </button>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-stone-600 hover:text-stone-900 transition-colors" onClick={() => setIsMenuOpen(true)}>
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-white z-50 p-8 flex flex-col space-y-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-end">
            <button className="p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors" onClick={() => setIsMenuOpen(false)}>
              <X size={32} />
            </button>
          </div>
          <div className="flex flex-col space-y-6 mt-8">
            {['home', 'about', 'services'].map(tab => (
              <button 
                key={tab}
                className="text-4xl font-serif text-left capitalize text-stone-800 hover:text-emerald-800 transition-colors" 
                onClick={() => {setActiveTab(tab); setIsMenuOpen(false)}}
              >
                {tab}
              </button>
            ))}
            <button 
              className="text-4xl font-serif text-left text-emerald-800" 
              onClick={() => {setActiveTab('booking'); setIsMenuOpen(false)}}
            >
              Book Session
            </button>
          </div>
        </div>
      )}

      {/* Main Page Content */}
      <main className="pt-32 pb-24 px-6 max-w-6xl mx-auto min-h-screen">
        
        {/* HOME SECTION */}
        {activeTab === 'home' && (
          <section className="grid lg:grid-cols-2 gap-16 items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-8">
              <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-widest border border-emerald-100">
                Accepting New Clients
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.1] text-stone-900">
                Resilience is found in the <span className="italic text-emerald-800">unspoken.</span>
              </h1>
              <p className="text-xl text-stone-600 leading-relaxed max-w-lg">
                Integrative, trauma-informed therapy for individuals and couples in Saint Catharines and throughout Ontario.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={() => setActiveTab('booking')} 
                  className="bg-emerald-900 text-white px-8 py-4 rounded-full font-medium shadow-xl hover:bg-stone-900 transition-all hover:-translate-y-1"
                >
                  Start Your Journey
                </button>
                <button 
                  onClick={() => setIsChatOpen(true)} 
                  className="bg-white border border-stone-200 text-stone-700 px-8 py-4 rounded-full font-medium hover:bg-stone-50 hover:border-stone-300 transition-all"
                >
                  Ask a Question
                </button>
              </div>
            </div>
            <div className="relative aspect-[4/5] lg:aspect-[3/4] bg-gradient-to-tr from-stone-200 to-stone-100 rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden group">
               <div className="absolute inset-0 bg-emerald-900/5 group-hover:bg-transparent transition-colors duration-700"></div>
               <User size={140} strokeWidth={1} className="text-stone-400 group-hover:scale-105 transition-transform duration-700" />
               <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                 <p className="font-serif italic text-stone-700 text-sm md:text-base leading-relaxed">
                   "Mapping the contours of your experience together to find meaning beneath the anxiety."
                 </p>
               </div>
            </div>
          </section>
        )}

        {/* ABOUT SECTION */}
        {activeTab === 'about' && (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-serif text-stone-900">About Lakshmi</h2>
              <div className="w-16 h-1 bg-emerald-800 mx-auto rounded-full"></div>
            </div>
            <div className="prose prose-stone lg:prose-lg text-stone-600 leading-relaxed space-y-6 mx-auto bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-stone-100">
              <p className="text-xl font-serif italic text-stone-800 leading-normal border-l-4 border-emerald-800 pl-6">
                My work is grounded in empathy, cultural humility, and clinical excellence.
              </p>
              <p>{PRACTICE_DETAILS.bio}</p>
              <p>
                I hold a Masters in Psychology and navigate the therapeutic space with a deep understanding of intersectional identities. Whether you are dealing with burnout, relationship challenges, or late-diagnosed neurodivergence, we will work collaboratively to build a toolkit that feels authentic to you.
              </p>
              
              <div className="mt-10 grid sm:grid-cols-2 gap-6 not-prose">
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-2"><Globe size={18} className="text-emerald-700" /> Languages</h4>
                  <p className="text-sm text-stone-600">{PRACTICE_DETAILS.languages.join(", ")}</p>
                </div>
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-700" /> Certification</h4>
                  <p className="text-sm text-stone-600">Registered Psychotherapist (Qualifying) - CRPO</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SERVICES SECTION */}
        {activeTab === 'services' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl md:text-5xl font-serif text-stone-900">Therapeutic Specialties</h2>
              <p className="text-stone-500 max-w-2xl mx-auto">Evidence-based, integrative care tailored to your unique lived experience.</p>
              <div className="w-16 h-1 bg-emerald-800 mx-auto rounded-full mt-6"></div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Anxiety & Depression", icon: <Heart className="text-emerald-700" size={24} />, desc: "Moving beyond symptom management to understand the root causes of distress." },
                { title: "Relational Wounds", icon: <User className="text-emerald-700" size={24} />, desc: "Healing attachment trauma and building healthier boundaries with others." },
                { title: "Neurodivergence", icon: <Shield className="text-emerald-700" size={24} />, desc: "Affirming support for ADHD and ASD, focusing on unmasking and burnout." },
                { title: "Trauma & Attachment", icon: <CheckCircle className="text-emerald-700" size={24} />, desc: "Processing past experiences in a safe, paced, and grounded environment." },
                { title: "Cultural Identity", icon: <Globe className="text-emerald-700" size={24} />, desc: "Navigating the intersection of tradition, family expectations, and autonomy." },
                { title: "Couples Therapy", icon: <MessageSquare className="text-emerald-700" size={24} />, desc: "Improving communication and rebuilding trust using Emotion-Focused techniques." }
              ].map((s, i) => (
                <div key={i} className="p-8 bg-white border border-stone-100 rounded-3xl shadow-sm hover:shadow-md hover:border-emerald-100 transition-all group">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {s.icon}
                  </div>
                  <h3 className="text-xl font-serif text-stone-900 mb-3">{s.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BOOKING SECTION */}
        {activeTab === 'booking' && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-stone-100">
              <div className="lg:w-5/12 bg-emerald-900 p-12 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
                <div className="relative z-10 space-y-8">
                  <h2 className="text-4xl lg:text-5xl font-serif leading-tight">Let's Connect.</h2>
                  <p className="text-emerald-100 text-lg leading-relaxed">
                    Finding the right therapist is an important step. I offer a complimentary 15-minute consultation to ensure my approach aligns with your needs.
                  </p>
                  
                  <div className="space-y-6 pt-8 border-t border-emerald-800/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center"><Clock size={18} /></div>
                      <div>
                        <p className="font-bold text-sm">Session Length</p>
                        <p className="text-emerald-200 text-sm">50 Minutes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center"><Globe size={18} /></div>
                      <div>
                        <p className="font-bold text-sm">Format</p>
                        <p className="text-emerald-200 text-sm">Online & In-Person (St. Catharines)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="lg:w-7/12 p-12 lg:p-16 flex flex-col justify-center bg-stone-50/50">
                <div className="max-w-md mx-auto w-full space-y-8">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-serif text-stone-900">Ready to begin?</h3>
                    <p className="text-stone-500">Use the assistant to ask questions or start the booking process immediately.</p>
                  </div>
                  
                  <button 
                    onClick={() => setIsChatOpen(true)} 
                    className="w-full bg-stone-900 text-white py-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-stone-800 hover:shadow-xl transition-all transform hover:-translate-y-1"
                  >
                    <MessageSquare size={22} /> 
                    <span className="font-medium text-lg">Open Booking Assistant</span>
                  </button>
                  
                  <p className="text-center text-xs text-stone-400 mt-6">
                    Powered by secure AI. Your information is kept confidential.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating AI Assistant UI */}
      <div className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 transition-all duration-400 ease-out transform origin-bottom-right ${isChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8 pointer-events-none'}`}>
        <div className="bg-white w-[calc(100vw-3rem)] max-w-[400px] h-[600px] max-h-[calc(100vh-6rem)] rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-stone-200 flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="bg-emerald-900 p-5 text-white flex justify-between items-center shadow-md relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <MessageSquare size={20} className="text-emerald-50" />
              </div>
              <div>
                <span className="font-serif text-lg block leading-none">Practice Assistant</span>
                <span className="text-[10px] text-emerald-200/80 uppercase tracking-widest font-bold flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                </span>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
          </div>
          
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#fdfcfb]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-stone-800 text-white rounded-br-sm' 
                  : 'bg-white border border-stone-100 text-stone-800 rounded-bl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
               <div className="flex justify-start">
                 <div className="bg-white border border-stone-100 p-4 rounded-2xl rounded-bl-sm shadow-sm flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                 </div>
               </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-stone-100 flex gap-3">
            <input 
              type="text" 
              placeholder="Type your message..." 
              className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all" 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={isTyping || !input.trim()}
              className="bg-emerald-900 text-white p-3 rounded-xl hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
            >
              <Send size={18}/>
            </button>
          </form>
        </div>
      </div>

      {/* Floating Action Button */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)} 
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-stone-900 text-white p-4 md:p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group"
          aria-label="Open Chat Assistant"
        >
          <MessageSquare size={24} className="group-hover:animate-pulse" />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-16 px-6 text-sm border-t border-stone-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-900/50 rounded-full flex items-center justify-center text-white font-serif text-xs">LM</div>
            <span className="text-stone-300 font-serif">Lakshmi Mupparthi</span>
          </div>
          <p className="text-center md:text-left">© {new Date().getFullYear()} Professional Psychotherapy Practice. All rights reserved.</p>
          <div className="flex gap-6">
             <button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">Home</button>
             <button onClick={() => setActiveTab('booking')} className="hover:text-white transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
