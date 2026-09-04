// audioFilter.js
// High-performance real-time PCM Audio Equalizer and Voice Filter stream for Node.js
const { Transform } = require('stream');

/**
 * Calculates Biquad Filter Coefficients for 48000Hz PCM Audio
 * Based on Robert Bristow-Johnson's Audio EQ Cookbook
 */
function getLowShelfCoeffs(f0, dbGain, q = 0.707, fs = 48000) {
  const A = Math.pow(10, dbGain / 40);
  const w0 = 2 * Math.PI * f0 / fs;
  const alpha = Math.sin(w0) / (2 * q);
  const cosW0 = Math.cos(w0);
  const beta = 2 * Math.sqrt(A) * alpha;

  const b0 = A * ((A + 1) - (A - 1) * cosW0 + beta);
  const b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
  const b2 = A * ((A + 1) - (A - 1) * cosW0 - beta);
  const a0 = (A + 1) + (A - 1) * cosW0 + beta;
  const a1 = -2 * ((A - 1) + (A + 1) * cosW0);
  const a2 = (A + 1) - (A - 1) * cosW0 - beta;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0
  };
}

function getHighShelfCoeffs(f0, dbGain, q = 0.707, fs = 48000) {
  const A = Math.pow(10, dbGain / 40);
  const w0 = 2 * Math.PI * f0 / fs;
  const alpha = Math.sin(w0) / (2 * q);
  const cosW0 = Math.cos(w0);
  const beta = 2 * Math.sqrt(A) * alpha;

  const b0 = A * ((A + 1) + (A - 1) * cosW0 + beta);
  const b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
  const b2 = A * ((A + 1) - (A - 1) * cosW0 - beta);
  const a0 = (A + 1) - (A - 1) * cosW0 + beta;
  const a1 = 2 * ((A - 1) - (A + 1) * cosW0);
  const a2 = (A + 1) - (A - 1) * cosW0 - beta;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0
  };
}

/**
 * Fast soft-clipping saturation to prevent harsh digital clipping
 */
function softClip(sample) {
  const maxVal = 32767;
  const threshold = 22000;

  if (sample > threshold) {
    const diff = sample - threshold;
    return Math.round(threshold + (maxVal - threshold) * Math.tanh(diff / (maxVal - threshold)));
  } else if (sample < -threshold) {
    const diff = sample + threshold;
    return Math.round(-threshold + (-maxVal + threshold) * Math.tanh(diff / (-maxVal + threshold)));
  }

  return Math.round(sample);
}

class AudioFilterStream extends Transform {
  /**
   * @param {string} preset 'none' | 'big_voice' | 'loudness' | 'deep_studio' | 'crystal'
   */
  constructor(preset = 'none') {
    super();
    this.preset = preset;

    // Default parameters
    this.gain = 1.0;
    this.filterCoeffs = null;

    // Filter memory state per channel: [Left Channel (0), Right Channel (1)]
    this.x1 = [0, 0];
    this.x2 = [0, 0];
    this.y1 = [0, 0];
    this.y2 = [0, 0];

    // Internal buffer to align output into exact 20ms PCM audio frames (3840 bytes)
    this._remainder = Buffer.alloc(0);

    this.initPreset();
  }

  initPreset() {
    switch (this.preset) {
      case 'big_voice':
        // Big Voice & Bass Boost: +9dB low shelf at 220Hz, 1.6x overall gain
        this.filterCoeffs = getLowShelfCoeffs(220, 9, 0.8);
        this.gain = 1.6;
        break;
      case 'loudness':
        // Extreme Loudness & Gain: 2.0x volume boost with soft limiting
        this.filterCoeffs = null;
        this.gain = 2.0;
        break;
      case 'deep_studio':
        // Deep Studio EQ: +6dB low shelf at 180Hz, 1.4x gain
        this.filterCoeffs = getLowShelfCoeffs(180, 6, 0.75);
        this.gain = 1.4;
        break;
      case 'crystal':
        // Crystal Clarity EQ: +7dB high shelf at 3200Hz, 1.3x gain
        this.filterCoeffs = getHighShelfCoeffs(3200, 7, 0.8);
        this.gain = 1.3;
        break;
      case 'none':
      default:
        this.filterCoeffs = null;
        this.gain = 1.0;
        break;
    }
  }

  _transform(chunk, encoding, callback) {
    if (this.preset === 'none' && this.gain === 1.0) {
      this.push(chunk);
      return callback();
    }

    // Accumulate incoming data
    const buffer = this._remainder.length > 0 ? Buffer.concat([this._remainder, chunk]) : chunk;

    // 20ms of 48kHz stereo 16-bit PCM = 48000 * 2 channels * 2 bytes * 0.02s = 3840 bytes
    const FRAME_SIZE = 3840;
    const totalFrames = Math.floor(buffer.length / FRAME_SIZE);

    if (totalFrames === 0) {
      this._remainder = buffer;
      return callback();
    }

    const processLength = totalFrames * FRAME_SIZE;
    this._remainder = buffer.length > processLength ? buffer.slice(processLength) : Buffer.alloc(0);

    const outBuffer = Buffer.allocUnsafe(processLength);
    const coeffs = this.filterCoeffs;
    const gain = this.gain;

    for (let offset = 0; offset < processLength; offset += 4) {
      for (let ch = 0; ch < 2; ch++) {
        const sampleOffset = offset + (ch * 2);
        const x = buffer.readInt16LE(sampleOffset);

        let y = x;
        if (coeffs) {
          y = (coeffs.b0 * x) +
              (coeffs.b1 * this.x1[ch]) +
              (coeffs.b2 * this.x2[ch]) -
              (coeffs.a1 * this.y1[ch]) -
              (coeffs.a2 * this.y2[ch]);

          this.x2[ch] = this.x1[ch];
          this.x1[ch] = x;
          this.y2[ch] = this.y1[ch];
          this.y1[ch] = y;
        }

        const processed = softClip(y * gain);
        outBuffer.writeInt16LE(processed, sampleOffset);
      }
    }

    this.push(outBuffer);
    callback();
  }

  _flush(callback) {
    if (this._remainder.length >= 4) {
      const validBytes = Math.floor(this._remainder.length / 4) * 4;
      const outBuffer = Buffer.allocUnsafe(validBytes);
      const coeffs = this.filterCoeffs;
      const gain = this.gain;

      for (let offset = 0; offset < validBytes; offset += 4) {
        for (let ch = 0; ch < 2; ch++) {
          const sampleOffset = offset + (ch * 2);
          const x = this._remainder.readInt16LE(sampleOffset);

          let y = x;
          if (coeffs) {
            y = (coeffs.b0 * x) +
                (coeffs.b1 * this.x1[ch]) +
                (coeffs.b2 * this.x2[ch]) -
                (coeffs.a1 * this.y1[ch]) -
                (coeffs.a2 * this.y2[ch]);

            this.x2[ch] = this.x1[ch];
            this.x1[ch] = x;
            this.y2[ch] = this.y1[ch];
            this.y1[ch] = y;
          }

          const processed = softClip(y * gain);
          outBuffer.writeInt16LE(processed, sampleOffset);
        }
      }
      this.push(outBuffer);
    }
    this._remainder = Buffer.alloc(0);
    callback();
  }
}

/**
 * Creates an AudioFilterStream for PCM audio streams
 * @param {string} preset - 'none' | 'big_voice' | 'loudness' | 'deep_studio' | 'crystal'
 */
function createAudioFilterStream(preset = 'none') {
  return new AudioFilterStream(preset);
}

const FILTER_CHOICES = [
  { name: 'none', message: '🔊 Normal (Original Voice - بدون فيلتر)' },
  { name: 'big_voice', message: '📻 Equalizer: Big Voice & Bass Boost (صوت ضخم و تضخيم البيس)' },
  { name: 'loudness', message: '📢 Equalizer: Extreme Loudness & Gain (تضخيم ورفع الصوت)' },
  { name: 'deep_studio', message: '🎙️ Equalizer: Deep Studio (صوت استوديو عميق ومجسم)' },
  { name: 'crystal', message: '⚡ Equalizer: Crystal Clarity (توضيح وتنعيم الصوت)' }
];

module.exports = {
  createAudioFilterStream,
  AudioFilterStream,
  FILTER_CHOICES
};
