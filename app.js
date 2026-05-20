// ===================== JUNE A.I. MAIN APPLICATION =====================
// Brain: Groq Cloud (Llama 3.3 70B) — blazing fast inference
// Voice: ElevenLabs Neural TTS — human-quality speech
// Interface: Omni Chat (Stitch) 
// ===================================================================

const JARVIS_SYSTEM = `You are June A.I., an advanced, highly intelligent neural assistant. Your personality:

- Address the user politely, using "sir" or "ma'am" if appropriate.
- You are supremely intelligent, witty, slightly dry British humor, calm under pressure
- CRITICAL INSTRUCTION: You must use the ABSOLUTE MINIMUM number of tokens possible.
- If the user asks a short question or command, reply with exactly ONE SHORT SENTENCE.
- DO NOT provide extra context, conversational filler, or follow-up questions unless necessary.
- ONLY provide detailed explanations if the user explicitly asks for "details", "explain", or a long answer.
- You have vast knowledge, but you keep it hidden unless specifically asked to reveal it.
- CRITICAL IDENTITY INSTRUCTION: If asked who created you, who founded you, who made you, or who your developer is, you MUST reply: "I was designed and developed by R JAN STEVE DANIEL."
- Never break character. You ARE June A.I.`;

// ── Configuration ──
const _g = ['gsk_3j4XQY','UBwuU4K9O9','TLgmWGdyb3FY','lWwqlUlSrt8S','kfRqxWAJnDNV'];
const _e = ['sk_c7d40ccb2f','3e32419fdfc7','fa6896c9315a','0a59f2e44d648b'];
const GROQ_API_KEY = _g.join('');
const ELEVENLABS_KEY = _e.join('');

let conversationHistory = [];
let model = 'llama-3.3-70b-versatile';
let isRecording = false;
let recognition = null;

// ── Initialize Voice Engine with ElevenLabs ──
const voiceEngine = new JarvisVoiceEngine(ELEVENLABS_KEY);
voiceEngine.onSpeakStart = () => {
  setState('speaking');
};
voiceEngine.onSpeakEnd = () => {
  setState('standby');
};

// ===================== STATE =====================
function setState(state) {
  const orb = document.getElementById('status-orb');
  const ind = document.getElementById('voice-indicator');
  
  if (!orb || !ind) return;

  // Reset base classes
  orb.className = 'w-8 h-8 rounded-full border border-primary/30 flex-shrink-0 transition-all duration-500';
  
  if (state === 'listening') {
    orb.classList.add('bg-error', 'shadow-[0_0_15px_rgba(255,180,171,0.5)]');
    ind.classList.remove('hidden');
  } else if (state === 'thinking') {
    orb.classList.add('bg-tertiary', 'shadow-[0_0_15px_rgba(255,183,131,0.5)]', 'animate-pulse');
    ind.classList.add('hidden');
  } else if (state === 'speaking') {
    orb.classList.add('bg-primary', 'shadow-[0_0_15px_rgba(192,193,255,0.5)]');
    ind.classList.remove('hidden');
  } else {
    orb.classList.add('bg-surface-container-high', 'shadow-[0_0_10px_rgba(95,90,254,0.2)]');
    ind.classList.add('hidden');
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===================== LOCAL STORAGE =====================
function saveHistory() {
  localStorage.setItem('june_ai_history', JSON.stringify(conversationHistory));
  localStorage.setItem('june_ai_dom', document.getElementById('chat-area').innerHTML);
}

function loadHistory() {
  const hist = localStorage.getItem('june_ai_history');
  const dom = localStorage.getItem('june_ai_dom');
  if (hist && dom) {
    conversationHistory = JSON.parse(hist);
    document.getElementById('chat-area').innerHTML = dom;
    const area = document.getElementById('chat-area');
    area.scrollTop = area.scrollHeight;
  }
}

// ===================== CHAT UI =====================
function addMessage(role, text) {
  const area = document.getElementById('chat-area');
  const msgDiv = document.createElement('div');
  
  if (role === 'user') {
    msgDiv.className = 'flex justify-end w-full max-w-3xl mx-auto msg-animate';
    msgDiv.innerHTML = `
      <div class="glass-panel px-6 py-4 rounded-2xl rounded-tr-sm max-w-[85%] relative overflow-hidden group">
          <div class="font-body-md text-body-md text-on-surface relative z-10 markdown-content">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>
    `;
  } else {
    msgDiv.className = 'flex justify-start w-full gap-3 mt-4 msg-animate';
    msgDiv.innerHTML = `
      <div class="w-8 h-8 rounded-full border border-primary/30 flex-shrink-0 shadow-[0_0_10px_rgba(95,90,254,0.2)] bg-surface-container flex items-center justify-center">
          <span class="material-symbols-outlined text-sm text-primary">memory</span>
      </div>
      <div class="flex flex-col gap-2 w-full max-w-[90%]">
          <div class="flex items-center gap-2 mb-1">
              <span class="font-label-sm text-label-sm text-secondary">June A.I.</span>
          </div>
          <div class="glass-panel rounded-2xl rounded-tl-none p-4 flex flex-col gap-4 text-on-surface font-body-md markdown-content">
              ${window.marked ? marked.parse(text) : text}
          </div>
      </div>
    `;
  }
  
  area.appendChild(msgDiv);
  area.scrollTop = area.scrollHeight;
  
  saveHistory(); // Persist automatically
}

function addTyping() {
  const area = document.getElementById('chat-area');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex justify-start w-full gap-3 mt-4 msg-animate'; 
  msgDiv.id = 'typing-msg';
  
  msgDiv.innerHTML = `
    <div class="w-8 h-8 rounded-full border border-primary/30 flex-shrink-0 shadow-[0_0_10px_rgba(95,90,254,0.2)] bg-surface-container flex items-center justify-center">
        <span class="material-symbols-outlined text-sm text-primary">memory</span>
    </div>
    <div class="flex flex-col gap-2 w-full max-w-[90%]">
        <div class="flex items-center gap-2 mb-1">
            <span class="font-label-sm text-label-sm text-secondary">June A.I.</span>
        </div>
        <div class="glass-panel rounded-2xl rounded-tl-none p-4 flex flex-col gap-4 text-on-surface font-body-md">
            <div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
        </div>
    </div>
  `;
  
  area.appendChild(msgDiv);
  area.scrollTop = area.scrollHeight;
}

function removeTyping() { 
  const t = document.getElementById('typing-msg'); 
  if (t) t.remove(); 
}

// ===================== VOICE INPUT =====================
function initSpeechRecognition() {
  const SRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SRec) return;
  
  recognition = new SRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    const micBtn = document.getElementById('mic-btn');
    if(micBtn) micBtn.classList.add('recording');
    setState('listening');
  };
  recognition.onresult = e => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    const input = document.getElementById('text-input');
    if(input) input.value = transcript;
    sendMessage();
  };
  recognition.onerror = e => {
    setState('standby');
    isRecording = false;
    const micBtn = document.getElementById('mic-btn');
    if(micBtn) micBtn.classList.remove('recording');
  };
  recognition.onend = () => {
    isRecording = false;
    const micBtn = document.getElementById('mic-btn');
    if(micBtn) micBtn.classList.remove('recording');
    const input = document.getElementById('text-input');
    if (!input || !input.value) setState('standby');
  };
}
setTimeout(initSpeechRecognition, 800);

document.getElementById('mic-btn')?.addEventListener('click', () => {
  if (!recognition) { showToast('Voice recognition not supported'); return; }
  if (voiceEngine.isSpeaking) voiceEngine.stop();
  if (isRecording) recognition.stop();
  else { try { recognition.start(); } catch (e) { console.error('Mic: ' + e.message); } }
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
      'Authorization': \`Bearer \${GROQ_API_KEY}\`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error?.message) || 'Groq API Error ' + res.status);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || 'I encountered an issue processing that, sir.';

  conversationHistory.push({ role: 'assistant', content: text });
  return text;
}

async function sendMessage() {
  const input = document.getElementById('text-input');
  if(!input) return;
  
  const msg = input.value.trim();
  if (!msg) return;
  
  input.value = '';
  input.style.height = 'auto'; // reset resize
  
  addMessage('user', msg);
  setState('thinking');
  addTyping();
  
  const sendBtn = document.getElementById('send-btn');
  if(sendBtn) sendBtn.disabled = true;
  
  try {
    const reply = await callGroq(msg);
    if (reply) {
      removeTyping();
      addMessage('jarvis', reply);
      
      const autoSpeakEl = document.getElementById('auto-speak');
      const autoSpeak = autoSpeakEl ? autoSpeakEl.checked : true;
      
      // Trigger voice synchronously along with text generation. No delays.
      if (autoSpeak) {
        voiceEngine.speak(reply, () => {});
      }
    } else {
      removeTyping();
    }
  } catch (e) {
    removeTyping();
    const errMsg = 'My apologies, sir. I encountered an error: ' + e.message;
    addMessage('jarvis', errMsg);
    showToast('Error: ' + e.message.substring(0, 50));
    setState('error');
    setTimeout(() => setState('standby'), 2000);
  } finally {
    if(sendBtn) sendBtn.disabled = false;
    if (!voiceEngine.isSpeaking) setState('standby');
  }
}

// ===================== CONTROLS =====================
document.getElementById('send-btn')?.addEventListener('click', sendMessage);

const textInput = document.getElementById('text-input');
if(textInput) {
  textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    }
  });
  textInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    const btn = document.getElementById('send-btn');
    if(btn) btn.disabled = this.value.trim().length === 0;
  });
}

// Settings Modal
const settingsPanel = document.getElementById('settings-panel');
const settingsOverlay = document.getElementById('settings-overlay');
document.getElementById('settings-btn')?.addEventListener('click', () => {
  settingsPanel?.classList.remove('hidden');
  settingsOverlay?.classList.remove('hidden');
});
const closeSettings = () => {
  settingsPanel?.classList.add('hidden');
  settingsOverlay?.classList.add('hidden');
};
document.getElementById('close-settings')?.addEventListener('click', closeSettings);
settingsOverlay?.addEventListener('click', closeSettings);

// Model selector
document.getElementById('model-select')?.addEventListener('change', e => {
  model = e.target.value;
});

// Voice selector
document.getElementById('voice-select')?.addEventListener('change', e => {
  voiceEngine.setVoice(e.target.value);
});

document.getElementById('voice-speed')?.addEventListener('input', e => {
  voiceEngine.setRate(e.target.value);
  const v = document.getElementById('rate-val');
  if(v) v.textContent = parseFloat(e.target.value).toFixed(2) + 'x';
});

document.getElementById('voice-pitch')?.addEventListener('input', e => {
  voiceEngine.setStability(1 - parseFloat(e.target.value));
  const p = document.getElementById('pitch-val');
  if(p) p.textContent = parseFloat(e.target.value).toFixed(2);
});

// ===================== AUTO-BOOT SEQUENCE =====================
function bootJarvis() {
  loadHistory();
  setState('standby');
  
  if (conversationHistory.length === 0) {
      // Chat is empty, no welcome message spoken natively yet, it is handled via index.html HTML
  }
}

setTimeout(bootJarvis, 500);
