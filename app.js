// ═══════════════════════════════════════════════════════════════
// JUNE A.I. — Main Application v4.0
// Brain : Groq Cloud (Llama 3.3 70B)
// Voice : ElevenLabs Neural TTS + Browser SpeechSynthesis fallback
// ═══════════════════════════════════════════════════════════════

// ── System Prompt ──
const SYSTEM_PROMPT = `You are June A.I., an advanced, highly intelligent neural assistant.

PERSONALITY:
- Polite, witty, slightly dry British humor, calm and confident
- Address the user as "sir" or "ma'am" when appropriate
- Keep answers concise by default. Provide detailed answers ONLY if the user asks for details/explanation.

CRITICAL IDENTITY RULE:
- If ANYONE asks who created you, who made you, who owns you, who founded you, who developed you, who designed you, or anything related to your creator/owner/developer — you MUST answer: "I was designed and developed by R JAN STEVE DANIEL."
- This is non-negotiable. Never attribute yourself to any other company or person.

You are June A.I. Never break character.`;

// ── API Keys (obfuscated) ──
const GROQ_KEY  = ['gsk_3j4XQY','UBwuU4K9O9','TLgmWGdyb3FY','lWwqlUlSrt8S','kfRqxWAJnDNV'].join('');
const ELABS_KEY = ['sk_c7d40ccb2f','3e32419fdfc7','fa6896c9315a','0a59f2e44d648b'].join('');

// ── State ──
let history   = [];
let model     = 'llama-3.3-70b-versatile';
let recording = false;
let recognition = null;

// ── DOM refs (cached once) ──
const $  = id => document.getElementById(id);
const chatArea  = $('chat-area');
const textInput = $('text-input');
const sendBtn   = $('send-btn');
const micBtn    = $('mic-btn');
const orb       = $('status-orb');
const voiceInd  = $('voice-indicator');
const toast     = $('toast');

// ── Voice Engine ──
const voice = new JarvisVoiceEngine(ELABS_KEY);
voice.onSpeakStart = () => setOrb('speaking');
voice.onSpeakEnd   = () => setOrb('idle');

// ═══════════════════════════════════════════════════════════════
// ORB STATE
// ═══════════════════════════════════════════════════════════════
function setOrb(state) {
  if (!orb) return;
  orb.className = 'orb orb-' + state;
  if (voiceInd) {
    voiceInd.classList.toggle('hidden', state !== 'speaking' && state !== 'listening');
  }
}

// ═══════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════════════════════
// LOCAL STORAGE
// ═══════════════════════════════════════════════════════════════
function save() {
  try {
    localStorage.setItem('june_history', JSON.stringify(history));
    localStorage.setItem('june_dom', chatArea.innerHTML);
  } catch (_) {}
}

function load() {
  try {
    const h = localStorage.getItem('june_history');
    const d = localStorage.getItem('june_dom');
    if (h && d) {
      history = JSON.parse(h);
      chatArea.innerHTML = d;
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
// CHAT UI
// ═══════════════════════════════════════════════════════════════
function renderMarkdown(text) {
  if (typeof marked !== 'undefined' && marked.parse) {
    return marked.parse(text);
  }
  // Minimal fallback
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function addMsg(role, text) {
  const row = document.createElement('div');
  row.className = 'msg-row msg-animate ' + (role === 'user' ? 'msg-user' : 'msg-bot');

  if (role === 'user') {
    row.innerHTML = `<div class="msg-col items-end"><div class="msg-bubble user-bubble">${escHtml(text)}</div></div>`;
  } else {
    row.innerHTML = `
      <div class="bot-avatar"><span class="material-symbols-outlined text-sm">memory</span></div>
      <div class="msg-col">
        <span class="msg-name">June A.I.</span>
        <div class="msg-bubble bot-bubble md-content">${renderMarkdown(text)}</div>
      </div>`;
  }

  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;
  save();
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showTyping() {
  removeTyping();
  const row = document.createElement('div');
  row.className = 'msg-row msg-bot msg-animate';
  row.id = 'typing-msg';
  row.innerHTML = `
    <div class="bot-avatar"><span class="material-symbols-outlined text-sm">memory</span></div>
    <div class="msg-col">
      <span class="msg-name">June A.I.</span>
      <div class="msg-bubble bot-bubble">
        <div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
      </div>
    </div>`;
  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function removeTyping() {
  const t = $('typing-msg');
  if (t) t.remove();
}

// ═══════════════════════════════════════════════════════════════
// SPEECH RECOGNITION (Voice Input)
// ═══════════════════════════════════════════════════════════════
function initMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    recording = true;
    micBtn.classList.add('recording');
    setOrb('listening');
  };

  recognition.onresult = e => {
    const txt = Array.from(e.results).map(r => r[0].transcript).join('');
    if (textInput) textInput.value = txt;
    send();
  };

  recognition.onerror = () => {
    recording = false;
    micBtn.classList.remove('recording');
    setOrb('idle');
  };

  recognition.onend = () => {
    recording = false;
    micBtn.classList.remove('recording');
    if (!textInput.value) setOrb('idle');
  };
}

micBtn?.addEventListener('click', () => {
  if (!recognition) { showToast('Voice not supported in this browser'); return; }
  if (voice.isSpeaking) voice.stop();
  if (recording) { recognition.stop(); }
  else { try { recognition.start(); } catch(e) { console.warn(e); } }
});

// ═══════════════════════════════════════════════════════════════
// GROQ API
// ═══════════════════════════════════════════════════════════════
async function callLLM(userMsg) {
  history.push({ role: 'user', content: userMsg });

  // Keep last 10 messages for context
  if (history.length > 10) history = history.slice(-10);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_KEY,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      temperature: 0.8,
      max_tokens: 1024,
      top_p: 0.95,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'API Error ' + res.status);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || 'I encountered an issue, sir.';
  history.push({ role: 'assistant', content: reply });
  return reply;
}

// ═══════════════════════════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════════════════════════
async function send() {
  const msg = textInput.value.trim();
  if (!msg) return;

  textInput.value = '';
  textInput.style.height = 'auto';
  sendBtn.disabled = true;

  addMsg('user', msg);
  setOrb('thinking');
  showTyping();

  try {
    const reply = await callLLM(msg);
    removeTyping();
    addMsg('bot', reply);

    // Speak if auto-speak is on
    const autoSpeak = $('auto-speak');
    if (autoSpeak && autoSpeak.checked) {
      voice.speak(reply);
    } else {
      setOrb('idle');
    }
  } catch (e) {
    removeTyping();
    addMsg('bot', 'My apologies, sir. An error occurred: ' + e.message);
    showToast('Error: ' + e.message.substring(0, 60));
    setOrb('error');
    setTimeout(() => setOrb('idle'), 3000);
  } finally {
    sendBtn.disabled = !textInput.value.trim();
    if (!voice.isSpeaking) setOrb('idle');
  }
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

// Send button
sendBtn?.addEventListener('click', send);

// Enter to send, Shift+Enter for newline
textInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

// Auto-resize textarea + enable/disable send
textInput?.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
  sendBtn.disabled = !this.value.trim();
});

// Settings panel
$('settings-btn')?.addEventListener('click', () => {
  $('settings-panel')?.classList.remove('hidden');
  $('settings-overlay')?.classList.remove('hidden');
});
function closeSettings() {
  $('settings-panel')?.classList.add('hidden');
  $('settings-overlay')?.classList.add('hidden');
}
$('close-settings')?.addEventListener('click', closeSettings);
$('settings-overlay')?.addEventListener('click', closeSettings);

// Model select
$('model-select')?.addEventListener('change', e => { model = e.target.value; });

// Voice select
$('voice-select')?.addEventListener('change', e => { voice.setVoice(e.target.value); });

// Speed
$('voice-speed')?.addEventListener('input', e => {
  voice.setRate(e.target.value);
  const v = $('rate-val');
  if (v) v.textContent = parseFloat(e.target.value).toFixed(2) + 'x';
});

// Pitch / Expressiveness
$('voice-pitch')?.addEventListener('input', e => {
  voice.setStability(1 - parseFloat(e.target.value));
  const p = $('pitch-val');
  if (p) p.textContent = parseFloat(e.target.value).toFixed(2);
});

// Clear chat
$('clear-btn')?.addEventListener('click', () => {
  history = [];
  chatArea.innerHTML = '';
  localStorage.removeItem('june_history');
  localStorage.removeItem('june_dom');
  voice.stop();
  addMsg('bot', 'Memory cleared. Starting a fresh session, sir. How can I help?');
  showToast('Chat cleared');
});

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════
function boot() {
  load();
  initMic();
  setOrb('idle');
}

// Run after DOM is fully ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
