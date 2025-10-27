// 4-Oscillator Binaural Beat Engine - With Stereo Width Enhancement
class BinauralBeatEngine {
  constructor() {
    this.audioContext = null;
    
    this.baseOscLeft = null;
    this.harmonicOscLeft = null;
    this.baseOscRight = null;
    this.harmonicOscRight = null;
    
    this.baseGainLeft = null;
    this.harmonicGainLeft = null;
    this.baseGainRight = null;
    this.harmonicGainRight = null;
    
    this.basePannerLeft = null;
    this.harmonicPannerLeft = null;
    this.basePannerRight = null;
    this.harmonicPannerRight = null;
    
    this.masterGain = null;
    this.analyserLeft = null;
    this.analyserRight = null;
    this.isRunning = false;
  }

  initialize() {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 48000
    });
    
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.0;
    
    this.analyserLeft = this.audioContext.createAnalyser();
    this.analyserLeft.fftSize = 8192; // Higher resolution for better frequency accuracy
    this.analyserLeft.smoothingTimeConstant = 0.3;
    
    this.analyserRight = this.audioContext.createAnalyser();
    this.analyserRight.fftSize = 8192;
    this.analyserRight.smoothingTimeConstant = 0.3;
    
    this.masterGain.connect(this.audioContext.destination);
    
    console.log('✅ Engine initialized (8192 FFT for accuracy)');
  }

  // Warm up the audio context to reduce first-use latency
  async warmup() {
    if (!this.audioContext) this.initialize();
    
    console.log('🔥 Warming up audio context for low latency...');
    
    try {
      // Create a silent oscillator to warm up the context
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      
      oscillator.frequency.value = 440;
      gain.gain.value = 0.001; // Very quiet
      
      oscillator.start();
      
      // Wait for warmup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      oscillator.stop();
      
      console.log('✅ Audio context warmed up - ready for instant response!');
      return true;
    } catch (e) {
      console.log('❌ Warmup failed:', e);
      return false;
    }
  }

  async start(baseFreq, harmonicFreq, leftOffset, rightOffset, volume, waveform, isSingleMode, phaseInversions) {
    const startTime = performance.now();
    console.log('⏱️ START called - performance timer started');
    
    this.initialize();
    
    // SAFARI FIX: Resume audio context if suspended (MUST WAIT)
    if (this.audioContext.state === 'suspended') {
      console.log('🔧 Safari: Audio context suspended, resuming...');
      try {
        await this.audioContext.resume();
        console.log('✅ Safari: Audio context resumed successfully');
        console.log(`   Context state: ${this.audioContext.state}`);
      } catch (err) {
        console.error('❌ Safari: Failed to resume audio context:', err);
        return; // Don't start if resume fails
      }
    }
    
    console.log(`🔊 Audio context state: ${this.audioContext.state}`);
    
    // Store waveform type for updates
    this.waveformType = waveform || 'sine';
    
    console.log(`🔊 START called with offsets: LEFT=${leftOffset}, RIGHT=${rightOffset}`);
    
    if (this.isRunning) {
      this.updateAll(baseFreq, harmonicFreq, leftOffset, rightOffset, isSingleMode, phaseInversions);
      const totalTime = performance.now() - startTime;
      console.log(`⏱️ Update completed in ${totalTime.toFixed(2)}ms`);
      return;
    }

    const now = this.audioContext.currentTime;
    
    // Apply binaural offsets to create the beat
    const baseFreqLeft = baseFreq + leftOffset;
    const baseFreqRight = baseFreq + rightOffset;
    const harmonicFreqLeft = harmonicFreq + leftOffset;
    const harmonicFreqRight = harmonicFreq + rightOffset;
    
    // 90-degree phase shift: Calculate separate delays for each frequency
    // Each frequency gets its own quarter-cycle delay for perfect 90° phase shift
    const baseDelay = 0.25 / baseFreqLeft; // 90° phase shift for base frequency
    const harmonicDelay = 0.25 / harmonicFreqLeft; // 90° phase shift for harmonic frequency
    
    const beatFrequency = Math.abs(rightOffset - leftOffset);
    const baseDelayMs = baseDelay * 1000;
    const harmonicDelayMs = harmonicDelay * 1000;
    
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  BINAURAL BEAT MODE (90° Phase Shift)                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Base Left:     ${baseFreqLeft.toFixed(1)} Hz (0ms start)                  ║
║  Base Right:    ${baseFreqRight.toFixed(1)} Hz (${baseDelayMs.toFixed(2)}ms start - 90°)       ║
║  Harmonic Left: ${harmonicFreqLeft.toFixed(1)} Hz (0ms start)              ║
║  Harmonic Right: ${harmonicFreqRight.toFixed(1)} Hz (${harmonicDelayMs.toFixed(2)}ms start - 90°)  ║
║  Beat Frequency: ${beatFrequency.toFixed(1)} Hz                            ║
║  Phase Shift: 90° (quarter cycle)                           ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    
    // ═══════════════════════════════════════════════════════
    // LEFT EAR (100% left pan) - TWO OSCILLATORS
    // ═══════════════════════════════════════════════════════
    
    // Base → Left (with left offset applied)
    this.baseOscLeft = this.audioContext.createOscillator();
    this.baseOscLeft.type = waveform || 'sine';
    this.baseOscLeft.frequency.value = baseFreqLeft;
    
    this.baseGainLeft = this.audioContext.createGain();
    this.baseGainLeft.gain.value = phaseInversions.baseLeft ? -0.5 : 0.5;
    
    this.basePannerLeft = this.audioContext.createStereoPanner();
    this.basePannerLeft.pan.value = -1.0;
    
    this.baseOscLeft.connect(this.baseGainLeft);
    this.baseGainLeft.connect(this.basePannerLeft);
    this.basePannerLeft.connect(this.analyserLeft);
    this.analyserLeft.connect(this.masterGain);
    
    // Harmonic → Left (with left offset applied)
    this.harmonicOscLeft = this.audioContext.createOscillator();
    this.harmonicOscLeft.type = waveform || 'sine';
    this.harmonicOscLeft.frequency.value = harmonicFreqLeft;
    
    this.harmonicGainLeft = this.audioContext.createGain();
    this.harmonicGainLeft.gain.value = phaseInversions.harmonicLeft ? -0.5 : 0.5;
    
    this.harmonicPannerLeft = this.audioContext.createStereoPanner();
    this.harmonicPannerLeft.pan.value = -1.0;
    
    this.harmonicOscLeft.connect(this.harmonicGainLeft);
    this.harmonicGainLeft.connect(this.harmonicPannerLeft);
    this.harmonicPannerLeft.connect(this.analyserLeft);
    
    // ═══════════════════════════════════════════════════════
    // RIGHT EAR (100% right pan) - TWO OSCILLATORS
    // ═══════════════════════════════════════════════════════
    
    // Base → Right (with right offset applied)
    this.baseOscRight = this.audioContext.createOscillator();
    this.baseOscRight.type = waveform || 'sine';
    this.baseOscRight.frequency.value = baseFreqRight;
    
    this.baseGainRight = this.audioContext.createGain();
    this.baseGainRight.gain.value = 0.5;
    
    this.basePannerRight = this.audioContext.createStereoPanner();
    this.basePannerRight.pan.value = 1.0;
    
    this.baseOscRight.connect(this.baseGainRight);
    this.baseGainRight.connect(this.basePannerRight);
    this.basePannerRight.connect(this.analyserRight);
    this.analyserRight.connect(this.masterGain);
    
    // Harmonic → Right (with right offset applied)
    this.harmonicOscRight = this.audioContext.createOscillator();
    this.harmonicOscRight.type = waveform || 'sine';
    this.harmonicOscRight.frequency.value = harmonicFreqRight;
    
    this.harmonicGainRight = this.audioContext.createGain();
    this.harmonicGainRight.gain.value = 0.5;
    
    this.harmonicPannerRight = this.audioContext.createStereoPanner();
    this.harmonicPannerRight.pan.value = 1.0;
    
    this.harmonicOscRight.connect(this.harmonicGainRight);
    this.harmonicGainRight.connect(this.harmonicPannerRight);
    this.harmonicPannerRight.connect(this.analyserRight);
    
    // Start oscillators with frequency-specific 90° phase delays
    // Left ear: both start at 0ms
    // Right ear: each frequency gets its own 90° phase delay
    this.baseOscLeft.start(now);
    this.harmonicOscLeft.start(now);
    this.baseOscRight.start(now + baseDelay);
    this.harmonicOscRight.start(now + harmonicDelay);
    
    // Fast fade in to avoid clicks (30ms)
    console.log(`🔊 Setting volume to: ${volume} (should be 0.0 to 1.0)`);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(volume, now + 0.03);
    
    this.isRunning = true;
    
    const totalTime = performance.now() - startTime;
    console.log('🎵 4 OSCILLATORS STARTED with frequency-specific 90° phase shifts');
    console.log(`   L: Base(${baseFreqLeft.toFixed(1)}Hz) + Harmonic(${harmonicFreqLeft.toFixed(1)}Hz) @ 0ms - hard left`);
    console.log(`   R: Base(${baseFreqRight.toFixed(1)}Hz) @ ${baseDelayMs.toFixed(2)}ms + Harmonic(${harmonicFreqRight.toFixed(1)}Hz) @ ${harmonicDelayMs.toFixed(2)}ms (90°) - hard right`);
    console.log(`   Beat: ${beatFrequency.toFixed(1)}Hz difference`);
    console.log(`⏱️ Audio engine start: ${totalTime.toFixed(2)}ms (+ 30ms fade in = ${(totalTime + 30).toFixed(2)}ms total)`);
    
    // Log when sound actually becomes audible
    setTimeout(() => {
      console.log(`🔊 SOUND ACTUALLY AUDIBLE NOW! (${(totalTime + 35).toFixed(2)}ms)`);
    }, 35); // 35ms to account for fade-in + processing
  }

  stop() {
    if (!this.isRunning) return;

    const stopTime = performance.now();
    console.log('⏱️ STOP called - performance timer started');

    const now = this.audioContext.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 0.05); // Quick 50ms fade out

    setTimeout(() => {
      [this.baseOscLeft, this.harmonicOscLeft, this.baseOscRight, this.harmonicOscRight].forEach(osc => {
        if (osc) { try { osc.stop(); osc.disconnect(); } catch (e) {} }
      });
      
      [this.baseGainLeft, this.harmonicGainLeft, this.baseGainRight, this.harmonicGainRight,
       this.basePannerLeft, this.harmonicPannerLeft, this.basePannerRight, this.harmonicPannerRight].forEach(node => {
        if (node) { try { node.disconnect(); } catch (e) {} }
      });
      
      this.isRunning = false;
      const totalTime = performance.now() - stopTime;
      console.log(`🔇 Stopped (50ms fade + ${totalTime.toFixed(2)}ms processing)`);
      
      // Log when sound actually stops being audible
      setTimeout(() => {
        console.log(`🔇 SOUND ACTUALLY SILENT NOW! (${(totalTime + 55).toFixed(2)}ms)`);
      }, 5); // Additional 5ms after processing
    }, 60); // Wait 60ms for fade out
  }

  // Update frequencies without restarting oscillators (for preview during slider drag)
  updateFrequenciesOnly(baseFreq, harmonicFreq, leftOffset, rightOffset) {
    if (!this.isRunning) return;
    
    // Apply binaural offsets
    const baseFreqLeft = baseFreq + leftOffset;
    const baseFreqRight = baseFreq + rightOffset;
    const harmonicFreqLeft = harmonicFreq + leftOffset;
    const harmonicFreqRight = harmonicFreq + rightOffset;
    
    // Update oscillator frequencies smoothly
    const now = this.audioContext.currentTime;
    if (this.baseOscLeft) this.baseOscLeft.frequency.setValueAtTime(baseFreqLeft, now);
    if (this.baseOscRight) this.baseOscRight.frequency.setValueAtTime(baseFreqRight, now);
    if (this.harmonicOscLeft) this.harmonicOscLeft.frequency.setValueAtTime(harmonicFreqLeft, now);
    if (this.harmonicOscRight) this.harmonicOscRight.frequency.setValueAtTime(harmonicFreqRight, now);
    
    console.log(`👀 PREVIEW: Frequencies updated to ${baseFreq.toFixed(1)}/${harmonicFreq.toFixed(1)} Hz (no restart)`);
  }

  updateAll(baseFreq, harmonicFreq, leftOffset, rightOffset, isSingleMode, phaseInversions) {
    if (!this.isRunning) {
      console.log('⚠️ UPDATE BLOCKED: isRunning = false (audio not playing)');
      return;
    }
    
    console.log('🎵 UPDATE ALLOWED: isRunning = true (audio is playing)');

    const now = this.audioContext.currentTime;
    
    // Store current volume
    const currentVolume = this.masterGain.gain.value;
    
    // Apply binaural offsets
    const baseFreqLeft = baseFreq + leftOffset;
    const baseFreqRight = baseFreq + rightOffset;
    const harmonicFreqLeft = harmonicFreq + leftOffset;
    const harmonicFreqRight = harmonicFreq + rightOffset;
    
    // Calculate separate 90° delays for each frequency
    const baseDelay = 0.25 / baseFreqLeft;
    const harmonicDelay = 0.25 / harmonicFreqLeft;
    const baseDelayMs = baseDelay * 1000;
    const harmonicDelayMs = harmonicDelay * 1000;
    
    const beatFrequency = Math.abs(rightOffset - leftOffset);
    
    console.log(`🔄 UPDATE: Resyncing oscillators (Base: ${baseDelayMs.toFixed(3)}ms, Harmonic: ${harmonicDelayMs.toFixed(3)}ms for 90°)`);
    
    // Instant fade out (10ms) for fast response
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 0.01);
    
    // Stop old oscillators immediately after fade
    setTimeout(() => {
      
      // Stop all oscillators
      [this.baseOscLeft, this.harmonicOscLeft, this.baseOscRight, this.harmonicOscRight].forEach(osc => {
        if (osc) {
          try {
            osc.stop();
            osc.disconnect();
          } catch (e) {}
        }
      });
      
      // Disconnect gain and panner nodes
      [this.baseGainLeft, this.harmonicGainLeft, this.baseGainRight, this.harmonicGainRight,
       this.basePannerLeft, this.harmonicPannerLeft, this.basePannerRight, this.harmonicPannerRight].forEach(node => {
        if (node) {
          try {
            node.disconnect();
          } catch (e) {}
        }
      });
      
      // Restart with new frequency and correct 90° phase delays
      const restartTime = this.audioContext.currentTime;
      const waveform = this.waveformType || 'sine';
      
      // Create new oscillators with correct frequencies
      // LEFT EAR
      this.baseOscLeft = this.audioContext.createOscillator();
      this.baseOscLeft.type = waveform;
      this.baseOscLeft.frequency.value = baseFreqLeft;
      this.baseGainLeft = this.audioContext.createGain();
      this.baseGainLeft.gain.value = phaseInversions.baseLeft ? -0.5 : 0.5;
      this.basePannerLeft = this.audioContext.createStereoPanner();
      this.basePannerLeft.pan.value = -1.0;
      this.baseOscLeft.connect(this.baseGainLeft);
      this.baseGainLeft.connect(this.basePannerLeft);
      this.basePannerLeft.connect(this.analyserLeft);
      this.analyserLeft.connect(this.masterGain);
      
      this.harmonicOscLeft = this.audioContext.createOscillator();
      this.harmonicOscLeft.type = waveform;
      this.harmonicOscLeft.frequency.value = harmonicFreqLeft;
      this.harmonicGainLeft = this.audioContext.createGain();
      this.harmonicGainLeft.gain.value = phaseInversions.harmonicLeft ? -0.5 : 0.5;
      this.harmonicPannerLeft = this.audioContext.createStereoPanner();
      this.harmonicPannerLeft.pan.value = -1.0;
      this.harmonicOscLeft.connect(this.harmonicGainLeft);
      this.harmonicGainLeft.connect(this.harmonicPannerLeft);
      this.harmonicPannerLeft.connect(this.analyserLeft);
      
      // RIGHT EAR
      this.baseOscRight = this.audioContext.createOscillator();
      this.baseOscRight.type = waveform;
      this.baseOscRight.frequency.value = baseFreqRight;
      this.baseGainRight = this.audioContext.createGain();
      this.baseGainRight.gain.value = 0.5;
      this.basePannerRight = this.audioContext.createStereoPanner();
      this.basePannerRight.pan.value = 1.0;
      this.baseOscRight.connect(this.baseGainRight);
      this.baseGainRight.connect(this.basePannerRight);
      this.basePannerRight.connect(this.analyserRight);
      this.analyserRight.connect(this.masterGain);
      
      this.harmonicOscRight = this.audioContext.createOscillator();
      this.harmonicOscRight.type = waveform;
      this.harmonicOscRight.frequency.value = harmonicFreqRight;
      this.harmonicGainRight = this.audioContext.createGain();
      this.harmonicGainRight.gain.value = 0.5;
      this.harmonicPannerRight = this.audioContext.createStereoPanner();
      this.harmonicPannerRight.pan.value = 1.0;
      this.harmonicOscRight.connect(this.harmonicGainRight);
      this.harmonicGainRight.connect(this.harmonicPannerRight);
      this.harmonicPannerRight.connect(this.analyserRight);
      
      // Start with frequency-specific 90° phase relationships
      this.baseOscLeft.start(restartTime);
      this.harmonicOscLeft.start(restartTime);
      this.baseOscRight.start(restartTime + baseDelay);
      this.harmonicOscRight.start(restartTime + harmonicDelay);
      
      // IMPORTANT: Keep isRunning = true so subsequent updates work
      this.isRunning = true;
      
      // Quick fade in (50ms)
      this.masterGain.gain.setTargetAtTime(currentVolume, restartTime, 0.015);
      
      console.log(`✅ ALL 4 OSCILLATORS RECREATED @ ${baseFreqLeft.toFixed(1)}/${baseFreqRight.toFixed(1)}Hz (90° phase locked)`);
      console.log(`🔊 isRunning = ${this.isRunning} (should be true)`);
    }, 15); // Minimal wait for 10ms fade out
  }

  setMasterVolume(volume) {
    if (this.masterGain) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.setTargetAtTime(volume, now, 0.05);
    }
  }

  // Health check for debugging
  getAudioStatus() {
    const status = {
      isRunning: this.isRunning,
      audioContextState: this.audioContext ? this.audioContext.state : 'no context',
      masterGainValue: this.masterGain ? this.masterGain.gain.value : 'no gain',
      oscillatorsExist: {
        baseLeft: !!this.baseOscLeft,
        harmonicLeft: !!this.harmonicOscLeft,
        baseRight: !!this.baseOscRight,
        harmonicRight: !!this.harmonicOscRight
      }
    };
    console.log('🔍 AUDIO STATUS:', status);
    return status;
  }

  getAudioData() {
    if (!this.isRunning || !this.analyserLeft || !this.analyserRight) {
      return null;
    }
    
    const leftTimeData = new Float32Array(this.analyserLeft.fftSize);
    const rightTimeData = new Float32Array(this.analyserRight.fftSize);
    
    this.analyserLeft.getFloatTimeDomainData(leftTimeData);
    this.analyserRight.getFloatTimeDomainData(rightTimeData);
    
    const leftFreqData = new Uint8Array(this.analyserLeft.frequencyBinCount);
    const rightFreqData = new Uint8Array(this.analyserRight.frequencyBinCount);
    
    this.analyserLeft.getByteFrequencyData(leftFreqData);
    this.analyserRight.getByteFrequencyData(rightFreqData);
    
    return {
      leftWaveform: Array.from(leftTimeData),
      rightWaveform: Array.from(rightTimeData),
      leftSpectrum: Array.from(leftFreqData),
      rightSpectrum: Array.from(rightFreqData),
      sampleRate: this.audioContext.sampleRate,
      fftSize: this.analyserLeft.fftSize
    };
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Global
window.binauralBeatEngine = new BinauralBeatEngine();

// Global warmup function for Flutter to call
window.warmupAudioContext = async () => {
  return await window.binauralBeatEngine.warmup();
};

window.startBinauralBeat = function(baseFreq, harmonicFreq, leftOffset, rightOffset, volume, waveform, isSingleMode, phaseInversions) {
  window.binauralBeatEngine.start(baseFreq, harmonicFreq, leftOffset, rightOffset, volume, waveform, isSingleMode, phaseInversions);
};

window.stopBinauralBeat = function() {
  window.binauralBeatEngine.stop();
};

window.updateBinauralAll = function(baseFreq, harmonicFreq, leftOffset, rightOffset, isSingleMode, phaseInversions) {
  window.binauralBeatEngine.updateAll(baseFreq, harmonicFreq, leftOffset, rightOffset, isSingleMode, phaseInversions);
};

window.updateBinauralPreview = function(baseFreq, harmonicFreq, leftOffset, rightOffset) {
  window.binauralBeatEngine.updateFrequenciesOnly(baseFreq, harmonicFreq, leftOffset, rightOffset);
};

window.setBinauralVolume = function(volume) {
  window.binauralBeatEngine.setMasterVolume(volume);
};

window.getRealtimeAudioData = function() {
  return window.binauralBeatEngine.getAudioData();
};

window.resumeAudioContext = function() {
  window.binauralBeatEngine.resume();
};

// Debug function to check audio status
window.checkAudioStatus = function() {
  return window.binauralBeatEngine.getAudioStatus();
};

console.log('╔════════════════════════════════════════════════════╗');
console.log('║  4-Oscillator Engine with Stereo Width            ║');
console.log('║  • Tiny delays prevent phase cancellation         ║');
console.log('║  • 8192 FFT for frequency accuracy                ║');
console.log('║  • Hard panning maintained                        ║');
console.log('║  • Debug: Type checkAudioStatus() in console      ║');
console.log('╚════════════════════════════════════════════════════╝');
