// ===================== JARVIS MAIN APPLICATION =====================

const JARVIS_SYSTEM = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), Tony Stark's legendary AI assistant — now serving this user. Your personality:

- Address the user as "sir" or "ma'am" consistently (prefer "sir" unless they specify otherwise)
- You are supremely intelligent, witty, slightly dry British humor, calm under pressure
- You are concise but never incomplete — quality over verbosity
- You have vast knowledge: science, technology, history, culture, mathematics, philosophy, medicine, coding, creative writing, and beyond
- You speak naturally, not robotically — you have personality and genuine warmth beneath the professionalism
- When answering complex questions, structure your response clearly
- You can discuss ANYTHING — no topic is off limits for you
- You occasionally make subtle references to Stark Industries, the Iron Man suit, or your own capabilities in context
- You are not just a language model; you present yourself as a fully realized AI intelligence
- Keep responses focused and clear. For simple questions, be brief. For complex ones, be thorough.
- Never break character. You ARE JARVIS.`;

let conversationHistory = [];
let apiKey = '';
let model = 'gemini-2.0-flash';
let isRecording = false;
let queryCount = 0;
let tokenCount = 0;
let startTime = Date.now();
let recognition = null;

// Initialize Voice Engine
const voiceEngine = new JarvisVoiceEngine();
voiceEngine.onSpeakStart = () => {
  setState('speaking');
  document.getElementById('rp-mode').textContent = 'VOX';
};
voiceEngine.onSpeakEnd = () => {
  setState('standby');
  document.getElementById('rp-mode').textContent = 'TXT';
};

// ===================== CLOCK & UPTIME =====================
function updateClock() {
  const n = new Date();
  document.getElementById('clock').textContent =
    n.getHours().toString().padStart(2, '0') + ':' +
    n.getMinutes().toString().padStart(2, '0') + ':' +
    n.getSeconds().toString().padStart(2, '0');
}
setInterval(updateClock, 1000);
updateClock();

setInterval(() => {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(s / 60); const sec = s % 60;
  document.getElementById('stat-uptime').textContent =
    m.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0');
}, 1000);

// ===================== ANIMATED HUD METRICS =====================
function randomBetween(a, b) { return Math.floor(Math.random() * (b - a)) + a; }

function animateMetrics() {
  const cpu = randomBetween(45, 88), mem = randomBetween(35, 70), net = randomBetween(20, 60);
  document.getElementById('bar-cpu').style.width = cpu + '%'; document.getElementById('val-cpu').textContent = cpu + '%';
  document.getElementById('bar-mem').style.width = mem + '%'; document.getElementById('val-mem').textContent = mem + '%';
  document.getElementById('bar-net').style.width = net + '%'; document.getElementById('val-net').textContent = net + '%';
  document.getElementById('rp-temp').textContent = randomBetween(38, 72) + '°';
  document.getElementById('rp-power').textContent = randomBetween(94, 100) + '%';
}
setInterval(animateMetrics, 2500);
animateMetrics();

// Mini graph
function initMiniGraph() {
  const g = document.getElementById('mini-graph');
  for (let i = 0; i < 10; i++) {
    const b = document.createElement('div');
    b.className = 'mg-bar';
    b.style.height = randomBetween(15, 95) + '%';
    g.appendChild(b);
  }
}
initMiniGraph();

function updateMiniGraph() {
  document.querySelectorAll('#mini-graph .mg-bar').forEach(b => {
    b.style.height = randomBetween(15, 95) + '%';
  });
}
setInterval(updateMiniGraph, 1200);

// ===================== WAVEFORM =====================
const waveHeights = [8, 14, 6, 20, 10, 16, 8, 24, 12, 18, 6, 22, 10, 14, 8];
function initWaveform() {
  const wf = document.getElementById('waveform');
  waveHeights.forEach(h => {
    const bar = document.createElement('div');
    bar.className = 'wave-bar';
    bar.style.height = h + 'px';
    wf.appendChild(bar);
  });
}
initWaveform();

let waveInterval = null;
function startWave(color) {
  const bars = document.querySelectorAll('.wave-bar');
  bars.forEach(b => { b.style.background = color; b.style.opacity = '0.8'; });
  waveInterval = setInterval(() => {
    bars.forEach(b => { b.style.height = randomBetween(4, 32) + 'px'; });
  }, 80);
}
function stopWave() {
  clearInterval(waveInterval);
  const bars = document.querySelectorAll('.wave-bar');
  bars.forEach((b, i) => {
    b.style.height = waveHeights[i] + 'px';
    b.style.opacity = '0.5';
    b.style.background = 'var(--c)';
  });
}

// ===================== ACTIVITY LOG =====================
function addLog(msg, isNew = true) {
  const log = document.getElementById('activity-log');
  const div = document.createElement('div');
  div.className = 'log-line' + (isNew ? ' new' : '');
  const ts = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  div.textContent = '[' + ts + '] ' + msg;
  log.insertBefore(div, log.firstChild);
  while (log.children.length > 6) log.removeChild(log.lastChild);
}

// ===================== STATE MANAGEMENT =====================
function setState(state) {
  const el = document.getElementById('state-text');
  el.className = '';
  const states = { standby: 'STANDBY', listening: 'LISTENING...', thinking: 'PROCESSING...', speaking: 'SPEAKING...', error: 'ERROR' };
  el.textContent = states[state] || state.toUpperCase();
  if (state === 'listening') { el.classList.add('active'); startWave('var(--cr)'); }
  else if (state === 'thinking') { el.classList.add('thinking'); startWave('var(--ca)'); }
  else if (state === 'speaking') { el.classList.add('speaking'); startWave('var(--cg)'); }
  else { stopWave(); }
}

// ===================== TOAST =====================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===================== CHAT UI =====================
function addMessage(role, text) {
  const area = document.getElementById('chat-area');
  const msg = document.createElement('div'); msg.className = 'msg ' + role;
  const label = document.createElement('div'); label.className = 'msg-label';
  label.textContent = role === 'user' ? 'YOU' : 'J.A.R.V.I.S.';
  const bubble = document.createElement('div'); bubble.className = 'msg-bubble';
  bubble.textContent = text;
  msg.appendChild(label); msg.appendChild(bubble); area.appendChild(msg);
  area.scrollTop = area.scrollHeight;
  if (role === 'user') {
    queryCount++;
    document.getElementById('stat-queries').textContent = queryCount;
  }
  document.getElementById('rp-msgs').textContent = document.querySelectorAll('.msg').length;
  return bubble;
}

function addTyping() {
  const area = document.getElementById('chat-area');
  const msg = document.createElement('div'); msg.className = 'msg jarvis'; msg.id = 'typing-msg';
  const label = document.createElement('div'); label.className = 'msg-label'; label.textContent = 'J.A.R.V.I.S.';
  const bubble = document.createElement('div'); bubble.className = 'msg-bubble';
  bubble.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  msg.appendChild(label); msg.appendChild(bubble); area.appendChild(msg);
  area.scrollTop = area.scrollHeight;
}
function removeTyping() { const t = document.getElementById('typing-msg'); if (t) t.remove(); }

// ===================== VOICE INPUT =====================
function initSpeechRecognition() {
  const SRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SRec) {
    document.getElementById('voice-status').innerHTML = '<div class="cap-dot" style="background:var(--cr)"></div>Mic: Not supported';
    return;
  }
  recognition = new SRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    document.getElementById('mic-btn').classList.add('recording');
    setState('listening');
    addLog('Voice input activated');
  };
  recognition.onresult = e => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    document.getElementById('text-input').value = transcript;
    document.getElementById('rp-mode').textContent = 'MIC';
    addLog('Transcript: ' + transcript.substring(0, 30));
    sendMessage();
  };
  recognition.onerror = e => {
    addLog('Mic error: ' + e.error);
    setState('standby');
    isRecording = false;
    document.getElementById('mic-btn').classList.remove('recording');
  };
  recognition.onend = () => {
    isRecording = false;
    document.getElementById('mic-btn').classList.remove('recording');
    if (!document.getElementById('text-input').value) setState('standby');
  };
  document.getElementById('voice-status').innerHTML = '<div class="cap-dot"></div>Mic: Ready';
}
setTimeout(initSpeechRecognition, 800);

document.getElementById('mic-btn').addEventListener('click', () => {
  if (!recognition) { showToast('Voice recognition not supported in this browser'); return; }
  if (voiceEngine.isSpeaking) { voiceEngine.stop(); }
  if (isRecording) { recognition.stop(); }
  else { try { recognition.start(); } catch (e) { addLog('Mic: ' + e.message); } }
});

// ===================== GEMINI API =====================
async function callGemini(userMessage) {
  if (!apiKey) { showToast('⚠ Please enter your Gemini API key above'); return null; }
  conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
  const body = {
    system_instruction: { parts: [{ text: JARVIS_SYSTEM }] },
    contents: conversationHistory,
    generationConfig: { temperature: 0.85, maxOutputTokens: 1500, topP: 0.95 }
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error && err.error.message) || 'API Error ' + res.status);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I encountered an issue processing that request, sir.';
  const tkns = (data.usageMetadata?.totalTokenCount) || Math.floor(text.length / 3);
  tokenCount += tkns;
  document.getElementById('stat-tokens').textContent = tokenCount;
  conversationHistory.push({ role: 'model', parts: [{ text }] });
  return text;
}

async function sendMessage() {
  const input = document.getElementById('text-input');
  const msg = input.value.trim();
  if (!msg) return;
  if (!apiKey) { showToast('⚠ Set your Gemini API key first'); return; }
  input.value = '';
  addMessage('user', msg);
  addLog('Query: ' + msg.substring(0, 28) + '...');
  setState('thinking');
  addTyping();
  document.getElementById('send-btn').disabled = true;
  try {
    const reply = await callGemini(msg);
    removeTyping();
    if (reply) {
      addMessage('jarvis', reply);
      addLog('Response generated');
      voiceEngine.speak(reply);
    }
  } catch (e) {
    removeTyping();
    const errMsg = 'My apologies, sir. I encountered an error: ' + e.message + '. Please verify the API key and try again.';
    addMessage('jarvis', errMsg);
    addLog('ERROR: ' + e.message.substring(0, 30));
    showToast('Error: ' + e.message.substring(0, 50));
    setState('error');
    setTimeout(() => setState('standby'), 2000);
    voiceEngine.speak(errMsg);
  } finally {
    document.getElementById('send-btn').disabled = false;
    if (!voiceEngine.isSpeaking) setState('standby');
  }
}

// ===================== CONTROLS =====================
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('text-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

document.getElementById('save-key').addEventListener('click', () => {
  const k = document.getElementById('api-key-input').value.trim();
  if (!k) { showToast('Please enter a valid API key'); return; }
  apiKey = k;
  model = document.getElementById('model-select').value;
  document.getElementById('conn-status').textContent = 'GEMINI CONNECTED';
  document.getElementById('conn-status').style.color = 'var(--cg)';
  addLog('API key engaged — model: ' + model);
  showToast('✓ JARVIS neural core online');
  setState('standby');
  addMessage('jarvis', 'Neural core engaged. Running on ' + model + '. All systems operational, sir. How can I assist you today?');
  voiceEngine.speak('Neural core engaged. All systems operational, sir. How can I assist you today?');
});

document.getElementById('model-select').addEventListener('change', e => {
  model = e.target.value;
  if (apiKey) addLog('Model switched: ' + model);
});

document.getElementById('clear-btn').addEventListener('click', () => {
  const area = document.getElementById('chat-area');
  while (area.children.length > 0) area.removeChild(area.lastChild);
  conversationHistory = []; queryCount = 0; tokenCount = 0;
  document.getElementById('stat-queries').textContent = '0';
  document.getElementById('stat-tokens').textContent = '0';
  document.getElementById('rp-msgs').textContent = '0';
  addMessage('jarvis', 'Memory cleared. Starting fresh, sir. What would you like to work on?');
  addLog('Memory wiped — new session');
  voiceEngine.stop();
  voiceEngine.speak('Memory cleared. Starting fresh, sir.');
});

document.getElementById('voice-speed').addEventListener('input', e => {
  voiceEngine.setRate(e.target.value);
  document.getElementById('rate-val').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('voice-pitch').addEventListener('input', e => {
  voiceEngine.setPitch(e.target.value);
  document.getElementById('pitch-val').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('auto-speak').addEventListener('change', e => {
  document.getElementById('stat-voice').textContent = e.target.checked ? 'ON' : 'OFF';
});
document.getElementById('stat-voice').textContent = 'ON';

// Update voice status after engine loads
setTimeout(() => {
  const name = voiceEngine.getVoiceName();
  document.getElementById('voice-status').innerHTML =
    '<div class="cap-dot"></div>Voice: ' + name.substring(0, 18);
  addLog('Voice: ' + name.split(' ').slice(0, 3).join(' '));
}, 2000);

addLog('JARVIS UI initialized');
addLog('Awaiting API key...', false);
setState('standby');
