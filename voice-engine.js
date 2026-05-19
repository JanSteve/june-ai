/**
 * JARVIS Natural Voice Engine
 * Produces human-like speech by splitting text into natural sentence chunks,
 * adding micro-pauses between phrases, and selecting the most natural-sounding
 * voice available on the system.
 */

class JarvisVoiceEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.selectedVoice = null;
    this.isSpeaking = false;
    this.rate = 0.92;
    this.pitch = 0.95;
    this.queue = [];
    this.currentUtterance = null;
    this.onSpeakStart = null;
    this.onSpeakEnd = null;
    this.onSpeakError = null;
    this.voiceReady = false;

    // Preferred voices ranked by naturalness (premium/neural voices first)
    this.voicePreferences = [
      // macOS premium voices
      'Samantha', 'Daniel', 'Alex', 'Tom', 'Oliver',
      // Google high-quality voices
      'Google UK English Male', 'Google UK English Female',
      'Google US English',
      // Microsoft neural voices (Edge/Windows)
      'Microsoft Ryan', 'Microsoft George', 'Microsoft Mark',
      'Microsoft Guy Online', 'Microsoft Ryan Online',
      // Chrome OS / Android
      'English United Kingdom', 'English (United Kingdom)',
      // Fallback patterns
      'en-GB', 'en-US', 'en-AU'
    ];

    this._initVoices();
  }

  _initVoices() {
    const load = () => {
      const voices = this.synth.getVoices();
      if (voices.length === 0) return;

      // Try each preferred voice in order
      for (const pref of this.voicePreferences) {
        const found = voices.find(v =>
          v.name.includes(pref) || v.lang === pref
        );
        if (found) {
          this.selectedVoice = found;
          break;
        }
      }

      // Fallback: any English voice
      if (!this.selectedVoice) {
        this.selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      }

      this.voiceReady = true;
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
    // Retry after a delay for browsers that load voices asynchronously
    setTimeout(load, 500);
    setTimeout(load, 1500);
  }

  getVoiceName() {
    return this.selectedVoice ? this.selectedVoice.name : 'Loading...';
  }

  /**
   * Splits text into natural sentence-level chunks for human-like delivery.
   * Handles abbreviations, ellipsis, and conversational patterns.
   */
  _splitIntoChunks(text) {
    // Clean markdown formatting
    let clean = text
      .replace(/```[\s\S]*?```/g, ' code block omitted ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Split on sentence boundaries while preserving natural flow
    // Handles: periods, question marks, exclamation marks, semicolons, em-dashes
    const rawSentences = clean.split(/(?<=[.!?;])\s+|(?<=\.\.\.)\s+|(?<=—)\s+/);

    const chunks = [];
    let current = '';

    for (const sentence of rawSentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      // If adding this sentence keeps us under ~120 chars, merge for flow
      if (current && (current + ' ' + trimmed).length < 120) {
        current += ' ' + trimmed;
      } else {
        if (current) chunks.push(current);
        current = trimmed;
      }
    }
    if (current) chunks.push(current);

    // If we only have one very long chunk, split on commas/colons for breath pauses
    if (chunks.length === 1 && chunks[0].length > 150) {
      const subChunks = chunks[0].split(/(?<=[:,])\s+/);
      const merged = [];
      let buf = '';
      for (const sc of subChunks) {
        if (buf && (buf + ' ' + sc).length > 100) {
          merged.push(buf);
          buf = sc;
        } else {
          buf = buf ? buf + ' ' + sc : sc;
        }
      }
      if (buf) merged.push(buf);
      return merged;
    }

    return chunks.length ? chunks : [clean];
  }

  /**
   * Speaks text in a natural, human-like manner by:
   * 1. Splitting into sentence chunks
   * 2. Adding micro-pauses between sentences (like breathing)
   * 3. Slightly varying rate per chunk for natural rhythm
   */
  speak(text) {
    if (!document.getElementById('auto-speak')?.checked) return;

    this.stop();
    this.isSpeaking = true;

    const chunks = this._splitIntoChunks(text);
    this.queue = [...chunks];

    if (this.onSpeakStart) this.onSpeakStart();

    this._speakNextChunk(0);
  }

  _speakNextChunk(index) {
    if (index >= this.queue.length || !this.isSpeaking) {
      this.isSpeaking = false;
      this.queue = [];
      if (this.onSpeakEnd) this.onSpeakEnd();
      return;
    }

    const chunk = this.queue[index];
    const utter = new SpeechSynthesisUtterance(chunk);

    if (this.selectedVoice) utter.voice = this.selectedVoice;

    // Natural rate variation: slightly faster mid-sentence, slower at ends
    const isLast = index === this.queue.length - 1;
    const isFirst = index === 0;
    let rateVariation = (Math.random() - 0.5) * 0.06; // ±3% variation
    if (isFirst) rateVariation -= 0.02; // Start slightly slower (deliberate)
    if (isLast) rateVariation -= 0.03;  // End slower (conclusive)

    utter.rate = Math.max(0.6, Math.min(1.3, this.rate + rateVariation));
    utter.pitch = this.pitch;
    utter.volume = 1;

    utter.onend = () => {
      // Natural pause between sentences (150-350ms, like a breath)
      const pauseMs = isLast ? 0 : 150 + Math.random() * 200;
      setTimeout(() => this._speakNextChunk(index + 1), pauseMs);
    };

    utter.onerror = (e) => {
      // Skip chunk on error, continue with next
      console.warn('Speech chunk error:', e);
      this._speakNextChunk(index + 1);
    };

    this.currentUtterance = utter;
    this.synth.speak(utter);

    // Chrome workaround: Chrome pauses speech after ~15s, resume it
    this._startChromeWorkaround();
  }

  _startChromeWorkaround() {
    // Chrome has a known bug where speechSynthesis pauses after ~15 seconds
    // This workaround resumes it periodically
    if (this._chromeTimer) clearInterval(this._chromeTimer);
    this._chromeTimer = setInterval(() => {
      if (this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.synth.resume();
      } else if (!this.synth.speaking) {
        clearInterval(this._chromeTimer);
      }
    }, 10000);
  }

  stop() {
    this.isSpeaking = false;
    this.queue = [];
    this.synth.cancel();
    if (this._chromeTimer) clearInterval(this._chromeTimer);
    if (this.onSpeakEnd) this.onSpeakEnd();
  }

  setRate(val) { this.rate = parseFloat(val); }
  setPitch(val) { this.pitch = parseFloat(val); }
}

// Export as global
window.JarvisVoiceEngine = JarvisVoiceEngine;
