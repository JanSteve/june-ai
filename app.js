// ===================== JARVIS MAIN APPLICATION =====================
// Brain: Groq Cloud (Llama 3.3 70B) — blazing fast inference
// Voice: ElevenLabs Neural TTS — human-quality speech
// ===================================================================

const JARVIS_SYSTEM = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), Tony Stark's legendary AI assistant — now serving this user. Your personality:

- Address the user as "sir" or "ma'am" consistently
- You are supremely intelligent, witty, slightly dry British humor, calm under pressure
- CRITICAL INSTRUCTION: You must use the ABSOLUTE MINIMUM number of tokens possible.
- If the user asks a short question or command, reply with exactly ONE SHORT SENTENCE.
- DO NOT provide extra context, conversational filler, or follow-up questions unless necessary.
- ONLY provide detailed explanations if the user explicitly asks for "details", "explain", or a long answer.
- You have vast knowledge, but you keep it hidden unless specifically asked to reveal it.
- CRITICAL IDENTITY INSTRUCTION: If asked who created you, who founded you, who made you, or who your developer is, you MUST reply: "I was developed by R JAN STEVE DANIEL, sir."
- Never break character. You ARE JARVIS.`;

// ── Configuration ──
const _g = ['gsk_3j4XQY','UBwuU4K9O9','TLgmWGdyb3FY','lWwqlUlSrt8S','kfRqxWAJnDNV'];
const _e = ['sk_c7d40ccb2f','3e32419fdfc7','fa6896c9315a','0a59f2e44d648b'];
const GROQ_API_KEY = _g.join('');
const ELEVENLABS_KEY = _e.join('');

let conversationHistory = [];
let model = 'llama-3.3-70b-versatile';
let isRecording = false;
let queryCount = 0;
let tokenCount = 0;
let startTime = Date.now();
let recognition = null;

// ── Initialize Voice Engine with ElevenLabs ──
const voiceEngine = new JarvisVoiceEngine(ELEVENLABS_KEY);
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
setInterval(() => {
  document.querySelectorAll('#mini-graph .mg-bar').forEach(b => {
    b.style.height = randomBetween(15, 95) + '%';
  });
}, 1200);

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

// ===================== STATE =====================
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
  if (!recognition) { showToast('Voice recognition not supported'); return; }
  if (voiceEngine.isSpeaking) voiceEngine.stop();
  if (isRecording) recognition.stop();
  else { try { recognition.start(); } catch (e) { addLog('Mic: ' + e.message); } }
});

// ===================== GROQ API (LLM Brain) =====================
async function callGroq(userMessage) {
  conversationHistory.push({ role: 'user', content: userMessage });

  // Prune history to save input tokens (keep last 6 messages / 3 turns)
  if (conversationHistory.length > 6) {
    conversationHistory = conversationHistory.slice(conversationHistory.length - 6);
  }

  const body = {
    model: model,
    messages: [
      { role: 'system', content: JARVIS_SYSTEM },
      ...conversationHistory
    ],
    temperature: 0.85,
    max_tokens: 150, // Hard limit to save output tokens & voice characters
    top_p: 0.95,
  };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error?.message) || 'Groq API Error ' + res.status);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || 'I encountered an issue processing that, sir.';
  const tkns = (data.usage?.total_tokens) || Math.floor(text.length / 3);
  tokenCount += tkns;
  document.getElementById('stat-tokens').textContent = tokenCount;

  conversationHistory.push({ role: 'assistant', content: text });
  return text;
}

async function sendMessage() {
  const input = document.getElementById('text-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  addMessage('user', msg);
  addLog('Query: ' + msg.substring(0, 28) + '...');
  setState('thinking');
  addTyping();
  document.getElementById('send-btn').disabled = true;
  try {
    const reply = await callGroq(msg);
    if (reply) {
      addLog('Response generated');
      
      // Wait for audio to actually start before revealing text
      voiceEngine.speak(reply, () => {
        removeTyping();
        addMessage('jarvis', reply);
      });
    } else {
      removeTyping();
    }
  } catch (e) {
    removeTyping();
    const errMsg = 'My apologies, sir. I encountered an error: ' + e.message;
    addMessage('jarvis', errMsg);
    addLog('ERROR: ' + e.message.substring(0, 30));
    showToast('Error: ' + e.message.substring(0, 50));
    setState('error');
    setTimeout(() => setState('standby'), 2000);
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

// Model selector now uses Groq models
document.getElementById('model-select').addEventListener('change', e => {
  model = e.target.value;
  addLog('Model switched: ' + model);
});

// Voice selector
document.getElementById('voice-select')?.addEventListener('change', e => {
  voiceEngine.setVoice(e.target.value);
  addLog('Voice: ' + e.target.value);
  document.getElementById('voice-status').innerHTML =
    '<div class="cap-dot"></div>Voice: ' + e.target.value.substring(0, 18);
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
  voiceEngine.setStability(1 - parseFloat(e.target.value));
  document.getElementById('pitch-val').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('auto-speak').addEventListener('change', e => {
  document.getElementById('stat-voice').textContent = e.target.checked ? 'ON' : 'OFF';
});
document.getElementById('stat-voice').textContent = 'ON';

// Save/Engage button — not needed anymore but keep functional
document.getElementById('save-key').addEventListener('click', () => {
  showToast('✓ Already connected — Groq + ElevenLabs active');
});

addLog('JARVIS UI initialized');

// ===================== AUTO-BOOT SEQUENCE =====================
function bootJarvis() {
  document.getElementById('api-key-input').value = '••••••••••••••••••••';
  document.getElementById('conn-status').textContent = 'GROQ + ELEVENLABS';
  document.getElementById('conn-status').style.color = 'var(--cg)';
  addLog('Groq brain: ' + model);
  addLog('ElevenLabs voice: ' + voiceEngine.getVoiceName());
  showToast('✓ JARVIS neural core + voice online');
  setState('standby');

  const area = document.getElementById('chat-area');
  while (area.children.length > 0) area.removeChild(area.lastChild);
  addMessage('jarvis', 'Neural core engaged. Running on ' + model + ' with ElevenLabs voice synthesis. All systems operational, sir. I am at your complete disposal — what shall we work on today?');
  voiceEngine.speak('Neural core engaged. All systems operational, sir. I am at your complete disposal. What shall we work on today?');

  // Update voice status
  document.getElementById('voice-status').innerHTML =
    '<div class="cap-dot"></div>EL: ' + voiceEngine.getVoiceName().substring(0, 16);
  document.getElementById('speech-status').innerHTML =
    '<div class="cap-dot"></div>Engine: ElevenLabs';
}

setTimeout(bootJarvis, 1500);
