/**
 * JARVIS Voice Engine v3.0 — ElevenLabs Integration
 * ───────────────────────────────────────────────────
 * Uses ElevenLabs' neural TTS for truly human-quality speech.
 * Falls back to browser Speech Synthesis if ElevenLabs fails.
 */

class JarvisVoiceEngine {
  constructor(elevenLabsKey) {
    this.apiKey = elevenLabsKey;
    this.isSpeaking = false;
    this.onSpeakStart = null;
    this.onSpeakEnd = null;
    this._cancelled = false;
    this._currentAudio = null;
    this._queue = [];

    // ElevenLabs voice IDs — British male voices ideal for JARVIS
    this.voices = {
      'George (British)':   'JBFqnCBsd6RMkjVDRZzb',
      'Daniel (British)':   'onwK4e9ZLuTAKqWW03F9',
      'Callum (Refined)':   'N2lVS1w4EtoT3dr4eOWO',
      'Charlie (Casual)':   'IKne3meq5aSn9XLyUdCD',
      'James (Authoritative)': 'ZQe5CZNOzWyzPSCn5a3c',
      'Adam (Deep)':        'pNInz6obpgDQGcFmaJgB',
    };

    // Default to George — refined British, perfect JARVIS voice
    this.selectedVoiceId = 'JBFqnCBsd6RMkjVDRZzb';
    this.selectedVoiceName = 'George (British)';

    // Voice settings for naturalness
    this.stability = 0.45;        // Lower = more expressive/natural
    this.similarityBoost = 0.78;  // How close to original voice
    this.style = 0.35;            // Style exaggeration
    this.speakerBoost = true;

    // Playback
    this.rate = 1.0;

    // Browser fallback
    this.synth = window.speechSynthesis;
    this.browserVoice = null;
    this._initBrowserFallback();
  }

  _initBrowserFallback() {
    const load = () => {
      const voices = this.synth.getVoices();
      this.browserVoice =
        voices.find(v => v.name.includes('Samantha')) ||
        voices.find(v => v.name.includes('Daniel')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
    };
    load();
    if (this.synth.onvoiceschanged !== undefined) this.synth.onvoiceschanged = load;
    setTimeout(load, 500);
  }

  getVoiceName() { return this.selectedVoiceName; }
  getVoiceList() { return Object.keys(this.voices); }

  setVoice(name) {
    if (this.voices[name]) {
      this.selectedVoiceId = this.voices[name];
      this.selectedVoiceName = name;
    }
  }

  setRate(val) { this.rate = parseFloat(val); }
  setPitch(val) { /* ElevenLabs handles pitch internally via stability */ }

  setStability(val) { this.stability = parseFloat(val); }
  setSimilarity(val) { this.similarityBoost = parseFloat(val); }

  // ═══════════════════════════════════════════════
  // TEXT PROCESSING
  // ═══════════════════════════════════════════════

  _cleanText(text) {
    return text
      .replace(/```[\s\S]*?```/g, '. Code block provided. ')
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

  /**
   * Split into chunks that fit ElevenLabs' sweet spot (~300-500 chars).
   * Larger chunks sound more natural as ElevenLabs models full context.
   */
  _splitForElevenLabs(text) {
    const clean = this._cleanText(text);

    // If short enough, send as single chunk (most natural)
    if (clean.length <= 500) return [clean];

    // Split at sentence boundaries
    const sentences = clean.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let buffer = '';

    for (const sentence of sentences) {
      const candidate = buffer ? buffer + ' ' + sentence : sentence;
      if (candidate.length > 500 && buffer) {
        chunks.push(buffer);
        buffer = sentence;
      } else {
        buffer = candidate;
      }
    }
    if (buffer) chunks.push(buffer);
    return chunks;
  }

  // ═══════════════════════════════════════════════
  // ELEVENLABS TTS API
  // ═══════════════════════════════════════════════

  async _callElevenLabs(text) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.selectedVoiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: this.stability,
          similarity_boost: this.similarityBoost,
          style: this.style,
          use_speaker_boost: this.speakerBoost,
        }
      })
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`ElevenLabs API error ${response.status}: ${err}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  }

  // ═══════════════════════════════════════════════
  // PLAYBACK
  // ═══════════════════════════════════════════════

  async speak(text, onPlaybackStart = null) {
    if (!document.getElementById('auto-speak')?.checked) {
      if (onPlaybackStart) onPlaybackStart();
      return;
    }

    this.stop();
    this._cancelled = false;
    this.isSpeaking = true;

    if (this.onSpeakStart) this.onSpeakStart();

    try {
      const chunks = this._splitForElevenLabs(text);
      this._queue = [...chunks];
      await this._playNextChunk(0, onPlaybackStart);
    } catch (err) {
      console.warn('[JARVIS Voice] ElevenLabs failed, using browser fallback:', err.message);
      this._browserFallback(text, onPlaybackStart);
    }
  }

  async _playNextChunk(index, onPlaybackStart) {
    if (this._cancelled || index >= this._queue.length) {
      this._finish();
      return;
    }

    try {
      const audioUrl = await this._callElevenLabs(this._queue[index]);
      if (this._cancelled) return;

      await this._playAudio(audioUrl, index === 0 ? onPlaybackStart : null);

      // Small pause between chunks for breath
      if (index < this._queue.length - 1 && !this._cancelled) {
        await new Promise(r => setTimeout(r, 200));
      }

      await this._playNextChunk(index + 1);
    } catch (err) {
      console.warn('[JARVIS Voice] Chunk error:', err.message);
      // Try next chunk on error
      if (!this._cancelled) await this._playNextChunk(index + 1);
    }
  }

  _playAudio(url, onStart) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.playbackRate = this.rate;
      this._currentAudio = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Audio playback error'));
      };

      audio.play().catch(reject);
    });
  }

  // ═══════════════════════════════════════════════
  // BROWSER FALLBACK (if ElevenLabs fails)
  // ═══════════════════════════════════════════════

  _browserFallback(text, onPlaybackStart) {
    const clean = this._cleanText(text).substring(0, 1000);
    const utter = new SpeechSynthesisUtterance(clean);
    if (this.browserVoice) utter.voice = this.browserVoice;
    utter.rate = 0.92;
    utter.pitch = 0.95;
    utter.onstart = () => {
      if (onPlaybackStart) onPlaybackStart();
    };
    utter.onend = () => this._finish();
    utter.onerror = () => this._finish();
    this.synth.speak(utter);
  }

  // ═══════════════════════════════════════════════
  // CONTROL
  // ═══════════════════════════════════════════════

  _finish() {
    this.isSpeaking = false;
    this._queue = [];
    if (this.onSpeakEnd) this.onSpeakEnd();
  }

  stop() {
    this._cancelled = true;
    this.isSpeaking = false;
    this._queue = [];
    if (this._currentAudio) {
      this._currentAudio.pause();
      this._currentAudio = null;
    }
    this.synth.cancel();
  }
}

window.JarvisVoiceEngine = JarvisVoiceEngine;
