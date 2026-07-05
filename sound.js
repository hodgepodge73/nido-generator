// sound.js - Web Audio API Sound Effects Synthesizer for NeeDoh Lab

class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (this.ctx) return;
        // Create audio context on first user interaction due to browser autoplay policies
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    toggle(force) {
        this.enabled = force !== undefined ? force : !this.enabled;
        return this.enabled;
    }

    // Helper to generate a short burst of noise
    createNoiseNode(duration, cutoffStart, cutoffEnd) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fill buffer with random white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter to sculpt noise
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(cutoffStart, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(cutoffEnd, this.ctx.currentTime + duration);
        filter.Q.value = 3.0;

        noise.connect(filter);
        return { source: noise, filter: filter };
    }

    // Play a squishing sound tailored to the filling type
    playSquish(fillingType) {
        this.init();
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const duration = 0.25;

        // Main sub-bass hum for rubbery deformation
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'triangle';
        
        // Pitch sweeps down to simulate compression
        let startFreq = 150;
        let endFreq = 70;
        let volume = 0.4;
        
        if (fillingType === 'maltose') {
            startFreq = 120;
            endFreq = 50;
            volume = 0.3; // Deeper, slower feeling
        } else if (fillingType === 'beads') {
            startFreq = 180;
            endFreq = 90;
            volume = 0.2;
            this.playBeadCrunches(duration);
        } else if (fillingType === 'gel') {
            startFreq = 200;
            endFreq = 80;
            volume = 0.25;
            this.playGelSquelch(duration);
        } else if (fillingType === 'shimmer') {
            startFreq = 160;
            endFreq = 75;
            volume = 0.35;
        }

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        // Lowpass filter to muffle the sound (rubber casing)
        const casingFilter = this.ctx.createBiquadFilter();
        casingFilter.type = 'lowpass';
        casingFilter.frequency.setValueAtTime(400, now);
        casingFilter.frequency.linearRampToValueAtTime(200, now + duration);

        osc.connect(casingFilter);
        casingFilter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);

        // Rubbery friction noise overlay
        const noiseDetails = this.createNoiseNode(duration, 400, 150);
        if (noiseDetails) {
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.01, now);
            noiseGain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.04);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            noiseDetails.filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noiseDetails.source.start(now);
            noiseDetails.source.stop(now + duration);
        }
    }

    // Play a release sound returning to normal
    playRelease(fillingType) {
        this.init();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = fillingType === 'maltose' ? 0.6 : 0.18; // Maltose expands back much slower

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'triangle';
        let startFreq = 65;
        let endFreq = 120;
        let volume = 0.25;

        if (fillingType === 'maltose') {
            startFreq = 50;
            endFreq = 95;
            volume = 0.15; // Slow, lazy expansion hum
        } else if (fillingType === 'beads') {
            startFreq = 80;
            endFreq = 150;
            volume = 0.15;
            this.playBeadCrunches(duration * 0.5);
        }

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        const casingFilter = this.ctx.createBiquadFilter();
        casingFilter.type = 'lowpass';
        casingFilter.frequency.setValueAtTime(300, now);

        osc.connect(casingFilter);
        casingFilter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Synthesize rapid crackles/pops for water beads
    playBeadCrunches(totalDuration) {
        const now = this.ctx.currentTime;
        const numBeads = Math.floor(Math.random() * 6) + 6; // 6 to 11 crunches

        for (let i = 0; i < numBeads; i++) {
            const delay = Math.random() * totalDuration;
            const crunchTime = now + delay;
            
            // Single crunch unit
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            const pitch = 500 + Math.random() * 800; // high frequency click
            osc.frequency.setValueAtTime(pitch, crunchTime);
            osc.frequency.exponentialRampToValueAtTime(100, crunchTime + 0.015); // ultra-fast drop

            filter.type = 'highpass';
            filter.frequency.setValueAtTime(800, crunchTime);

            gain.gain.setValueAtTime(0.001, crunchTime);
            gain.gain.linearRampToValueAtTime(0.04, crunchTime + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.001, crunchTime + 0.012);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(crunchTime);
            osc.stop(crunchTime + 0.015);
        }
    }

    // Synthesize wet squelching sound for glitter gel
    playGelSquelch(duration) {
        const now = this.ctx.currentTime;
        
        // Web audio LFO to modulate bandpass filter to create "squishy" wet bubbles
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const noise = this.createNoiseNode(duration, 200, 100);

        if (!noise) return;

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(14, now); // 14 Hz modulation speed
        
        lfoGain.gain.setValueAtTime(250, now); // sweep amplitude (Hz)
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.Q.value = 5.0;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.08, now + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        // Connect LFO -> Filter frequency parameter
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        // Re-route noise source through modulating filter
        noise.source.disconnect();
        noise.source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        lfo.start(now);
        noise.source.start(now);
        
        lfo.stop(now + duration);
        noise.source.stop(now + duration);
    }
}

export const sound = new SoundManager();
