use std::ops::{Deref, DerefMut};
use std::ops::{Index, IndexMut};

pub const SAMPLE_RATE: usize = 44100;
pub const SAMPLE_RATE_F32: f32 = SAMPLE_RATE as f32;
pub const QUANTUM_SIZE: usize = 128;
pub const INV_SAMPLE_RATE: f32 = 1.0 / SAMPLE_RATE as f32;

#[derive(Clone, Copy)]
pub struct AudioBuffer([f32; QUANTUM_SIZE]);

impl Deref for AudioBuffer {
  type Target = [f32; QUANTUM_SIZE];
  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

impl DerefMut for AudioBuffer {
  fn deref_mut(&mut self) -> &mut [f32; QUANTUM_SIZE] {
    &mut self.0
  }
}

impl Default for AudioBuffer {
  fn default() -> AudioBuffer {
    AudioBuffer([0.0f32; QUANTUM_SIZE])
  }
}

#[derive(PartialEq)]
pub struct AudioInput(*const AudioOutput);

impl Default for AudioInput {
  fn default() -> Self {
    AudioInput(std::ptr::null())
  }
}

impl AudioInput {
  pub fn at(&self, sample: usize) -> f32 {
    if self.0 == std::ptr::null() {
      return 0.0;
    }
    unsafe { (*self.0).previous()[sample] }
  }

  pub fn set_ptr(&mut self, ptr: *const AudioOutput) {
    self.0 = ptr;
  }
}

pub enum AudioParamModulationType {
  Multiplicative,
  Additive,
}

pub struct AudioParam {
  modulation_type: AudioParamModulationType,
  target: f32,
  previous: f32,
  target_set_at_quantum: u64,
  pub modulation: AudioInput,
}

impl Default for AudioParam {
  fn default() -> Self {
    AudioParam {
      modulation_type: AudioParamModulationType::Additive,
      target: 0.0,
      previous: 0.0,
      target_set_at_quantum: 0,
      modulation: AudioInput::default(),
    }
  }
}

const PARAMETER_SMOOTHING_TIME: f32 = 44100.0 * 0.01; // samples

impl AudioParam {
  pub fn new(modulation_type: AudioParamModulationType) -> AudioParam {
    AudioParam {
      modulation_type,
      target: 0.0,
      previous: 0.0,
      target_set_at_quantum: 0,
      modulation: AudioInput::default(),
    }
  }

  pub fn set_target(&mut self, target: f32, target_set_at_quantum: u64) {
    let prev = self.at(0, target_set_at_quantum);

    self.previous = prev;
    self.target = target;
    self.target_set_at_quantum = target_set_at_quantum;
  }

  pub fn at(&self, sample: usize, quantum: u64) -> f32 {
    let dq = quantum - self.target_set_at_quantum;
    let ds = dq * 128 + sample as u64;
    let t = ds as f32 / PARAMETER_SMOOTHING_TIME;
    let value = if t > 1.0 {
      self.target
    } else {
      lerp(self.previous, self.target, t)
    };

    match self.modulation_type {
      AudioParamModulationType::Additive => value + self.modulation.at(sample),
      AudioParamModulationType::Multiplicative => value * self.modulation.at(sample),
    }
  }
}

const AUDIO_OUTPUT_NUM_BUFFERS: usize = 2;

pub struct AudioOutput {
  buffers: [AudioBuffer; AUDIO_OUTPUT_NUM_BUFFERS],
  current: usize,
}

impl Index<usize> for AudioOutput {
  type Output = f32;
  fn index(&self, i: usize) -> &f32 {
    &self.buffers[self.current][i]
  }
}

impl IndexMut<usize> for AudioOutput {
  fn index_mut(&mut self, i: usize) -> &mut f32 {
    &mut self.buffers[self.current][i]
  }
}

impl Default for AudioOutput {
  fn default() -> Self {
    AudioOutput {
      buffers: [AudioBuffer::default(); AUDIO_OUTPUT_NUM_BUFFERS],
      current: 0,
    }
  }
}

impl AudioOutput {
  pub fn swap(&mut self) {
    self.current = (self.current + 1) % AUDIO_OUTPUT_NUM_BUFFERS;
  }

  pub fn current(&self) -> &AudioBuffer {
    &self.buffers[self.current]
  }

  pub fn current_mut(&mut self) -> &mut AudioBuffer {
    &mut self.buffers[self.current]
  }

  pub fn previous(&self) -> &AudioBuffer {
    let prev = (self.current + AUDIO_OUTPUT_NUM_BUFFERS - 1) % AUDIO_OUTPUT_NUM_BUFFERS;
    &self.buffers[prev]
  }

  pub fn previous_mut(&mut self) -> &mut AudioBuffer {
    let prev = (self.current + AUDIO_OUTPUT_NUM_BUFFERS - 1) % AUDIO_OUTPUT_NUM_BUFFERS;
    &mut self.buffers[prev]
  }
}

pub fn lerp(start: f32, end: f32, t: f32) -> f32 {
  start + t * (end - start)
}

pub fn exp_curve(x: f32) -> f32 {
  (3.0 + x * (-13.0 + 5.0 * x)) / (3.0 + 2.0 * x)
}

pub struct RingBuffer {
  buffers: [Vec<f32>; 2],
  current: usize,
  length: usize,
  pos: usize,
}

impl RingBuffer {
  pub fn new(length: usize) -> RingBuffer {
    RingBuffer {
      buffers: [vec![0.0; SAMPLE_RATE * 16], vec![0.0; SAMPLE_RATE * 16]],
      current: 0,
      length,
      pos: 0,
    }
  }

  pub fn rms(&self) -> f32 {
    let mut value = 0.0;

    for i in 0..self.length {
      value += self.buffers[self.current][i] * self.buffers[self.current][i];
    }

    value /= self.length as f32;
    value = f32::sqrt(value);

    value
  }

  pub fn resize(&mut self, mut len: usize) {
    if len == 0 {
      len = 1
    }
    if self.length == len {
      return;
    }

    let ratio = self.length as f32 / len as f32;

    let dst = if self.current == 0 {
      self.buffers[1].as_mut_ptr()
    } else {
      self.buffers[0].as_mut_ptr()
    };

    let mut pos = 0.0;
    for sample in 0..len {
      let ipos = pos as u32;
      let src_index = ipos as usize;
      let t = pos - ipos as f32;

      let a = self.at_usize(src_index + self.pos);
      let b = self.at_usize(src_index + 1 + self.pos);

      unsafe {
        *dst.add(sample) = lerp(a, b, t);
      }

      pos += ratio;
    }

    self.current = if self.current == 0 { 1 } else { 0 };

    self.pos = 0;
    self.length = len;
  }

  pub fn at_usize(&self, mut index: usize) -> f32 {
    index %= self.length;
    self.buffers[self.current][index as usize]
  }

  pub fn head(&self) -> f32 {
    self.buffers[self.current][self.pos]
  }

  pub fn write(&mut self, value: f32) {
    self.buffers[self.current][self.pos] = value;
    self.pos = (self.pos + 1) % self.length;
  }
}

pub struct FeedbackCombFilter {
  buffer: RingBuffer,
  pub gain: f32,
}

impl FeedbackCombFilter {
  pub fn new(len: usize, gain: f32) -> FeedbackCombFilter {
    FeedbackCombFilter {
      buffer: RingBuffer::new(len),
      gain,
    }
  }

  pub fn set_delay(&mut self, length: usize) {
    self.buffer.resize(length)
  }

  pub fn step(&mut self, input: f32) -> f32 {
    let value = self.buffer.head() * self.gain + input;
    self.buffer.write(value);
    value
  }
}

pub struct AllPassFilter {
  filter_buffer: RingBuffer,
  input_buffer: RingBuffer,
  pub gain: f32,
}

impl AllPassFilter {
  pub fn new(len: usize, gain: f32) -> AllPassFilter {
    AllPassFilter {
      filter_buffer: RingBuffer::new(len),
      input_buffer: RingBuffer::new(len),
      gain,
    }
  }

  pub fn step(&mut self, input: f32) -> f32 {
    let value =
      -self.gain * input + self.input_buffer.head() + self.gain * self.filter_buffer.head();
    self.filter_buffer.write(value);
    self.input_buffer.write(input);

    value
  }
}

#[derive(PartialEq)]
pub enum Edge {
  High,
  Low,
  Rose,
  Fell,
}

impl Edge {
  pub fn is_edge(&self) -> bool {
    self == &Edge::Rose || self == &Edge::Fell
  }

  pub fn is_high(&self) -> bool {
    self == &Edge::Rose || self == &Edge::High
  }

  pub fn is_low(&self) -> bool {
    self == &Edge::Fell || self == &Edge::Low
  }
}

pub struct EdgeDetector {
  threshold: f32,
  previous_sample: f32,
}

impl Default for EdgeDetector {
  fn default() -> Self {
    EdgeDetector {
      threshold: 0.5,
      previous_sample: 0.0,
    }
  }
}

impl EdgeDetector {
  pub fn new(threshold: f32) -> EdgeDetector {
    EdgeDetector {
      threshold,
      previous_sample: 0.0,
    }
  }

  pub fn step(&mut self, sample: f32) -> Edge {
    let edge = if self.previous_sample < self.threshold && sample > self.threshold {
      Edge::Rose
    } else if self.previous_sample > self.threshold && sample < self.threshold {
      Edge::Fell
    } else {
      if sample < self.threshold {
        Edge::Low
      } else {
        Edge::High
      }
    };
    self.previous_sample = sample;

    edge
  }
}

fn tension_interp(start: f32, end: f32, tension: f32, t: f32) -> f32 {
  start
    + (end - start)
      * if tension > 0.0 {
        let exp = 1.0 + tension * 2.0;
        1.0 - f32::powf(1.0 - f32::powf(t.clamp(0.0, 1.0), exp), 1.0 / exp)
      } else {
        let exp = 1.0 - tension * 2.0;
        f32::powf(1.0 - f32::powf(1.0 - t.clamp(0.0, 1.0), exp), 1.0 / exp)
      }
}

pub struct ADSRCurve {
  edge_detector: EdgeDetector,
  level: f32,
  release_level: f32,
  time: f32,

  pub attack_time: f32,
  pub attack_tension: f32,
  pub decay_time: f32,
  pub decay_tension: f32,
  pub sustain_level: f32,
  pub release_time: f32,
  pub release_tension: f32,
}

impl Default for ADSRCurve {
  fn default() -> Self {
    ADSRCurve {
      edge_detector: EdgeDetector::default(),
      level: 0.0,
      release_level: 0.0,
      time: 0.0,
      attack_time: 0.0,
      attack_tension: 0.0,
      decay_time: 0.0,
      decay_tension: 0.0,
      sustain_level: 0.0,
      release_time: 0.0,
      release_tension: 0.0,
    }
  }
}

impl ADSRCurve {
  pub fn step(&mut self, sample: f32) -> f32 {
    let edge = self.edge_detector.step(sample);

    if edge.is_edge() {
      self.time = 0.0;
      self.release_level = self.level;
    }

    self.level = 'l: {
      if edge.is_high() {
        let attack_time = self.attack_time * SAMPLE_RATE_F32;

        if self.time < attack_time {
          break 'l tension_interp(
            self.release_level,
            1.0,
            self.attack_tension,
            self.time / attack_time,
          );
        }

        let decay_time = self.decay_time * SAMPLE_RATE_F32;

        if self.time - attack_time < decay_time {
          break 'l tension_interp(
            1.0,
            self.sustain_level,
            self.decay_tension,
            (self.time - attack_time) / decay_time,
          );
        }

        self.sustain_level
      } else {
        let release_time = self.release_time * SAMPLE_RATE_F32;

        if self.time < release_time {
          break 'l tension_interp(
            self.release_level,
            0.0,
            self.release_tension,
            self.time / release_time,
          );
        }

        0.0
      }
    };

    self.time = self.time + 1.0;

    self.level
  }
}
