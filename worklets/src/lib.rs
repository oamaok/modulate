#![feature(stdsimd)]
use core::arch::wasm32::{memory_atomic_notify, memory_atomic_wait32, memory_atomic_wait64};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::ops::{Index, IndexMut};
use std::sync::atomic::{AtomicI32, AtomicU64, AtomicUsize, Ordering};
use wasm_bindgen::prelude::*;

pub mod barrier;
pub mod modulate_core;
pub mod module;
pub mod modules;
pub mod vec;

use modules::{
  adsr, audio_out, biquad_filter, bouncy_boi, clock, delay, gain, lfo, limiter, midi, mixer,
  oscillator, pow_shaper, reverb, sequencer,
};

#[wasm_bindgen(inline_js = "export function now() { return performance.now() }")]
extern "C" {
  fn now() -> f64;
}

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
  rw_state: AtomicI32,
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
      rw_state: AtomicI32::new(0),
    }
  }

  pub fn len(&self) -> usize {
    self.modules.len()
  }

  pub fn insert(&mut self, id: module::ModuleId, module: Box<dyn module::Module>) {
    self.write_lock();

    let index = self.modules.len();
    self.modules.push(module);
    self.module_ids.insert(id, index);

    self.write_unlock();
  }

  pub fn remove(&mut self, id: &module::ModuleId) {
    self.write_lock();

    let module_index = *self.module_ids.get(&id).unwrap();
    self.modules.remove(module_index);
    self.module_ids.remove(&id);

    for (_, i) in self.module_ids.iter_mut() {
      if *i > module_index {
        *i -= 1;
      }
    }

    self.write_unlock();
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

  pub fn read_lock(&mut self) {
    loop {
      let readers = self.rw_state.load(Ordering::SeqCst);

      if readers < 0 {
        unsafe {
          memory_atomic_wait32(
            &mut self.rw_state as *mut AtomicI32 as *mut i32,
            readers,
            -1,
          );
        }
        continue;
      }

      if self
        .rw_state
        .compare_exchange(readers, readers + 1, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok()
      {
        break;
      }
    }
  }

  pub fn read_unlock(&mut self) {
    if self.rw_state.fetch_sub(1, Ordering::SeqCst) == 1 {
      unsafe { memory_atomic_notify(&mut self.rw_state as *mut AtomicI32 as *mut i32, u32::MAX) };
    }
  }

  pub fn write_lock(&mut self) {
    loop {
      match self
        .rw_state
        .compare_exchange(0, -1, Ordering::SeqCst, Ordering::SeqCst)
      {
        Ok(_) => break,
        Err(v) => unsafe {
          memory_atomic_wait32(&mut self.rw_state as *mut AtomicI32 as *mut i32, v, -1);
        },
      }
    }
  }

  pub fn write_unlock(&mut self) {
    self.rw_state.store(0, Ordering::SeqCst);
    unsafe { memory_atomic_notify(&mut self.rw_state as *mut AtomicI32 as *mut i32, u32::MAX) };
  }
}

#[derive(Serialize)]
struct ContextPointers {
  audio_buffers: usize,
  worklet_performance: usize,
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
  output_buffers: [modulate_core::AudioBuffer; NUM_OUTPUT_BUFFERS],

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

    loop {
      context.barrier.wait();

      if context.worker_position >= NUM_OUTPUT_BUFFERS as u64 {
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
          continue;
        }
      }

      let start_time = now() as f32;

      modules.read_lock();

      // Have the leader swap the buffers
      if context.barrier.wait() {
        modules.swap_buffers();
        context.current_module.store(0, Ordering::SeqCst);
      }
      context.barrier.wait();

      loop {
        let module_index = context.current_module.fetch_add(1, Ordering::SeqCst);

        if module_index >= modules.len() {
          break;
        }

        modules[module_index].process();
      }

      modules.read_unlock();
      
      // Have the leader write the output buffers
      if context.barrier.wait() {
        modules.read_lock();

        // NOTE: If this `worker_position` changes are not done by the barrier leader, it must be converted
        // into an atomic. Currently only a single thread reads and writes to it.
        context.worker_position += 1;
        let output_index = context.worker_position % NUM_OUTPUT_BUFFERS as u64;
        let output_buffer = &mut context.output_buffers[output_index as usize];

        for sample in 0..modulate_core::QUANTUM_SIZE {
          (*output_buffer)[sample] = 0.0;
        }

        for audio_output in context.audio_outputs.iter() {
          let module = modules.get_mut(audio_output).unwrap();
          let mut outputs = module.get_outputs();
          let output = outputs.get_mut(0).unwrap().current();
          for sample in 0..modulate_core::QUANTUM_SIZE {
            (*output_buffer)[sample] += output[sample];
          }
        }

        modules.read_unlock();
      }

      self.performance_samples[context.worker_position as usize % 64] = (now() as f32) - start_time;

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
  on_event_callback: js_sys::Function,

  workers: Vec<Worker>,
  worker_context: WorkerContext,
}

impl ModulateEngine {
  pub fn new(num_threads: usize, on_event_callback: js_sys::Function) -> ModulateEngine {
    ModulateEngine {
      next_id: 0,
      modules: ModuleStore::new(),
      connections: HashMap::new(),
      on_event_callback,

      workers: vec![],
      worker_context: WorkerContext {
        num_threads,
        barrier: barrier::Barrier::new(num_threads),
        current_module: AtomicUsize::new(0),

        worker_position: 0,
        audio_worklet_position: AtomicU64::new(0),

        audio_outputs: HashSet::new(),
        output_buffers: [modulate_core::AudioBuffer::default(); NUM_OUTPUT_BUFFERS],

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
      audio_buffers: self.worker_context.output_buffers.as_ptr() as usize,
      worklet_performance: self.worker_context.performance.as_ptr() as usize,
      audio_worklet_position: self.worker_context.audio_worklet_position.as_ptr() as usize,
    }
  }

  pub fn create_module(&mut self, module_name: &str) -> module::ModuleId {
    let id = self.get_next_id() as module::ModuleId;
    match module_name {
      "AudioOut" => {
        self
          .modules
          .insert(id, Box::new(audio_out::AudioOut::new()));
        self.worker_context.audio_outputs.insert(id);
      }
      "Oscillator" => {
        self
          .modules
          .insert(id, Box::new(oscillator::Oscillator::new()));
      }
      "LFO" => {
        self.modules.insert(id, Box::new(lfo::LFO::new()));
      }
      "BiquadFilter" => {
        self
          .modules
          .insert(id, Box::new(biquad_filter::BiquadFilter::new()));
      }
      "Mixer" => {
        self.modules.insert(id, Box::new(mixer::Mixer::new()));
      }
      "Gain" => {
        self.modules.insert(id, Box::new(gain::Gain::new()));
      }
      "Limiter" => {
        self.modules.insert(id, Box::new(limiter::Limiter::new()));
      }
      "PowShaper" => {
        self
          .modules
          .insert(id, Box::new(pow_shaper::PowShaper::new()));
      }
      "Sequencer" => {
        self
          .modules
          .insert(id, Box::new(sequencer::Sequencer::new()));
      }
      "ADSR" => {
        self.modules.insert(id, Box::new(adsr::ADSR::new()));
      }
      "Reverb" => {
        self.modules.insert(id, Box::new(reverb::Reverb::new()));
      }
      "Delay" => {
        self.modules.insert(id, Box::new(delay::Delay::new()));
      }
      "Clock" => {
        self.modules.insert(id, Box::new(clock::Clock::new()));
      }
      "MIDI" => {
        self.modules.insert(id, Box::new(midi::MIDI::new()));
      }
      "BouncyBoi" => {
        self
          .modules
          .insert(id, Box::new(bouncy_boi::BouncyBoi::new()));
      }
      _ => panic!("create_module: unimplemented module '{}'", module_name),
    }
    id
  }

  pub fn delete_module(&mut self, module_id: module::ModuleId) {
    self.worker_context.audio_outputs.remove(&module_id);

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

    self.modules.remove(&module_id);
  }

  pub fn set_parameter_value(
    &mut self,
    module_id: module::ModuleId,
    parameter: module::ParameterId,
    value: f32,
  ) {
    let module = self.modules.get_mut(&module_id).unwrap();
    let mut parameters = module.get_parameters();
    let param = parameters.get_mut(parameter).unwrap();
    param.value = value;
  }

  pub fn connect_to_input(
    &mut self,
    from: (module::ModuleId, module::OutputId),
    to: (module::ModuleId, module::InputId),
  ) -> module::ConnectionId {
    let id = self.get_next_id() as module::ConnectionId;

    let (from_module_id, from_output) = from;
    let (to_module_id, to_input) = to;

    self.modules.write_lock();

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

    self.modules.write_unlock();

    id
  }

  pub fn connect_to_parameter(
    &mut self,
    from: (module::ModuleId, module::OutputId),
    to: (module::ModuleId, module::ParameterId),
  ) -> module::ConnectionId {
    self.modules.write_lock();

    let id = self.get_next_id() as module::ConnectionId;

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

    self.modules.write_unlock();

    id
  }

  pub fn remove_connection(&mut self, connection_id: module::ConnectionId) {
    self.modules.write_lock();

    let connection = self.connections.get(&connection_id).unwrap();

    match connection.to {
      ConnectionTarget::Input(to_module_id, to_input) => {
        let to_module = self.modules.get_mut(&to_module_id).unwrap();
        to_module.set_input_buffer_ptr(to_input, std::ptr::null());
      }
      ConnectionTarget::Parameter(to_module_id, to_parameter) => {
        let to_module = self.modules.get_mut(&to_module_id).unwrap();
        to_module.set_parameter_buffer_ptr(to_parameter, std::ptr::null());
      }
    }

    self.modules.write_unlock();

    self.connections.remove(&connection_id);
  }

  pub fn send_message_to_module(&mut self, module_id: module::ModuleId, message: JsValue) {
    self.modules.write_lock();

    let module = self.modules.get_mut(&module_id).unwrap();

    // TODO: Move this deserialization to the wrapper
    match serde_wasm_bindgen::from_value(message) {
      Ok(msg) => module.on_message(msg),
      Err(err) => panic!("error deserializing message: {}", err.to_string().as_str()),
    }

    self.modules.write_unlock();
  }
}

#[wasm_bindgen]
pub struct ModulateEngineWrapper {
  engine: ModulateEngine,
}

#[wasm_bindgen]
impl ModulateEngineWrapper {
  #[wasm_bindgen(constructor)]
  pub fn new(num_threads: usize, on_event_callback: js_sys::Function) -> ModulateEngineWrapper {
    #[cfg(debug_assertions)]
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));

    ModulateEngineWrapper {
      engine: ModulateEngine::new(num_threads, on_event_callback),
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
}

#[wasm_bindgen(js_name = workerEntry)]
pub fn worker_entry(ptr: usize) {
  unsafe {
    let worker = &mut *(ptr as *mut Worker);
    worker.run();
  }
}
