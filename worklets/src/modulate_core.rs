use std::ops::{Deref, DerefMut};
use std::ops::{Index, IndexMut};

pub const SAMPLE_RATE: usize = 44100;
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
  pub value: f32,
  pub modulation: AudioInput,
}

impl Default for AudioParam {
  fn default() -> Self {
    AudioParam {
      modulation_type: AudioParamModulationType::Additive,
      value: 0.0,
      modulation: AudioInput::default(),
    }
  }
}

impl AudioParam {
  pub fn new(modulation_type: AudioParamModulationType) -> AudioParam {
    AudioParam {
      modulation_type,
      value: 0.0,
      modulation: AudioInput::default(),
    }
  }

  pub fn at(&self, sample: usize) -> f32 {
    match self.modulation_type {
      AudioParamModulationType::Additive => self.value + self.modulation.at(sample),
      AudioParamModulationType::Multiplicative => self.value * self.modulation.at(sample),
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
  buffer: Vec<f32>,
  alt_buffer: Vec<f32>,
  length: usize,
  pos: usize,
}

impl RingBuffer {
  pub fn new(length: usize) -> RingBuffer {
    RingBuffer {
      buffer: vec![0.0; SAMPLE_RATE * 16],
      alt_buffer: vec![0.0; SAMPLE_RATE * 16],
      length,
      pos: 0,
    }
  }

  pub fn rms(&self) -> f32 {
    let mut value = 0.0;

    for i in 0..self.length {
      value += self.buffer[i] * self.buffer[i];
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

    for sample in 0..len {
      let pos = ratio * sample as f32;
      let src_index = pos as i32;
      let t = pos - src_index as f32;
      let a = self.at(src_index + self.pos as i32);
      let b = self.at(src_index + 1 + self.pos as i32);
      self.alt_buffer[sample] = lerp(a, b, t);
    }

    std::mem::swap(&mut self.buffer, &mut self.alt_buffer);

    self.pos = 0;
    self.length = len;
  }

  pub fn at(&self, mut index: i32) -> f32 {
    if index < 0 {
      index += self.length as i32;
    }
    index %= self.length as i32;
    self.buffer[index as usize]
  }

  pub fn head(&self) -> f32 {
    self.buffer[self.pos]
  }

  pub fn write(&mut self, value: f32) {
    self.buffer[self.pos] = value;
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
