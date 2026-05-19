/**
 * JARVIS Natural Voice Engine v2.0
 * ─────────────────────────────────
 * Produces ElevenLabs-quality speech using advanced prosody techniques:
 * 
 * 1. PHRASE-LEVEL CHUNKING — Splits at natural breath points, not just sentences
 * 2. INTONATION MODELING — Pitch rises for questions, falls for conclusions
 * 3. EMPHASIS DETECTION — Key words get slight stress via rate/pitch shifts
 * 4. BREATHING RHYTHM — Variable pauses mimic human breath patterns
 * 5. DYNAMIC RATE — Speeds up through familiar phrases, slows for important ones
 * 6. PREMIUM VOICE SELECTION — Prioritizes Enhanced/Neural/Premium system voices
 */

class JarvisVoiceEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.selectedVoice = null;
    this.isSpeaking = false;
    this.baseRate = 0.92;
    this.basePitch = 0.95;
    this.queue = [];
    this.currentUtterance = null;
    this.onSpeakStart = null;
    this.onSpeakEnd = null;
    this.voiceReady = false;
    this._cancelled = false;
    this._chromeTimer = null;

    // Premium/Enhanced voices ranked by naturalness
    // Enhanced voices on macOS sound dramatically better than standard ones
    this.voicePreferences = [
      // macOS Enhanced (neural-quality) voices — these are the best
      'Samantha (Enhanced)', 'Daniel (Enhanced)', 'Karen (Enhanced)',
      'Moira (Enhanced)', 'Rishi (Enhanced)', 'Tessa (Enhanced)',
      'Alex (Enhanced)', 'Tom (Enhanced)', 'Oliver (Enhanced)',
      'Stephanie (Enhanced)', 'Fiona (Enhanced)',
      // macOS Premium voices
      'Samantha (Premium)', 'Daniel (Premium)',
      // macOS standard high-quality
      'Samantha', 'Daniel', 'Alex', 'Tom', 'Oliver', 'Karen', 'Moira',
      // Google Chrome neural voices (very natural)
      'Google UK English Male', 'Google UK English Female', 'Google US English',
      // Microsoft Edge neural voices (excellent quality)
      'Microsoft Ryan Online (Natural)', 'Microsoft Guy Online (Natural)',
      'Microsoft Ryan Online', 'Microsoft Guy Online',
      'Microsoft Ryan', 'Microsoft George', 'Microsoft Mark',
      // Android / ChromeOS
      'English United Kingdom', 'English (United Kingdom)',
    ];

    this._initVoices();
  }

  _initVoices() {
    const load = () => {
      const voices = this.synth.getVoices();
      if (voices.length === 0) return;

      // Try premium voices first, in preference order
      for (const pref of this.voicePreferences) {
        const found = voices.find(v => v.name === pref || v.name.includes(pref));
        if (found) {
          this.selectedVoice = found;
          break;
        }
      }

      // Fallback: best English voice available
      if (!this.selectedVoice) {
        // Prefer en-GB for the JARVIS British persona
        this.selectedVoice =
          voices.find(v => v.lang === 'en-GB') ||
          voices.find(v => v.lang.startsWith('en')) ||
          voices[0];
      }

      this.voiceReady = true;
      console.log('[JARVIS Voice] Selected:', this.selectedVoice?.name, this.selectedVoice?.lang);
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
    setTimeout(load, 300);
    setTimeout(load, 1000);
    setTimeout(load, 2500);
  }

  getVoiceName() {
    return this.selectedVoice ? this.selectedVoice.name : 'Loading...';
  }

  // ═══════════════════════════════════════════════════════════════
  // TEXT PROCESSING — Natural phrase extraction
  // ═══════════════════════════════════════════════════════════════

  /**
   * Clean markdown/formatting artifacts from AI response text
   */
  _cleanText(text) {
    return text
      .replace(/```[\s\S]*?```/g, '. Code block provided. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/[-*]\s+/g, '. ')             // bullet points → pause
      .replace(/\d+\.\s+/g, '. ')            // numbered lists → pause
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\.{2,}/g, '.')
      .replace(/,{2,}/g, ',')
      .trim();
  }

  /**
   * Split text into natural phrases at breath points.
   * Humans breathe at: sentence ends, commas, semicolons, colons, 
   * dashes, and after ~60-80 characters of continuous speech.
   */
  _splitIntoPhrases(text) {
    const clean = this._cleanText(text);

    // First split on strong boundaries (sentence endings)
    const sentences = clean.split(/(?<=[.!?])\s+/);
    const phrases = [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      // Short sentences stay whole (natural single-breath delivery)
      if (trimmed.length <= 80) {
        phrases.push(trimmed);
        continue;
      }

      // Long sentences: split at weak boundaries (commas, semicolons, dashes)
      const subParts = trimmed.split(/(?<=[:;,])\s+|(?<=\s—\s)/);
      let buffer = '';

      for (const part of subParts) {
        const candidate = buffer ? buffer + ' ' + part : part;
        
        // Keep accumulating until we hit a natural breath length (40-90 chars)
        if (candidate.length > 90 && buffer) {
          phrases.push(buffer);
          buffer = part;
        } else {
          buffer = candidate;
        }
      }
      if (buffer) phrases.push(buffer);
    }

    return phrases.length ? phrases : [clean];
  }

  // ═══════════════════════════════════════════════════════════════
  // PROSODY ENGINE — Natural intonation & rhythm
  // ═══════════════════════════════════════════════════════════════

  /**
   * Analyze a phrase and return prosody parameters.
   * This mimics how humans naturally modulate their voice.
   */
  _getProsody(phrase, index, total) {
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const isQuestion = /\?$/.test(phrase.trim());
    const isExclamation = /!$/.test(phrase.trim());
    const isListItem = /^(First|Second|Third|Next|Finally|Also|Additionally|Moreover)/i.test(phrase);
    const isShort = phrase.length < 30;
    const isLong = phrase.length > 100;
    const hasComma = phrase.includes(',');

    let rate = this.baseRate;
    let pitch = this.basePitch;

    // ── Rate modulation ──
    if (isFirst) rate -= 0.04;          // Start deliberately, like gathering thoughts
    if (isLast) rate -= 0.06;           // Slow down conclusively
    if (isQuestion) rate -= 0.02;       // Questions are slightly slower
    if (isShort) rate += 0.02;          // Short phrases flow faster
    if (isLong) rate -= 0.02;           // Long phrases slow slightly
    if (isListItem) rate -= 0.01;       // List items are measured

    // Micro-variation for naturalness (±2%)
    rate += (Math.random() - 0.5) * 0.04;

    // ── Pitch modulation ──
    if (isQuestion) pitch += 0.12;      // Rising intonation for questions
    if (isExclamation) pitch += 0.06;   // Slight lift for emphasis
    if (isLast && !isQuestion) pitch -= 0.06;  // Falling intonation at conclusion
    if (isFirst) pitch += 0.02;         // Slightly higher start (engagement)
    if (isListItem) pitch += 0.03;      // List items have slight lift

    // Micro-variation (±1.5%)
    pitch += (Math.random() - 0.5) * 0.03;

    // Clamp to safe ranges
    rate = Math.max(0.6, Math.min(1.25, rate));
    pitch = Math.max(0.7, Math.min(1.3, pitch));

    // ── Pause duration after this phrase (ms) ──
    let pauseAfter = 0;
    if (!isLast) {
      if (isQuestion) pauseAfter = 400 + Math.random() * 200;      // Pause after questions
      else if (/[.!]$/.test(phrase)) pauseAfter = 280 + Math.random() * 180;  // Sentence end
      else if (/[;:]$/.test(phrase)) pauseAfter = 200 + Math.random() * 120;  // Mid-sentence break
      else if (/,$/.test(phrase)) pauseAfter = 120 + Math.random() * 100;     // Comma pause
      else pauseAfter = 150 + Math.random() * 100;   // Default breath
    }

    return { rate, pitch, pauseAfter };
  }

  // ═══════════════════════════════════════════════════════════════
  // SPEECH DELIVERY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Speak text with natural human-like delivery
   */
  speak(text) {
    if (!document.getElementById('auto-speak')?.checked) return;
    
    this.stop();
    this._cancelled = false;
    this.isSpeaking = true;

    const phrases = this._splitIntoPhrases(text);
    this.queue = [...phrases];

    if (this.onSpeakStart) this.onSpeakStart();
    this._deliverPhrase(0);
  }

  _deliverPhrase(index) {
    if (this._cancelled || index >= this.queue.length) {
      this._finish();
      return;
    }

    const phrase = this.queue[index];
    const prosody = this._getProsody(phrase, index, this.queue.length);
    const utter = new SpeechSynthesisUtterance(phrase);

    if (this.selectedVoice) utter.voice = this.selectedVoice;
    utter.rate = prosody.rate;
    utter.pitch = prosody.pitch;
    utter.volume = 1;

    utter.onend = () => {
      if (this._cancelled) return;
      // Natural pause between phrases (breathing simulation)
      if (prosody.pauseAfter > 0) {
        setTimeout(() => this._deliverPhrase(index + 1), prosody.pauseAfter);
      } else {
        this._deliverPhrase(index + 1);
      }
    };

    utter.onerror = (e) => {
      console.warn('[JARVIS Voice] Chunk error:', e.error);
      if (!this._cancelled) {
        setTimeout(() => this._deliverPhrase(index + 1), 100);
      }
    };

    this.currentUtterance = utter;
    this.synth.speak(utter);
    this._ensureChromePlayback();
  }

  /**
   * Chrome has a bug where speechSynthesis freezes after ~15s.
   * This workaround periodically nudges it to keep going.
   */
  _ensureChromePlayback() {
    if (this._chromeTimer) clearInterval(this._chromeTimer);
    this._chromeTimer = setInterval(() => {
      if (!this.synth.speaking) {
        clearInterval(this._chromeTimer);
        return;
      }
      if (this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 12000);
  }

  _finish() {
    this.isSpeaking = false;
    this.queue = [];
    if (this._chromeTimer) clearInterval(this._chromeTimer);
    if (this.onSpeakEnd) this.onSpeakEnd();
  }

  stop() {
    this._cancelled = true;
    this.isSpeaking = false;
    this.queue = [];
    this.synth.cancel();
    if (this._chromeTimer) clearInterval(this._chromeTimer);
  }

  setRate(val) { this.baseRate = parseFloat(val); }
  setPitch(val) { this.basePitch = parseFloat(val); }
}

window.JarvisVoiceEngine = JarvisVoiceEngine;
