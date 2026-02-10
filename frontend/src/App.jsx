import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  ListTodo,
  Glasses,
  Clock,
  MessageSquare,
  Moon,
  Sun,
  ChevronRight,
  LogOut,
  User,
  Lock,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  chatWithAI,
  breakdownTask,
  simplifyText,
  estimateTime,
  login,
  register,
  logout
} from './services/api';
import './index.css';

// --- Voice Helpers ---

const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
    }
  }, []);

  const listen = (onResult) => {
    if (!recognitionRef.current) return;
    setIsListening(true);
    recognitionRef.current.start();
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);
  };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return { listen, speak, stopSpeaking, isListening, isSpeaking };
};

// --- Auth Components ---

const AuthScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
        await login(username, password);
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
        style={{ padding: '3rem', maxWidth: '440px', width: '100%', textAlign: 'center' }}
      >
        <div className="feature-icon-container" style={{ margin: '0 auto 2rem auto', width: '80px', height: '80px' }}>
          <BrainCircuit size={48} />
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p style={{ marginBottom: '2.5rem', opacity: 0.7 }}>Experience the next gen of neuro-design.</p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Username</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#ef4444', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</motion.p>}

          <button className="btn-primary" style={{ width: '100%', height: '56px', fontSize: '1.1rem' }} disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Get Started')}
            <ArrowRight size={20} />
          </button>
        </form>

        <p style={{ marginTop: '2rem', opacity: 0.7 }}>
          {isLogin ? "New to NeuroAssist? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
          >
            {isLogin ? 'Create one' : 'Login'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

// --- Main Header ---

const NavHeader = ({ darkMode, toggleDarkMode, onLogout, user }) => (
  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div className="feature-icon-container" style={{ marginBottom: 0, width: '48px', height: '48px', borderRadius: '14px' }}>
        <Sparkles size={24} />
      </div>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>NeuroAssist</h2>
        <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>Active: {user}</p>
      </div>
    </div>

    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <button onClick={toggleDarkMode} className="glass-panel" style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', borderRadius: '12px' }}>
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <button onClick={onLogout} className="glass-panel" style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', borderRadius: '12px', color: '#ef4444' }}>
        <LogOut size={20} />
      </button>
    </div>
  </header>
);

// --- Feature Panels ---

const TaskBreaker = ({ speak }) => {
  const [task, setTask] = useState('');
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const { listen, isListening } = useSpeech();

  const handleBreakdown = async (val = task) => {
    if (!val.trim()) return;
    setLoading(true);
    setSteps([]);
    try {
      const result = await breakdownTask(val);
      setSteps(result || []);
      if (result && result.length > 0) {
        speak(`I've broken it down into ${result.length} steps. Start with: ${result[0]}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>Task Paralysis Solver</h2>
          <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Let's slice that mountain into manageable pebbles.</p>
        </div>
        <div className="feature-icon-container active"><ListTodo size={24} /></div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="input-field"
            placeholder="What's weighing on your mind?"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBreakdown()}
          />
          <button
            onClick={() => listen((t) => { setTask(t); handleBreakdown(t); })}
            className={`voice-indicator ${isListening ? 'active' : ''}`}
            style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'none', cursor: 'pointer', color: isListening ? 'var(--accent-color)' : 'grey' }}
          >
            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
        </div>
        <button className="btn-primary" onClick={() => handleBreakdown()} disabled={loading}>
          {loading ? 'Thinking...' : 'Slice Task'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <AnimatePresence>
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              style={{ padding: '1.2rem', background: 'rgba(99, 102, 241, 0.04)', borderRadius: '16px', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid rgba(99, 102, 241, 0.1)' }}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                {idx + 1}
              </div>
              <span style={{ fontWeight: 500 }}>{step}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const TextSimplifier = ({ speak }) => {
  const [text, setText] = useState('');
  const [simplified, setSimplified] = useState('');
  const [loading, setLoading] = useState(false);
  const { listen, isListening } = useSpeech();

  const handleSimplify = async (val = text) => {
    if (!val.trim()) return;
    setLoading(true);
    try {
      const result = await simplifyText(val);
      setSimplified(result);
      speak("Here is the simplified version for you.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>Dyslexia Reader</h2>
          <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Remove visual noise and complex jargon instantly.</p>
        </div>
        <div className="feature-icon-container active"><Glasses size={24} /></div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <textarea
          className="input-field"
          rows={5}
          placeholder="Paste cluttered text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ resize: 'none' }}
        />
        <button
          onClick={() => listen((t) => { setText(t); handleSimplify(t); })}
          className={`voice-indicator ${isListening ? 'active' : ''}`}
          style={{ position: 'absolute', right: '12px', bottom: '12px', border: 'none', background: 'none', cursor: 'pointer', color: isListening ? 'var(--accent-color)' : 'grey' }}
        >
          {isListening ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
      </div>

      <button className="btn-primary" onClick={() => handleSimplify()} disabled={loading} style={{ width: '100%', marginBottom: '2rem' }}>
        {loading ? 'Cleaning Text...' : 'Simplify & Format'}
      </button>

      {simplified && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '2rem', background: 'rgba(99, 102, 241, 0.02)', border: '2px solid var(--accent-color)', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 800, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} /> CLEAN VERSION
            </span>
            <button onClick={() => speak(simplified)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-color)' }}><Volume2 size={20} /></button>
          </div>
          <div style={{ lineHeight: '1.8', fontSize: '1.15rem', fontWeight: 500 }}>
            {simplified.split('\n').map((line, i) => <p key={i} style={{ marginBottom: '1rem' }}>{line}</p>)}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const ChatAssistant = ({ speak, stopSpeaking, isSpeaking }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { listen, isListening } = useSpeech();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async (val = input) => {
    if (!val.trim()) return;
    const userMsg = val;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await chatWithAI(userMsg, 'general');
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
      speak(response);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "I had a bit of a brain fog. Could you repeat that?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel card" style={{ height: '650px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.4rem' }}>NeuroChat AI</h2>
          <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>An empathetic ear that never tires.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isSpeaking && <button onClick={stopSpeaking} className="glass-panel" style={{ padding: '0.5rem', border: 'none', color: '#ef4444', borderRadius: '10px', cursor: 'pointer' }}><VolumeX size={18} /></button>}
          <div className="feature-icon-container active" style={{ marginBottom: 0 }}><MessageSquare size={24} /></div>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '1.2rem',
              borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              background: msg.role === 'user' ? 'var(--accent-gradient)' : 'rgba(100, 100, 100, 0.05)',
              color: msg.role === 'user' ? 'white' : 'inherit',
              boxShadow: msg.role === 'user' ? '0 10px 20px rgba(99, 102, 241, 0.2)' : 'none',
              fontWeight: 500,
              lineHeight: 1.5
            }}
          >
            {msg.content}
          </motion.div>
        ))}
        {loading && <div style={{ opacity: 0.5, fontSize: '0.9rem', padding: '1rem' }}>AI is thinking...</div>}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Talk to me..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={() => listen((t) => handleSend(t))}
            className={`voice-indicator ${isListening ? 'active' : ''}`}
            style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'none', cursor: 'pointer', color: isListening ? 'var(--accent-color)' : 'grey' }}
          >
            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
        </div>
        <button className="btn-primary" style={{ width: '56px', padding: 0 }} onClick={() => handleSend()}>
          <ChevronRight size={24} />
        </button>
      </div>
    </motion.div>
  );
};

// --- App Entry ---

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [darkMode, setDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('username'));
  const { speak, stopSpeaking, isSpeaking } = useSpeech();

  useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    stopSpeaking();
  };

  if (!currentUser) return <AuthScreen onLoginSuccess={() => setCurrentUser(localStorage.getItem('username'))} />;

  const tabs = [
    { id: 'chat', label: 'NeuroChat', icon: MessageSquare, desc: 'Empathetic AI Assistant' },
    { id: 'breakdown', label: 'Tasks', icon: ListTodo, desc: 'Beat Task Paralysis' },
    { id: 'simplify', label: 'Reader', icon: Glasses, desc: 'Dyslexia Friendly' },
    { id: 'time', label: 'Time', icon: Clock, desc: 'Time Blindness Anchor' }
  ];

  return (
    <div style={{ minHeight: '100vh', transition: 'all 0.5s ease' }}>
      <NavHeader darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} onLogout={handleLogout} user={currentUser} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
          Your <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Neuro-Companion</span>
        </h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.6, maxWidth: '600px', margin: '0 auto' }}>
          Designed with ❤️ to support ADHD, Autism, and Dyslexia.
        </p>
      </motion.div>

      <div className="grid-layout" style={{ marginBottom: '3rem' }}>
        {tabs.map((tab) => (
          <motion.div
            key={tab.id}
            className={`glass-panel card tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); stopSpeaking(); }}
            whileHover={{ y: -5 }}
            style={{ cursor: 'pointer', padding: '1.5rem', border: activeTab === tab.id ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)' }}
          >
            <div className={`feature-icon-container ${activeTab === tab.id ? 'active' : ''}`} style={{ marginBottom: '1rem' }}>
              <tab.icon size={22} />
            </div>
            <h3 style={{ fontSize: '1rem' }}>{tab.label}</h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: 0 }}>{tab.desc}</p>
          </motion.div>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && <ChatAssistant key="chat" speak={speak} stopSpeaking={stopSpeaking} isSpeaking={isSpeaking} />}
          {activeTab === 'breakdown' && <TaskBreaker key="breakdown" speak={speak} />}
          {activeTab === 'simplify' && <TextSimplifier key="simplify" speak={speak} />}
          {activeTab === 'time' && (
            <motion.div key="time" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-panel card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ marginBottom: '0.5rem' }}>Time Blindness Anchor</h2>
                  <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Get a realistic AI estimate for your tasks.</p>
                </div>
                <div className="feature-icon-container active"><Clock size={24} /></div>
              </div>
              <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>Feature coming soon to this premium layout...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer style={{ marginTop: '6rem', textAlign: 'center', opacity: 0.4, paddingBottom: '4rem' }}>
        <p>© 2026 NeuroAssist • Built for Hackathon Excellence</p>
      </footer>
    </div>
  );
}

export default App;
