/**
 * Paytm Soundbox Audio Synthesizer
 * Uses Web Audio API to produce the signature dual-frequency Paytm chime
 * Followed by Hindi/Hinglish speech synthesis.
 */
class PaytmSoundbox {
  constructor() {
    this.audioCtx = null;
    this.isSpeaking = false;
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Play the authentic Paytm dual-frequency chime
  playChime() {
    return new Promise((resolve) => {
      this.initAudio();
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Tone 1: High tone (880 Hz - A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Tone 2: Warm confirmation tone (1174.66 Hz - D6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);

      setTimeout(() => {
        resolve();
      }, 450);
    });
  }

  // Speak aloud the notification text
  speak(text) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported in this browser.');
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Natural Indian pace
      utterance.pitch = 1.05;

      // Find Hindi/Indian English voice if available
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }

      const hardwareEl = document.getElementById('soundboxHardware');
      if (hardwareEl) hardwareEl.classList.add('speaking');

      utterance.onend = () => {
        if (hardwareEl) hardwareEl.classList.remove('speaking');
        resolve();
      };

      utterance.onerror = () => {
        if (hardwareEl) hardwareEl.classList.remove('speaking');
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  // Chime + Speech sequence
  async broadcast(speechText) {
    await this.playChime();
    await this.speak(speechText);
  }
}

window.paytmSoundbox = new PaytmSoundbox();
