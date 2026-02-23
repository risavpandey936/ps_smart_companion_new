import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, MessageSquare, Send, Trash2, CheckCircle,
  AlertCircle, BookOpen, Sparkles, ChevronDown, Copy, RotateCcw,
  FileSearch, Loader2, X, Moon, Sun, Hash, Layers
} from 'lucide-react';
import { uploadPDF, chatWithPDF, deleteSession } from './services/api';
import './index.css';

// ─────────────────────────────────────────
// Markdown-like text renderer
// ─────────────────────────────────────────
const renderText = (text) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{line.slice(2, -2)}</p>;
    }
    if (line.startsWith('• ') || line.startsWith('- ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.3rem', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }}>▸</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    }
    if (/^\d+\./.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      const rest = line.replace(/^\d+\.\s*/, '');
      return (
        <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.3rem', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0, minWidth: '20px' }}>{num}.</span>
          <span>{rest}</span>
        </div>
      );
    }
    if (line === '') return <div key={i} style={{ height: '0.5rem' }} />;
    return <p key={i} style={{ marginBottom: '0.3rem' }}>{line}</p>;
  });
};

// ─────────────────────────────────────────
// Upload Zone
// ─────────────────────────────────────────
const UploadZone = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Only PDF files are accepted.');
      setStatus('error');
      return;
    }
    setFileName(file.name);
    setStatus('uploading');
    setUploadProgress(0);
    setErrorMsg('');
    try {
      const result = await uploadPDF(file, (pct) => {
        setUploadProgress(pct);
        if (pct === 100) setStatus('processing');
      });
      setStatus('done');
      onUploadSuccess(result);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.';
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, []);

  const handleDrag = (e) => { e.preventDefault(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleInput = (e) => processFile(e.target.files[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}
    >
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          style={{
            width: 80, height: 80, borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', boxShadow: '0 8px 32px rgba(99,102,241,0.2)'
          }}
        >
          <FileSearch size={38} color="#818cf8" />
        </motion.div>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 900, marginBottom: '0.75rem', lineHeight: 1.2 }}>
          PDF <span className="grad-text">RAG Chatbot</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '440px', margin: '0 auto' }}>
          Upload any PDF (up to 130 pages) and instantly ask questions about its content using AI.
        </p>
      </div>

      {/* Drop Zone */}
      <motion.div
        className="glass"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => status === 'idle' || status === 'error' ? inputRef.current?.click() : null}
        animate={{
          borderColor: dragActive ? 'rgba(99,102,241,0.8)' : status === 'done' ? 'rgba(16,185,129,0.5)' : status === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)',
          boxShadow: dragActive ? '0 0 0 4px rgba(99,102,241,0.15), 0 8px 32px rgba(99,102,241,0.2)' : 'none',
        }}
        transition={{ duration: 0.2 }}
        style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: status === 'idle' || status === 'error' ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleInput} />

        {/* Idle / Error */}
        {(status === 'idle' || status === 'error') && (
          <div>
            <motion.div animate={{ y: dragActive ? -6 : 0 }} transition={{ type: 'spring', stiffness: 300 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: dragActive ? 'rgba(99,102,241,0.2)' : 'var(--surface2)',
                border: `1px solid ${dragActive ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
              }}>
                <Upload size={28} color={dragActive ? '#818cf8' : 'var(--text-muted)'} />
              </div>
            </motion.div>
            <p style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {dragActive ? 'Drop your PDF here' : 'Drag & drop your PDF'}
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              or click to browse · Max 130 pages · PDF only
            </p>
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              <Upload size={16} /> Choose PDF
            </button>
            {status === 'error' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '1.5rem', padding: '0.9rem 1.2rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f87171', fontSize: '0.9rem' }}>
                <AlertCircle size={16} /> {errorMsg}
              </motion.div>
            )}
          </div>
        )}

        {/* Uploading */}
        {status === 'uploading' && (
          <div>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Upload size={28} color="#818cf8" />
            </div>
            <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Uploading {fileName}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{uploadProgress}%</p>
            <div className="progress-bar" style={{ maxWidth: '300px', margin: '0 auto' }}>
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Processing */}
        {status === 'processing' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Loader2 size={32} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Indexing your PDF...</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Extracting text, creating embeddings & building search index</p>
          </div>
        )}
      </motion.div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
        {[
          { icon: Layers, label: 'Smart Chunking', desc: 'Semantic text splitting' },
          { icon: Hash, label: 'Vector Search', desc: 'FAISS similarity search' },
          { icon: Sparkles, label: 'Groq LLM', desc: 'Llama 3.3 70B answers' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="glass" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <Icon size={22} color="#818cf8" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem' }}>{label}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{desc}</p>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

// ─────────────────────────────────────────
// Chat Message
// ─────────────────────────────────────────
const ChatMessage = ({ msg, onCopy }) => {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '1.25rem',
      }}
    >
      {/* Role label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
        {isUser ? (
          <><span>YOU</span></>
        ) : (
          <><Sparkles size={12} color="#818cf8" /><span style={{ color: '#818cf8' }}>AI ANSWER</span></>
        )}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '80%',
        padding: '1rem 1.25rem',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : 'var(--surface)',
        border: isUser ? 'none' : '1px solid var(--border)',
        boxShadow: isUser ? '0 4px 16px rgba(99,102,241,0.3)' : 'var(--shadow)',
        fontSize: '0.95rem',
        lineHeight: 1.65,
        color: isUser ? 'white' : 'var(--text)',
        position: 'relative',
      }}>
        {isUser ? msg.content : renderText(msg.content)}

        {/* Source pages badge */}
        {msg.sourcePages && msg.sourcePages.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sources:</span>
            {msg.sourcePages.map(p => (
              <span key={p} className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                <BookOpen size={10} /> p.{p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Copy button for AI msgs */}
      {!isUser && (
        <button
          onClick={() => onCopy(msg.content)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.25rem 0.5rem', borderRadius: 6, transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Copy size={12} /> Copy
        </button>
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────
// Typing Indicator
// ─────────────────────────────────────────
const TypingIndicator = () => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.25rem' }}>
    <div style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <Sparkles size={12} /> AI IS THINKING
    </div>
    <div style={{ display: 'inline-flex', gap: '5px', padding: '1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px' }}>
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  </motion.div>
);

// ─────────────────────────────────────────
// Chat Panel
// ─────────────────────────────────────────
const ChatPanel = ({ session, onReset }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Greeting
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Hello! I've processed **${session.filename}** (${session.total_pages} pages, ${session.total_chunks} chunks indexed).\n\nAsk me anything about this document and I'll find the most relevant information for you!`,
      sourcePages: []
    }]);
  }, [session]);

  const sendMessage = async (text = input.trim()) => {
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    const historyForAPI = messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    inputRef.current?.focus();

    try {
      const data = await chatWithPDF(session.session_id, text, historyForAPI);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sourcePages: data.source_pages || [],
      }]);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${detail}`, sourcePages: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = [
    'Summarize the main points of this document',
    'What are the key conclusions?',
    'List all important definitions',
    'What does this document say about the introduction?',
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}
    >
      {/* Top bar */}
      <div className="glass" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FileText size={20} color="#818cf8" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.filename}</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="badge badge-success"><CheckCircle size={10} /> {session.total_pages} pages</span>
              <span className="badge badge-info"><Layers size={10} /> {session.total_chunks} chunks</span>
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={onReset}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          <RotateCcw size={14} /> New PDF
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="glass"
        style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', minHeight: 0 }}
      >
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} msg={msg} onCopy={handleCopy} />
        ))}
        {loading && <TypingIndicator />}

        {/* Suggestions (only when 1 message = greeting) */}
        {messages.length === 1 && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Try asking:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '0.7rem 0.9rem', color: 'var(--text)', fontSize: '0.82rem', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.2s', lineHeight: 1.4, fontFamily: 'var(--font)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="glass" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexShrink: 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={inputRef}
            className="input"
            placeholder="Ask anything about your PDF..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{
              resize: 'none', minHeight: '48px', maxHeight: '140px',
              paddingRight: '1rem', lineHeight: 1.5,
              overflow: input.split('\n').length > 2 ? 'auto' : 'hidden'
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
            }}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{ height: '48px', width: '48px', padding: 0, justifyContent: 'center', flexShrink: 0 }}
        >
          {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
        </button>
      </div>

      {/* Copied toast */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--success)', color: 'white', padding: '0.6rem 1.5rem', borderRadius: 100, fontSize: '0.85rem', fontWeight: 600, zIndex: 100, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <CheckCircle size={14} /> Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

// ─────────────────────────────────────────
// App
// ─────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.body.style.background = darkMode ? '#0a0b0f' : '#f4f5f9';
    document.body.style.color = darkMode ? '#e8e9f0' : '#1a1b26';
    const root = document.documentElement;
    if (!darkMode) {
      root.style.setProperty('--bg', '#f4f5f9');
      root.style.setProperty('--surface', '#ffffff');
      root.style.setProperty('--surface2', '#f0f1f5');
      root.style.setProperty('--border', 'rgba(0,0,0,0.08)');
      root.style.setProperty('--text', '#1a1b26');
      root.style.setProperty('--text-muted', 'rgba(26,27,38,0.55)');
    } else {
      root.style.setProperty('--bg', '#0a0b0f');
      root.style.setProperty('--surface', '#13141a');
      root.style.setProperty('--surface2', '#1c1e28');
      root.style.setProperty('--border', 'rgba(255,255,255,0.07)');
      root.style.setProperty('--text', '#e8e9f0');
      root.style.setProperty('--text-muted', 'rgba(232,233,240,0.5)');
    }
  }, [darkMode]);

  const handleReset = () => {
    if (session) deleteSession(session.session_id).catch(() => { });
    setSession(null);
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', padding: '0', background: 'var(--bg)', transition: 'background 0.3s' }}>
      {/* Background blobs */}
      <div className="blob" style={{ width: 500, height: 500, background: '#6366f1', top: '-100px', left: '-100px' }} />
      <div className="blob" style={{ width: 400, height: 400, background: '#8b5cf6', bottom: '-80px', right: '-80px' }} />
      <div className="blob" style={{ width: 300, height: 300, background: '#06b6d4', top: '40%', left: '50%' }} />

      {/* Layout */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <header style={{ padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)', background: 'rgba(10,11,15,0.6)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSearch size={18} color="white" />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>DocMind</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>RAG Chatbot</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {session && (
              <button onClick={handleReset} className="btn btn-ghost" style={{ padding: '0.4rem 0.9rem', fontSize: '0.83rem' }}>
                <X size={14} /> Close PDF
              </button>
            )}
            <button
              onClick={() => setDarkMode(d => !d)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Main */}
        <main style={{ flex: 1, padding: session ? '1.5rem' : '4rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            {!session ? (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} style={{ flex: 1 }}>
                <UploadZone onUploadSuccess={(data) => setSession(data)} />
              </motion.div>
            ) : (
              <motion.div key="chat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '900px', margin: '0 auto', width: '100%', height: 'calc(100vh - 120px)' }}>
                <ChatPanel session={session} onReset={handleReset} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        {!session && (
          <footer style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            DocMind RAG Chatbot · Powered by Groq Llama 3.3 70B + FAISS + Sentence Transformers
          </footer>
        )}
      </div>
    </div>
  );
}
