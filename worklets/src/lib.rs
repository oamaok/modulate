#![feature(stdsimd)]
use audio_buffer::AudioBuffer;
use core::arch::wasm32::memory_atomic_wait64;
use filters::biquad_filter::BiquadFilter;
use modules::adsr::ADSR;
use modules::audio_out::AudioOut;
use modules::bouncy_boi::BouncyBoi;
use modules::chorus::Chorus;
use modules::clock::Clock;
use modules::delay::Delay;
use modules::eq3::EQ3;
use modules::fdn_reverb::FDNReverb;
use modules::gain::Gain;
use modules::lfo::LFO;
use modules::limiter::Limiter;
use modules::midi::MIDI;
use modules::mixer::Mixer;
use modules::oscillator::Oscillator;
use modules::oscilloscope::Oscilloscope;
use modules::piano_roll::PianoRoll;
use modules::pow_shaper::PowShaper;
use modules::ring_mod::RingMod;
use modules::sampler::Sampler;
use modules::sequencer::Sequencer;
use modules::sideq::Sideq;
use modules::virtual_controller::VirtualController;
use rw_lock::RwLock;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::ops::{Index, IndexMut};
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use wasm_bindgen::prelude::*;

pub mod adsr_curve;
pub mod audio_buffer;
pub mod audio_input;
pub mod audio_output;
pub mod audio_param;
pub mod barrier;
pub mod delay_line;
pub mod edge_detector;
pub mod filters;
pub mod modulate_core;
pub mod module;
pub mod modules;
pub mod ring_buffer;
pub mod rw_lock;
pub mod util;
pub mod vec;
pub mod windowed_sinc;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(extends = js_sys::Array, is_type_of = js_sys::Array::is_array, typescript_type = "[number, number]")]
  #[derive(Clone, Debug, PartialEq, Eq)]
  pub type IntegerTuple;
}

enum ConnectionTarget {
  Input(module::ModuleId, module::InputId),
  Parameter(module::ModuleId, module::ParameterId),
}

struct ModuleConnection {
  from: (module::ModuleId, module::OutputId),
  to: ConnectionTarget,
}

struct ModuleStore {
  modules: Vec<Box<dyn module::Module>>,
  module_ids: HashMap<module::ModuleId, usize>,
  rw_lock: RwLock,
}

impl Index<usize> for ModuleStore {
  type Output = Box<dyn module::Module>;
  fn index(&self, i: usize) -> &Box<dyn module::Module> {
    &self.modules[i]
  }
}

impl IndexMut<usize> for ModuleStore {
  fn index_mut(&mut self, i: usize) -> &mut Box<dyn module::Module> {
    &mut self.modules[i]
  }
}

impl ModuleStore {
  pub fn new() -> ModuleStore {
    ModuleStore {
      modules: vec![],
      module_ids: HashMap::new(),
      rw_lock: RwLock::new(),
    }
  }

  pub fn len(&self) -> usize {
    self.modules.len()
  }

  pub fn insert(&mut self, id: module::ModuleId, module: Box<dyn module::Module>) {
    let index = self.modules.len();
    self.modules.push(module);
    self.module_ids.insert(id, index);
  }

  pub fn remove(&mut self, id: &module::ModuleId) {
    let module_index = *self.module_ids.get(&id).unwrap();
    self.modules.remove(module_index);
    self.module_ids.remove(&id);

    for (_, i) in self.module_ids.iter_mut() {
      if *i > module_index {
        *i -= 1;
      }
    }
  }

  pub fn swap_buffers(&mut self) {
    for module in self.modules.iter_mut() {
      module.swap_output_buffers()
    }
  }

  pub fn get_mut(&mut self, id: &module::ModuleId) -> Option<&mut Box<dyn module::Module>> {
    let module_index = *self.module_ids.get(id).unwrap();
    self.modules.get_mut(module_index)
  }
}

#[derive(Serialize)]
struct ContextPointers {
  output_left: usize,
  output_right: usize,
  worker_performance: usize,
  worker_position: usize,
  audio_worklet_position: usize,
}

struct WorkerContext {
  num_threads: usize,

  barrier: barrier::Barrier,
  current_module: AtomicUsize,

  // Output buffer positions
  audio_worklet_position: AtomicU64,

  // Worker position needs not be atomic as it is only read and written by the barrier leader
  // after each processing loop.
  worker_position: u64,

  audio_outputs: HashSet<module::ModuleId>,
  output_buffers_left: [AudioBuffer; NUM_OUTPUT_BUFFERS],
  output_buffers_right: [AudioBuffer; NUM_OUTPUT_BUFFERS],

  performance: Vec<f32>,
}

struct Worker {
  id: usize,
  performance_samples: [f32; 64],
  modules: *mut ModuleStore,
  context: *mut WorkerContext,
}

const NUM_OUTPUT_BUFFERS: usize = 16;

impl Worker {
  fn run(&mut self) {
    let (context, modules) = unsafe {
      (
        self.context.as_mut().unwrap(),
        self.modules.as_mut().unwrap(),
      )
    };

    let performance = js_sys::Reflect::get(&js_sys::global(), &"performance".into())
      .expect("failed to get performance from global object")
      .unchecked_into::<web_sys::Performance>();

    loop {
      if context.worker_position >= NUM_OUTPUT_BUFFERS as u64 {
        // `audio_worklet_position` is atomically incremented by one from the AudioWorklet each time
        // it has consumed a quantum and then calls `Atomic.notify` on the address. If the workers
        // have reached the buffer right before the one being consumed, wait until the AudioWorklet
        // has proceeded to the next one.
        let wait_for_position = context.worker_position + 1 - NUM_OUTPUT_BUFFERS as u64;
        unsafe {
          memory_atomic_wait64(
            context.audio_worklet_position.as_ptr() as usize as *mut i64,
            wait_for_position as i64,
            -1,
          );
        }

        let audio_worklet_position = context.audio_worklet_position.load(Ordering::SeqCst);
        if audio_worklet_position < wait_for_position {
          // We are ahead of the audio worklet, so just spin here.
          continue;
        }
      }
      let start_time = performance.now();

      modules.rw_lock.lock_read();

      // Have the leader swap the buffers.
      context.barrier.wait_and_do(|| {
        modules.swap_buffers();
        context.current_module.store(0, Ordering::SeqCst);
      });

      loop {
        let module_index = context.current_module.fetch_add(1, Ordering::SeqCst);
        if module_index >= modules.len() {
          break;
        }

        let module = &mut modules[module_index];
        for parameter in module.get_parameters() {
          parameter.process(context.worker_position);
        }

        module.process(context.worker_position);
      }

      modules.rw_lock.unlock_read();

      // Have the leader write the output buffers
      context.barrier.wait_and_do(|| {
        modules.rw_lock.lock_read();

        // NOTE: If `worker_position` changes are not done by the barrier leader, it must be converted
        // into an atomic. Currently only a single thread reads and writes to it.
        context.worker_position += 1;
        let output_index = context.worker_position % NUM_OUTPUT_BUFFERS as u64;
        let output_buf_l = &mut context.output_buffers_left[output_index as usize];
        let output_buf_r = &mut context.output_buffers_right[output_index as usize];

        for sample in 0..modulate_core::QUANTUM_SIZE {
          (*output_buf_l)[sample] = 0.0;
          (*output_buf_r)[sample] = 0.0;
        }

        for audio_output in context.audio_outputs.iter() {
          let module = modules.get_mut(audio_output).unwrap();
          let outputs = module.get_outputs();
          let output_l = outputs.get(0).unwrap().read_buffer();
          let output_r = outputs.get(1).unwrap().read_buffer();

          for sample in 0..modulate_core::QUANTUM_SIZE {
            (*output_buf_l)[sample] += output_l[sample];
            (*output_buf_r)[sample] += output_r[sample];
          }
        }

        modules.rw_lock.unlock_read();
      });

      self.performance_samples[context.worker_position as usize % 64] =
        (performance.now() - start_time) as f32;
      context.performance[self.id] = 0.0;
      for i in 0..64 {
        context.performance[self.id] += self.performance_samples[i] / 64.0;
      }
    }
  }
}

struct ModulateEngine {
  next_id: u32,
  modules: ModuleStore,
  connections: HashMap<module::ConnectionId, ModuleConnection>,

  workers: Vec<Worker>,
  worker_context: WorkerContext,
}

impl ModulateEngine {
  pub fn new(num_threads: usize) -> ModulateEngine {
    ModulateEngine {
      next_id: 0,
      modules: ModuleStore::new(),
      connections: HashMap::new(),

      workers: vec![],
      worker_context: WorkerContext {
        num_threads,
        barrier: barrier::Barrier::new(num_threads),
        current_module: AtomicUsize::new(0),

        worker_position: 0,
        audio_worklet_position: AtomicU64::new(0),

        audio_outputs: HashSet::new(),
        output_buffers_left: [AudioBuffer::default(); NUM_OUTPUT_BUFFERS],
        output_buffers_right: [AudioBuffer::default(); NUM_OUTPUT_BUFFERS],

        performance: vec![0.0; num_threads],
      },
    }
  }

  fn get_next_id(&mut self) -> module::ModuleId {
    let id = self.next_id;
    self.next_id += 1;
    id
  }

  pub fn init_workers(&mut self) -> Vec<usize> {
    for i in 0..self.worker_context.num_threads {
      let worker = Worker {
        id: i,
        performance_samples: [0.0; 64],
        modules: &mut self.modules,
        context: &mut self.worker_context,
      };

      self.workers.push(worker);
    }

    self
      .workers
      .iter()
      .map(|worker| worker as *const Worker as usize)
      .collect()
  }

  pub fn get_context_pointers(&self) -> ContextPointers {
    ContextPointers {
      output_left: self.worker_context.output_buffers_left.as_ptr() as usize,
      output_right: self.worker_context.output_buffers_right.as_ptr() as usize,
      worker_performance: self.worker_context.performance.as_ptr() as usize,
      worker_position: &self.worker_context.worker_position as *const u64 as usize,
      audio_worklet_position: self.worker_context.audio_worklet_position.as_ptr() as usize,
    }
  }

  pub fn create_module(&mut self, module_name: &str) -> module::ModuleId {
    let id = self.get_next_id() as module::ModuleId;
    self.modules.rw_lock.lock_write();

    match module_name {
      "AudioOut" => {
        self.modules.insert(id, AudioOut::new());
        self.worker_context.audio_outputs.insert(id);
      }
      "Oscillator" => {
        self.modules.insert(id, Oscillator::new());
      }
      "LFO" => {
        self.modules.insert(id, LFO::new());
      }
      "BiquadFilter" => {
        self
          .modules
          .insert(id, modules::biquad_filter::BiquadFilter::new());
      }
      "Mixer" => {
        self.modules.insert(id, Mixer::new());
      }
      "Gain" => {
        self.modules.insert(id, Gain::new());
      }
      "Limiter" => {
        self.modules.insert(id, Limiter::new());
      }
      "PowShaper" => {
        self.modules.insert(id, PowShaper::new());
      }
      "Sequencer" => {
        self.modules.insert(id, Sequencer::new());
      }
      "ADSR" => {
        self.modules.insert(id, ADSR::new());
      }
      "Delay" => {
        self.modules.insert(id, Delay::new());
      }
      "Clock" => {
        self.modules.insert(id, Clock::new());
      }
      "MIDI" => {
        self.modules.insert(id, MIDI::new());
      }
      "BouncyBoi" => {
        self.modules.insert(id, BouncyBoi::new());
      }
      "Sampler" => {
        self.modules.insert(id, Sampler::new());
      }
      "VirtualController" => {
        self.modules.insert(id, VirtualController::new());
      }
      "PianoRoll" => {
        self.modules.insert(id, PianoRoll::new());
      }
      "Oscilloscope" => {
        self.modules.insert(
          id,
          Oscilloscope::new(self.worker_context.worker_position as usize),
        );
      }
      "FDNReverb" => {
        self.modules.insert(id, FDNReverb::new());
      }
      "Chorus" => {
        self.modules.insert(id, Chorus::new());
      }
      "EQ3" => {
        self.modules.insert(id, EQ3::new());
      }
      "RingMod" => {
        self.modules.insert(id, RingMod::new());
      }
      "Sideq" => {
        self.modules.insert(id, Sideq::new());
      }
      _ => panic!("create_module: unimplemented module '{}'", module_name),
    }

    self.modules.rw_lock.unlock_write();
    id
  }

  pub fn delete_module(&mut self, module_id: module::ModuleId) {
    self.modules.rw_lock.lock_write();
    self.worker_context.audio_outputs.remove(&module_id);
    self.modules.rw_lock.unlock_write();

    let connections_to_drop: Vec<module::ConnectionId> = self
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

    self.modules.rw_lock.lock_write();
    self.modules.remove(&module_id);
    self.modules.rw_lock.unlock_write();
  }

  pub fn set_parameter_value(
    &mut self,
    module_id: module::ModuleId,
    parameter: module::ParameterId,
    value: f32,
  ) {
    let module = self
      .modules
      .get_mut(&module_id)
      .expect("set_parameter_value: module_id doesn't exist");
    let mut parameters = module.get_parameters();
    let param = parameters.get_mut(parameter).unwrap();
    param.set_target(value, self.worker_context.worker_position);
  }

  pub fn connect_to_input(
    &mut self,
    from: (module::ModuleId, module::OutputId),
    to: (module::ModuleId, module::InputId),
  ) -> module::ConnectionId {
    let id = self.get_next_id() as module::ConnectionId;

    let (from_module_id, from_output) = from;
    let (to_module_id, to_input) = to;

    self.modules.rw_lock.lock_write();

    self.connections.insert(
      id,
      ModuleConnection {
        from,
        to: ConnectionTarget::Input(to_module_id, to_input),
      },
    );

    let output_buffer_ptr = {
      let from_module = self
        .modules
        .get_mut(&from_module_id)
        .expect("connect_to_input: from_module_id doesn't exist");
      from_module.get_output_buffer_ptr(from_output)
    };

    {
      let to_module = self
        .modules
        .get_mut(&to_module_id)
        .expect("connect_to_input: to_module_id doesn't exist");
      to_module.set_input_buffer_ptr(to_input, output_buffer_ptr);
    }

    self.modules.rw_lock.unlock_write();

    id
  }

  pub fn connect_to_parameter(
    &mut self,
    from: (module::ModuleId, module::OutputId),
    to: (module::ModuleId, module::ParameterId),
  ) -> module::ConnectionId {
    let id = self.get_next_id() as module::ConnectionId;

    let (from_module_id, from_output) = from;
    let (to_module_id, to_parameter) = to;

    self.modules.rw_lock.lock_write();

    self.connections.insert(
      id,
      ModuleConnection {
        from,
        to: ConnectionTarget::Parameter(to_module_id, to_parameter),
      },
    );

    let output_buffer_ptr = {
      let from_module = self
        .modules
        .get_mut(&from_module_id)
        .expect("connect_to_parameter: from_module_id doesn't exist");
      from_module.get_output_buffer_ptr(from_output)
    };

    {
      let to_module = self
        .modules
        .get_mut(&to_module_id)
        .expect("connect_to_parameter: to_module_id doesn't exist");
      to_module.set_parameter_buffer_ptr(to_parameter, output_buffer_ptr);
    }

    self.modules.rw_lock.unlock_write();

    id
  }

  pub fn remove_connection(&mut self, connection_id: module::ConnectionId) {
    self.modules.rw_lock.lock_write();

    if let Some(connection) = self.connections.get(&connection_id) {
      match connection.to {
        ConnectionTarget::Input(to_module_id, to_input) => {
          if let Some(to_module) = self.modules.get_mut(&to_module_id) {
            to_module.reset_input_buffer_ptr(to_input);
          };
        }
        ConnectionTarget::Parameter(to_module_id, to_parameter) => {
          if let Some(to_module) = self.modules.get_mut(&to_module_id) {
            to_module.reset_parameter_buffer_ptr(to_parameter);
          }
        }
      }

      self.connections.remove(&connection_id);
    };

    self.modules.rw_lock.unlock_write();
  }

  pub fn send_message_to_module(&mut self, module_id: module::ModuleId, message: JsValue) {
    self.modules.rw_lock.lock_write();

    let module = self.modules.get_mut(&module_id).unwrap();

    // TODO: Move this deserialization to the wrapper
    match serde_wasm_bindgen::from_value(message) {
      Ok(msg) => module.on_message(msg),
      Err(err) => panic!("error deserializing message: {}", err.to_string().as_str()),
    }

    self.modules.rw_lock.unlock_write();
  }

  pub fn get_module_pointers(&mut self, module_id: module::ModuleId) -> Vec<usize> {
    self.modules.rw_lock.lock_write();

    let module = self.modules.get_mut(&module_id).unwrap();

    let pointers = module.get_pointers();

    self.modules.rw_lock.unlock_write();

    pointers
  }

  pub fn collect_module_events(&mut self) -> Vec<module::ModuleEventWithId> {
    // NOTE: This need not be atomic or `lock_write`ed, as the only place where other modifying
    // operations can be called is this thread (main worker)
    let mut events = vec![];
    let module_ids = &self.modules.module_ids;
    let modules = &mut self.modules.modules;

    for (&id, &idx) in module_ids.iter() {
      let module = &mut modules[idx];
      loop {
        match module.pop_event() {
          Some(event) => {
            events.push(module::ModuleEventWithId { id, event });
          }
          None => break,
        };
      }
    }

    events
  }
}

#[wasm_bindgen]
pub struct ModulateEngineWrapper {
  engine: ModulateEngine,
}

#[wasm_bindgen]
impl ModulateEngineWrapper {
  #[wasm_bindgen(constructor)]
  pub fn new(num_threads: usize) -> ModulateEngineWrapper {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));

    ModulateEngineWrapper {
      engine: ModulateEngine::new(num_threads),
    }
  }

  #[wasm_bindgen(js_name = initWorkers)]
  pub fn init_workers(&mut self) -> Vec<usize> {
    self.engine.init_workers()
  }

  #[wasm_bindgen(js_name = getContextPointers)]
  pub fn get_context_pointers(&self) -> JsValue {
    serde_wasm_bindgen::to_value(&self.engine.get_context_pointers()).unwrap()
  }

  #[wasm_bindgen(js_name = createModule)]
  pub fn create_module(&mut self, module_name: &str) -> module::ModuleId {
    self.engine.create_module(module_name)
  }

  #[wasm_bindgen(js_name = deleteModule)]
  pub fn delete_module(&mut self, module_id: module::ModuleId) {
    self.engine.delete_module(module_id);
  }

  #[wasm_bindgen(js_name = setParameterValue)]
  pub fn set_parameter_value(
    &mut self,
    module_id: module::ModuleId,
    parameter: module::ParameterId,
    value: f32,
  ) {
    self.engine.set_parameter_value(module_id, parameter, value);
  }

  #[wasm_bindgen(js_name = connectToInput)]
  pub fn connect_to_input(&mut self, from: IntegerTuple, to: IntegerTuple) -> module::ConnectionId {
    // TODO: use serde
    let from_tuple: (module::ModuleId, module::OutputId) = match from
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (module::ModuleId, module::OutputId),
      _ => panic!("`from` must be [u32, u32]"),
    };

    let to_tuple: (module::ModuleId, module::InputId) = match to
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (module::ModuleId, module::InputId),
      _ => panic!("`to` must be [u32, u32]"),
    };

    self.engine.connect_to_input(from_tuple, to_tuple)
  }

  #[wasm_bindgen(js_name = connectToParameter)]
  pub fn connect_to_parameter(
    &mut self,
    from: IntegerTuple,
    to: IntegerTuple,
  ) -> module::ConnectionId {
    // TODO: use serde

    let from_tuple: (module::ModuleId, module::OutputId) = match from
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (module::ModuleId, module::OutputId),
      _ => panic!("`from` must be [u32, u32]"),
    };

    let to_tuple: (module::ModuleId, module::InputId) = match to
      .iter()
      .map(|x| x.as_f64().unwrap() as u32)
      .take(2)
      .collect::<Vec<u32>>()
      .as_slice()
    {
      [first, second] => (*first, *second as usize) as (module::ModuleId, module::ParameterId),
      _ => panic!("`to` must be [u32, u32]"),
    };

    self.engine.connect_to_parameter(from_tuple, to_tuple)
  }

  #[wasm_bindgen(js_name = removeConnection)]
  pub fn remove_connection(&mut self, connection_id: module::ConnectionId) {
    self.engine.remove_connection(connection_id)
  }

  #[wasm_bindgen(js_name = sendMessageToModule)]
  pub fn send_message_to_module(&mut self, module_id: module::ModuleId, message: JsValue) {
    self.engine.send_message_to_module(module_id, message);
  }

  #[wasm_bindgen(js_name = getModulePointers)]
  pub fn get_module_pointers(&mut self, module_id: module::ModuleId) -> Vec<usize> {
    self.engine.get_module_pointers(module_id)
  }

  #[wasm_bindgen(js_name = collectModuleEvents)]
  pub fn collect_module_events(&mut self) -> JsValue {
    serde_wasm_bindgen::to_value(&self.engine.collect_module_events()).unwrap()
  }
}

#[wasm_bindgen(js_name = workerEntry)]
pub fn worker_entry(ptr: usize) {
  unsafe {
    let worker = &mut *(ptr as *mut Worker);
    worker.run();
  }
}

#[wasm_bindgen(js_name = getFilterCoefficients)]
pub fn get_filter_coefficients(filter_type: &str, freq: f32, q: f32, gain: f32) -> Vec<f32> {
  let mut biquad_filter = BiquadFilter::new();

  match filter_type {
    "highpass" => biquad_filter.set_highpass(freq, q),
    "lowpass" => biquad_filter.set_lowpass(freq, q),
    "bandpass" => biquad_filter.set_bandpass(freq, q),
    "highshelf" => biquad_filter.set_highshelf(freq, q, gain),
    "lowshelf" => biquad_filter.set_lowshelf(freq, q, gain),
    "peaking" => biquad_filter.set_peaking(freq, q, gain),
    _ => panic!("Unknown filter type!"),
  }

  biquad_filter.get_coefficients()
}
