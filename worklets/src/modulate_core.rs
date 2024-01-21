use std::arch::wasm32::{
  f32x4, f32x4_add, f32x4_max, f32x4_min, f32x4_mul, f32x4_sub, v128, v128_load, v128_store,
};
use std::ops::{Deref, DerefMut};
use std::ops::{Index, IndexMut};
use std::ptr::eq;
use wasm_bindgen::prelude::*;

use crate::windowed_sinc::windowed_sinc_sample;

pub const SAMPLE_RATE: usize = 44100;
pub const SAMPLE_RATE_F32: f32 = SAMPLE_RATE as f32;
pub const QUANTUM_SIZE: usize = 128;
pub const INV_SAMPLE_RATE: f32 = 1.0 / SAMPLE_RATE as f32;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = console)]
  pub fn log(s: &str);
}

#[derive(Clone, Copy)]
pub struct AudioBuffer(pub [f32; QUANTUM_SIZE]);

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
pub struct AudioInput(pub *const AudioOutput);

impl Default for AudioInput {
  fn default() -> Self {
    AudioInput(EMPTY_AUDIO_OUTPUT)
  }
}

impl AudioInput {
  pub fn at(&self, sample: usize) -> f32 {
    unsafe { (*self.0).read_buffer()[sample] }
  }

  pub fn set_ptr(&mut self, ptr: *const AudioOutput) {
    self.0 = ptr;
  }

  pub fn reset_ptr(&mut self) {
    self.0 = EMPTY_AUDIO_OUTPUT;
  }

  pub fn is_connected(&self) -> bool {
    !eq(self.0, EMPTY_AUDIO_OUTPUT)
  }
}

const EMPTY_AUDIO_OUTPUT: &AudioOutput = &(AudioOutput {
  buffers: [AudioBuffer([0.0; QUANTUM_SIZE]); AUDIO_OUTPUT_NUM_BUFFERS],
  current: 0,
});

pub enum AudioParamModulationType {
  Multiplicative,
  Additive,
}

pub struct AudioParam {
  modulation_type: AudioParamModulationType,
  target: f32,
  previous: f32,
  buffer: [f32; QUANTUM_SIZE],
  modulated_buffer: [f32; QUANTUM_SIZE],
  target_set_at_quantum: u64,
  pub modulation: AudioInput,
}

impl Default for AudioParam {
  fn default() -> Self {
    AudioParam {
      modulation_type: AudioParamModulationType::Additive,
      target: 0.0,
      previous: 0.0,
      buffer: [0.0; QUANTUM_SIZE],
      modulated_buffer: [0.0; QUANTUM_SIZE],
      target_set_at_quantum: 0,
      modulation: AudioInput::default(),
    }
  }
}

const INV_PARAMETER_SMOOTHING_TIME: f32 = 1.0 / (SAMPLE_RATE_F32 * 0.01/* samples */);

impl AudioParam {
  pub fn new(modulation_type: AudioParamModulationType) -> AudioParam {
    AudioParam {
      modulation_type,
      target: 0.0,
      previous: 0.0,
      buffer: [0.0; QUANTUM_SIZE],
      modulated_buffer: [0.0; QUANTUM_SIZE],
      target_set_at_quantum: 0,
      modulation: AudioInput::default(),
    }
  }

  pub fn process(&mut self, quantum: u64) {
    let mut t = [0.0; 4];

    for i in 0..4 {
      let dq = ((quantum as i64) - (self.target_set_at_quantum as i64)) as f32;
      let ds = dq * 128.0 + i as f32;
      t[i] = ds * INV_PARAMETER_SMOOTHING_TIME;
    }

    let t_increment = (t[1] - t[0]) * 4.0;

    unsafe {
      let mut t = v128_load(t.as_ptr() as *const v128);
      let t_increment = f32x4(t_increment, t_increment, t_increment, t_increment);

      let zero = f32x4(0.0, 0.0, 0.0, 0.0);
      let one = f32x4(1.0, 1.0, 1.0, 1.0);

      let target = f32x4(self.target, self.target, self.target, self.target);
      let previous = f32x4(self.previous, self.previous, self.previous, self.previous);

      for block in 0..(QUANTUM_SIZE / 4) {
        let block = block * 4;
        let clamped_t = f32x4_max(zero, f32x4_min(one, t));

        v128_store(
          self.buffer.as_mut_ptr().offset(block as isize) as *mut v128,
          f32x4_add(previous, f32x4_mul(clamped_t, f32x4_sub(target, previous))),
        );

        t = f32x4_add(t, t_increment);
      }
    }

    let modulation_ptr = unsafe { (*self.modulation.0).read_buffer().as_ptr() };

    match self.modulation_type {
      AudioParamModulationType::Additive => unsafe {
        for block in 0..(QUANTUM_SIZE / 4) {
          let block = block * 4;

          let value = v128_load((self.buffer.as_ptr().offset(block as isize)) as *const v128);
          let modulation = v128_load((modulation_ptr.offset(block as isize)) as *const v128);

          v128_store(
            self.modulated_buffer.as_mut_ptr().offset(block as isize) as *mut v128,
            f32x4_add(value, modulation),
          );
        }
      },
      AudioParamModulationType::Multiplicative => unsafe {
        for block in 0..(QUANTUM_SIZE / 4) {
          let block = block * 4;

          let value = v128_load((self.buffer.as_ptr().offset(block as isize)) as *const v128);
          let modulation = v128_load((modulation_ptr.offset(block as isize)) as *const v128);

          v128_store(
            self.modulated_buffer.as_mut_ptr().offset(block as isize) as *mut v128,
            f32x4_mul(value, modulation),
          );
        }
      },
    }
  }

  pub fn set_target(&mut self, target: f32, target_set_at_quantum: u64) {
    self.target = target;
    self.target_set_at_quantum = target_set_at_quantum;
    self.previous = self.buffer[QUANTUM_SIZE - 1];
  }

  pub fn at(&mut self, sample: usize) -> f32 {
    self.modulated_buffer[sample]
  }

  pub fn at_f32x4(&mut self, sample: usize) -> *const v128 {
    debug_assert!(sample + 4 <= QUANTUM_SIZE);

    unsafe { self.modulated_buffer.as_ptr().offset(sample as isize) as *const v128 }
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

  pub fn write_buffer(&self) -> &AudioBuffer {
    &self.buffers[self.current]
  }

  pub fn write_buffer_mut(&mut self) -> &mut AudioBuffer {
    &mut self.buffers[self.current]
  }

  pub fn read_buffer(&self) -> &AudioBuffer {
    let prev = (self.current + AUDIO_OUTPUT_NUM_BUFFERS - 1) % AUDIO_OUTPUT_NUM_BUFFERS;
    &self.buffers[prev]
  }
}

pub fn lerp(start: f32, end: f32, t: f32) -> f32 {
  start + t * (end - start)
}

pub fn exp_curve(x: f32) -> f32 {
  (3.0 + x * (-13.0 + 5.0 * x)) / (3.0 + 2.0 * x)
}

pub struct VariableDelayLineInterpolated {
  size: usize,
  buffer: Vec<f32>,
  write_pos: usize,
  current_delay: f32,
  read_speed: f32,
  delay: f32,
}

impl VariableDelayLineInterpolated {
  pub fn new(size: usize, delay: f32) -> VariableDelayLineInterpolated {
    assert!((delay as usize) < size);
    VariableDelayLineInterpolated {
      size,
      buffer: vec![0.0; size],
      write_pos: delay as usize,
      current_delay: delay,
      read_speed: 0.0,
      delay,
    }
  }

  pub fn set_delay(&mut self, delay: f32) {
    assert!(delay < self.size as f32);
    let delay = delay.max(1.0);

    if (delay - self.delay).abs() < f32::EPSILON {
      return;
    }

    self.delay = delay;
    self.read_speed = 1.0 - self.current_delay / delay;
  }

  fn read_pos(&self) -> f32 {
    let mut read_pos = self.write_pos as f32 - self.current_delay;
    if read_pos < 0.0 {
      read_pos += self.size as f32;

      // Due to floating point precision this _is_ a possible case
      if read_pos >= self.size as f32 {
        read_pos = 0.0;
      }
    }

    assert!(read_pos >= 0.0);
    assert!(read_pos < self.size as f32);

    read_pos
  }

  pub fn read_sinc(&self) -> f32 {
    windowed_sinc_sample(self.read_pos(), self.buffer.as_slice())
  }

  pub fn read_lerp(&self) -> f32 {
    let read_pos = self.read_pos();

    let read_pos_int = read_pos as usize;
    let read_pos_fract = read_pos.fract();

    let curr = self.buffer[read_pos_int];
    let next = {
      if read_pos_int == self.size - 1 {
        self.buffer[0]
      } else {
        self.buffer[read_pos_int + 1]
      }
    };

    lerp(curr, next, read_pos_fract)
  }

  pub fn write(&mut self, input: f32) {
    self.buffer[self.write_pos] = input;

    if (self.read_speed > 0.0 && self.current_delay < self.delay)
      || (self.read_speed < 0.0 && self.current_delay > self.delay)
    {
      self.current_delay += self.read_speed;
    }

    assert!(self.current_delay >= 0.0);

    self.write_pos += 1;

    if self.write_pos >= self.size {
      self.write_pos = 0;
    }
  }
}

pub struct VariableDelayLine {
  size: usize,
  buffer: Vec<f32>,
  write_pos: usize,
  read_pos: usize,
  feedback: f32,
}

impl VariableDelayLine {
  pub fn new(size: usize, delay: usize) -> VariableDelayLine {
    assert!(delay < size);
    VariableDelayLine {
      size,
      buffer: vec![0.0; size],
      write_pos: delay,
      read_pos: 0,
      feedback: 0.0,
    }
  }

  pub fn set_delay(&mut self, delay: usize) {
    assert!(delay < self.size);

    let mut read_pos = self.write_pos as i32 - delay as i32;
    if read_pos < 0 {
      read_pos += self.size as i32;
    }
    self.read_pos = read_pos as usize;
  }

  pub fn set_feedback(&mut self, feedback: f32) {
    self.feedback = feedback;
  }

  pub fn step(&mut self, input: f32) -> f32 {
    let delayed = self.buffer[self.read_pos];

    self.buffer[self.write_pos] = input + delayed * self.feedback;

    self.write_pos += 1;
    self.read_pos += 1;

    if self.write_pos >= self.size {
      self.write_pos = 0;
    }

    if self.read_pos >= self.size {
      self.read_pos = 0;
    }

    return delayed;
  }
}

pub struct RingBuffer {
  buffer: Vec<f32>,
  position: usize,
}

impl RingBuffer {
  pub fn new(size: usize) -> RingBuffer {
    RingBuffer {
      buffer: vec![0.0; size],
      position: 0,
    }
  }

  pub fn write(&mut self, value: f32) {
    self.buffer[self.position] = value;
    self.position += 1;
    if self.position >= self.buffer.len() {
      self.position = 0;
    }
  }

  pub fn head(&self) -> f32 {
    self.buffer[self.position]
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

    self.level = 'level: {
      if edge.is_high() {
        let attack_time = self.attack_time * SAMPLE_RATE_F32;

        if self.time < attack_time {
          break 'level tension_interp(
            self.release_level,
            1.0,
            self.attack_tension,
            self.time / attack_time,
          );
        }

        let decay_time = self.decay_time * SAMPLE_RATE_F32;

        if self.time - attack_time < decay_time {
          break 'level tension_interp(
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
          break 'level tension_interp(
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
