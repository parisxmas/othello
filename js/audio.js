// Audio System using Web Audio API
export class AudioManager {
    constructor() {
        this.context = null;
        this.enabled = true;
        this.masterGain = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.context.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    // Place disc sound - satisfying "thunk"
    playPlace() {
        if (!this.enabled || !this.context) return;
        
        const now = this.context.currentTime;
        
        // Main thunk
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.15);
        
        // Click layer
        const click = this.context.createOscillator();
        const clickGain = this.context.createGain();
        
        click.type = 'square';
        click.frequency.setValueAtTime(1200, now);
        click.frequency.exponentialRampToValueAtTime(200, now + 0.02);
        
        clickGain.gain.setValueAtTime(0.15, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        
        click.connect(clickGain);
        clickGain.connect(this.masterGain);
        
        click.start(now);
        click.stop(now + 0.03);
    }

    // Flip disc sound - whoosh with a pop
    playFlip(delay = 0) {
        if (!this.enabled || !this.context) return;
        
        const now = this.context.currentTime + delay;
        
        // Whoosh noise
        const bufferSize = this.context.sampleRate * 0.08;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        
        const noise = this.context.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = this.context.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 2000;
        noiseFilter.Q.value = 1;
        
        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        noise.start(now);
        
        // Pop at the end
        const pop = this.context.createOscillator();
        const popGain = this.context.createGain();
        
        pop.type = 'sine';
        pop.frequency.setValueAtTime(400, now + 0.04);
        pop.frequency.exponentialRampToValueAtTime(150, now + 0.08);
        
        popGain.gain.setValueAtTime(0, now);
        popGain.gain.setValueAtTime(0.2, now + 0.04);
        popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        pop.connect(popGain);
        popGain.connect(this.masterGain);
        
        pop.start(now + 0.04);
        pop.stop(now + 0.1);
    }

    // Invalid move sound - soft buzz
    playInvalid() {
        if (!this.enabled || !this.context) return;
        
        const now = this.context.currentTime;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.setValueAtTime(0.1, now + 0.05);
        gain.gain.setValueAtTime(0, now + 0.06);
        gain.gain.setValueAtTime(0.1, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Win sound - triumphant fanfare
    playWin() {
        if (!this.enabled || !this.context) return;
        
        const now = this.context.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((freq, i) => {
            const delay = i * 0.15;
            
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + delay);
            
            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(0.3, now + delay + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now + delay);
            osc.stop(now + delay + 0.5);
            
            // Harmony
            const osc2 = this.context.createOscillator();
            const gain2 = this.context.createGain();
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 1.5, now + delay);
            
            gain2.gain.setValueAtTime(0, now + delay);
            gain2.gain.linearRampToValueAtTime(0.15, now + delay + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);
            
            osc2.connect(gain2);
            gain2.connect(this.masterGain);
            
            osc2.start(now + delay);
            osc2.stop(now + delay + 0.4);
        });
    }

    // Lose sound - descending tones
    playLose() {
        if (!this.enabled || !this.context) return;
        
        const now = this.context.currentTime;
        const notes = [392, 349.23, 293.66, 261.63]; // G4, F4, D4, C4
        
        notes.forEach((freq, i) => {
            const delay = i * 0.2;
            
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);
            
            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.3);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now + delay);
            osc.stop(now + delay + 0.3);
        });
    }

    // Tie sound - neutral chord
    playTie() {
        if (!this.enabled || !this.context) return;
        
        const now = this.context.currentTime;
        const notes = [349.23, 440, 523.25]; // F4, A4, C5 (F major)
        
        notes.forEach((freq) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.8);
        });
    }

    // Hover sound - soft click
    playHover() {
        if (!this.enabled || !this.context) return;
        
        const now = this.context.currentTime;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.05);
    }

    // Button click
    playClick() {
        if (!this.enabled || !this.context) return;
        
        const now = this.context.currentTime;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.08);
    }

    // New game sound
    playNewGame() {
        if (!this.enabled || !this.context) return;
        
        const now = this.context.currentTime;
        
        // Sweep up
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.35);
        
        // Chime at the end
        setTimeout(() => {
            if (!this.enabled || !this.context) return;
            const chimeNow = this.context.currentTime;
            
            const chime = this.context.createOscillator();
            const chimeGain = this.context.createGain();
            
            chime.type = 'triangle';
            chime.frequency.setValueAtTime(1046.50, chimeNow);
            
            chimeGain.gain.setValueAtTime(0.2, chimeNow);
            chimeGain.gain.exponentialRampToValueAtTime(0.01, chimeNow + 0.4);
            
            chime.connect(chimeGain);
            chimeGain.connect(this.masterGain);
            
            chime.start(chimeNow);
            chime.stop(chimeNow + 0.4);
        }, 250);
    }
}

