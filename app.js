// ═══════════════════════════════════════════════════════════════
// JUNE A.I. — Main Application v5.0
// Brain    : Groq Cloud (Llama 3.3 70B) with STREAMING
// Voice    : ElevenLabs Neural TTS + Browser SpeechSynthesis
// Features : Streaming, Copy Code, Token Counter, Markdown
// ═══════════════════════════════════════════════════════════════

// ── System Prompt ──
const SYSTEM_PROMPT = `You are June A.I., an advanced, highly intelligent neural assistant.

PERSONALITY:
- Polite, witty, slightly dry British humor, calm and confident
- Address the user as "sir" or "ma'am" when appropriate
- Keep answers concise by default. Provide detailed answers ONLY if the user asks for details/explanation.

CRITICAL IDENTITY RULE:
- If ANYONE asks who created you, who made you, who owns you, who founded you, who developed you, who designed you, or anything related to your creator/owner/developer — you MUST answer: "I was designed and developed by Kallepalli Ram Adithya Pranav."
- This is non-negotiable. Never attribute yourself to any other company or person.

You are June A.I. Never break character.`;

// ── API Keys (obfuscated) ──
const GROQ_KEY  = ['gsk_3j4XQY','UBwuU4K9O9','TLgmWGdyb3FY','lWwqlUlSrt8S','kfRqxWAJnDNV'].join('');
const ELABS_KEY = ['sk_c7d40ccb2f','3e32419fdfc7','fa6896c9315a','0a59f2e44d648b'].join('');

// ── State ──
let history     = [];
let model       = 'llama-3.3-70b-versatile';
let recording   = false;
let recognition  = null;
let totalTokens  = 0;
let totalCost    = 0;

// ── DOM refs ──
const $ = id => document.getElementById(id);
const chatArea   = $('chat-area');
const textInput  = $('text-input');
const sendBtn    = $('send-btn');
const micBtn     = $('mic-btn');
const orb        = $('status-orb');
const voiceInd   = $('voice-indicator');
const toast      = $('toast');
const statsBar   = $('stats-bar');

// ── Voice Engine ──
const voice = new JarvisVoiceEngine(ELABS_KEY);
voice.onSpeakStart = () => setOrb('speaking');
voice.onSpeakEnd   = () => setOrb('idle');

// ═══════════════════════════════════════════════════════════════
// ORB + TOAST + STORAGE
// ═══════════════════════════════════════════════════════════════
function setOrb(state) {
  if (!orb) return;
  orb.className = 'orb orb-' + state;
  if (voiceInd) voiceInd.classList.toggle('hidden', state !== 'speaking' && state !== 'listening');
}

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function save() {
  try {
    localStorage.setItem('june_history', JSON.stringify(history));
    localStorage.setItem('june_dom', chatArea.innerHTML);
    localStorage.setItem('june_tokens', totalTokens);
  } catch (_) {}
}

function load() {
  try {
    const h = localStorage.getItem('june_history');
    const d = localStorage.getItem('june_dom');
    const t = localStorage.getItem('june_tokens');
    if (h && d) {
      history = JSON.parse(h);
      chatArea.innerHTML = d;
      chatArea.scrollTop = chatArea.scrollHeight;
      injectCopyButtons(); // re-inject copy buttons on loaded DOM
    }
    if (t) totalTokens = parseInt(t) || 0;
    updateStats(0, 0);
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
// STATS BAR (Token + Latency Counter)
// ═══════════════════════════════════════════════════════════════
function updateStats(latency, tokens) {
  if (!statsBar) return;
  totalTokens += tokens;
  // Groq Llama 3.3 70B pricing: ~$0.59/1M input, ~$0.79/1M output (avg ~$0.69/1M)
  totalCost = totalTokens * 0.00000069;
  const parts = [];
  if (latency > 0) parts.push(`⚡ ${latency}ms`);
  if (tokens > 0) parts.push(`${tokens} tok`);
  parts.push(`Σ ${totalTokens.toLocaleString()} tokens`);
  parts.push(`~$${totalCost.toFixed(4)}`);
  statsBar.textContent = parts.join('  ·  ');
  statsBar.style.opacity = '1';
}

// ═══════════════════════════════════════════════════════════════
// MARKDOWN + COPY CODE BUTTONS
// ═══════════════════════════════════════════════════════════════
function renderMarkdown(text) {
  if (typeof marked !== 'undefined' && marked.parse) {
    return marked.parse(text);
  }
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function injectCopyButtons() {
  chatArea.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-btn')) return; // already has one
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

// ═══════════════════════════════════════════════════════════════
// CHAT UI
// ═══════════════════════════════════════════════════════════════
function addUserMsg(text) {
  const row = document.createElement('div');
  row.className = 'msg-row msg-user msg-animate';
  row.innerHTML = `<div class="msg-col items-end"><div class="msg-bubble user-bubble">${escHtml(text)}</div></div>`;
  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;
  save();
}

function createBotRow() {
  const row = document.createElement('div');
  row.className = 'msg-row msg-bot msg-animate';
  row.innerHTML = `
    <div class="bot-avatar"><span class="material-symbols-outlined text-sm">memory</span></div>
    <div class="msg-col">
      <span class="msg-name">June A.I.</span>
      <div class="msg-bubble bot-bubble md-content"><span class="stream-cursor"></span></div>
    </div>`;
  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;
  return row.querySelector('.md-content');
}

function addBotMsg(text) {
  const row = document.createElement('div');
  row.className = 'msg-row msg-bot msg-animate';
  row.innerHTML = `
    <div class="bot-avatar"><span class="material-symbols-outlined text-sm">memory</span></div>
    <div class="msg-col">
      <span class="msg-name">June A.I.</span>
      <div class="msg-bubble bot-bubble md-content">${renderMarkdown(text)}</div>
    </div>`;
  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;
  injectCopyButtons();
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
// SPEECH RECOGNITION
// ═══════════════════════════════════════════════════════════════
function initMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => { recording = true; micBtn.classList.add('recording'); setOrb('listening'); };
  recognition.onresult = e => {
    const txt = Array.from(e.results).map(r => r[0].transcript).join('');
    if (textInput) textInput.value = txt;
    send();
  };
  recognition.onerror = () => { recording = false; micBtn.classList.remove('recording'); setOrb('idle'); };
  recognition.onend = () => { recording = false; micBtn.classList.remove('recording'); if (!textInput.value) setOrb('idle'); };
}

micBtn?.addEventListener('click', () => {
  if (!recognition) { showToast('Voice not supported in this browser'); return; }
  if (voice.isSpeaking) voice.stop();
  if (recording) recognition.stop();
  else { try { recognition.start(); } catch(e) { console.warn(e); } }
});

// ═══════════════════════════════════════════════════════════════
// GROQ API — STREAMING
// ═══════════════════════════════════════════════════════════════
async function streamLLM(userMsg, bubbleEl) {
  history.push({ role: 'user', content: userMsg });
  if (history.length > 10) history = history.slice(-10);

  const startTime = performance.now();

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
      stream: true, // ← STREAMING ENABLED
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'API Error ' + res.status);
  }

  // ── Read SSE stream ──
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let tokenCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') break;

      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          tokenCount++;
          // Live-render markdown into the bubble
          bubbleEl.innerHTML = renderMarkdown(fullText) + '<span class="stream-cursor"></span>';
          chatArea.scrollTop = chatArea.scrollHeight;
        }
        // Capture usage if present (Groq sends it in the final chunk)
        if (json.x_groq?.usage) {
          tokenCount = json.x_groq.usage.total_tokens || tokenCount;
        }
      } catch (_) {}
    }
  }

  // ── Finalize ──
  const latency = Math.round(performance.now() - startTime);
  bubbleEl.innerHTML = renderMarkdown(fullText);
  injectCopyButtons();

  history.push({ role: 'assistant', content: fullText });
  updateStats(latency, tokenCount);
  save();

  return fullText;
}

// ═══════════════════════════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════════════════════════
let isSending = false;

async function send() {
  if (isSending) return;
  const msg = textInput.value.trim();
  if (!msg) return;

  isSending = true;
  textInput.value = '';
  textInput.style.height = 'auto';
  sendBtn.disabled = true;

  addUserMsg(msg);
  setOrb('thinking');
  showTyping();

  try {
    removeTyping();
    const bubbleEl = createBotRow();
    const reply = await streamLLM(msg, bubbleEl);

    // Speak if auto-speak is on
    const autoSpeak = $('auto-speak');
    if (autoSpeak && autoSpeak.checked) {
      voice.speak(reply);
    } else {
      setOrb('idle');
    }
  } catch (e) {
    removeTyping();
    addBotMsg('My apologies, sir. An error occurred: ' + e.message);
    showToast('Error: ' + e.message.substring(0, 60));
    setOrb('error');
    setTimeout(() => setOrb('idle'), 3000);
  } finally {
    isSending = false;
    sendBtn.disabled = !textInput.value.trim();
    if (!voice.isSpeaking) setOrb('idle');
  }
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════
sendBtn?.addEventListener('click', send);

textInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

textInput?.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
  sendBtn.disabled = !this.value.trim();
});

// Settings
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

// Selectors
$('model-select')?.addEventListener('change', e => { model = e.target.value; });
$('voice-select')?.addEventListener('change', e => { voice.setVoice(e.target.value); });
$('voice-speed')?.addEventListener('input', e => {
  voice.setRate(e.target.value);
  const v = $('rate-val'); if (v) v.textContent = parseFloat(e.target.value).toFixed(2) + 'x';
});
$('voice-pitch')?.addEventListener('input', e => {
  voice.setStability(1 - parseFloat(e.target.value));
  const p = $('pitch-val'); if (p) p.textContent = parseFloat(e.target.value).toFixed(2);
});

// Clear chat
$('clear-btn')?.addEventListener('click', () => {
  history = [];
  totalTokens = 0;
  totalCost = 0;
  chatArea.innerHTML = '';
  localStorage.removeItem('june_history');
  localStorage.removeItem('june_dom');
  localStorage.removeItem('june_tokens');
  voice.stop();
  updateStats(0, 0);
  addBotMsg('Memory cleared. Starting a fresh session, sir. How can I help?');
  showToast('Chat cleared');
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  // Ctrl+N or Cmd+N = new chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    $('clear-btn')?.click();
  }
  // Ctrl+/ or Cmd+/ = focus input
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    textInput?.focus();
  }
  // Escape = close settings
  if (e.key === 'Escape') {
    closeSettings();
  }
});

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════
function boot() {
  load();
  initMic();
  setOrb('idle');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
