use std::ops::{Deref, DerefMut};
use wasm_bindgen::prelude::*;

const SAMPLE_RATE: usize = 44100;
const QUANTUM_SIZE: usize = 128;
const INV_SAMPLE_RATE: f32 = 1.0 / SAMPLE_RATE as f32;

const AUDIO_PARAM_SCALAR_SIGNAL: u32 = 0b0111_1111_1000_1100_1100_1100_1100_1100;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = console)]
  fn log(s: &str);
}

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

#[derive(Clone, Copy)]
pub struct AudioParam([f32; QUANTUM_SIZE]);

impl Deref for AudioParam {
  type Target = [f32; QUANTUM_SIZE];
  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

impl DerefMut for AudioParam {
  fn deref_mut(&mut self) -> &mut [f32; QUANTUM_SIZE] {
    &mut self.0
  }
}

impl Default for AudioParam {
  fn default() -> AudioParam {
    AudioParam([0.0f32; QUANTUM_SIZE])
  }
}

impl AudioParam {
  fn at(&self, sample: usize) -> f32 {
    if self[1].to_bits() == AUDIO_PARAM_SCALAR_SIGNAL {
      self[0]
    } else {
      self[sample]
    }
  }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct Oscillator {
  cv_input: AudioBuffer,
  fm_input: AudioBuffer,
  pw_input: AudioBuffer,

  sin_output: AudioBuffer,
  tri_output: AudioBuffer,
  saw_output: AudioBuffer,
  sqr_output: AudioBuffer,

  cv_param: AudioParam,
  fm_param: AudioParam,
  pw_param: AudioParam,
  fine_param: AudioParam,

  phase: f32,
}

fn exp_curve(x: f32) -> f32 {
  (3.0 + x * (-13.0 + 5.0 * x)) / (3.0 + 2.0 * x)
}

const OVERSAMPLE: usize = 8;

#[wasm_bindgen]
impl Oscillator {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Oscillator {
    Oscillator::default()
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![
      self.cv_input.as_ptr() as i32,
      self.fm_input.as_ptr() as i32,
      self.pw_input.as_ptr() as i32,
    ]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![
      self.sin_output.as_ptr() as i32,
      self.tri_output.as_ptr() as i32,
      self.saw_output.as_ptr() as i32,
      self.sqr_output.as_ptr() as i32,
    ]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![
      self.cv_param.as_ptr() as i32,
      self.fm_param.as_ptr() as i32,
      self.pw_param.as_ptr() as i32,
      self.fine_param.as_ptr() as i32,
    ]
  }

  fn sin(&self) -> f32 {
    let half_phase = self.phase < 0.5;
    let x = self.phase - if half_phase { 0.25 } else { 0.75 };
    let v = 1.0 - 16.0 * f32::powf(x, 2.);
    v * if half_phase { 1. } else { -1. }
  }

  fn tri(&self) -> f32 {
    let mut x = self.phase + 0.25;
    x -= f32::trunc(x);
    let half_x = x >= 0.5;
    x *= 2.0;
    x -= f32::trunc(x);
    exp_curve(x) * if half_x { 1. } else { -1. }
  }

  fn saw(&self) -> f32 {
    let x = self.phase + 0.5;
    exp_curve(x - f32::trunc(x))
  }

  fn sqr(&self, pw: f32) -> f32 {
    if self.phase > pw {
      -1.0
    } else {
      1.0
    }
  }

  pub fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let cv = self.cv_input[sample];
      let fm = self.fm_input[sample];

      let cv_param = self.cv_param.at(sample);
      let fm_param = self.fm_param.at(sample);
      let fine_param = self.fine_param.at(sample);

      let voltage = 5.0 + cv + cv_param + fm * fm_param + fine_param / 12.0;
      let freq = 13.75 * f32::powf(2.0, voltage);

      self.sin_output[sample] = 0.;
      self.tri_output[sample] = 0.;
      self.saw_output[sample] = 0.;
      self.sqr_output[sample] = 0.;

      let pw = self.pw_param.at(sample) + self.pw_input[sample];

      for _ in 0..OVERSAMPLE {
        self.sin_output[sample] += self.sin() / OVERSAMPLE as f32;
        self.tri_output[sample] += self.tri() / OVERSAMPLE as f32;
        self.saw_output[sample] += self.saw() / OVERSAMPLE as f32;
        self.sqr_output[sample] += self.sqr(pw) / OVERSAMPLE as f32;

        self.phase += freq / SAMPLE_RATE as f32 / OVERSAMPLE as f32;
        if self.phase > 1.0 {
          self.phase -= 1.0;
        }
      }
    }
  }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct BiquadFilter {
  input: AudioBuffer,
  lowpass_output: AudioBuffer,
  highpass_output: AudioBuffer,

  frequency: AudioParam,
  q: AudioParam,

  input_buffer: [f32; 2],
  lowpass_buffer: [f32; 2],
  highpass_buffer: [f32; 2],
}

#[wasm_bindgen]
impl BiquadFilter {
  #[wasm_bindgen(constructor)]
  pub fn new() -> BiquadFilter {
    BiquadFilter::default()
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![self.input.as_ptr() as i32]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![
      self.lowpass_output.as_ptr() as i32,
      self.highpass_output.as_ptr() as i32,
    ]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![self.frequency.as_ptr() as i32, self.q.as_ptr() as i32]
  }

  pub fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let voltage = 5.0 + self.frequency.at(sample);
      let freq = 13.75 * f32::powf(2.0, voltage);

      let omega = std::f32::consts::PI * 2.0 * freq * INV_SAMPLE_RATE;
      let (sin_omega, cos_omega) = f32::sin_cos(omega);
      let alpha = sin_omega / 2.0 / f32::max(f32::EPSILON, self.q.at(sample));
      let input = self.input[sample];

      {
        let b0 = (1.0 - cos_omega) / 2.0;
        let b1 = 1.0 - cos_omega;
        let b2 = b0;

        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_omega;
        let a2 = 1.0 - alpha;

        let rcp_a0 = 1.0 / a0;

        let output = ((b0 * rcp_a0) * input
          + (b1 * rcp_a0) * self.input_buffer[0]
          + (b2 * rcp_a0) * self.input_buffer[1]
          - (a1 * rcp_a0) * self.lowpass_buffer[0]
          - (a2 * rcp_a0) * self.lowpass_buffer[1])
          .clamp(-1000., 1000.);

        self.lowpass_buffer[1] = self.lowpass_buffer[0];
        self.lowpass_buffer[0] = output;
        self.lowpass_output[sample] = output;
      }

      {
        let b0 = (1.0 + cos_omega) / 2.0;
        let b1 = -(1.0 + cos_omega);
        let b2 = b0;

        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_omega;
        let a2 = 1.0 - alpha;

        let rcp_a0 = 1.0 / f32::max(f32::EPSILON, a0);

        let output = (b0 * rcp_a0) * input
          + (b1 * rcp_a0) * self.input_buffer[0]
          + (b2 * rcp_a0) * self.input_buffer[1]
          - (a1 * rcp_a0) * self.highpass_buffer[0]
          - (a2 * rcp_a0) * self.highpass_buffer[1];

        self.highpass_buffer[1] = self.highpass_buffer[0];
        self.highpass_buffer[0] = output;
        self.highpass_output[sample] = output;
      }

      self.input_buffer[1] = self.input_buffer[0];
      self.input_buffer[0] = input;
    }
  }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct Mixer {
  inputs: [AudioBuffer; 8],
  params: [AudioParam; 8],
  output: AudioBuffer,
}

#[wasm_bindgen]
impl Mixer {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Mixer {
    Mixer::default()
  }

  pub fn inputs(&self) -> Vec<i32> {
    self
      .inputs
      .iter()
      .map(|input| input.as_ptr() as i32)
      .collect()
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![self.output.as_ptr() as i32]
  }

  pub fn parameters(&self) -> Vec<i32> {
    self
      .params
      .iter()
      .map(|param| param.as_ptr() as i32)
      .collect()
  }

  pub fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let v = self
        .inputs
        .iter()
        .enumerate()
        .map(|(ix, input)| input[sample] * self.params[ix].at(sample))
        .sum();
      self.output[sample] = v
    }
  }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct Gain {
  input: AudioBuffer,
  output: AudioBuffer,
  gain: AudioParam,
}

#[wasm_bindgen]
impl Gain {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Gain {
    Gain::default()
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![self.input.as_ptr() as i32]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![self.output.as_ptr() as i32]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![self.gain.as_ptr() as i32]
  }

  pub fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      self.output[sample] = self.input[sample] * self.gain.at(sample)
    }
  }
}

#[wasm_bindgen]
pub struct Limiter {
  input: AudioBuffer,
  output: AudioBuffer,
  threshold: AudioParam,

  buffer: RingBuffer,
}

#[wasm_bindgen]
impl Limiter {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Limiter {
    Limiter {
      input: AudioBuffer::default(),
      output: AudioBuffer::default(),
      threshold: AudioParam::default(),

      buffer: RingBuffer::new(500),
    }
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![self.input.as_ptr() as i32]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![self.output.as_ptr() as i32]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![self.threshold.as_ptr() as i32]
  }

  pub fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let rms = self.buffer.rms();
      let threshold = self.threshold.at(sample);
      let ratio = if rms > threshold {
        threshold / rms
      } else {
        1.0
      };
      self.output[sample] = self.buffer.head() * ratio;
      self.buffer.write(self.input[sample]);
    }
  }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct PowShaper {
  input: AudioBuffer,
  output: AudioBuffer,

  exponent: AudioParam,
  gain: AudioParam,
  pre_gain: AudioParam,
}

#[wasm_bindgen]
impl PowShaper {
  #[wasm_bindgen(constructor)]
  pub fn new() -> PowShaper {
    PowShaper::default()
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![self.input.as_ptr() as i32]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![self.output.as_ptr() as i32]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![
      self.exponent.as_ptr() as i32,
      self.gain.as_ptr() as i32,
      self.pre_gain.as_ptr() as i32,
    ]
  }

  pub fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let pre_gained = self.input[sample] * self.pre_gain.at(sample);
      self.output[sample] = f32::signum(pre_gained)
        * f32::abs(pre_gained).powf(self.exponent.at(sample))
        * self.gain.at(sample);
    }
  }
}

#[derive(PartialEq)]
enum Edge {
  High,
  Low,
  Rose,
  Fell,
}

impl Edge {
  fn is_edge(&self) -> bool {
    self == &Edge::Rose || self == &Edge::Fell
  }
}

#[derive(Default)]
struct EdgeDetector {
  previous_sample: f32,
}

impl EdgeDetector {
  fn step(&mut self, sample: f32) -> Edge {
    let edge: Edge;

    if self.previous_sample < 0.5 && sample > 0.5 {
      edge = Edge::Rose;
    } else if self.previous_sample > 0.5 && sample < 0.5 {
      edge = Edge::Fell;
    } else {
      edge = if sample < 0.5 { Edge::Low } else { Edge::High }
    }
    self.previous_sample = sample;

    edge
  }
}

#[wasm_bindgen]
struct Note {
  voltage: f32,
  glide: bool,
  gate: bool,
}

impl Default for Note {
  fn default() -> Note {
    Note {
      voltage: 0.0,
      gate: true,
      glide: false,
    }
  }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct Sequencer {
  gate_input: AudioBuffer,
  cv_output: AudioBuffer,
  gate_output: AudioBuffer,
  sequence_length: AudioParam,
  glide: AudioParam,

  notes: [Note; 32],
  current_step: usize,
  edge_detector: EdgeDetector,
  time: usize,
  previous_voltage: f32,

  advance_callback: Option<js_sys::Function>,
}

#[wasm_bindgen]
impl Sequencer {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Sequencer {
    Sequencer::default()
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![self.gate_input.as_ptr() as i32]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![
      self.cv_output.as_ptr() as i32,
      self.gate_output.as_ptr() as i32,
    ]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![
      self.sequence_length.as_ptr() as i32,
      self.glide.as_ptr() as i32,
    ]
  }

  pub fn set_notes(&mut self, notes: js_sys::Array) {
    for (i, value) in notes.iter().enumerate() {
      let voltage = js_sys::Reflect::get(&value, &JsValue::from_str("voltage"))
        .ok()
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0) as f32;
      let gate = js_sys::Reflect::get(&value, &JsValue::from_str("gate"))
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
      let glide = js_sys::Reflect::get(&value, &JsValue::from_str("glide"))
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false);

      self.notes[i].voltage = voltage;
      self.notes[i].gate = gate;
      self.notes[i].glide = glide;
    }
  }

  pub fn on_advance(&mut self, callback: js_sys::Function) {
    self.advance_callback = Some(callback);
  }

  pub fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let edge = self.edge_detector.step(self.gate_input[sample]);

      let note = &self.notes[self.current_step];

      let voltage = if note.glide {
        let t = f32::clamp(
          self.time as f32 / f32::max(1.0, SAMPLE_RATE as f32 * self.glide.at(sample)),
          0.0,
          1.0,
        );

        lerp(self.previous_voltage, note.voltage, t)
      } else {
        note.voltage
      };

      match edge {
        Edge::Rose => {
          self.current_step += 1;
          self.time = 0;
          self.previous_voltage = voltage;

          if self.current_step >= self.sequence_length.at(sample) as usize {
            self.current_step = 0;
          }

          match &self.advance_callback {
            Some(callback) => {
              let _ = callback.call1(&JsValue::null(), &JsValue::from(self.current_step as i32));
            }
            _ => {}
          }
        }
        _ => {}
      }

      self.cv_output[sample] = voltage;

      self.time += 1;

      if note.gate {
        self.gate_output[sample] = self.gate_input[sample];
      } else {
        self.gate_output[sample] = 0.0;
      }
    }
  }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct ADSR {
  gate_input: AudioBuffer,
  output: AudioBuffer,

  attack: AudioParam,
  decay: AudioParam,
  sustain: AudioParam,
  release: AudioParam,

  edge_detector: EdgeDetector,
  time: f32,
  release_level: f32,
  level: f32,
}

fn lerp(start: f32, end: f32, t: f32) -> f32 {
  start + t * (end - start)
}

#[wasm_bindgen]
impl ADSR {
  #[wasm_bindgen(constructor)]
  pub fn new() -> ADSR {
    ADSR::default()
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![self.gate_input.as_ptr() as i32]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![self.output.as_ptr() as i32]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![
      self.attack.as_ptr() as i32,
      self.decay.as_ptr() as i32,
      self.sustain.as_ptr() as i32,
      self.release.as_ptr() as i32,
    ]
  }

  pub fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let edge = self.edge_detector.step(self.gate_input[sample]);

      if edge.is_edge() {
        self.release_level = self.level;
        self.time = 0.0;
      }

      if edge == Edge::High {
        let attack = self.attack.at(sample);
        let decay = self.decay.at(sample);
        let sustain = self.sustain.at(sample);

        let attack_time = self.time * INV_SAMPLE_RATE / attack;
        let decay_time = (self.time - attack * SAMPLE_RATE as f32) * INV_SAMPLE_RATE / decay;

        if attack_time < 1.0 {
          self.level = lerp(self.release_level, 1.0, attack_time);
        } else if decay_time < 1.0 {
          self.level = lerp(1.0, sustain, decay_time);
        } else {
          self.level = sustain;
        }
      } else {
        let release_time = self.time * INV_SAMPLE_RATE / self.release.at(sample);
        if release_time < 1.0 {
          self.level = lerp(self.release_level, 0.0, release_time)
        } else {
          self.level = 0.0
        }
      }

      self.output[sample] = self.level;
      self.time += 1.0;
    }
  }
}

struct RingBuffer {
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

struct FeedbackCombFilter {
  buffer: RingBuffer,
  gain: f32,
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

struct AllPassFilter {
  filter_buffer: RingBuffer,
  input_buffer: RingBuffer,
  gain: f32,
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

const COMB_GAIN_COUNT: usize = 4;
const COMB_GAIN_OFFSETS: [f32; COMB_GAIN_COUNT] = [0.0, -0.01313, -0.02743, -0.031];
const COMB_DELAY_OFFSETS: [f32; COMB_GAIN_COUNT] = [0.0, -0.011, 0.019, -0.008];

#[wasm_bindgen]
pub struct Reverb {
  input: AudioBuffer,
  output: AudioBuffer,

  delay: AudioParam,
  decay: AudioParam,
  diffuse: AudioParam,
  wet: AudioParam,
  dry: AudioParam,

  comb_filters: Vec<FeedbackCombFilter>,
  all_pass_filters: Vec<AllPassFilter>,
}

#[wasm_bindgen]
impl Reverb {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Reverb {
    Reverb {
      input: AudioBuffer::default(),
      output: AudioBuffer::default(),

      delay: AudioParam::default(),
      decay: AudioParam::default(),
      diffuse: AudioParam::default(),
      wet: AudioParam::default(),
      dry: AudioParam::default(),

      comb_filters: vec![
        FeedbackCombFilter::new(1000, 0.1),
        FeedbackCombFilter::new(1000, 0.1),
        FeedbackCombFilter::new(1000, 0.1),
        FeedbackCombFilter::new(1000, 0.1),
      ],

      all_pass_filters: vec![
        AllPassFilter::new(1051, 0.7),
        AllPassFilter::new(337, 0.7),
        AllPassFilter::new(113, 0.7),
      ],
    }
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![self.input.as_ptr() as i32]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![self.output.as_ptr() as i32]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![
      self.delay.as_ptr() as i32,
      self.decay.as_ptr() as i32,
      self.diffuse.as_ptr() as i32,
      self.wet.as_ptr() as i32,
      self.dry.as_ptr() as i32,
    ]
  }

  pub fn process(&mut self) {
    for i in 0..COMB_GAIN_COUNT {
      let delay = ((self.delay.at(0) + COMB_DELAY_OFFSETS[i]) * SAMPLE_RATE as f32) as usize;
      self.comb_filters[i].set_delay(delay);
    }

    for sample in 0..QUANTUM_SIZE {
      let input = self.input[sample];
      let mut output = 0.0;

      for i in 0..COMB_GAIN_COUNT {
        let filter = &mut self.comb_filters[i];
        filter.gain = self.decay.at(sample) + COMB_GAIN_OFFSETS[i];
        output += filter.step(input);
      }

      for filter in self.all_pass_filters.iter_mut() {
        filter.gain = self.diffuse.at(sample);
        output = filter.step(output);
      }

      self.output[sample] = output * self.wet.at(sample) + input * self.dry.at(sample);
    }
  }
}

#[wasm_bindgen]
pub struct Delay {
  input: AudioBuffer,
  output: AudioBuffer,

  time: AudioParam,
  feedback: AudioParam,
  wet: AudioParam,
  dry: AudioParam,

  buffer: RingBuffer,
}

#[wasm_bindgen]
impl Delay {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Delay {
    Delay {
      input: AudioBuffer::default(),
      output: AudioBuffer::default(),

      time: AudioParam::default(),
      feedback: AudioParam::default(),
      wet: AudioParam::default(),
      dry: AudioParam::default(),

      buffer: RingBuffer::new(10000),
    }
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![self.input.as_ptr() as i32]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![self.output.as_ptr() as i32]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![
      self.time.as_ptr() as i32,
      self.feedback.as_ptr() as i32,
      self.wet.as_ptr() as i32,
      self.dry.as_ptr() as i32,
    ]
  }

  pub fn process(&mut self) {
    self
      .buffer
      .resize((self.time.at(0) * SAMPLE_RATE as f32) as usize);

    for sample in 0..QUANTUM_SIZE {
      let input = self.input[sample];
      let wet = self.buffer.head();
      self.buffer.write(input + wet * self.feedback.at(sample));
      self.output[sample] = wet * self.wet.at(sample) + input * self.dry.at(sample);
    }
  }
}

#[wasm_bindgen]
#[derive(Default)]
pub struct Clock {
  outputs: [AudioBuffer; 3],

  tempo: AudioParam,
  ratios: [AudioParam; 3],
  pulse_widths: [AudioParam; 3],
  swing_ratios: [AudioParam; 3],

  is_running: bool,
  cycle_positions: [usize; 3],
}

#[wasm_bindgen]
impl Clock {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Clock {
    Clock::default()
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![]
  }

  pub fn outputs(&self) -> Vec<i32> {
    self.outputs.iter().map(|out| out.as_ptr() as i32).collect()
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![
      self.tempo.as_ptr() as i32,
      self.ratios[0].as_ptr() as i32,
      self.ratios[1].as_ptr() as i32,
      self.ratios[2].as_ptr() as i32,
      self.pulse_widths[0].as_ptr() as i32,
      self.pulse_widths[1].as_ptr() as i32,
      self.pulse_widths[2].as_ptr() as i32,
      self.swing_ratios[0].as_ptr() as i32,
      self.swing_ratios[1].as_ptr() as i32,
      self.swing_ratios[2].as_ptr() as i32,
    ]
  }

  pub fn reset(&mut self) {
    for output in 0..3 {
      self.cycle_positions[output] = 0;
    }
  }

  pub fn set_running(&mut self, is_running: bool) {
    self.is_running = is_running;
  }

  pub fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      for output in 0..3 {
        if !self.is_running {
          self.outputs[output][sample] = 0.0;
          continue;
        }

        let samples_per_beat =
          60.0 / self.tempo.at(sample) * SAMPLE_RATE as f32 / self.ratios[output].at(sample);

        let odd_end = samples_per_beat * self.pulse_widths[output].at(sample);
        let even_start =
          samples_per_beat + (self.swing_ratios[output].at(sample) - 0.5) * samples_per_beat * 2.0;
        let even_end = even_start + odd_end;
        let pos = self.cycle_positions[output];
        if pos < odd_end as usize {
          self.outputs[output][sample] = 1.0;
        } else if pos > even_start as usize && pos < even_end as usize {
          self.outputs[output][sample] = 1.0;
        } else {
          self.outputs[output][sample] = 0.0;
        }
        self.cycle_positions[output] += 1;
        if self.cycle_positions[output] > (samples_per_beat * 2.0) as usize {
          self.cycle_positions[output] = 0;
        }
      }
    }
  }
}

const MIDI_NOTE_OFF: u32 = 0b1000;
const MIDI_NOTE_ON: u32 = 0b1001;
const MIDI_KEY_PRESSURE: u32 = 0b1010;
const MIDI_CONTROL_CHANGE: u32 = 0b1011;
const MIDI_PROGRAM_CHANGE: u32 = 0b1100;
const MIDI_CHANNEL_PRESSURE: u32 = 0b1101;
const MIDI_PITCH_BEND_CHANGE: u32 = 0b1110;

#[wasm_bindgen]
pub struct MIDI {
  cv_output: AudioBuffer,
  velocity_output: AudioBuffer,
  gate_output: AudioBuffer,

  current_cv: f32,

  note_velocities: [u8; 128],
}

#[wasm_bindgen]
impl MIDI {
  #[wasm_bindgen(constructor)]
  pub fn new() -> MIDI {
    MIDI {
      cv_output: AudioBuffer::default(),
      gate_output: AudioBuffer::default(),
      velocity_output: AudioBuffer::default(),
      current_cv: 0.0,
      note_velocities: [0; 128],
    }
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![
      self.cv_output.as_ptr() as i32,
      self.velocity_output.as_ptr() as i32,
      self.gate_output.as_ptr() as i32,
    ]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![]
  }

  pub fn on_message(&mut self, message: u32) {
    let message_type = (message >> 4) & 0b0000_1111;

    match message_type {
      MIDI_NOTE_ON => {
        let note = (message >> 8) & 0b0111_1111;
        let velocity = (message >> 16) & 0b0111_1111;

        self.note_velocities[note as usize] = velocity as u8;
      }

      MIDI_NOTE_OFF => {
        let note = (message >> 8) & 0b0111_1111;

        self.note_velocities[note as usize] = 0;
      }

      _ => {}
    }
  }

  pub fn process(&mut self) {
    let mut velocity = 0.0;

    for note in 0..128 {
      let index = 127 - note;

      if self.note_velocities[index] > 0 {
        self.current_cv = ((index as f32) - 57.0) / 12.0;
        velocity = (self.note_velocities[index] as f32) / 128.0;
        break;
      }
    }

    for sample in 0..QUANTUM_SIZE {
      self.cv_output[sample] = self.current_cv;
      self.velocity_output[sample] = velocity;
      self.gate_output[sample] = if velocity == 0.0 { 0.0 } else { 1.0 };
    }
  }
}

#[derive(Copy, Clone, Default)]
struct Vec2 {
  x: f32,
  y: f32,
}

impl std::ops::Add<Vec2> for Vec2 {
  type Output = Vec2;

  fn add(self, rhs: Vec2) -> Vec2 {
    Vec2 {
      x: self.x + rhs.x,
      y: self.y + rhs.y,
    }
  }
}

impl std::ops::Mul<f32> for Vec2 {
  type Output = Vec2;

  fn mul(self, rhs: f32) -> Vec2 {
    Vec2 {
      x: self.x * rhs,
      y: self.y * rhs,
    }
  }
}

impl std::ops::Mul<Vec2> for f32 {
  type Output = Vec2;

  fn mul(self, rhs: Vec2) -> Vec2 {
    Vec2 {
      x: rhs.x * self,
      y: rhs.y * self,
    }
  }
}

impl std::ops::Sub<Vec2> for Vec2 {
  type Output = Vec2;

  fn sub(self, rhs: Vec2) -> Vec2 {
    Vec2 {
      x: self.x - rhs.x,
      y: self.y - rhs.y,
    }
  }
}

impl Vec2 {
  fn dot(&self, vec: Vec2) -> f32 {
    self.x * vec.x + self.y * vec.y
  }

  fn length(&self) -> f32 {
    f32::sqrt(self.x * self.x + self.y * self.y)
  }

  fn normalize(&self) -> Vec2 {
    let rcp_len = 1. / self.length();
    Vec2 {
      x: self.x * rcp_len,
      y: self.y * rcp_len,
    }
  }
}

#[derive(Default)]
struct Rng {
  state: u64,
}

impl Rng {
  fn get_u32(&mut self) -> u32 {
    let oldstate = self.state;
    // Advance internal state
    self.state = oldstate * 6364136223846793005u64 + 1;
    // Calculate output function (XSH RR), uses old state for max ILP
    let xorshifted: u32 = (((oldstate >> 18u64) ^ oldstate) >> 27u64) as u32;
    let rot: u32 = (oldstate >> 59u64) as u32;
    return (xorshifted >> rot) | (xorshifted << ((0 - rot) & 31));
  }

  fn get_f32(&mut self) -> f32 {
    self.get_u32() as f32 * 2.3283064e-10
  }
}

#[derive(Default)]
struct Ball {
  pos: Vec2,
  vel: Vec2,
}

#[wasm_bindgen]
#[derive(Default)]
pub struct BouncyBoi {
  balls: [Ball; 3],
  trigger_outputs: [AudioBuffer; 3],
  trigger_timers: [u32; 3],
  velocity_outputs: [AudioBuffer; 3],

  speed: AudioParam,
  gravity: AudioParam,

  phase: f32,
}

#[derive(Copy, Clone, Default)]
struct Wall {
  from: Vec2,
  to: Vec2,
}

#[wasm_bindgen]
impl BouncyBoi {
  #[wasm_bindgen(constructor)]
  pub fn new() -> BouncyBoi {
    let mut boi = BouncyBoi::default();
    let mut rng = Rng::default();

    for ball in boi.balls.iter_mut() {
      ball.pos.x = 0.0;
      ball.pos.y = 0.0;
      ball.vel.x = rng.get_f32() * 2.0 - 1.0;
      ball.vel.y = rng.get_f32() * 2.0 - 1.0;
    }

    boi
  }

  pub fn inputs(&self) -> Vec<i32> {
    vec![]
  }

  pub fn outputs(&self) -> Vec<i32> {
    vec![
      self.trigger_outputs[0].as_ptr() as i32,
      self.trigger_outputs[1].as_ptr() as i32,
      self.trigger_outputs[2].as_ptr() as i32,
      self.velocity_outputs[0].as_ptr() as i32,
      self.velocity_outputs[1].as_ptr() as i32,
      self.velocity_outputs[2].as_ptr() as i32,
    ]
  }

  pub fn get_state(&self) -> Vec<f32> {
    vec![
      self.balls[0].pos.x,
      self.balls[0].pos.y,
      self.balls[1].pos.x,
      self.balls[1].pos.y,
      self.balls[2].pos.x,
      self.balls[2].pos.y,
      self.phase,
    ]
  }

  pub fn parameters(&self) -> Vec<i32> {
    vec![self.speed.as_ptr() as i32, self.gravity.as_ptr() as i32]
  }

  pub fn process(&mut self) {
    let mut walls: [Wall; 5] = [Wall::default(); 5];

    for (i, wall) in walls.iter_mut().enumerate() {
      {
        let (sin, cos) = f32::sin_cos(i as f32 * std::f32::consts::PI * 2.0 / 5.0 + self.phase);

        wall.from.x = sin * 100.0;
        wall.from.y = cos * 100.0;
      }

      {
        let (sin, cos) =
          f32::sin_cos((i + 1) as f32 * std::f32::consts::PI * 2.0 / 5.0 + self.phase);

        wall.to.x = sin * 100.0;
        wall.to.y = cos * 100.0;
      }
    }

    self.phase += self.speed.at(0) * 0.01;

    for (i, ball) in self.balls.iter_mut().enumerate() {
      ball.vel.y += self.gravity.at(0) * 0.05;

      let speed = ball.vel.length();
      ball.vel = ball.vel.normalize() * f32::max(speed, 0.001);

      ball.pos = ball.pos + (ball.vel * 0.05);

      for wall in walls.iter() {
        let e = wall.to - wall.from;
        let n = Vec2 { x: e.y, y: -e.x }.normalize();
        let d = ball.pos - wall.from;
        let distance = n.dot(d);

        if distance < 10.0 {
          let depth = 10.0 - distance;

          self.trigger_timers[i] = 10000;
          self.velocity_outputs[i][0] = depth;

          ball.pos = ball.pos + n * depth;
          ball.vel = ball.vel - n * f32::min(0.0, 2.01 * ball.vel.dot(n));
        }
      }
    }

    for sample in 0..QUANTUM_SIZE {
      for i in 0..3 {
        self.velocity_outputs[i][sample] = self.velocity_outputs[i][0];

        if self.trigger_timers[i] != 0 {
          self.trigger_outputs[i][sample] = 1.0;
          self.trigger_timers[i] -= 1;
        } else {
          self.trigger_outputs[i][sample] = 0.0;
        }
      }
    }
  }
}
