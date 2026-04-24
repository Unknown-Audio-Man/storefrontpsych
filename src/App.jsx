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
  Send,
  MapPin,
  Mail,
  Phone,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

const apiKey = ""; // API key is handled by the environment or needs to be provided in production

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

const FAQS = [
  {
    q: "Do you offer free consultations?",
    a: "Yes, I offer a complimentary 15-minute introductory video or phone call. This gives us a chance to see if we are a good fit before committing to a full session."
  },
  {
    q: "Are your services covered by insurance?",
    a: "As a Registered Psychotherapist (Qualifying), my services are covered by many extended health benefits plans in Ontario. Please check with your provider to see if 'Psychotherapy' is covered under your plan."
  },
  {
    q: "What are your fees?",
    a: "My standard fee is $160 for a 50-minute individual session and $190 for couples therapy. I also hold a limited number of sliding scale spots for those facing financial barriers."
  },
  {
    q: "Do you offer in-person sessions?",
    a: "Yes! I offer both secure online video sessions across Ontario and in-person sessions at the Centre for Interpersonal Relationships (CFIR) in Saint Catharines."
  }
];

const QUICK_REPLIES = [
  "I'd like to book a consultation.",
  "Do you accept insurance?",
  "What is your approach to therapy?",
  "Where is your office located?"
];

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

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', service: 'individual', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;
    
    const userMsg = { role: 'user', text: textToSend };
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

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would send data to a backend or email service.
    // For now, we simulate a successful submission.
    setTimeout(() => {
      setIsSubmitted(true);
      setBookingForm({ name: '', email: '', service: 'individual', message: '' });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] font-sans text-stone-800 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-40 border-b border-stone-100 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center text-white font-serif text-xl group-hover:bg-emerald-800 transition-colors shadow-inner">LM</div>
            <div className="flex flex-col">
              <span className="font-serif text-lg leading-none tracking-tight text-stone-900">Lakshmi Mupparthi</span>
              <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mt-1">Psychotherapy</span>
            </div>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {['home', 'about', 'services', 'faq'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`text-sm tracking-wide capitalize transition-colors hover:text-emerald-700 ${activeTab === tab ? 'text-emerald-900 font-semibold border-b-2 border-emerald-800 pb-1' : 'text-stone-500'}`}
              >
                {tab === 'faq' ? 'FAQ' : tab}
              </button>
            ))}
            <button 
              onClick={() => setActiveTab('booking')} 
              className="ml-2 bg-emerald-900 text-white px-7 py-2.5 rounded-full text-sm font-medium hover:bg-emerald-800 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
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
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 p-8 flex flex-col space-y-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-end">
            <button className="p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors" onClick={() => setIsMenuOpen(false)}>
              <X size={32} />
            </button>
          </div>
          <div className="flex flex-col space-y-6 mt-8">
            {['home', 'about', 'services', 'faq'].map(tab => (
              <button 
                key={tab}
                className="text-4xl font-serif text-left capitalize text-stone-800 hover:text-emerald-800 transition-colors" 
                onClick={() => {setActiveTab(tab); setIsMenuOpen(false)}}
              >
                {tab === 'faq' ? 'FAQ' : tab}
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-widest border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
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
                  className="bg-emerald-900 text-white px-8 py-4 rounded-full font-medium shadow-xl hover:bg-stone-900 transition-all hover:-translate-y-1 flex justify-center items-center gap-2 group"
                >
                  Start Your Journey <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => setIsChatOpen(true)} 
                  className="bg-white border border-stone-200 text-stone-700 px-8 py-4 rounded-full font-medium hover:bg-stone-50 hover:border-stone-300 transition-all flex justify-center items-center gap-2"
                >
                  <MessageSquare size={18} /> Ask a Question
                </button>
              </div>
            </div>
            <div className="relative aspect-[4/5] lg:aspect-[3/4] bg-gradient-to-tr from-stone-200 to-stone-100 rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden group">
               <div className="absolute inset-0 bg-emerald-900/5 group-hover:bg-transparent transition-colors duration-700"></div>
               <User size={140} strokeWidth={1} className="text-stone-400 group-hover:scale-105 transition-transform duration-700" />
               <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 transform group-hover:-translate-y-2 transition-transform duration-500">
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
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 hover:border-emerald-200 transition-colors">
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-2"><Globe size={18} className="text-emerald-700" /> Languages</h4>
                  <p className="text-sm text-stone-600">{PRACTICE_DETAILS.languages.join(", ")}</p>
                </div>
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 hover:border-emerald-200 transition-colors">
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
                <div key={i} className="p-8 bg-white border border-stone-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    {s.icon}
                  </div>
                  <h3 className="text-xl font-serif text-stone-900 mb-3">{s.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-16 bg-emerald-900 rounded-[2.5rem] p-12 text-center text-white shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-800 via-transparent to-transparent opacity-50"></div>
              <h3 className="text-3xl font-serif mb-6 relative z-10">My Approach</h3>
              <p className="max-w-3xl mx-auto text-emerald-50 text-lg leading-relaxed relative z-10">
                {PRACTICE_DETAILS.approach}. I don't believe in a one-size-fits-all model. I draw from these different modalities to create a framework that fits your specific needs, pace, and comfort level.
              </p>
            </div>
          </div>
        )}

        {/* FAQ SECTION */}
        {activeTab === 'faq' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-serif text-stone-900">Frequently Asked Questions</h2>
              <div className="w-16 h-1 bg-emerald-800 mx-auto rounded-full mt-6"></div>
            </div>

            <div className="grid gap-6">
              {FAQS.map((faq, index) => (
                <div key={index} className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-serif text-stone-900 mb-4 flex items-start gap-3">
                    <HelpCircle className="text-emerald-700 shrink-0 mt-1" size={20} />
                    {faq.q}
                  </h3>
                  <p className="text-stone-600 leading-relaxed pl-8">{faq.a}</p>
                </div>
              ))}
            </div>

            <div className="text-center pt-8 border-t border-stone-200">
              <p className="text-stone-500 mb-4">Still have questions?</p>
              <button 
                onClick={() => setIsChatOpen(true)}
                className="inline-flex items-center gap-2 text-emerald-800 font-medium hover:text-emerald-900 transition-colors"
              >
                <MessageSquare size={18} /> Ask the virtual assistant
              </button>
            </div>
          </div>
        )}

        {/* BOOKING SECTION */}
        {activeTab === 'booking' && (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-serif text-stone-900">Let's Connect</h2>
              <p className="text-stone-500 max-w-2xl mx-auto">Choose the method that feels most comfortable for you to get started.</p>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-stone-100">
              
              {/* Left Column - Contact Details & AI Assistant Prompt */}
              <div className="lg:w-5/12 bg-emerald-900 p-10 lg:p-14 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
                <div className="relative z-10 space-y-10">
                  <div>
                    <h3 className="text-3xl font-serif mb-4">Contact Information</h3>
                    <p className="text-emerald-100/90 leading-relaxed">
                      Reach out directly, or use the form to request a consultation. I aim to respond to all inquiries within 48 hours.
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-800/80 flex items-center justify-center shrink-0 border border-emerald-700"><Mail size={20} className="text-emerald-100" /></div>
                      <div>
                        <p className="font-bold text-sm tracking-wider uppercase text-emerald-200/80">Email</p>
                        <p className="text-white font-medium">{PRACTICE_DETAILS.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-800/80 flex items-center justify-center shrink-0 border border-emerald-700"><Phone size={20} className="text-emerald-100" /></div>
                      <div>
                        <p className="font-bold text-sm tracking-wider uppercase text-emerald-200/80">Phone</p>
                        <p className="text-white font-medium">{PRACTICE_DETAILS.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-800/80 flex items-center justify-center shrink-0 border border-emerald-700"><MapPin size={20} className="text-emerald-100" /></div>
                      <div>
                        <p className="font-bold text-sm tracking-wider uppercase text-emerald-200/80">Location</p>
                        <p className="text-white font-medium">CFIR - Saint Catharines, ON</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-emerald-800/50">
                    <p className="mb-4 text-emerald-50">Prefer to chat before booking?</p>
                    <button 
                      onClick={() => setIsChatOpen(true)} 
                      className="w-full bg-white text-emerald-950 py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-50 hover:shadow-xl transition-all font-bold"
                    >
                      <MessageSquare size={20} /> Use Virtual Assistant
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Booking Form */}
              <div className="lg:w-7/12 p-10 lg:p-14 bg-stone-50/50">
                {isSubmitted ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
                      <CheckCircle size={48} />
                    </div>
                    <h3 className="text-3xl font-serif text-stone-900">Request Sent</h3>
                    <p className="text-stone-600 max-w-sm">
                      Thank you for reaching out. I have received your request and will get back to you via email shortly.
                    </p>
                    <button 
                      onClick={() => setIsSubmitted(false)}
                      className="text-emerald-800 font-medium hover:underline pt-4"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-serif text-stone-900">Request a Consultation</h3>
                      <p className="text-stone-500 text-sm">Fill out the details below to request your free 15-minute introductory call.</p>
                    </div>
                    
                    <form onSubmit={handleBookingSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-stone-700 ml-1">Full Name</label>
                          <input 
                            required
                            type="text" 
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                            value={bookingForm.name}
                            onChange={(e) => setBookingForm({...bookingForm, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-stone-700 ml-1">Email Address</label>
                          <input 
                            required
                            type="email" 
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                            value={bookingForm.email}
                            onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-stone-700 ml-1">Service Interest</label>
                        <select 
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                          value={bookingForm.service}
                          onChange={(e) => setBookingForm({...bookingForm, service: e.target.value})}
                        >
                          <option value="individual">Individual Therapy</option>
                          <option value="couples">Couples Therapy</option>
                          <option value="neuro">Neurodivergence Support</option>
                          <option value="consultation">General Consultation</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-stone-700 ml-1">Brief Message (Optional)</label>
                        <textarea 
                          rows="4"
                          placeholder="Is there anything specific you'd like to address?"
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all resize-none"
                          value={bookingForm.message}
                          onChange={(e) => setBookingForm({...bookingForm, message: e.target.value})}
                        ></textarea>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full bg-stone-900 text-white py-4 rounded-xl font-medium hover:bg-stone-800 transition-all shadow-md hover:shadow-lg mt-2"
                      >
                        Submit Request
                      </button>
                    </form>
                    <p className="text-center text-xs text-stone-400">
                      Your information is kept strictly confidential.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating AI Assistant UI */}
      <div className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 transition-all duration-400 ease-out transform origin-bottom-right ${isChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8 pointer-events-none'}`}>
        <div className="bg-white w-[calc(100vw-3rem)] max-w-[420px] h-[650px] max-h-[calc(100vh-6rem)] rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-stone-200 flex flex-col overflow-hidden">
          
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
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#fcfbf9]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-stone-800 text-white rounded-br-sm' 
                  : 'bg-white border border-stone-200 text-stone-800 rounded-bl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            
            {/* Quick Replies (Only show after first assistant message and if not typing) */}
            {messages.length === 1 && !isTyping && (
              <div className="flex flex-col gap-2 pt-2 animate-in fade-in duration-700">
                <p className="text-xs text-stone-400 ml-1 mb-1 font-medium">SUGGESTED QUESTIONS</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_REPLIES.map((reply, index) => (
                    <button 
                      key={index}
                      onClick={() => handleSendMessage(reply)}
                      className="text-left text-sm bg-white border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-full hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="p-4 bg-white border-t border-stone-100 flex gap-3">
            <input 
              type="text" 
              placeholder="Type your message..." 
              className="flex-1 text-base bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all" 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={isTyping || !input.trim()}
              className="bg-emerald-900 text-white p-3 rounded-xl hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
            >
              <Send size={20}/>
            </button>
          </form>
        </div>
      </div>

      {/* Floating Action Button */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)} 
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-stone-900 text-white p-4 md:p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group flex items-center justify-center border-4 border-white"
          aria-label="Open Chat Assistant"
        >
          <MessageSquare size={28} className="group-hover:animate-pulse" />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-16 px-6 text-sm border-t border-stone-900">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-900/50 rounded-full flex items-center justify-center text-white font-serif text-sm border border-emerald-800/50">LM</div>
              <span className="text-stone-200 font-serif text-xl">Lakshmi Mupparthi</span>
            </div>
            <p className="max-w-sm leading-relaxed text-stone-500">
              Dedicated to deepening self-awareness and healing relational patterns through integrative psychotherapy in Ontario.
            </p>
          </div>
          <div>
            <h4 className="text-stone-200 font-bold uppercase tracking-widest mb-6 text-xs">Quick Links</h4>
            <ul className="space-y-3">
              <li><button onClick={() => setActiveTab('home')} className="hover:text-emerald-400 transition-colors">Home</button></li>
              <li><button onClick={() => setActiveTab('about')} className="hover:text-emerald-400 transition-colors">About Lakshmi</button></li>
              <li><button onClick={() => setActiveTab('services')} className="hover:text-emerald-400 transition-colors">Specialties</button></li>
              <li><button onClick={() => setActiveTab('faq')} className="hover:text-emerald-400 transition-colors">FAQ</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-stone-200 font-bold uppercase tracking-widest mb-6 text-xs">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2"><Mail size={14} /> {PRACTICE_DETAILS.email}</li>
              <li className="flex items-center gap-2"><Phone size={14} /> {PRACTICE_DETAILS.phone}</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> Saint Catharines, ON</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto pt-8 border-t border-stone-900/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-600">
          <p>© {new Date().getFullYear()} Lakshmi Mupparthi. Registered Psychotherapist (Qualifying). All rights reserved.</p>
          <div className="flex gap-6">
             <span className="hover:text-stone-300 cursor-pointer transition-colors">Privacy Policy</span>
             <span className="hover:text-stone-300 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
