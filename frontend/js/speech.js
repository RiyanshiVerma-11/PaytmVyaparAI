/**
 * Vernacular Speech Recognition Engine
 * Captures Hindi and Hinglish voice commands from the microphone
 */
class SpeechEngine {
  constructor(onResultCallback, onStateChangeCallback) {
    this.recognition = null;
    this.isListening = false;
    this.onResult = onResultCallback;
    this.onStateChange = onStateChangeCallback;
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser. Fallback to text input.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'hi-IN'; // Recognizes Hindi & Hinglish naturally

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStateChange) this.onStateChange(true);
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (this.onResult) this.onResult(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (this.onStateChange) this.onStateChange(false);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onStateChange) this.onStateChange(false);
    };
  }

  toggle() {
    if (!this.recognition) {
      alert('Microphone speech recognition is not supported in this browser. Please use Chrome/Edge or type your command.');
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }
}

window.SpeechEngine = SpeechEngine;
