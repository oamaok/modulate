use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::ops::{Deref, DerefMut};
use std::ops::{Index, IndexMut};
use wasm_bindgen::prelude::*;

const SAMPLE_RATE: usize = 44100;
const QUANTUM_SIZE: usize = 128;
const INV_SAMPLE_RATE: f32 = 1.0 / SAMPLE_RATE as f32;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = console)]
  fn log(s: &str);
}

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(extends = js_sys::Array, is_type_of = js_sys::Array::is_array, typescript_type = "[number, number]")]
  #[derive(Clone, Debug, PartialEq, Eq)]
  pub type IntegerTuple;
}

struct AudioBuffer([f32; QUANTUM_SIZE]);

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

#[derive(PartialEq, Default)]
struct AudioInput(usize);

impl AudioInput {
  pub fn at(&self, sample: usize) -> f32 {
    if self.0 == 0 {
      return 0.0;
    }
    unsafe { (*(self.0 as *const AudioBuffer))[sample] }
  }

  pub fn set_ptr(&mut self, ptr: usize) {
    self.0 = ptr;
  }
}

enum AudioParamModulationType {
  Multiplicative,
  Additive,
}

struct AudioParam {
  modulation_type: AudioParamModulationType,
  value: f32,
  modulation: AudioInput,
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
  fn new(modulation_type: AudioParamModulationType) -> AudioParam {
    AudioParam {
      modulation_type,
      value: 0.0,
      modulation: AudioInput::default(),
    }
  }

  fn at(&self, sample: usize) -> f32 {
    match self.modulation_type {
      AudioParamModulationType::Additive => self.value + self.modulation.at(sample),
      AudioParamModulationType::Multiplicative => self.value * self.modulation.at(sample),
    }
  }
}

// TODO: Swap references to two buffers instead of swapping the whole contents each time
struct AudioOutput {
  previous: AudioBuffer,
  current: AudioBuffer,
}

impl Index<usize> for AudioOutput {
  type Output = f32;
  fn index(&self, i: usize) -> &f32 {
    &self.current[i]
  }
}

impl IndexMut<usize> for AudioOutput {
  fn index_mut(&mut self, i: usize) -> &mut f32 {
    &mut self.current[i]
  }
}

impl Default for AudioOutput {
  fn default() -> Self {
    AudioOutput {
      previous: AudioBuffer::default(),
      current: AudioBuffer::default(),
    }
  }
}

impl AudioOutput {
  pub fn swap(&mut self) {
    std::mem::swap(&mut self.current, &mut self.previous)
  }
}

fn lerp(start: f32, end: f32, t: f32) -> f32 {
  start + t * (end - start)
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

struct EdgeDetector {
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
  fn new(threshold: f32) -> EdgeDetector {
    EdgeDetector {
      threshold,
      previous_sample: 0.0,
    }
  }

  fn step(&mut self, sample: f32) -> Edge {
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

type ModuleId = u32;
type ConnectionId = u32;
type OutputId = usize;
type ParameterId = usize;
type InputId = usize;

#[derive(Serialize)]
#[serde(tag = "type")]
enum ModuleEvent {
  SequencerAdvance { position: usize },
  BouncyBoiUpdate { balls: [Ball; 3], phase: f32 },
}

#[derive(Deserialize)]
struct NamedNote {
  name: String,
  octave: f32,
  gate: bool,
  glide: bool,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum ModuleMessage {
  SequencerSetNotes { notes: Vec<NamedNote> },
  ClockReset,
  ClockSetRunning { running: bool },
  MidiMessage { message: u32 },
}

trait Module: Send {
  fn process(&mut self);
  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![]
  }
  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![]
  }
  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![]
  }
  fn get_input_count(&mut self) -> usize {
    self.get_inputs().len()
  }
  fn get_output_count(&mut self) -> usize {
    self.get_outputs().len()
  }
  fn swap_output_buffers(&mut self) {
    for buffer in self.get_outputs().iter_mut() {
      buffer.swap();
    }
  }
  fn get_output_buffer_ptr(&mut self, output: OutputId) -> usize {
    let ptr = self
      .get_outputs()
      .get(output)
      .map(|x| &x.previous as *const AudioBuffer as usize)
      .unwrap();
    ptr
  }

  fn set_input_buffer_ptr(&mut self, input: InputId, buffer_ptr: usize) {
    let mut inputs = self.get_inputs();
    let buffer = inputs.get_mut(input).unwrap();
    buffer.set_ptr(buffer_ptr);
  }

  fn set_parameter_buffer_ptr(&mut self, input: ParameterId, buffer_ptr: usize) {
    let mut params = self.get_parameters();
    let buffer = params.get_mut(input).unwrap();
    buffer.modulation.set_ptr(buffer_ptr);
  }

  fn pop_event(&mut self) -> Option<ModuleEvent> {
    None
  }

  fn on_message(&mut self, _message: ModuleMessage) {
    panic!("module received a message when no handler is implemented");
  }
}

enum ConnectionTarget {
  Input(ModuleId, InputId),
  Parameter(ModuleId, ParameterId),
}

struct ModuleConnection {
  from: (ModuleId, OutputId),
  to: ConnectionTarget,
}

struct ModulateEngine {
  next_id: u32,
  modules: HashMap<ModuleId, Box<dyn Module>>,
  connections: HashMap<ConnectionId, ModuleConnection>,
  audio_outputs: HashSet<ModuleId>,
  on_event_callback: js_sys::Function,
}

impl ModulateEngine {
  pub fn new(on_event_callback: js_sys::Function) -> ModulateEngine {
    ModulateEngine {
      next_id: 0,
      modules: HashMap::new(),
      connections: HashMap::new(),
      audio_outputs: HashSet::new(),
      on_event_callback,
    }
  }

  fn get_next_id(&mut self) -> u32 {
    let id = self.next_id;
    self.next_id += 1;
    id
  }

  pub fn create_module(&mut self, module_name: &str) -> ModuleId {
    let id = self.get_next_id() as ModuleId;
    match module_name {
      "AudioOut" => {
        self.modules.insert(id, Box::new(AudioOut::new()));
        self.audio_outputs.insert(id);
      }
      "Oscillator" => {
        self.modules.insert(id, Box::new(Oscillator::new()));
      }
      "BiquadFilter" => {
        self.modules.insert(id, Box::new(BiquadFilter::new()));
      }
      "Mixer" => {
        self.modules.insert(id, Box::new(Mixer::new()));
      }
      "Gain" => {
        self.modules.insert(id, Box::new(Gain::new()));
      }
      "Limiter" => {
        self.modules.insert(id, Box::new(Limiter::new()));
      }
      "PowShaper" => {
        self.modules.insert(id, Box::new(PowShaper::new()));
      }
      "Sequencer" => {
        self.modules.insert(id, Box::new(Sequencer::new()));
      }
      "ADSR" => {
        self.modules.insert(id, Box::new(ADSR::new()));
      }
      "Reverb" => {
        self.modules.insert(id, Box::new(Reverb::new()));
      }
      "Delay" => {
        self.modules.insert(id, Box::new(Delay::new()));
      }
      "Clock" => {
        self.modules.insert(id, Box::new(Clock::new()));
      }
      "MIDI" => {
        self.modules.insert(id, Box::new(MIDI::new()));
      }
      "BouncyBoi" => {
        self.modules.insert(id, Box::new(BouncyBoi::new()));
      }
      _ => panic!("create_module: unimplemented module '{}'", module_name),
    }
    id
  }

  pub fn delete_module(&mut self, module_id: ModuleId) {
    self.audio_outputs.remove(&module_id);

    let connections_to_drop: Vec<ConnectionId> = self
      .connections
      .iter()
      .filter(|(_, connection)| {
        let (from_module_id, _) = connection.from;
        let to_module_id = match connection.to {
          ConnectionTarget::Input(to_module_id, _) => to_module_id,
          ConnectionTarget::Parameter(to_module_id, _) => to_module_id,
        };

        from_module_id == module_id || to_module_id == module_id
      })
      .map(|(connection_id, _)| *connection_id)
      .collect();

    for connection_id in connections_to_drop {
      self.remove_connection(connection_id);
    }

    self.modules.remove(&module_id);
  }

  pub fn set_parameter_value(&mut self, module_id: ModuleId, parameter: ParameterId, value: f32) {
    let module = self.modules.get_mut(&module_id).unwrap();
    let mut parameters = module.get_parameters();
    let param = parameters.get_mut(parameter).unwrap();
    param.value = value;
  }

  pub fn connect_to_input(
    &mut self,
    from: (ModuleId, OutputId),
    to: (ModuleId, InputId),
  ) -> ConnectionId {
    let id = self.get_next_id() as ConnectionId;

    let (from_module_id, from_output) = from;
    let (to_module_id, to_input) = to;

    self.connections.insert(
      id,
      ModuleConnection {
        from,
        to: ConnectionTarget::Input(to_module_id, to_input),
      },
    );

    let output_buffer_ptr = {
      let from_module = self.modules.get_mut(&from_module_id).unwrap();
      from_module.get_output_buffer_ptr(from_output)
    };

    {
      let to_module = self.modules.get_mut(&to_module_id).unwrap();
      to_module.set_input_buffer_ptr(to_input, output_buffer_ptr);
    }

    id
  }

  pub fn connect_to_parameter(
    &mut self,
    from: (ModuleId, OutputId),
    to: (ModuleId, ParameterId),
  ) -> ConnectionId {
    let id = self.get_next_id() as ConnectionId;

    let (from_module_id, from_output) = from;
    let (to_module_id, to_parameter) = to;

    self.connections.insert(
      id,
      ModuleConnection {
        from,
        to: ConnectionTarget::Parameter(to_module_id, to_parameter),
      },
    );

    let output_buffer_ptr = {
      let from_module = self.modules.get_mut(&from_module_id).unwrap();
      from_module.get_output_buffer_ptr(from_output)
    };

    {
      let to_module = self.modules.get_mut(&to_module_id).unwrap();
      to_module.set_parameter_buffer_ptr(to_parameter, output_buffer_ptr);
    }

    id
  }

  pub fn remove_connection(&mut self, connection_id: ConnectionId) {
    let connection = self.connections.get(&connection_id).unwrap();

    match connection.to {
      ConnectionTarget::Input(to_module_id, to_input) => {
        let to_module = self.modules.get_mut(&to_module_id).unwrap();
        to_module.set_input_buffer_ptr(to_input, 0);
      }
      ConnectionTarget::Parameter(to_module_id, to_parameter) => {
        let to_module = self.modules.get_mut(&to_module_id).unwrap();
        to_module.set_parameter_buffer_ptr(to_parameter, 0);
      }
    }

    self.connections.remove(&connection_id);
  }

  pub fn send_message_to_module(&mut self, module_id: ModuleId, message: JsValue) {
    let module = self.modules.get_mut(&module_id).unwrap();

    // TODO: Move this deserialization to the wrapper
    match serde_wasm_bindgen::from_value(message) {
      Ok(msg) => module.on_message(msg),
      Err(err) => panic!("error deserializing message: {}", err.to_string().as_str()),
    }
  }

  pub fn process(&mut self, output_buffer: &mut AudioBuffer) {
    for (_, module) in self.modules.iter_mut() {
      module.swap_output_buffers();
    }

    for (_, module) in self.modules.iter_mut() {
      module.process();
    }

    for audio_output in self.audio_outputs.iter() {
      let module = self.modules.get_mut(audio_output).unwrap();
      let buffer_ptr = module.get_output_buffer_ptr(0) as *const AudioBuffer;
      unsafe {
        for sample in 0..QUANTUM_SIZE {
          output_buffer[sample] += (*buffer_ptr)[sample];
        }
      };
    }

    for (module_id, module) in self.modules.iter_mut() {
      loop {
        match module.pop_event() {
          Some(message) => {
            let _ = self.on_event_callback.call2(
              &JsValue::null(),
              &JsValue::from(*module_id),
              &serde_wasm_bindgen::to_value(&message).unwrap(),
            );
          }
          None => break,
        };
      }
    }
  }
}

#[wasm_bindgen]
pub struct ModulateEngineWrapper {
  output: AudioBuffer,
  engine: ModulateEngine,
}

#[wasm_bindgen]
impl ModulateEngineWrapper {
  #[wasm_bindgen(constructor)]
  pub fn new(on_event_callback: js_sys::Function) -> ModulateEngineWrapper {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));

    ModulateEngineWrapper {
      output: AudioBuffer::default(),
      engine: ModulateEngine::new(on_event_callback),
    }
  }

  #[wasm_bindgen(js_name = createModule)]
  pub fn create_module(&mut self, module_name: &str) -> ModuleId {
    self.engine.create_module(module_name)
  }

  #[wasm_bindgen(js_name = deleteModule)]
  pub fn delete_module(&mut self, module_id: ModuleId) {
    self.engine.delete_module(module_id);
  }

  #[wasm_bindgen(js_name = setParameterValue)]
  pub fn set_parameter_value(&mut self, module_id: ModuleId, parameter: ParameterId, value: f32) {
    self.engine.set_parameter_value(module_id, parameter, value);
  }

  #[wasm_bindgen(js_name = connectToInput)]
  pub fn connect_to_input(&mut self, from: IntegerTuple, to: IntegerTuple) -> ConnectionId {
    // TODO: use serde
    let from_tuple: (ModuleId, OutputId) = match from
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (ModuleId, OutputId),
      _ => panic!("`from` must be [u32, u32]"),
    };

    let to_tuple: (ModuleId, InputId) = match to
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (ModuleId, InputId),
      _ => panic!("`to` must be [u32, u32]"),
    };

    self.engine.connect_to_input(from_tuple, to_tuple)
  }

  #[wasm_bindgen(js_name = connectToParameter)]
  pub fn connect_to_parameter(&mut self, from: IntegerTuple, to: IntegerTuple) -> ConnectionId {
    // TODO: use serde

    let from_tuple: (ModuleId, OutputId) = match from
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (ModuleId, OutputId),
      _ => panic!("`from` must be [u32, u32]"),
    };

    let to_tuple: (ModuleId, InputId) = match to
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (ModuleId, ParameterId),
      _ => panic!("`to` must be [u32, u32]"),
    };

    self.engine.connect_to_parameter(from_tuple, to_tuple)
  }

  #[wasm_bindgen(js_name = removeConnection)]
  pub fn remove_connection(&mut self, connection_id: ConnectionId) {
    self.engine.remove_connection(connection_id)
  }

  #[wasm_bindgen(js_name = getOutputBufferPtr)]
  pub fn get_output_buffer_ptr(&self) -> u32 {
    self.output.as_ptr() as u32
  }

  #[wasm_bindgen(js_name = sendMessageToModule)]
  pub fn send_message_to_module(&mut self, module_id: ModuleId, message: JsValue) {
    self.engine.send_message_to_module(module_id, message);
  }

  pub fn process(&mut self) {
    self.engine.process(&mut self.output);
  }
}

struct AudioOut {
  input: AudioInput,
  volume: AudioParam,
  output: AudioOutput,
}

impl Module for AudioOut {
  fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      self.output[sample] = self.input.at(sample) * self.volume.at(sample)
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.volume]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }
}

impl AudioOut {
  fn new() -> AudioOut {
    AudioOut {
      input: AudioInput::default(),
      volume: AudioParam::new(AudioParamModulationType::Additive),
      output: AudioOutput::default(),
    }
  }
}

struct Oscillator {
  sync_input: AudioInput,
  sync_edge_detector: EdgeDetector,

  sin_output: AudioOutput,
  tri_output: AudioOutput,
  saw_output: AudioOutput,
  sqr_output: AudioOutput,

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

impl Module for Oscillator {
  fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let edge = self.sync_edge_detector.step(self.sync_input.at(sample));

      if edge == Edge::Rose {
        self.phase = 0.5;
      }

      let cv = self.cv_param.at(sample);
      let fm = self.fm_param.at(sample);
      let pw = self.pw_param.at(sample);
      let fine = self.fine_param.at(sample);

      let voltage = 5.0 + cv + fm + fine / 12.0;
      let freq = 13.75 * f32::powf(2.0, voltage);

      self.sin_output[sample] = 0.;
      self.tri_output[sample] = 0.;
      self.saw_output[sample] = 0.;
      self.sqr_output[sample] = 0.;

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

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.sync_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.cv_param,
      &mut self.fm_param,
      &mut self.pw_param,
      &mut self.fine_param,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![
      &mut self.sin_output,
      &mut self.tri_output,
      &mut self.saw_output,
      &mut self.sqr_output,
    ]
  }
}

impl Oscillator {
  pub fn new() -> Oscillator {
    Oscillator {
      sync_input: AudioInput::default(),
      sync_edge_detector: EdgeDetector::new(0.0),

      sin_output: AudioOutput::default(),
      tri_output: AudioOutput::default(),
      saw_output: AudioOutput::default(),
      sqr_output: AudioOutput::default(),

      cv_param: AudioParam::new(AudioParamModulationType::Additive),
      fm_param: AudioParam::new(AudioParamModulationType::Multiplicative),
      pw_param: AudioParam::new(AudioParamModulationType::Additive),
      fine_param: AudioParam::new(AudioParamModulationType::Additive),

      phase: 0.0,
    }
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
}

#[derive(Default)]
struct BiquadFilter {
  input: AudioInput,

  frequency: AudioParam,
  q: AudioParam,

  lowpass_output: AudioOutput,
  highpass_output: AudioOutput,

  input_buffer: [f32; 2],
  lowpass_buffer: [f32; 2],
  highpass_buffer: [f32; 2],
}

impl Module for BiquadFilter {
  fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let voltage = 5.0 + self.frequency.at(sample);
      let freq = 13.75 * f32::powf(2.0, voltage);

      let omega = std::f32::consts::PI * 2.0 * freq * INV_SAMPLE_RATE;
      let (sin_omega, cos_omega) = f32::sin_cos(omega);
      let alpha = sin_omega / 2.0 / f32::max(f32::EPSILON, self.q.at(sample));
      let input = self.input.at(sample);

      let a0 = 1.0 + alpha;
      let a1 = -2.0 * cos_omega;
      let a2 = 1.0 - alpha;

      let rcp_a0 = 1.0 / f32::max(f32::EPSILON, a0);

      {
        let b0 = (1.0 - cos_omega) / 2.0;
        let b1 = 1.0 - cos_omega;
        let b2 = b0;

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

        let output = (b0 * rcp_a0) * input
          + (b1 * rcp_a0) * self.input_buffer[0]
          + (b2 * rcp_a0) * self.input_buffer[1]
          - (a1 * rcp_a0) * self.highpass_buffer[0]
          - (a2 * rcp_a0) * self.highpass_buffer[1].clamp(-1000., 1000.);

        self.highpass_buffer[1] = self.highpass_buffer[0];
        self.highpass_buffer[0] = output;
        self.highpass_output[sample] = output;
      }

      self.input_buffer[1] = self.input_buffer[0];
      self.input_buffer[0] = input;
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.frequency, &mut self.q]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.lowpass_output, &mut self.highpass_output]
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }
}

impl BiquadFilter {
  pub fn new() -> BiquadFilter {
    BiquadFilter::default()
  }
}

#[derive(Default)]
struct Mixer {
  inputs: [AudioInput; 8],
  params: [AudioParam; 8],
  output: AudioOutput,
}

impl Module for Mixer {
  fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let v = self
        .inputs
        .iter()
        .enumerate()
        .map(|(ix, input)| input.at(sample) * self.params[ix].at(sample))
        .sum();
      self.output[sample] = v
    }
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    self.inputs.iter_mut().collect()
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    self.params.iter_mut().collect()
  }
}

impl Mixer {
  fn new() -> Mixer {
    Mixer::default()
  }
}

struct Gain {
  input: AudioInput,
  output: AudioOutput,
  gain: AudioParam,
}

impl Module for Gain {
  fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      self.output[sample] = self.input.at(sample) * self.gain.at(sample)
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.gain]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl Gain {
  fn new() -> Gain {
    Gain {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      gain: AudioParam::new(AudioParamModulationType::Additive),
    }
  }
}

struct Limiter {
  input: AudioInput,
  output: AudioOutput,
  threshold: AudioParam,

  buffer: RingBuffer,
}

impl Module for Limiter {
  fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let rms = self.buffer.rms();
      let threshold = self.threshold.at(sample);
      let ratio = if rms > threshold {
        threshold / rms
      } else {
        1.0
      };
      self.output[sample] = self.buffer.head() * ratio;
      self.buffer.write(self.input.at(sample));
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.threshold]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl Limiter {
  pub fn new() -> Limiter {
    Limiter {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      threshold: AudioParam::new(AudioParamModulationType::Additive),

      buffer: RingBuffer::new(500),
    }
  }
}

struct PowShaper {
  input: AudioInput,
  output: AudioOutput,

  exponent: AudioParam,
  gain: AudioParam,
  pre_gain: AudioParam,
}

impl Module for PowShaper {
  fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let pre_gained = self.input.at(sample) * self.pre_gain.at(sample);
      self.output[sample] = f32::signum(pre_gained)
        * f32::abs(pre_gained).powf(self.exponent.at(sample))
        * self.gain.at(sample);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.exponent, &mut self.gain, &mut self.pre_gain]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl PowShaper {
  fn new() -> PowShaper {
    PowShaper {
      input: AudioInput::default(),
      output: AudioOutput::default(),
      exponent: AudioParam::new(AudioParamModulationType::Additive),
      gain: AudioParam::new(AudioParamModulationType::Additive),
      pre_gain: AudioParam::new(AudioParamModulationType::Additive),
    }
  }
}

#[derive(Clone, Copy)]
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

fn note_to_voltage(note: &String) -> f32 {
  match note.as_str() {
    "C" => -9.0 / 12.0,
    "C#" => -8.0 / 12.0,
    "D" => -7.0 / 12.0,
    "D#" => -6.0 / 12.0,
    "E" => -5.0 / 12.0,
    "F" => -4.0 / 12.0,
    "F#" => -3.0 / 12.0,
    "G" => -2.0 / 12.0,
    "G#" => -1.0 / 12.0,
    "A" => 0.0 / 12.0,
    "A#" => 1.0 / 12.0,
    "B" => 2.0 / 12.0,
    _ => panic!("unknown note {}", note),
  }
}

#[derive(Default)]
struct Sequencer {
  gate_input: AudioInput,
  sequence_length: AudioParam,
  glide: AudioParam,
  cv_output: AudioOutput,
  gate_output: AudioOutput,

  notes: [Note; 32],
  current_step: usize,
  edge_detector: EdgeDetector,
  time: usize,
  previous_voltage: f32,

  events: Vec<ModuleEvent>,
}

impl Module for Sequencer {
  fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let edge = self.edge_detector.step(self.gate_input.at(sample));

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

          self.events.push(ModuleEvent::SequencerAdvance {
            position: self.current_step,
          });
        }
        _ => {}
      }

      self.cv_output[sample] = voltage;

      self.time += 1;

      if note.gate {
        self.gate_output[sample] = self.gate_input.at(sample);
      } else {
        self.gate_output[sample] = 0.0;
      }
    }
  }

  fn pop_event(&mut self) -> Option<ModuleEvent> {
    self.events.pop()
  }

  fn on_message(&mut self, message: ModuleMessage) {
    match message {
      ModuleMessage::SequencerSetNotes { notes } => {
        for (i, note) in notes.iter().enumerate() {
          let voltage = note_to_voltage(&note.name) - 4.0 + note.octave;

          self.notes[i].voltage = voltage;
          self.notes[i].gate = note.gate;
          self.notes[i].glide = note.glide;
        }
      }
      _ => panic!("sequencer: received unhandled message"),
    };
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.gate_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.sequence_length, &mut self.glide]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.cv_output, &mut self.gate_output]
  }
}

impl Sequencer {
  fn new() -> Sequencer {
    Sequencer::default()
  }
}

#[derive(Default)]
struct ADSR {
  gate_input: AudioInput,
  output: AudioOutput,

  attack: AudioParam,
  decay: AudioParam,
  sustain: AudioParam,
  release: AudioParam,

  edge_detector: EdgeDetector,
  time: f32,
  release_level: f32,
  level: f32,
}

impl Module for ADSR {
  fn process(&mut self) {
    for sample in 0..QUANTUM_SIZE {
      let edge = self.edge_detector.step(self.gate_input.at(sample));

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

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.gate_input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.attack,
      &mut self.decay,
      &mut self.sustain,
      &mut self.release,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl ADSR {
  pub fn new() -> ADSR {
    ADSR::default()
  }
}
const COMB_GAIN_COUNT: usize = 4;
const COMB_GAIN_OFFSETS: [f32; COMB_GAIN_COUNT] = [0.0, -0.01313, -0.02743, -0.031];
const COMB_DELAY_OFFSETS: [f32; COMB_GAIN_COUNT] = [0.0, -0.011, 0.019, -0.008];

struct Reverb {
  input: AudioInput,
  output: AudioOutput,

  delay: AudioParam,
  decay: AudioParam,
  diffuse: AudioParam,
  wet: AudioParam,
  dry: AudioParam,

  comb_filters: Vec<FeedbackCombFilter>,
  all_pass_filters: Vec<AllPassFilter>,
}

impl Module for Reverb {
  fn process(&mut self) {
    for i in 0..COMB_GAIN_COUNT {
      let delay = ((self.delay.at(0) + COMB_DELAY_OFFSETS[i]) * SAMPLE_RATE as f32) as usize;
      self.comb_filters[i].set_delay(delay);
    }

    for sample in 0..QUANTUM_SIZE {
      let input = self.input.at(sample);
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

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.delay,
      &mut self.decay,
      &mut self.diffuse,
      &mut self.wet,
      &mut self.dry,
    ]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }
}

impl Reverb {
  fn new() -> Reverb {
    Reverb {
      input: AudioInput::default(),
      output: AudioOutput::default(),

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
}

struct Delay {
  input: AudioInput,
  output: AudioOutput,

  time: AudioParam,
  feedback: AudioParam,
  wet: AudioParam,
  dry: AudioParam,

  buffer: RingBuffer,
}

impl Module for Delay {
  fn process(&mut self) {
    self
      .buffer
      .resize((self.time.at(0) * SAMPLE_RATE as f32) as usize);

    for sample in 0..QUANTUM_SIZE {
      let input = self.input.at(sample);
      let wet = self.buffer.head();
      self.buffer.write(input + wet * self.feedback.at(sample));
      self.output[sample] = wet * self.wet.at(sample) + input * self.dry.at(sample);
    }
  }

  fn get_inputs(&mut self) -> Vec<&mut AudioInput> {
    vec![&mut self.input]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![&mut self.output]
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![
      &mut self.time,
      &mut self.feedback,
      &mut self.wet,
      &mut self.dry,
    ]
  }
}

impl Delay {
  fn new() -> Delay {
    Delay {
      input: AudioInput::default(),
      output: AudioOutput::default(),

      time: AudioParam::default(),
      feedback: AudioParam::default(),
      wet: AudioParam::default(),
      dry: AudioParam::default(),

      buffer: RingBuffer::new(10000),
    }
  }
}

#[derive(Default)]
struct Clock {
  outputs: [AudioOutput; 3],

  tempo: AudioParam,
  ratios: [AudioParam; 3],
  pulse_widths: [AudioParam; 3],
  swing_ratios: [AudioParam; 3],

  is_running: bool,
  cycle_positions: [usize; 3],
}

impl Module for Clock {
  fn process(&mut self) {
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

  fn on_message(&mut self, message: ModuleMessage) {
    match message {
      ModuleMessage::ClockReset => {
        for output in 0..3 {
          self.cycle_positions[output] = 0;
        }
      }
      ModuleMessage::ClockSetRunning { running } => self.is_running = running,
      _ => panic!("clock: received unhandled message"),
    }
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    let mut params = vec![&mut self.tempo];

    for ratio in self.ratios.iter_mut() {
      params.push(ratio);
    }

    for pulse_width in self.pulse_widths.iter_mut() {
      params.push(pulse_width);
    }

    for swing_ratio in self.swing_ratios.iter_mut() {
      params.push(swing_ratio);
    }

    params
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    self.outputs.iter_mut().map(|out| out).collect()
  }
}

impl Clock {
  fn new() -> Clock {
    Clock::default()
  }
}

const MIDI_NOTE_OFF: u32 = 0b1000;
const MIDI_NOTE_ON: u32 = 0b1001;
// const MIDI_KEY_PRESSURE: u32 = 0b1010;
// const MIDI_CONTROL_CHANGE: u32 = 0b1011;
// const MIDI_PROGRAM_CHANGE: u32 = 0b1100;
// const MIDI_CHANNEL_PRESSURE: u32 = 0b1101;
// const MIDI_PITCH_BEND_CHANGE: u32 = 0b1110;

struct MIDI {
  cv_output: AudioOutput,
  velocity_output: AudioOutput,
  gate_output: AudioOutput,

  current_cv: f32,

  note_velocities: [u8; 128],
}

impl Module for MIDI {
  fn process(&mut self) {
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

  fn on_message(&mut self, message: ModuleMessage) {
    match message {
      ModuleMessage::MidiMessage { message } => {
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
      _ => panic!("midi: received unhandled message"),
    }
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    vec![
      &mut self.cv_output,
      &mut self.velocity_output,
      &mut self.gate_output,
    ]
  }
}
impl MIDI {
  fn new() -> MIDI {
    MIDI {
      cv_output: AudioOutput::default(),
      velocity_output: AudioOutput::default(),
      gate_output: AudioOutput::default(),

      current_cv: 0.0,

      note_velocities: [0; 128],
    }
  }
}

#[derive(Copy, Clone, Default, Serialize)]
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
    self.state = oldstate.wrapping_mul(6364136223846793005u64) + 1u64;
    // Calculate output function (XSH RR), uses old state for max ILP
    let xorshifted: u32 = (((oldstate >> 18u64) ^ oldstate) >> 27u64) as u32;
    let rot: u32 = (oldstate >> 59u64) as u32;
    return (xorshifted >> rot) | (xorshifted << ((0u32.wrapping_sub(rot)) & 31));
  }

  fn get_f32(&mut self) -> f32 {
    self.get_u32() as f32 * 2.3283064e-10
  }
}

#[derive(Copy, Clone, Default, Serialize)]
struct Ball {
  pos: Vec2,
  vel: Vec2,
}

struct BouncyBoi {
  balls: [Ball; 3],
  trigger_outputs: [AudioOutput; 3],
  trigger_timers: [u32; 3],
  velocity_outputs: [AudioOutput; 3],

  speed: AudioParam,
  gravity: AudioParam,

  phase: f32,
  cycle_count: usize,
  events: Vec<ModuleEvent>,
}

#[derive(Copy, Clone, Default)]
struct Wall {
  from: Vec2,
  to: Vec2,
}

impl Module for BouncyBoi {
  fn process(&mut self) {
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
      ball.vel = ball.vel.normalize() * f32::min(speed, 10.0);

      ball.pos = ball.pos + (ball.vel * 0.05);

      for wall in walls.iter() {
        let e = wall.to - wall.from;
        let n = Vec2 { x: e.y, y: -e.x }.normalize();
        let d = ball.pos - wall.from;
        let distance = n.dot(d);

        if distance < 10.0 {
          let depth = 10.0 - distance;

          self.trigger_timers[i] = 4000;
          self.velocity_outputs[i][0] = ball.vel.length() / 5.0;

          ball.pos = ball.pos + n * depth;
          ball.vel = ball.vel - n * f32::min(0.0, 2.01 * ball.vel.dot(n));
        }
      }
    }

    for sample in 0..QUANTUM_SIZE {
      for i in 0..3 {
        if sample != 0 {
          self.velocity_outputs[i][sample] = self.velocity_outputs[i].previous[0];
        }
        if self.trigger_timers[i] != 0 {
          self.trigger_outputs[i][sample] = 1.0;
          self.trigger_timers[i] -= 1;
        } else {
          self.trigger_outputs[i][sample] = 0.0;
        }
      }
    }

    self.cycle_count += 1;
    // Each cycle is about 2.9ms, five cycles is a bit over 60hz
    if self.cycle_count >= 5 {
      self.cycle_count = 0;
      self.events.push(ModuleEvent::BouncyBoiUpdate {
        balls: self.balls,
        phase: self.phase,
      })
    }
  }

  fn pop_event(&mut self) -> Option<ModuleEvent> {
    self.events.pop()
  }

  fn get_parameters(&mut self) -> Vec<&mut AudioParam> {
    vec![&mut self.speed, &mut self.gravity]
  }

  fn get_outputs(&mut self) -> Vec<&mut AudioOutput> {
    let mut outputs = vec![];

    for trigger_output in self.trigger_outputs.iter_mut() {
      outputs.push(trigger_output);
    }

    for velocity_output in self.velocity_outputs.iter_mut() {
      outputs.push(velocity_output);
    }

    outputs
  }
}

impl BouncyBoi {
  fn new() -> BouncyBoi {
    let mut boi = BouncyBoi {
      balls: [Ball::default(), Ball::default(), Ball::default()],
      trigger_outputs: [
        AudioOutput::default(),
        AudioOutput::default(),
        AudioOutput::default(),
      ],
      trigger_timers: [0, 0, 0],
      velocity_outputs: [
        AudioOutput::default(),
        AudioOutput::default(),
        AudioOutput::default(),
      ],

      speed: AudioParam::default(),
      gravity: AudioParam::default(),

      phase: 0.0,
      cycle_count: 0,
      events: vec![],
    };
    let mut rng = Rng::default();

    for ball in boi.balls.iter_mut() {
      ball.pos.x = 0.0;
      ball.pos.y = 0.0;
      ball.vel.x = rng.get_f32() * 2.0 - 1.0;
      ball.vel.y = rng.get_f32() * 2.0 - 1.0;
    }

    boi
  }
}
