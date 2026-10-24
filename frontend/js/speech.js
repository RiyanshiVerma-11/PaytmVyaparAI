/**
 * Vernacular Speech Recognition Engine
 * Captures Hindi and Hinglish voice commands from the microphone
 */
class SpeechEngine {
  constructor(onResultCallback, onStateChangeCallback, onErrorCallback) {
    this.recognition = null;
    this.isListening = false;
    this.onResult = onResultCallback;
    this.onStateChange = onStateChangeCallback;
    this.onError = onErrorCallback;
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser. Fallback to text input.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'hi-IN'; // Recognizes Hindi, Hinglish, & English seamlessly

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStateChange) this.onStateChange(true);
      };

      this.recognition.onresult = (event) => {
        if (event.results && event.results.length > 0 && event.results[0].length > 0) {
          const transcript = event.results[0][0].transcript;
          console.log('🎤 Speech Recognized:', transcript);
          if (this.onResult) this.onResult(transcript);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);

        if (event.error === 'aborted') {
          return;
        }

        let msg = '';
        if (event.error === 'not-allowed') {
          msg = window.location.protocol === 'file:'
            ? 'Microphone blocked: Chrome restricts speech on file:// URLs. Open http://localhost:8000 or allow mic permissions in browser address bar.'
            : 'Microphone permission blocked. Kripya browser address bar me lock icon click karke microphone allow karein.';
        } else if (event.error === 'no-speech') {
          msg = 'Aawaz sunai nahi di. Kripya mic ke paas aakar saaf bolein (e.g. "Prachi, ₹500 aata udhaar darj karein") ya search bar me type karein.';
        } else if (event.error === 'network') {
          msg = 'Speech recognition network error. Kripya internet connection check karein ya direct type karein.';
        } else {
          msg = `Voice error (${event.error}). Kripya dobara koshish karein ya type karein.`;
        }

        if (this.onError) {
          this.onError(msg, event.error);
        } else if (typeof window.showNotification === 'function') {
          window.showNotification(`🎙️ ${msg}`, 'error');
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
      };
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err);
    }
  }

  toggle() {
    if (window.location.protocol === 'file:') {
      const msg = 'Web Speech requires running via http://localhost:8000 (Chrome blocks mic on file://). Please open http://localhost:8000 or type your command in the search bar.';
      if (this.onError) this.onError(msg, 'not-allowed');
      else if (typeof window.showNotification === 'function') window.showNotification(`🎙️ ${msg}`, 'error');
      else alert(msg);
      return;
    }

    if (!this.recognition) {
      const msg = 'Microphone speech recognition is not supported in this browser. Please use Google Chrome or type your command in the search bar.';
      if (this.onError) this.onError(msg, 'not-supported');
      else if (typeof window.showNotification === 'function') window.showNotification(`🎙️ ${msg}`, 'error');
      else alert(msg);
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn('Error starting recognition:', e);
        if (this.onError) {
          this.onError('Microphone start error. Kripya dobara click karein.', 'start-error');
        }
      }
    }
  }
}

window.SpeechEngine = SpeechEngine;
