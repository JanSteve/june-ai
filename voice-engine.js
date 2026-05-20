/**
 * JUNE A.I. Voice Engine v4.0
 * ────────────────────────────
 * ElevenLabs Neural TTS with automatic browser SpeechSynthesis fallback.
 */

class JarvisVoiceEngine {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.isSpeaking = false;
    this.onSpeakStart = null;
    this.onSpeakEnd = null;
    this._cancelled = false;
    this._currentAudio = null;
    this._queue = [];

    // ElevenLabs voice map
    this.voices = {
      'George (British)':     'JBFqnCBsd6RMkjVDRZzb',
      'Daniel (British)':     'onwK4e9ZLuTAKqWW03F9',
      'Callum (Refined)':     'N2lVS1w4EtoT3dr4eOWO',
      'Charlie (Casual)':     'IKne3meq5aSn9XLyUdCD',
      'James (Authoritative)':'ZQe5CZNOzWyzPSCn5a3c',
      'Adam (Deep)':          'pNInz6obpgDQGcFmaJgB',
    };

    this.selectedVoiceId   = 'JBFqnCBsd6RMkjVDRZzb';
    this.selectedVoiceName = 'George (British)';

    // Voice tuning
    this.stability      = 0.45;
    this.similarityBoost = 0.78;
    this.style          = 0.35;
    this.speakerBoost   = true;
    this.rate           = 1.0;

    // Browser fallback
    this.synth = window.speechSynthesis;
    this.browserVoice = null;
    this._loadBrowserVoices();
  }

  _loadBrowserVoices() {
    const pick = () => {
      const v = this.synth.getVoices();
      this.browserVoice =
        v.find(x => x.name.includes('Samantha')) ||
        v.find(x => x.name.includes('Daniel'))   ||
        v.find(x => x.lang.startsWith('en'))     ||
        v[0];
    };
    pick();
    if (this.synth.onvoiceschanged !== undefined) this.synth.onvoiceschanged = pick;
    setTimeout(pick, 600);
  }

  // ── Setters ──
  getVoiceName()  { return this.selectedVoiceName; }
  getVoiceList()  { return Object.keys(this.voices); }
  setVoice(name)  { if (this.voices[name]) { this.selectedVoiceId = this.voices[name]; this.selectedVoiceName = name; } }
  setRate(val)    { this.rate = parseFloat(val); }
  setStability(v) { this.stability = parseFloat(v); }

  // ── Text cleaning ──
  _clean(text) {
    return text
      .replace(/```[\s\S]*?```/g, '. Code block. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/[-*]\s+/g, '. ')
      .replace(/\d+\.\s+/g, '. ')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // ── Split into chunks ──
  _chunk(text) {
    const clean = this._clean(text);
    if (clean.length <= 500) return [clean];
    const sentences = clean.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let buf = '';
    for (const s of sentences) {
      const candidate = buf ? buf + ' ' + s : s;
      if (candidate.length > 500 && buf) { chunks.push(buf); buf = s; }
      else { buf = candidate; }
    }
    if (buf) chunks.push(buf);
    return chunks;
  }

  // ── ElevenLabs API ──
  async _tts(text) {
    const url = 'https://api.elevenlabs.io/v1/text-to-speech/' + this.selectedVoiceId;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': this.apiKey },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: this.stability,
          similarity_boost: this.similarityBoost,
          style: this.style,
          use_speaker_boost: this.speakerBoost,
        }
      })
    });
    if (!res.ok) throw new Error('ElevenLabs ' + res.status);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  // ── Play audio ──
  _play(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.playbackRate = this.rate;
      this._currentAudio = audio;
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('playback')); };
      audio.play().catch(reject);
    });
  }

  // ── Main speak method ──
  async speak(text, onStart) {
    this.stop();
    this._cancelled = false;
    this.isSpeaking = true;
    if (this.onSpeakStart) this.onSpeakStart();

    try {
      const chunks = this._chunk(text);
      for (let i = 0; i < chunks.length; i++) {
        if (this._cancelled) break;
        const url = await this._tts(chunks[i]);
        if (this._cancelled) break;
        if (i === 0 && onStart) onStart();
        await this._play(url);
        // Small breath between chunks
        if (i < chunks.length - 1 && !this._cancelled) {
          await new Promise(r => setTimeout(r, 150));
        }
      }
    } catch (err) {
      console.warn('[Voice] ElevenLabs failed, using browser fallback:', err.message);
      this._fallback(text, onStart);
      return; // _fallback handles _finish
    }

    this._finish();
  }

  // ── Browser SpeechSynthesis fallback ──
  _fallback(text, onStart) {
    const clean = this._clean(text).substring(0, 800);
    const utter = new SpeechSynthesisUtterance(clean);
    if (this.browserVoice) utter.voice = this.browserVoice;
    utter.rate  = 0.92;
    utter.pitch = 0.95;
    utter.onstart = () => { if (onStart) onStart(); };
    utter.onend   = () => this._finish();
    utter.onerror = () => this._finish();
    this.synth.speak(utter);
  }

  _finish() {
    this.isSpeaking = false;
    this._queue = [];
    if (this.onSpeakEnd) this.onSpeakEnd();
  }

  stop() {
    this._cancelled = true;
    this.isSpeaking = false;
    this._queue = [];
    if (this._currentAudio) { this._currentAudio.pause(); this._currentAudio = null; }
    this.synth.cancel();
  }
}

window.JarvisVoiceEngine = JarvisVoiceEngine;
